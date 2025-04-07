'use client'; // Assuming this might be used in client components

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import type { Tables } from '@/supabase/types';

type Agent = Tables<'assistants'>;

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    try {
      // TODO: Update API endpoint when created
      const response = await fetch('/api/agents');
      if (!response.ok) {
        throw new Error('Failed to fetch agents');
      }
      const data = await response.json();
      setAgents(data as Agent[]); // Ensure type assertion if necessary
    } catch (error) {
      if (error instanceof Error) {
        toast.error(`Failed to load agents: ${error.message}`);
      } else {
        toast.error('Failed to load agents: An unknown error occurred');
      }
      setAgents([]); // Reset agents on error
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array: fetchAgents function itself doesn't depend on props or state

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]); // Depend on the memoized fetchAgents function

  return { agents, loading, refetchAgents: fetchAgents };
}
