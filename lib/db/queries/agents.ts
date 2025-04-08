import type { KnowledgeFile } from '@/app/(main)/agents/components/agent-form';
import { createClient } from '@/lib/supabase/server';
import type { Tables, TablesInsert } from '@/supabase/types';

export type Agent = Tables<'assistants'>;
export type AgentInsert = TablesInsert<'assistants'>;
export type FileInsert = TablesInsert<'files'>;
export type AssistantFile = TablesInsert<'assistant_files'>;

export async function getAgentsForUser(userId: string, workspaceId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('assistant_workspaces')
    .select('*, assistants(*, assistant_files(*, files(*)))')
    .eq('user_id', userId)
    .eq('workspace_id', workspaceId);

  if (error) {
    console.error('Error fetching agents:', error);
    throw error;
  }

  return (
    data
      .flatMap((workspace) => workspace.assistants)
      .map((assistant) => ({
        ...assistant,
        files: assistant.assistant_files.flatMap((file) => file.files),
      })) || []
  );
}

// Function to create a file record in the database
export async function createFileRecord(
  fileData: FileInsert,
  workspaceId: string,
) {
  const supabase = await createClient();

  // Insert the file record
  const { data: file, error: fileError } = await supabase
    .from('files')
    .insert(fileData)
    .select()
    .single();

  if (fileError) {
    console.error('Error creating file record:', fileError);
    throw fileError;
  }

  // Create the workspace association
  const { error: workspaceError } = await supabase
    .from('file_workspaces')
    .insert({
      file_id: file.id,
      workspace_id: workspaceId,
      user_id: fileData.user_id,
    });

  if (workspaceError) {
    console.error('Error associating file with workspace:', workspaceError);
    throw workspaceError;
  }

  console.log('File created:', file);

  return file;
}

// Function to link files to an assistant
export async function associateFilesWithAssistant(
  assistantId: string,
  fileIds: string[],
  userId: string,
) {
  if (!fileIds.length) return [];

  const supabase = await createClient();

  // Create the assistant-file relationships
  const assistantFiles = fileIds.map((fileId) => ({
    assistant_id: assistantId,
    file_id: fileId,
    user_id: userId,
  }));

  const { data, error } = await supabase
    .from('assistant_files')
    .insert(assistantFiles)
    .select();

  if (error) {
    console.error(
      'Error associating files with assistant:',
      error,
      fileIds,
      assistantId,
      userId,
    );
    throw error;
  }

  return data || [];
}

export async function createAgent(
  agent: AgentInsert,
  workspaceId: string,
  fileIds: string[] = [],
) {
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

  // Associate files with the assistant if any
  if (fileIds.length > 0) {
    try {
      await associateFilesWithAssistant(assistant.id, fileIds, agent.user_id);
    } catch (error) {
      console.error('Error associating files with assistant:', error);
      // We don't rollback assistant creation if files fail to link
      // but log it as an error
    }
  }

  return assistant;
}

export async function updateAgent(
  id: string,
  agent: Partial<Agent>,
  fileIds: string[] = [],
) {
  const supabase = await createClient();

  // Update the assistant
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

  // If file IDs provided, update file associations
  if (fileIds.length > 0) {
    try {
      // First delete existing file associations
      const { error: deleteError } = await supabase
        .from('assistant_files')
        .delete()
        .eq('assistant_id', id);

      if (deleteError) {
        console.error(
          'Error removing existing file associations:',
          deleteError,
        );
        throw deleteError;
      }

      // Then create new associations
      await associateFilesWithAssistant(
        id,
        fileIds,
        agent.user_id || data.user_id,
      );
    } catch (error) {
      console.error('Error updating file associations:', error);
      // We don't rollback the agent update if file associations fail
      // but log it as an error
    }
  }

  return data;
}

export async function deleteAgent(id: string) {
  const supabase = await createClient();

  // Delete file associations first
  const { error: fileAssocError } = await supabase
    .from('assistant_files')
    .delete()
    .eq('assistant_id', id);

  if (fileAssocError) {
    console.error('Error deleting file associations:', fileAssocError);
    // We continue with deletion even if this fails
  }

  // Delete the assistant
  const { error } = await supabase.from('assistants').delete().eq('id', id);

  if (error) {
    console.error('Error deleting agent:', error);
    throw error;
  }

  return true;
}

export async function getAgentById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('assistants')
    .select('*, assistant_files(*, files(*))')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching agent by ID:', error);
    throw error;
  }

  return data
    ? {
        ...data,
        files: data.assistant_files?.flatMap((file) => file.files) || [],
      }
    : null;
}
