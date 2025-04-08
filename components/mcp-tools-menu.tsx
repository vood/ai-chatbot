'use client';

import { useEffect, useState } from 'react';
import {
  CheckIcon,
  ServerIcon,
  PlusIcon,
  DatabaseIcon,
  CreditCardIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface MCPTool {
  id: string;
  name: string;
  server: string;
  description: string;
}

interface MCPServer {
  id: string;
  name: string;
  toolCount: number;
  description: string;
  icon: string;
}

interface MCPToolsMenuProps {
  selectedTools: ReadonlySet<string>;
  onSelectedToolsChange: (newSelectedTools: Set<string>) => void;
  disabled?: boolean;
}

export function MCPToolsMenu({
  selectedTools,
  onSelectedToolsChange,
  disabled = false,
}: MCPToolsMenuProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [groupedTools, setGroupedTools] = useState<Record<string, MCPTool[]>>(
    {},
  );
  const [error, setError] = useState<string | null>(null);
  const [showIndividualTools, setShowIndividualTools] = useState<
    Record<string, boolean>
  >({});

  // Load the MCP tools from the API
  useEffect(() => {
    async function fetchMCPTools() {
      try {
        setLoading(true);
        const response = await fetch('/api/mcp-tools');

        if (!response.ok) {
          throw new Error(`Failed to fetch MCP tools: ${response.statusText}`);
        }

        const data = await response.json();
        setTools(data.tools);
        setGroupedTools(data.groupedTools);
        setServers(data.servers || []);

        // Initialize tool visibility state
        const initialVisibility: Record<string, boolean> = {};
        (data.servers || []).forEach((server: MCPServer) => {
          initialVisibility[server.id] = false;
        });
        setShowIndividualTools(initialVisibility);
      } catch (err) {
        console.error('Error fetching MCP tools:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchMCPTools();
  }, []);

  // Handle selecting/deselecting a tool
  const handleSelectTool = (toolId: string) => {
    const newSelectedTools = new Set(selectedTools);

    if (newSelectedTools.has(toolId)) {
      newSelectedTools.delete(toolId);
    } else {
      newSelectedTools.add(toolId);
    }

    onSelectedToolsChange(newSelectedTools);
  };

  // Handle selecting/deselecting all tools from a server
  const handleSelectServer = (serverName: string) => {
    const serverTools = groupedTools[serverName] || [];
    const serverToolIds = new Set(serverTools.map((tool) => tool.id));

    // Check if all tools from this server are already selected
    const allSelected = serverTools.every((tool) => selectedTools.has(tool.id));

    const newSelectedTools = new Set(selectedTools);

    if (allSelected) {
      // If all are selected, deselect all tools from this server
      serverTools.forEach((tool) => {
        newSelectedTools.delete(tool.id);
      });
    } else {
      // Otherwise, select all tools from this server
      serverTools.forEach((tool) => {
        newSelectedTools.add(tool.id);
      });
    }

    onSelectedToolsChange(newSelectedTools);
  };

  // Toggle showing individual tools for a server
  const toggleShowTools = (serverName: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setShowIndividualTools((prev) => ({
      ...prev,
      [serverName]: !prev[serverName],
    }));
  };

  // Get server icon component
  const getServerIcon = (serverName: string, iconType: string) => {
    if (iconType === 'database') return <DatabaseIcon className="size-4" />;
    if (iconType === 'payment') return <CreditCardIcon className="size-4" />;
    return <ServerIcon className="size-4" />;
  };

  // Check if all tools from a server are selected
  const areAllServerToolsSelected = (serverName: string): boolean => {
    const serverTools = groupedTools[serverName] || [];
    return (
      serverTools.length > 0 &&
      serverTools.every((tool) => selectedTools.has(tool.id))
    );
  };

  // Check if some (but not all) tools from a server are selected
  const areSomeServerToolsSelected = (serverName: string): boolean => {
    const serverTools = groupedTools[serverName] || [];
    return (
      serverTools.some((tool) => selectedTools.has(tool.id)) &&
      !serverTools.every((tool) => selectedTools.has(tool.id))
    );
  };

  // Get counts of selected tools per server
  const getServerSelectedCount = (serverName: string): number => {
    const serverTools = groupedTools[serverName] || [];
    return serverTools.filter((tool) => selectedTools.has(tool.id)).length;
  };

  // Count the number of selected servers (where all tools are selected)
  const selectedServerCount = Object.keys(groupedTools).filter((serverName) =>
    areAllServerToolsSelected(serverName),
  ).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          disabled={disabled}
        >
          <ServerIcon className="h-3.5 w-3.5" />
          MCP Servers
          {selectedServerCount > 0 && (
            <Badge
              variant="secondary"
              className="ml-1 rounded-sm text-xs px-1 font-normal"
            >
              {selectedServerCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="end">
        <Command>
          <CommandInput placeholder="Search MCP servers or tools..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            {loading ? (
              <CommandItem className="gap-2 opacity-60">
                Loading MCP servers...
              </CommandItem>
            ) : error ? (
              <CommandItem className="gap-2 text-destructive">
                Error: {error}
              </CommandItem>
            ) : servers.length === 0 ? (
              <CommandItem className="gap-2 opacity-60">
                No MCP servers configured
              </CommandItem>
            ) : (
              <>
                {servers.map((server) => (
                  <div key={server.id}>
                    <CommandItem
                      key={server.id}
                      onSelect={() => handleSelectServer(server.id)}
                      className="gap-2 font-medium"
                    >
                      <div
                        className={cn(
                          'size-5 flex items-center justify-center rounded-sm border border-primary/20',
                          areAllServerToolsSelected(server.id)
                            ? 'bg-primary text-primary-foreground'
                            : areSomeServerToolsSelected(server.id)
                              ? 'bg-primary/30 text-primary-foreground'
                              : 'opacity-50',
                        )}
                      >
                        {areAllServerToolsSelected(server.id) && (
                          <CheckIcon className="size-3" />
                        )}
                        {areSomeServerToolsSelected(server.id) &&
                          !areAllServerToolsSelected(server.id) && (
                            <div className="w-2 h-2 bg-primary-foreground rounded-sm" />
                          )}
                      </div>
                      <div className="flex items-center gap-2 flex-1">
                        {getServerIcon(server.id, server.icon)}
                        <span>{server.name}</span>
                      </div>
                      <div className="flex items-center">
                        {areSomeServerToolsSelected(server.id) && (
                          <Badge
                            variant="secondary"
                            className="text-[9px] px-1 py-0 h-4 mr-2"
                          >
                            {getServerSelectedCount(server.id)}/
                            {(groupedTools[server.id] || []).length}
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 rounded-sm"
                          onClick={(e) => toggleShowTools(server.id, e)}
                        >
                          <PlusIcon
                            className={cn(
                              'h-3 w-3 transition-transform',
                              showIndividualTools[server.id] && 'rotate-45',
                            )}
                          />
                        </Button>
                      </div>
                    </CommandItem>

                    {/* Show individual tools if expanded */}
                    {showIndividualTools[server.id] &&
                      (groupedTools[server.id] || []).map((tool) => (
                        <CommandItem
                          key={tool.id}
                          onSelect={() => handleSelectTool(tool.id)}
                          className="gap-2 pl-7 text-xs"
                        >
                          <div
                            className={cn(
                              'size-3.5 flex items-center justify-center rounded-sm border border-primary/20',
                              selectedTools.has(tool.id)
                                ? 'bg-primary text-primary-foreground'
                                : 'opacity-50',
                            )}
                          >
                            {selectedTools.has(tool.id) && (
                              <CheckIcon className="size-2" />
                            )}
                          </div>
                          <span>{tool.name}</span>
                        </CommandItem>
                      ))}
                  </div>
                ))}
              </>
            )}
          </CommandList>
          <CommandSeparator />
          <div className="p-2 text-xs text-muted-foreground">
            Click a server to select all its tools, or expand to select
            individual tools
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
