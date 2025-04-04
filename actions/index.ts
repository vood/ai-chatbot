'use server';

// Remove db imports and drizzle imports if no longer needed here
// import { db } from '@/db';
// import { ContractField as contractFieldsTable, Contact as contactsTable } from '@/lib/db/schema';
// import { eq, sql, inArray } from 'drizzle-orm';

// Import the query function
import { getContactsForDocument as getContactsForDocumentQuery } from '@/lib/db/queries';

export async function getContractFields({
  documentId,
}: { documentId: string }) {
  // ... existing implementation ...
}

export async function getSuggestions({ documentId }: { documentId: string }) {
  // ... existing implementation ...
}

// --- Action now calls the query function ---
export async function getContactsForDocument({
  documentId,
}: {
  documentId: string;
}): Promise<Array<{ id: string; name: string | null }>> {
  // Directly call the query function from queries.ts
  return getContactsForDocumentQuery({ documentId });
}
