import { z } from 'zod';
import { type DataStreamWriter, streamObject, streamText, tool } from 'ai';
import { getDocumentById, saveContractFields } from '@/lib/db/queries';
import { generateUUID } from '@/lib/utils';
import { myProvider } from '../providers';
import type { ContractFieldInsert, ContactInsert } from '@/lib/db/schema';
import { textDocumentHandler } from '@/artifacts/text/server';
import { createClient } from '@/lib/supabase/server';

interface RequestContractFieldsProps {
  user: { id?: string };
  dataStream: DataStreamWriter;
}

// Define the annotation position interface for context-based positioning
export interface DocumentAnnotationPosition {
  placeholder: string; // The exact placeholder text (e.g. "[Signature]")
  prefix: string; // Text before the field (for context)
  suffix: string; // Text after the field (for context)
  context?: string; // Optional section or paragraph identifier
}

// Define the contract field definition interface
export interface ContractFieldDefinition {
  id: string;
  document_id: string;
  contact_id: string;
  user_id: string;
  field_name: string;
  field_type: string;
  is_required: boolean;
  is_filled: boolean;
  field_value?: string | null;
}

// Define the contract field occurrence interface
export interface ContractFieldOccurrence {
  id: string;
  field_definition_id: string;
  placeholder_text: string;
  position: DocumentAnnotationPosition;
}

// Combined interface for working with both definition and occurrence
export interface ContractFieldAnnotation {
  definition: ContractFieldDefinition;
  occurrences: ContractFieldOccurrence[];
}

// Define serializable versions of our interfaces for sending to the client
export interface SerializableDocumentAnnotationPosition {
  placeholder: string;
  prefix: string;
  suffix: string;
  context?: string;
}

export interface SerializableFieldDefinition {
  id: string;
  document_id: string;
  contact_id: string;
  user_id: string;
  field_name: string;
  field_type: string;
  is_required: boolean;
  is_filled: boolean;
}

export interface SerializableFieldOccurrence {
  id: string;
  field_definition_id: string;
  placeholder_text: string;
  position: SerializableDocumentAnnotationPosition;
}

