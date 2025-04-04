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

// Contract Fields Types
export interface ContractField {
  id: string;
  user_id: string;
  document_id: string;
  contact_id: string;
  field_name: string;
  field_type: string;
  field_value?: string | null;
  placeholder_text: string;
  position_in_document?: any | null;
  is_required: boolean;
  is_filled: boolean;
  created_at: string;
  updated_at: string;
}

export type ContractFieldInsert = Omit<
  ContractField,
  'created_at' | 'updated_at'
> & {
  created_at?: string;
  updated_at?: string;
};

// Contact Types
export interface Contact {
  id: string;
  user_id: string;
  name: string;
  email?: string | null;
  company?: string | null;
  phone?: string | null;
  created_at: string;
  updated_at: string;
}

export type ContactInsert = Omit<Contact, 'created_at' | 'updated_at'> & {
  created_at?: string;
  updated_at?: string;
};

// Export other types as needed
