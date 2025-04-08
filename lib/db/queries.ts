import 'server-only';

import {
  createClient,
  auth,
  createServiceRoleClient,
} from '@/lib/supabase/server';
import type { Tables, TablesInsert, TablesUpdate } from '@/supabase/types';
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
  SigningLinkInsert,
  SigningLink,
} from '@/lib/db/schema';
import { JSONValue } from 'ai';

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

// Define explicit ProfileInsert type
type ProfileInsert = TablesInsert<'profiles'>;
type ProfileUpdate = TablesUpdate<'profiles'>;

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
  metadata,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
  metadata?: JSONValue;
}) {
  const supabase = await createClient();
  const documentData: DocumentInsert = {
    id,
    title,
    kind,
    content,
    user_id: userId,
    metadata: metadata as JSONValue,
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
  console.log({ id, timestamp, isoTimestamp });
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
    // Upsert based on unique constraint (document_id, field_name, contact_id)
    const { error } = await supabase
      .from('contract_fields')
      .upsert(contractFields, {
        onConflict: 'document_id, field_name, contact_id',
      });

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
      .select('contact_id, contacts(*)')
      .eq('document_id', documentId);

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

    // flatten the array of arrays
    const contactsData = fieldData
      .flatMap((field) => field.contacts)
      .filter((contact): contact is Contact => !!contact)
      .reduce((acc, contact) => {
        if (!acc.some((c) => c.id === contact.id)) {
          acc.push(contact);
        }
        return acc;
      }, [] as Contact[]);

    return contactsData || [];
  } catch (error) {
    console.error('Error in getContactsForDocument query:', error);
    console.trace();
    return []; // Return empty array on error
  }
}

// --- Signing Link Queries ---

export async function saveSigningLinks({
  signingLinks,
}: {
  signingLinks: Array<SigningLinkInsert>;
}) {
  const supabase = await createClient();
  try {
    // Insert new links. Tokens are generated by the DB default.
    const { data, error } = await supabase
      .from('signing_links')
      .insert(signingLinks)
      .select('token, contact_id'); // Select token and contact_id to return

    if (error) {
      console.error('Failed to save signing links in database:', error);
      throw error;
    }
    // Return the generated tokens mapped to contact_ids or just success
    return { success: true, links: data || [] };
  } catch (error) {
    console.error('Error in saveSigningLinks function:', error);
    throw error;
  }
}