export const requestContractFields = ({
  user,
  dataStream,
}: RequestContractFieldsProps) =>
  tool({
    description: `Request contract fields for a document for digital signing.

The tool identifies or adds placeholders for contract fields like [Name], [Company], etc. and extracts them as structured data.
It returns an updated document with field placeholders and metadata for each field.
    `,
    parameters: z.object({
      documentId: z
        .string()
        .describe('The ID of the document to extract contract fields from'),
    }),
    execute: async ({ documentId }) => {
      console.log(
        `Starting contract fields extraction for document: ${documentId}`,
      );

      const document = await getDocumentById({ id: documentId });

      if (!document || !document.content) {
        console.error(`Document not found or has no content: ${documentId}`);
        return {
          error: 'Document not found',
        };
      }

      console.log(`Retrieved document: ${document.title} (${document.id})`);

      // First, check if we need to generate field placeholders or just detect existing ones
      const hasExistingPlaceholders = /\[([^\]]+)\]/.test(document.content);
      console.log(
        `Document has existing placeholders: ${hasExistingPlaceholders}`,
      );

      const updatedContent = document.content;

      // If no placeholders exist, use AI to suggest and add appropriate fields
      // if (!hasExistingPlaceholders) {
      console.log('No placeholders found, preparing to add fields with AI');
      // Generate an updated document with field placeholders
      const prompt = `You are a document field analyzer for digital signatures. Please identify where name, email, company, signature fields, etc. should be added for each party involved.
            Add placeholders in the format [Field Name] at appropriate locations in the document. 
            Make sure to distinguish fields for different parties (e.g., [Company Name - Client], [Signature - Vendor]).
            Return only the document with the added field placeholders, with no additional explanation.
            Do not modify the document content, only add fields.

            The placeholders must be always plain text, not decorated with bold, italic, underline, etc.

            If the document does not need any fields, return the original document content, and a message saying "No fields needed".
            `;

      // Save the updated content to the database using documentHandler
      if (updatedContent !== document.content) {
        console.log('Content updated with field placeholders, saving changes');
        // Create a temporary DataStream for the update operation
        const tempDataStream = {
          writeData: (data: any) => {
            // Pass through important updates to the main dataStream
            if (data.type === 'text-delta') {
              dataStream.writeData(data);
            }
          },
        } as DataStreamWriter;

        // Update the document with the enhanced content
        await textDocumentHandler.onUpdateDocument({
          document,
          description: prompt,
          dataStream: tempDataStream,
          user,
        });

        console.log('Document updated with signature fields');

        // Send the updated document to the client
        dataStream.writeData({
          type: 'updatedDocument',
          content: {
            id: documentId,
            content: updatedContent,
          },
        });
      }
      // }

      const contractFields: Array<ContractFieldInsert> = [];

      console.log('Starting to extract fields from content using AI');
      // Now extract the fields from the updated content
      const { elementStream } = streamObject({
        model: myProvider.languageModel('artifact-model'),
        system: `You are a document analysis assistant. Given a document, 
          identify all placeholder fields that are formatted like [Field Name]. 
          For each field, identify its type (name, email, company, address, phone, date, signature) and assign it to the appropriate contact/signer. 
          If there are multiple signers mentioned, distinguish between them (e.g., client, vendor, etc.).
          
          For each field, you MUST extract:
          1. The exact placeholder text with brackets (e.g. "[Signature]")
          2. The context around the field (text before and after) to help locate it precisely
          3. The field type and assignment to the correct signer
          
          Return structured data for each field with its metadata.`,
        prompt: updatedContent,
        output: 'array',
        schema: z.object({
          field_name: z
            .string()
            .describe('The name of the field (e.g., "Company Name", "Email")'),
          field_type: z
            .string()
            .describe(
              'The type of field (e.g., "email", "name", "company", "address", "phone", "date", "signature")',
            ),
          placeholder_text: z
            .string()
            .describe(
              'The exact placeholder text found in document including brackets (e.g., "[Company Name]")',
            ),
          signer_reference: z
            .string()
            .describe(
              'Reference to which signer/contact this field belongs to (e.g., "Signer 1", "Client", "Vendor")',
            ),
          prefix: z
            .string()
            .describe(
              'Up to 30 characters of text immediately before the placeholder',
            ),
          suffix: z
            .string()
            .describe(
              'Up to 30 characters of text immediately after the placeholder',
            ),
          context: z
            .string()
            .optional()
            .describe(
              'Brief description of paragraph/section where field appears (optional)',
            ),
          is_required: z
            .boolean()
            .describe('Whether this field is required to be filled'),
        }),
      });

      // Create a map to track contact IDs for each signer reference
      const signerReferenceMap = new Map<string, string>();
      // Create a map to track field definitions by field name and contact
      const fieldDefinitionMap = new Map<string, ContractFieldInsert>();
      // Array to store contact records for database
      const contacts: ContactInsert[] = [];

      console.log('Processing field elements from AI stream');
      // Create arrays to store our new model
      const fieldDefinitions: Array<ContractFieldInsert> = [];
      const fieldOccurrences: Array<any> = [];

      for await (const element of elementStream) {
        console.log(
          `Processing field: ${element.field_name}, type: ${element.field_type}, signer: ${element.signer_reference}`,
        );

        // Generate or get consistent contact ID for each signer reference
        if (!signerReferenceMap.has(element.signer_reference)) {
          const newContactId = generateUUID();
          signerReferenceMap.set(element.signer_reference, newContactId);

          // Create a new contact record
          const contact: ContactInsert = {
            id: newContactId,
            user_id: user.id || '',
            name: element.signer_reference,
            email: null,
            company: null,
            phone: null,
            // Remove the fields that don't exist in ContactInsert
            // document_id: documentId,
            // address: null,
            // role: 'signer',
          };

          contacts.push(contact);
          console.log(
            `Created new contact for ${element.signer_reference}: ${newContactId}`,
          );
        }

        const contactId =
          signerReferenceMap.get(element.signer_reference) || generateUUID();

        // Create position object based on context
        const position: DocumentAnnotationPosition = {
          placeholder: element.placeholder_text,
          prefix: element.prefix,
          suffix: element.suffix,
          context: element.context,
        };

        // Generate a unique key for this field definition based on field name and contact
        const fieldDefKey = `${element.field_name}|${contactId}`;

        // Check if we already have this field definition
        let fieldDefinition: ContractFieldInsert;

        if (!fieldDefinitionMap.has(fieldDefKey)) {
          // Create a new field definition
          fieldDefinition = {
            id: generateUUID(),
            user_id: user.id || '',
            document_id: documentId,
            contact_id: contactId,
            field_name: element.field_name,
            field_type: element.field_type,
            placeholder_text: element.placeholder_text, // Required by ContractFieldInsert type
            position_in_document: {
              // Required by ContractFieldInsert type
              type: 'definition',
              field_name: element.field_name,
            },
            is_required: element.is_required,
            is_filled: false,
          };

          // Add to our tracking maps and arrays
          fieldDefinitionMap.set(fieldDefKey, fieldDefinition);
          fieldDefinitions.push(fieldDefinition);

          console.log(
            `Created new field definition with ID: ${fieldDefinition.id}`,
          );
        } else {
          // Use existing field definition
          fieldDefinition = fieldDefinitionMap.get(fieldDefKey)!;
          console.log(`Using existing field definition: ${fieldDefinition.id}`);
        }

        // Always create a new occurrence for this instance
        const fieldOccurrence = {
          id: generateUUID(),
          field_definition_id: fieldDefinition.id,
          placeholder_text: element.placeholder_text,
          position: position, // Simplified for serialization
        };

        fieldOccurrences.push(fieldOccurrence);
        console.log(`Created field occurrence with ID: ${fieldOccurrence.id}`);

        // Convert the position to a simple JSON object
        const positionObject: Record<string, string> = {
          placeholder: fieldOccurrence.position.placeholder,
          prefix: fieldOccurrence.position.prefix,
          suffix: fieldOccurrence.position.suffix,
        };

        if (fieldOccurrence.position.context) {
          // Only add context if it exists
          positionObject.context = fieldOccurrence.position.context;
        }

        // Send annotation to the client - using proper JSON serialization
        dataStream.writeData({
          type: 'annotation',
          content: {
            type: 'contractField',
            data: JSON.parse(
              JSON.stringify({
                definition: {
                  id: fieldDefinition.id,
                  document_id: fieldDefinition.document_id,
                  contact_id: fieldDefinition.contact_id,
                  user_id: fieldDefinition.user_id,
                  field_name: fieldDefinition.field_name,
                  field_type: fieldDefinition.field_type,
                  is_required: fieldDefinition.is_required,
                  is_filled: fieldDefinition.is_filled,
                },
                occurrence: {
                  id: fieldOccurrence.id,
                  field_definition_id: fieldOccurrence.field_definition_id,
                  placeholder_text: fieldOccurrence.placeholder_text,
                  position: positionObject,
                },
              }),
            ),
          },
        });
      }

      console.log(
        `Total field definitions: ${fieldDefinitions.length}, occurrences: ${fieldOccurrences.length}`,
      );

      // Save contacts to the database
      try {
        console.log(`Saving ${contacts.length} contacts to database`);
        await saveContacts({
          contacts,
        });
        console.log('Successfully saved contacts to database');
      } catch (error) {
        console.error('Error saving contacts:', error);
      }

      if (user.id && fieldDefinitions.length > 0) {
        const userId = user.id;
        console.log(
          `Saving ${fieldDefinitions.length} field definitions and ${fieldOccurrences.length} occurrences to database for user: ${userId}`,
        );

        // Update each field definition to include its occurrences
        for (const fieldDefinition of fieldDefinitions) {
          // Find all occurrences for this field
          const occurrences = fieldOccurrences.filter(
            (occ) => occ.field_definition_id === fieldDefinition.id,
          );

          // Store occurrences position data in the field definition
          if (occurrences.length > 0) {
            // Use the first occurrence for the primary position
            const primaryOccurrence = occurrences[0];
            fieldDefinition.placeholder_text =
              primaryOccurrence.placeholder_text;
            fieldDefinition.position_in_document = {
              type: 'annotation',
              position: primaryOccurrence.position,
              // Add a list of all occurrence positions
              occurrences: occurrences.map((occ) => ({
                id: occ.id,
                position: occ.position,
                placeholder_text: occ.placeholder_text,
              })),
            };
          }
        }

        // Save all contract fields to the database
        try {
          // Save fields with their occurrences
          await saveContractFields({
            contractFields: fieldDefinitions,
          });

          console.log('Successfully saved contract fields to database');
        } catch (error) {
          console.error('Error saving contract fields:', error);
        }
      } else {
        console.log(
          `No user ID available or no fields to save. User ID: ${user.id}, Fields: ${fieldDefinitions.length}`,
        );
      }

      // Create a summary of signers
      const signerSummary = Array.from(signerReferenceMap.entries()).map(
        ([reference, id]) => ({
          reference,
          contact_id: id,
          fields_count: fieldDefinitions.filter(
            (field) => field.contact_id === id,
          ).length,
        }),
      );

      console.log(
        `Generated signer summary with ${signerSummary.length} signers`,
      );
      signerSummary.forEach((signer) => {
        console.log(
          `Signer: ${signer.reference}, ID: ${signer.contact_id}, Fields: ${signer.fields_count}`,
        );
      });

      return {
        id: documentId,
        title: document.title,
        kind: document.kind,
        fields_count: fieldDefinitions.length,
        occurrences_count: fieldOccurrences.length,
        signers: signerSummary,
        content_updated:
          hasExistingPlaceholders === false &&
          updatedContent !== document.content,
        message: 'Contract fields have been identified in the document',
      };
    },
  });

// Helper function to save contacts
async function saveContacts({ contacts }: { contacts: ContactInsert[] }) {
  const supabase = await createClient();
  try {
    const { error } = await supabase.from('contacts').insert(contacts);
    if (error) {
      console.error('Failed to save contacts in database:', error);
      throw error;
    }
    return { success: true };
  } catch (error) {
    console.error('Error in saveContacts function:', error);
    throw error;
  }
}
