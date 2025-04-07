import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { Tables, TablesInsert, TablesUpdate } from '@/supabase/types';
import type { Chat, ChatInsert } from '@/lib/db/schema';

type SaveChatParams = {
  id: string;
  userId: string;
  name: string;
  workspace_id: string;
  model: string;
  prompt: string;
  context_length: number;
  embeddings_provider: string;
  include_profile_context: boolean;
  include_workspace_instructions: boolean;
  temperature: number;
  assistant_id?: string | null;
  folder_id?: string | null;
  sharing?: string;
};

export async function saveChat(params: SaveChatParams) {
  const supabase = await createClient();
  const chatData: ChatInsert = {
    id: params.id,
    user_id: params.userId,
    name: params.name,
    workspace_id: params.workspace_id,
    model: params.model,
    prompt: params.prompt,
    context_length: params.context_length,
    embeddings_provider: params.embeddings_provider,
    include_profile_context: params.include_profile_context,
    include_workspace_instructions: params.include_workspace_instructions,
    temperature: params.temperature,
    ...(params.assistant_id && { assistant_id: params.assistant_id }),
    ...(params.folder_id && { folder_id: params.folder_id }),
    ...(params.sharing && { sharing: params.sharing }),
  };

  try {
    const { error } = await supabase.from('chats').insert(chatData);

    if (error) {
      console.error('Failed to save chat in database:', error);
      throw error;
    }
    return { success: true };
  } catch (error) {
    console.error('Error in saveChat function:', error);
    throw error;
  }
}

export async function deleteChatById({ id }: { id: string }) {
  const supabase = await createClient();
  try {
    const { error: msgError } = await supabase
      .from('messages')
      .delete()
      .eq('chat_id', id);

    if (msgError) {
      console.error('Failed to delete messages for chat:', msgError);
      throw msgError;
    }

    const { error: chatError } = await supabase
      .from('chats')
      .delete()
      .eq('id', id);

    if (chatError) {
      console.error('Failed to delete chat by id from database:', chatError);
      throw chatError;
    }
    return { success: true };
  } catch (error) {
    console.error('Error in deleteChatById function:', error);
    throw error;
  }
}

export async function getChatsByUserId({
  id,
}: { id: string }): Promise<Chat[]> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to get chats by user from database:', error);
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error('Error in getChatsByUserId function:', error);
    throw error;
  }
}

export async function getChatById({
  id,
}: { id: string }): Promise<Chat | null> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Failed to get chat by id from database:', error);
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error in getChatById function:', error);
    throw error;
  }
}

type SharingOption = Tables<'chats'>['sharing'];

export async function updateChatSharingById({
  chatId,
  sharing,
}: {
  chatId: string;
  sharing: SharingOption;
}) {
  const supabase = await createClient();
  try {
    const { error } = await supabase
      .from('chats')
      .update({ sharing })
      .eq('id', chatId);

    if (error) {
      console.error('Failed to update chat sharing in database:', error);
      throw error;
    }
    return { success: true };
  } catch (error) {
    console.error('Error in updateChatSharingById function:', error);
    throw error;
  }
}