// Fetch data needed for the public signing page
export async function getPublicSigningDataByToken({
  token,
}: { token: string }): Promise<{
  document: Document | null;
  fields: ContractField[];
  contact: Contact | null;
  link: SigningLink | null;
} | null> {
  const supabase = await createClient(); // Client for initial token check (uses anon or user context)

  try {
    // 1. Fetch the signing link using the token (respects signing_links RLS)
    const { data: linkData, error: linkError } = await supabase
      .from('signing_links')
      .select('*, contacts(*)') // Fetch link and associated contact
      .eq('token', token)
      .maybeSingle();

    if (linkError) {
      console.error(
        `Error fetching signing link for token ${token}:`,
        linkError,
      );
      throw linkError;
    }
    if (!linkData) {
      console.log(`No signing link found for token: ${token}`);
      return null; // Link not found
    }

    // 2. Validate the link status and expiration (remains the same)
    if (linkData.status === 'completed' || linkData.status === 'expired') {
      // ... handle completed/expired ...
      return { document: null, fields: [], contact: null, link: linkData };
    }
    if (linkData.expires_at && new Date(linkData.expires_at) < new Date()) {
      // ... handle expired ...
      return { document: null, fields: [], contact: null, link: linkData };
    }

    // 3. Fetch the document content USING SERVICE ROLE (bypasses RLS)
    //    Do this ONLY after validating the token.
    const supabaseService = await createServiceRoleClient();
    const { data: documentData, error: docError } = await supabaseService
      .from('documents')
      .select('*')
      .eq('id', linkData.document_id)
      .order('created_at', { ascending: false })
      .limit(1); // Use single() here as service role should find the unique doc or error

    // Handle document fetch errors (e.g., document deleted)
    if (docError) {
      console.error(
        `Service role error fetching document ${linkData.document_id} for link ${token}:`,
        docError,
      );
      // Throw or return null depending on how you want to handle missing docs
      throw docError;
    }
    // If using single(), error should be thrown if not found. If maybeSingle(), check !documentData
    if (!documentData) {
      console.warn(
        `Document ${linkData.document_id} not found via service role for link ${token}.`,
      );
      return null; // Document genuinely not found
    }

    // 4. Fetch the specific contract fields assigned to this contact
    //    (Using owner's user_id from linkData to respect contract_fields RLS)
    const { data: fieldsData, error: fieldsError } = await supabase // Use regular client again
      .from('contract_fields')
      .select('*')
      .eq('document_id', linkData.document_id)
      .eq('contact_id', linkData.contact_id)
      .eq('user_id', linkData.user_id); // Filter by owner ID from the link

    // ... fieldsError check remains the same ...
    if (fieldsError) {
      console.error(
        `Error fetching fields for contact ${linkData.contact_id} and document ${linkData.document_id}:`,
        fieldsError,
      );
      throw fieldsError;
    }

    // ... rest of the function (extract contact, update status, return) remains the same ...
    const contactDetails = linkData.contacts as Contact | null;
    if (linkData.status === 'pending') {
      await supabase
        .from('signing_links')
        .update({ status: 'viewed', updated_at: new Date().toISOString() })
        .eq('token', token);
    }
    return {
      document: documentData[0],
      fields: fieldsData || [],
      contact: contactDetails,
      link: linkData as SigningLink,
    };
  } catch (error) {
    // ... outer error handling ...
    console.error('Error in getPublicSigningDataByToken function:', error);
    return null;
  }
}

// Function to update the status of a signing link (e.g., to 'completed')
export async function updateSigningLinkStatus({
  token,
  status,
}: {
  token: string;
  status: SigningLink['status'];
}) {
  const supabase = await createClient();
  try {
    const { error } = await supabase
      .from('signing_links')
      .update({ status: status, updated_at: new Date().toISOString() })
      .eq('token', token);

    if (error) {
      console.error(`Error updating status for signing link ${token}:`, error);
      throw error;
    }
    return { success: true };
  } catch (error) {
    console.error('Error in updateSigningLinkStatus:', error);
    throw error;
  }
}

// Batch update contract field values and status
export async function updateContractFieldsBatch({
  fieldUpdates,
  userId, // Include userId to ensure RLS allows the update
  documentId, // Include documentId for potential additional filtering/security
}: {
  fieldUpdates: Array<{ id: string; fieldValue: string | null }>;
  userId: string;
  documentId: string;
}) {
  const supabase = await createClient();
  try {
    // We need to perform multiple updates. Supabase batching via RPC or multiple awaits.
    // Using multiple awaits for simplicity, consider transaction RPC for atomicity if critical.
    const updatePromises = fieldUpdates.map(
      (update) =>
        supabase
          .from('contract_fields')
          .update({
            field_value: update.fieldValue,
            is_filled: true, // Mark as filled upon submission
            updated_at: new Date().toISOString(),
          })
          .eq('id', update.id)
          .eq('user_id', userId) // RLS check: User must own the field
          .eq('document_id', documentId), // Extra check
    );

    const results = await Promise.all(updatePromises);

    // Check for errors in any of the updates
    const errors = results.map((res) => res.error).filter(Boolean);
    if (errors.length > 0) {
      console.error('Error batch updating contract fields:', errors);
      // Combine error messages or handle appropriately
      throw new Error(
        `Failed to update some fields: ${errors.map((e) => e?.message).join('; ')}`,
      );
    }

    console.log(`Successfully updated ${fieldUpdates.length} contract fields.`);
    return { success: true };
  } catch (error) {
    console.error('Error in updateContractFieldsBatch function:', error);
    throw error;
  }
}

