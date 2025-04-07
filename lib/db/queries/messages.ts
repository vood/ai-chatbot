import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { Message, MessageInsert } from '@/lib/db/schema';

export async function saveMessages({
  messages,
}: {
  messages: Array<MessageInsert>;
}) {
  const supabase = await createClient();
  const formattedMessages = messages.map((msg) => ({
    ...msg,
    image_paths: msg.image_paths || [],
  }));

  try {
    const { error } = await supabase.from('messages').insert(formattedMessages);
    if (error) {
      console.error('Failed to save messages in database:', error);
      throw error;
    }
    return { success: true };
  } catch (error) {
    console.error('Error in saveMessages function:', error);
    throw error;
  }
}

export async function getMessagesByChatId({
  id,
}: { id: string }): Promise<Message[]> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to get messages by chat id from database', error);
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error('Error in getMessagesByChatId function:', error);
    throw error;
  }
}

export async function getMessageById({
  id,
}: { id: string }): Promise<Message | null> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Failed to get message by id from database:', error);
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error in getMessageById function:', error);
    throw error;
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  const supabase = await createClient();
  try {
    const isoTimestamp = timestamp.toISOString();
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('chat_id', chatId)
      .gte('created_at', isoTimestamp);

    if (error) {
      console.error(
        'Failed to delete messages by id after timestamp from database:',
        error,
      );
      throw error;
    }
    return { success: true };
  } catch (error) {
    console.error(
      'Error in deleteMessagesByChatIdAfterTimestamp function:',
      error,
    );
    throw error;
  }
}
