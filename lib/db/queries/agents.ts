import { createClient } from '@/lib/supabase/server';
import type { Tables, TablesInsert } from '@/supabase/types';

export type Agent = Tables<'assistants'>;
export type AgentInsert = TablesInsert<'assistants'>;

export async function getAgentsForUser(userId: string, workspaceId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_assistants_for_user', {
    p_user_id: userId,
    p_workspace_id: workspaceId,
  });

  if (error) {
    console.error('Error fetching agents:', error);
    throw error;
  }

  return data || [];
}

export async function createAgent(agent: AgentInsert, workspaceId: string) {
  const supabase = await createClient();

  // First insert the assistant
  const { data: assistant, error: assistantError } = await supabase
    .from('assistants')
    .insert(agent)
    .select()
    .single();

  if (assistantError) {
    console.error('Error creating assistant:', assistantError);
    throw assistantError;
  }

  // Then create the workspace association
  const { error: workspaceError } = await supabase
    .from('assistant_workspaces')
    .insert({
      assistant_id: assistant.id,
      workspace_id: workspaceId,
      user_id: agent.user_id,
    });

  if (workspaceError) {
    console.error(
      'Error associating assistant with workspace:',
      workspaceError,
    );
    // Try to rollback the assistant creation
    await supabase.from('assistants').delete().eq('id', assistant.id);
    throw workspaceError;
  }

  return assistant;
}

export async function updateAgent(id: string, agent: Partial<Agent>) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('assistants')
    .update(agent)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating agent:', error);
    throw error;
  }

  return data;
}

export async function deleteAgent(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('assistants').delete().eq('id', id);

  if (error) {
    console.error('Error deleting agent:', error);
    throw error;
  }

  return true;
}