// Fetch multiple contacts by their IDs
export async function getContactsByIds({
  ids,
}: { ids: string[] }): Promise<Contact[]> {
  if (!ids || ids.length === 0) {
    return [];
  }
  const supabase = await createClient();
  try {
    // Assuming RLS on contacts allows the authenticated user to fetch contacts
    // they own or are associated with via documents they own.
    // Adjust the query/RLS if different access logic is needed.
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .in('id', ids);

    if (error) {
      console.error('Failed to get contacts by IDs:', error);
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error('Error in getContactsByIds function:', error);
    throw error;
  }
}

// Batch update contact emails
export async function updateContactEmailsBatch({
  emailUpdates, // Array of { id: string; email: string | null }
  userId, // User performing the update (for RLS checks)
}: {
  emailUpdates: Array<{ id: string; email: string | null }>;
  userId: string;
}) {
  const supabase = await createClient();
  try {
    // Perform multiple updates. Consider transaction RPC for atomicity if needed.
    const updatePromises = emailUpdates.map(
      (update) =>
        supabase
          .from('contacts')
          .update({
            email: update.email,
            updated_at: new Date().toISOString(),
          })
          .eq('id', update.id)
          .eq('user_id', userId), // RLS check: User must own the contact
    );

    const results = await Promise.all(updatePromises);

    // Check for errors in any updates
    const errors = results.map((res) => res.error).filter(Boolean);
    if (errors.length > 0) {
      console.error('Error batch updating contact emails:', errors);
      throw new Error(
        `Failed to update some contact emails: ${errors.map((e) => e?.message).join('; ')}`,
      );
    }

    console.log(`Successfully updated ${emailUpdates.length} contact emails.`);
    return { success: true };
  } catch (error) {
    console.error('Error in updateContactEmailsBatch function:', error);
    throw error;
  }
}

// Get all contact IDs associated with fields in a document
export async function getDocumentFieldContacts({
  documentId,
  userId,
}: {
  documentId: string;
  userId: string;
}): Promise<{ contact_id: string }[]> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from('contract_fields')
      .select('contact_id') // Select only the contact_id column
      .eq('document_id', documentId)
      .eq('user_id', userId); // Ensure user owns the fields

    if (error) {
      console.error('Error fetching contacts for document:', error);
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error('Error in getDocumentFieldContacts function:', error);
    throw error;
  }
}

// Get all signing links with associated contact information for a document
export async function getSigningLinksWithContacts({
  documentId,
  userId,
}: {
  documentId: string;
  userId: string;
}) {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from('signing_links')
      .select('*, contacts(id, name, email)')
      .eq('document_id', documentId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching signing links with contacts:', error);
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error('Error in getSigningLinksWithContacts function:', error);
    throw error;
  }
}

// Update a signing link status
export async function updateSigningLinkStatusById({
  id,
  status,
}: {
  id: string;
  status: SigningLink['status'];
}) {
  const supabase = await createClient();
  try {
    const { error } = await supabase
      .from('signing_links')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error(`Error updating status for signing link ID ${id}:`, error);
      throw error;
    }
    return { success: true };
  } catch (error) {
    console.error('Error in updateSigningLinkStatusById:', error);
    throw error;
  }
}

// --- Prompt Queries ---

// Get prompts for the current user
export async function getPromptsByUserId({
  userId,
}: {
  userId: string;
}): Promise<Tables<'prompts'>[]> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from('prompts')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false, nullsFirst: false });

    if (error) {
      console.error('Failed to get prompts by user from database:', error);
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error('Error in getPromptsByUserId function:', error);
    throw error;
  }
}

// Create a new prompt
export async function createPrompt({
  name,
  content,
  userId,
}: {
  name: string;
  content: string;
  userId: string;
}): Promise<Tables<'prompts'>> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from('prompts')
      .insert({
        name,
        content,
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create prompt in database:', error);
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error in createPrompt function:', error);
    throw error;
  }
}

