import { NextResponse } from 'next/server';
import { getAllMCPTools } from '@/lib/ai/mcp-clients';

export async function GET() {
  try {
    // Get all MCP tools from our utility
    const allTools = await getAllMCPTools();

    // Transform the tools into a structured format for the UI
    const toolList = Object.keys(allTools).map((toolName) => {
      // Extract the server name and actual tool name from the combined key
      const [serverName, actualToolName] = toolName.split('_', 2);

      return {
        id: toolName,
        name: actualToolName,
        server: serverName,
        description: `${serverName} - ${actualToolName}`, // Basic description
      };
    });

    // Group tools by server for better display
    const groupedTools = toolList.reduce(
      (acc, tool) => {
        if (!acc[tool.server]) {
          acc[tool.server] = [];
        }
        acc[tool.server].push(tool);
        return acc;
      },
      {} as Record<string, typeof toolList>,
    );

    // Add server metadata
    const servers = Object.entries(groupedTools).map(([serverName, tools]) => {
      return {
        id: serverName,
        name: serverName,
        toolCount: tools.length,
        description: `${serverName} MCP Server with ${tools.length} tools`,
        // Add an icon or other metadata if available
        icon: serverName.toLowerCase().includes('stripe')
          ? 'payment'
          : serverName.toLowerCase().includes('supabase')
            ? 'database'
            : 'server',
      };
    });

    return NextResponse.json({
      tools: toolList,
      groupedTools,
      servers,
    });
  } catch (error) {
    console.error('Error fetching MCP tools:', error);
    return NextResponse.json(
      { error: 'Failed to load MCP tools' },
      { status: 500 },
    );
  }
}
