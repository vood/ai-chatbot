'use client';

import { Button } from '@/components/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SparklesIcon } from '@/components/icons';
import { AgentCard } from './agent-card';
import type { Tables } from '@/supabase/types';

type Agent = Tables<'assistants'>;

interface AgentListProps {
  agents: Agent[];
  loading: boolean;
  onAddAgent: () => void;
  onEditAgent: (agent: Agent) => void;
}

export function AgentList({
  agents,
  loading,
  onAddAgent,
  onEditAgent,
}: AgentListProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={`skeleton-item-${index}-${Date.now()}`}
            className="flex flex-col items-center text-center p-4 rounded-lg border bg-card/50"
          >
            <Skeleton className="w-10 h-10 rounded-full mb-2" />
            <Skeleton className="h-5 w-3/4 mb-1" />
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-5/6 mb-3" />
            <Skeleton className="h-8 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-10 border border-dashed rounded-lg">
        <div className="mb-4 p-3 rounded-full bg-secondary/20 text-secondary-foreground">
          <SparklesIcon size={48} />
        </div>
        <h3 className="font-medium mb-2">No agents yet</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Create your first agent to quickly reuse in chats.
        </p>
        <Button onClick={onAddAgent}>Create an Agent</Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {agents.map((agent) => (
        <AgentCard key={agent.id} agent={agent} onClick={onEditAgent} />
      ))}
    </div>
  );
}
