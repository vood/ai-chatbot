import 'server-only';

import { createClient, auth } from '@/lib/supabase/server';
import type { Tables } from '@/supabase/types';
import type { ArtifactKind } from '@/components/artifact';
import type {
  Chat,
  Message,
  Document,
  Suggestion,
  ChatInsert,
  MessageInsert,
  DocumentInsert,
  SuggestionInsert,
  Vote,
  ContractField,
  ContractFieldInsert,
  Contact,
  ContactInsert,
} from '@/lib/db/schema';

// Define concrete types based on schema

// Type for saveChat parameters, derived from generated types excluding defaults like id, created_at
// type SaveChatParams = Omit<ChatInsert, 'id' | 'created_at' | 'user_id'> & { id: string; userId: string };
// Simpler explicit type for clarity:
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
  // Add other optional fields from ChatInsert if needed (e.g., assistant_id, folder_id, sharing)
  assistant_id?: string | null;
  folder_id?: string | null;
  sharing?: string; // Default is 'private' in schema, but can be overridden
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
    // Optional fields
    ...(params.assistant_id && { assistant_id: params.assistant_id }),
    ...(params.folder_id && { folder_id: params.folder_id }),
    ...(params.sharing && { sharing: params.sharing }),
    // created_at is handled by default in Supabase or trigger
  };

  try {
    const { error } = await supabase.from('chats').insert(chatData);

    if (error) {
      console.error('Failed to save chat in database:', error);
      throw error;
    }
    // Optionally return the inserted data or just success
    return { success: true };
  } catch (error) {
    // Catch potential errors from createClient() or network issues
    console.error('Error in saveChat function:', error);
    throw error;
  }
}

