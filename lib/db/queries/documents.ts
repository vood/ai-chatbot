import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { Document, DocumentInsert } from '@/lib/db/schema';
import type { ArtifactKind } from '@/components/artifact';

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

export async function getDocumentsById({
  id,
}: { id: string }): Promise<Document[]> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .order('created_at', { ascending: true });

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
      .limit(1);

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
    await supabase
      .from('suggestions')
      .delete()
      .eq('document_id', id)
      .gt('document_created_at', isoTimestamp);

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