// Update an existing prompt
export async function updatePrompt({
  id,
  name,
  content,
  userId,
}: {
  id: string;
  name: string;
  content: string;
  userId: string;
}): Promise<Tables<'prompts'>> {
  const supabase = await createClient();
  try {
    // First check if the prompt exists and belongs to the user
    const { data: existingPrompt, error: findError } = await supabase
      .from('prompts')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (findError || !existingPrompt) {
      console.error('Prompt not found or permission denied:', findError);
      throw new Error('Prompt not found or permission denied');
    }

    const { data, error } = await supabase
      .from('prompts')
      .update({
        name,
        content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update prompt in database:', error);
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error in updatePrompt function:', error);
    throw error;
  }
}

// Delete a prompt
export async function deletePrompt({
  id,
  userId,
}: {
  id: string;
  userId: string;
}): Promise<{ success: boolean }> {
  const supabase = await createClient();
  try {
    const { error } = await supabase
      .from('prompts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to delete prompt from database:', error);
      throw error;
    }
    return { success: true };
  } catch (error) {
    console.error('Error in deletePrompt function:', error);
    throw error;
  }
}

// Get profile data for a user
export async function getUserProfile({ userId }: { userId: string }) {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        display_name,
        image_url,
        image_path,
        profile_context,
        system_prompt_template,
        large_text_paste_threshold,
        bio,
        has_onboarded,
        use_azure_openai,
        username,
        plan,
        model_visibility
      `)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile data:', error);
      throw error;
    }

    return data || {};
  } catch (error) {
    console.error('Error in getUserProfile function:', error);
    throw error;
  }
}

// Update profile data for a user
export async function updateUserProfile({
  userId,
  profileData,
}: {
  userId: string;
  profileData: Partial<ProfileUpdate>;
}) {
  const supabase = await createClient();
  try {
    // Get existing profile data to ensure we're not removing required fields
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Only include fields that were explicitly provided in the request
    // This prevents overriding fields that weren't meant to be updated
    const updateData: ProfileUpdate = {
      updated_at: new Date().toISOString(),
    };

    // Handle required fields with checks to make sure they're never null
    if (profileData.image_url !== undefined) {
      updateData.image_url =
        profileData.image_url ||
        existingProfile?.image_url ||
        'https://www.gravatar.com/avatar/?d=mp';
    }

    if (profileData.image_path !== undefined) {
      updateData.image_path =
        profileData.image_path || existingProfile?.image_path || 'default.png';
    }

    // Only add other fields to the update if they were explicitly provided
    if (profileData.display_name !== undefined)
      updateData.display_name = profileData.display_name;
    if (profileData.profile_context !== undefined)
      updateData.profile_context = profileData.profile_context;
    if (profileData.system_prompt_template !== undefined)
      updateData.system_prompt_template = profileData.system_prompt_template;
    if (profileData.large_text_paste_threshold !== undefined)
      updateData.large_text_paste_threshold =
        profileData.large_text_paste_threshold;
    if (profileData.model_visibility !== undefined)
      updateData.model_visibility = profileData.model_visibility;
    if (profileData.bio !== undefined) updateData.bio = profileData.bio;
    if (profileData.has_onboarded !== undefined)
      updateData.has_onboarded = profileData.has_onboarded;
    if (profileData.use_azure_openai !== undefined)
      updateData.use_azure_openai = profileData.use_azure_openai;
    if (profileData.username !== undefined)
      updateData.username = profileData.username;
    if (profileData.plan !== undefined) updateData.plan = profileData.plan;

    // Add all other fields that might be in the profiles table
    Object.keys(profileData).forEach((key) => {
      if (
        key !== 'user_id' &&
        key !== 'id' &&
        key !== 'created_at' &&
        updateData[key as keyof ProfileUpdate] === undefined
      ) {
        (updateData as any)[key] = (profileData as any)[key];
      }
    });

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('user_id', userId);

    if (error) {
      console.error('Error saving profile data:', error);
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Error in updateUserProfile function:', error);
    throw error;
  }
}

// Delete a user account
export async function deleteUserAccount({ userId }: { userId: string }) {
  const supabase = await createServiceRoleClient();
  try {
    // Delete the user's auth account with cascade enabled
    const { error } = await supabase.auth.admin.deleteUser(userId, true);

    if (error) {
      console.error('Error deleting user account:', error);
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Error in deleteUserAccount function:', error);
    throw error;
  }
}
