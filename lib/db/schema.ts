// Types exported for use in the application
import type { Tables, TablesInsert } from '@/supabase/types';

// Define Vote type from the Supabase 'votes' table
export type Vote = Tables<'votes'>;
export type Chat = Tables<'chats'>;
export type Message = Tables<'messages'>;
export type ChatInsert = TablesInsert<'chats'>;
export type MessageInsert = TablesInsert<'messages'>;
export type DocumentInsert = TablesInsert<'documents'>;
export type SuggestionInsert = TablesInsert<'suggestions'>;
export type Document = Tables<'documents'>;
export type Suggestion = Tables<'suggestions'>;

// Export other types as needed 