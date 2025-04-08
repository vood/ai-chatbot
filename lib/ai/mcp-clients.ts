import fs from 'node:fs';
import path from 'node:path';
import { experimental_createMCPClient } from 'ai';
import { Experimental_StdioMCPTransport } from 'ai/mcp-stdio';
import { z } from 'zod';

// Zod schema for MCP server configuration with stricter validation
const MCPServerConfigSchema = z
  .object({
    command: z.string().min(1, 'Command cannot be empty'),
    args: z.array(z.string()),
  })
  .strict();

// Zod schema for the entire MCP config file
const MCPConfigSchema = z
  .object({
    mcpServers: z
      .record(
        z.string().min(1, 'Server name cannot be empty'),
        MCPServerConfigSchema,
      )
      .refine((servers) => Object.keys(servers).length > 0, {
        message: 'At least one MCP server must be configured',
      }),
  })
  .strict();

// Types derived from Zod schemas
type MCPServerConfig = z.infer<typeof MCPServerConfigSchema>;
type MCPConfig = z.infer<typeof MCPConfigSchema>;

// Find all environment variable references in a server config
function findEnvVarsInConfig(serverConfig: MCPServerConfig): string[] {
  const envVarRefs: string[] = [];
  const envVarPattern = /\{([^}]+)\}/g;

  // Check command string
  let match: RegExpExecArray | null;

  // Extract matches from command string
  match = envVarPattern.exec(serverConfig.command);
  while (match !== null) {
    envVarRefs.push(match[1]);
    match = envVarPattern.exec(serverConfig.command);
  }

  // Check each arg string
  for (const arg of serverConfig.args) {
    envVarPattern.lastIndex = 0; // Reset regex state

    match = envVarPattern.exec(arg);
    while (match !== null) {
      envVarRefs.push(match[1]);
      match = envVarPattern.exec(arg);
    }
  }

  return [...new Set(envVarRefs)]; // Remove duplicates
}

// Validate that all required environment variables are set
function validateConfigEnvVars(config: MCPConfig): {
  valid: boolean;
  missing: string[];
} {
  const missingVars: string[] = [];

  for (const [serverName, serverConfig] of Object.entries(config.mcpServers)) {
    const envVars = findEnvVarsInConfig(serverConfig);

    for (const envVar of envVars) {
      if (!process.env[envVar]) {
        missingVars.push(`${serverName}.${envVar}`);
      }
    }
  }

  return {
    valid: missingVars.length === 0,
    missing: missingVars,
  };
}

// Read and parse the MCP config file with comprehensive validation
function loadMCPConfig(): MCPConfig {
  const configPath = path.join(process.cwd(), 'mcp-config.json');
  const emptyConfig: MCPConfig = { mcpServers: {} };

  // Check if config file exists
  if (!fs.existsSync(configPath)) {
    console.error(`MCP config file not found at ${configPath}`);
    return emptyConfig;
  }

  try {
    // Read file content
    const configContent = fs.readFileSync(configPath, 'utf8');

    // Parse JSON with explicit error handling
    let parsedConfig: unknown;
    try {
      parsedConfig = JSON.parse(configContent);
    } catch (jsonError) {
      console.error('Failed to parse MCP config JSON:', jsonError);
      return emptyConfig;
    }

    // Validate config against schema
    const result = MCPConfigSchema.safeParse(parsedConfig);

    if (!result.success) {
      console.error('Invalid MCP config format:');
      const formattedErrors = result.error.format();
      console.error(JSON.stringify(formattedErrors, null, 2));
      return emptyConfig;
    }

    // Validate environment variables
    const envVarValidation = validateConfigEnvVars(result.data);
    if (!envVarValidation.valid) {
      console.warn(
        'Missing environment variables for MCP config:',
        envVarValidation.missing.join(', '),
      );
    }

    return result.data;
  } catch (error) {
    console.error('Failed to load MCP config:', error);
    return emptyConfig;
  }
}

// Replace environment variables in the format {ENV_VAR_NAME}
function replaceEnvVars(value: string): string {
  return value.replace(/\{([^}]+)\}/g, (_, envName) => {
    const envValue = process.env[envName];
    if (!envValue) {
      console.warn(`Environment variable ${envName} not found`);
      return `{${envName}}`;
    }
    return envValue;
  });
}

// Process server config to replace env vars in all args
function processServerConfig(serverConfig: MCPServerConfig): MCPServerConfig {
  return {
    command: serverConfig.command,
    args: serverConfig.args.map((arg) => replaceEnvVars(arg)),
  };
}

// Create MCP clients based on the config
export async function createMCPClients() {
  const config = loadMCPConfig();
  const clients: Record<string, any> = {};

  for (const [serverName, serverConfig] of Object.entries(config.mcpServers)) {
    try {
      const processedConfig = processServerConfig(serverConfig);

      const transport = new Experimental_StdioMCPTransport({
        command: processedConfig.command,
        args: processedConfig.args,
      });

      const client = await experimental_createMCPClient({
        transport,
      });

      // Store the client and its tools
      clients[serverName] = {
        client,
        tools: await client.tools(),
      };
    } catch (error) {
      console.error(`Failed to create MCP client for ${serverName}:`, error);
    }
  }

  return clients;
}

// Get all tools from all MCP clients
export async function getAllMCPTools() {
  const clients = await createMCPClients();
  const allTools: Record<string, any> = {};

  for (const [serverName, clientData] of Object.entries(clients)) {
    // Add prefix to avoid tool name collisions between different servers
    Object.entries(clientData.tools).forEach(([toolName, toolFn]) => {
      allTools[`${serverName}_${toolName}`] = toolFn;
    });
  }

  return allTools;
}

// Close all clients to clean up resources
export async function closeMCPClients(clients: Record<string, any>) {
  for (const [, clientData] of Object.entries(clients)) {
    try {
      await clientData.client.close();
    } catch (error) {
      console.error('Error closing MCP client:', error);
    }
  }
}
