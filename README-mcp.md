# MCP Integration

This project integrates with the Model Context Protocol (MCP) to provide additional AI tools from various services.

## Configuration

MCP servers are configured in the `mcp-config.json` file at the root of the project. This file defines the commands and arguments needed to start each MCP server.

### Config Schema

The configuration file must follow this schema:

```json
{
  "mcpServers": {
    "<server-name>": {
      "command": "<command-to-run>",
      "args": ["<arg1>", "<arg2>", ...]
    },
    ...
  }
}
```

The configuration is validated using Zod with the following constraints:

- Server names must not be empty
- At least one server must be configured
- Command strings cannot be empty
- Args must be an array of strings
- No additional properties are allowed (strict validation)

### Environment Variables

The configuration supports environment variable replacement. Use the format `{ENV_VAR_NAME}` in the config, and it will be replaced with the corresponding environment variable value at runtime.

Example:

```json
{
  "mcpServers": {
    "stripe": {
      "command": "npx",
      "args": [
        "-y",
        "@stripe/mcp",
        "--tools=all",
        "--api-key={STRIPE_SECRET_KEY}"
      ]
    }
  }
}
```

The system will:

1. Identify all environment variables referenced in the config
2. Validate that they are all defined in the environment
3. Warn you about any missing environment variables

### Required Environment Variables

Make sure to add the following environment variables to your `.env` file:

```
STRIPE_SECRET_KEY=sk_test_...
SUPABASE_ACCESS_TOKEN=sbp_...
```

## How It Works

1. The `lib/ai/mcp-clients.ts` utility reads the configuration and creates MCP clients
2. Environment variables in the format `{VAR_NAME}` are replaced with their actual values
3. MCP tools are made available to the chat API route
4. All MCP tools are automatically enabled for use in the chat

## Adding New MCP Servers

To add a new MCP server:

1. Add its configuration to `mcp-config.json`
2. Add any required environment variables to your `.env` file
3. Restart the application

The system will automatically discover and make available the tools from the new server.

## Troubleshooting

If you encounter issues with MCP tools:

1. Check that all required environment variables are set
2. Verify that the MCP package is correctly specified in the config
3. Check the server logs for any errors during MCP server startup
4. Make sure the MCP server package is compatible with your system
5. Check the validation errors in the console for any schema issues