export async function deleteChatById({ id }: { id: string }) {
  const supabase = await createClient();
  try {
    // Delete associated messages first (consider RLS/policies for cascade)
    const { error: msgError } = await supabase
      .from('messages')
      .delete()
      .eq('chat_id', id);

    if (msgError) {
      console.error('Failed to delete messages for chat:', msgError);
      // Decide whether to proceed or throw error
      throw msgError;
    }

    // Delete the chat
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
      .single(); // Use single() to get one record or null

    if (error && error.code !== 'PGRST116') {
      // Ignore 'No rows found' error from .single()
      console.error('Failed to get chat by id from database:', error);
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error in getChatById function:', error);
    throw error;
  }
}

// Use the generated Insert type for messages
export async function saveMessages({
  messages,
}: {
  messages: Array<MessageInsert>; // Use the generated Insert type
}) {
  const supabase = await createClient();
  // Assume input 'messages' array already conforms to MessageInsert structure
  // If not, map it here like before, ensuring all required fields exist.
  // Example minimal mapping if input is slightly different:
  const formattedMessages = messages.map((msg) => ({
    ...msg, // Spread existing valid fields
    // Ensure required fields are present, potentially setting defaults if needed
    // id: msg.id, // Usually generated by DB or provided
    // chat_id: msg.chat_id, // Must be provided
    // user_id: msg.user_id, // Must be provided
    // role: msg.role, // Must be provided
    // content: msg.content, // Must be provided
    // model: msg.model, // Must be provided
    // sequence_number: msg.sequence_number, // Must be provided
    image_paths: msg.image_paths || [], // Ensure array type
    // created_at: msg.created_at || new Date().toISOString(), // Handled by DB default/trigger
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

// --- Restored Document and Suggestion Queries (Using Supabase Client) ---

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  const supabase = await createClient();
  const documentData: DocumentInsert = {
    id,
    title,
    kind,
    content,
    user_id: userId,
    created_at: new Date().toISOString(),
    // created_at handled by DB
  };
  try {
    const { error } = await supabase.from('documents').insert(documentData);
    if (error) {
      console.error('Failed to save document in database:', error);
      throw error;
    }
    return { success: true };
  } catch (error) {
    console.error('Error in saveDocument function:', error);
    throw error;
  }
}

// Note: Original function returned array, keeping that behavior
export async function getDocumentsById({
  id,
}: { id: string }): Promise<Document[]> {
  const supabase = await createClient();
  try {
    // Assuming we want all versions/entries with the same document ID?
    // If ID is unique primary key, this might just return one or zero.
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .order('created_at', { ascending: true }); // Original had asc sorting

    if (error) {
      console.error('Failed to get document by id from database', error);
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error('Error in getDocumentsById function:', error);
    throw error;
  }
}

// Note: Original function returned single item, keeping that behavior
export async function getDocumentById({
  id,
}: { id: string }): Promise<Document | null> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .order('created_at', { ascending: false })
      .limit(1); // Original had desc sorting, but .single() doesn't need order

    if ((data && data.length === 0) || error) {
      console.error('Failed to get document by id from database:', error);
      throw error;
    }
    return data[0];
  } catch (error) {
    console.error('Error in getDocumentById function:', error);
    throw error;
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  const supabase = await createClient();
  const isoTimestamp = timestamp.toISOString();
  try {
    // First, delete related suggestions (assuming document_id is FK)
    // Original Drizzle code used documentcreated_at, mapped to document_created_at here
    // If document_created_at doesn't exist on suggestions, adjust the condition
    await supabase
      .from('suggestions')
      .delete()
      .eq('document_id', id)
      .gt('document_created_at', isoTimestamp); // Check if suggestions has this timestamp

    // Delete documents matching the ID created *after* the timestamp
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id)
      .gt('created_at', isoTimestamp);

    if (error) {
      console.error(
        'Failed to delete documents by id after timestamp from database:',
        error,
      );
      throw error;
    }
    return { success: true };
  } catch (error) {
    console.error(
      'Error in deleteDocumentsByIdAfterTimestamp function:',
      error,
    );
    throw error;
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<SuggestionInsert>; // Use placeholder Insert type
}) {
  const supabase = await createClient();
  // Assume input `suggestions` array conforms to SuggestionInsert structure
  // Add mapping logic here if needed
  try {
    const { error } = await supabase.from('suggestions').insert(suggestions);
    if (error) {
      console.error('Failed to save suggestions in database:', error);
      throw error;
    }
    return { success: true };
  } catch (error) {
    console.error('Error in saveSuggestions function:', error);
    throw error;
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}): Promise<Suggestion[]> {
  // Use placeholder type
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from('suggestions')
      .select('*')
      .eq('document_id', documentId);
    // Add ordering if needed, e.g., .order('created_at', { ascending: true });

    if (error) {
      console.error(
        'Failed to get suggestions by document id from database:',
        error,
      );
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error('Error in getSuggestionsByDocumentId function:', error);
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

// Assuming 'sharing' column exists and accepts these values
type SharingOption = Tables<'chats'>['sharing']; // Get allowed values from schema

export async function updateChatSharingById({
  chatId,
  sharing,
}: {
  chatId: string;
  sharing: SharingOption; // Use the type derived from the schema
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

// --- Added Helper ---
// Example function to get the profile for the currently authenticated user
export async function getCurrentUserProfile() {
  const supabase = await createClient();
  const user = await auth(); // Use the auth helper from server.ts
  if (!user) {
    console.log('No authenticated user found.');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id) // Use 'user_id' which is the foreign key to auth.users
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user profile:', error.message);
      throw error;
    }
    return data; // Returns the profile row or null
  } catch (error) {
    console.error('Error in getCurrentUserProfile function:', error);
    throw error;
  }
}

/**
 * Gets the display name of the currently authenticated user.
 * Returns the display name if found, or a fallback value if not available.
 */
export async function getCurrentUserDisplayName(
  fallback = 'there',
): Promise<string> {
  try {
    const profile = await getCurrentUserProfile();
    return profile?.display_name || fallback;
  } catch (error) {
    console.error('Error getting user display name:', error);
    return fallback;
  }
}

export async function getVotesByChatId({
  id,
}: { id: string }): Promise<Vote[]> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from('votes')
      .select('*')
      .eq('chat_id', id);

    if (error) {
      console.error('Failed to get votes by chat id from database:', error);
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error('Error in getVotesByChatId function:', error);
    throw error;
  }
}

export async function voteMessage({
  chat_id,
  message_id,
  type,
}: {
  chat_id: string;
  message_id: string;
  type: 'up' | 'down';
}) {
  const supabase = await createClient();
  try {
    const { error } = await supabase.from('votes').upsert(
      {
        chat_id: chat_id,
        message_id: message_id,
        type,
        is_upvoted: type === 'up',
      },
      {
        onConflict: 'chat_id,message_id',
      },
    );

    if (error) {
      console.error('Failed to vote message in database:', error);
      throw error;
    }
    return { success: true };
  } catch (error) {
    console.error('Error in voteMessage function:', error);
    throw error;
  }
}

export async function saveContractFields({
  contractFields,
}: {
  contractFields: Array<ContractFieldInsert>;
}) {
  const supabase = await createClient();
  try {
    const { error } = await supabase
      .from('contract_fields')
      .insert(contractFields);
    if (error) {
      console.error('Failed to save contract fields in database:', error);
      throw error;
    }
    return { success: true };
  } catch (error) {
    console.error('Error in saveContractFields function:', error);
    throw error;
  }
}

export async function getContractFieldsByDocumentId({
  documentId,
  userId,
}: {
  documentId: string;
  userId?: string;
}): Promise<ContractField[]> {
  const supabase = await createClient();
  try {
    let query = supabase
      .from('contract_fields')
      .select('*')
      .eq('document_id', documentId);

    // Add user_id filter if provided
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.order('created_at', {
      ascending: true,
    });

    if (error) {
      console.error(
        'Failed to get contract fields by document id from database:',
        error,
      );
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error('Error in getContractFieldsByDocumentId function:', error);
    throw error;
  }
}

export async function getContractFieldsByContactId({
  contactId,
  userId,
}: {
  contactId: string;
  userId?: string;
}): Promise<ContractField[]> {
  const supabase = await createClient();
  try {
    let query = supabase
      .from('contract_fields')
      .select('*')
      .eq('contact_id', contactId);

    // Add user_id filter if provided
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.order('created_at', {
      ascending: true,
    });

    if (error) {
      console.error(
        'Failed to get contract fields by contact id from database:',
        error,
      );
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error('Error in getContractFieldsByContactId function:', error);
    throw error;
  }
}

export async function updateContractField({
  id,
  fieldValue,
  isFilled = true,
  userId,
}: {
  id: string;
  fieldValue: string;
  isFilled?: boolean;
  userId: string;
}) {
  const supabase = await createClient();
  try {
    const { error } = await supabase
      .from('contract_fields')
      .update({
        field_value: fieldValue,
        is_filled: isFilled,
        user_id: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Failed to update contract field in database:', error);
      throw error;
    }
    return { success: true };
  } catch (error) {
    console.error('Error in updateContractField function:', error);
    throw error;
  }
}

export async function updateDocumentContent({
  id,
  content,
}: {
  id: string;
  content: string;
}) {
  const supabase = await createClient();
  try {
    const { error } = await supabase
      .from('documents')
      .update({
        content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Failed to update document content in database:', error);
      throw error;
    }
    return { success: true };
  } catch (error) {
    console.error('Error in updateDocumentContent function:', error);
    throw error;
  }
}

// --- Fetch Contacts Associated with a Document ---
export async function getContactsForDocument({
  documentId,
}: {
  documentId: string;
}): Promise<Array<Pick<Contact, 'id' | 'name'>>> {
  // Return only id and name
  if (!documentId || documentId === 'init') {
    return [];
  }

  const supabase = await createClient();

  try {
    // Step 1: Find distinct non-null contact_ids associated with the document
    // We need to query contract_fields table for this.
    const { data: fieldData, error: fieldError } = await supabase
      .from('contract_fields')
      .select('contact_id')
      .eq('document_id', documentId)
      .neq('contact_id', null); // Ensure contact_id is not null

    if (fieldError) {
      console.error(
        'Error fetching contact_ids from contract_fields:',
        fieldError,
      );
      throw fieldError;
    }

    if (!fieldData || fieldData.length === 0) {
      return []; // No associated contacts found
    }

    // Extract unique, non-null contact IDs
    const distinctContactIds = [
      ...new Set(
        fieldData
          .map((field) => field.contact_id)
          .filter((id): id is string => !!id),
      ),
    ];

    if (distinctContactIds.length === 0) {
      return [];
    }

    // Step 2: Fetch contact details for these unique IDs
    const { data: contactsData, error: contactsError } = await supabase
      .from('contacts')
      .select('id, name') // Select only id and name
      .in('id', distinctContactIds);

    if (contactsError) {
      console.error('Error fetching contact details:', contactsError);
      throw contactsError;
    }

    return contactsData || [];
  } catch (error) {
    console.error('Error in getContactsForDocument query:', error);
    return []; // Return empty array on error
  }
}
