'use server';

import { revalidatePath } from 'next/cache';
import { createClient, auth } from '@/lib/supabase/server';
import { z } from 'zod';
import {
  saveSigningLinks,
  getPublicSigningDataByToken,
  updateSigningLinkStatus,
  updateContractFieldsBatch,
  getContactsByIds,
  updateContactEmailsBatch,
  getDocumentFieldContacts,
  getSigningLinksWithContacts,
  updateSigningLinkStatusById,
} from '@/lib/db/queries';
import type {
  SigningLinkInsert,
  SigningLink,
  ContractField,
  Contact,
  Document,
} from '@/lib/db/schema';
// import { action } from '@/lib/safe-action'; // Removed safe-action

const generateLinksSchema = z.object({
  documentId: z.string().uuid(),
  // Optional: Add expiration duration later if needed
  // expiresInDays: z.number().optional(),
});

// Define the input type based on the schema
type GenerateLinksInput = z.infer<typeof generateLinksSchema>;

// Export a regular async function
export const generateSigningLinks = async (input: GenerateLinksInput) => {
  // Validate input manually (or use Zod parse)
  const parseResult = generateLinksSchema.safeParse(input);
  if (!parseResult.success) {
    throw new Error(`Invalid input: ${parseResult.error.message}`);
  }
  const { documentId } = parseResult.data;

  // Correctly get user from auth()
  const user = await auth(); // auth() returns UserWithWorkspace | null
  if (!user) {
    // Check if user is null
    console.error('Auth error or user not found.');
    throw new Error('Authentication required');
  }
  // User is now guaranteed to be UserWithWorkspace

  console.log(
    `Generating signing links for document ${documentId} by user ${user.id}`,
  );

  // 1. Fetch all contact IDs associated with this document from contract_fields
  const fieldContacts = await getDocumentFieldContacts({
    documentId,
    userId: user.id,
  });

  if (!fieldContacts || fieldContacts.length === 0) {
    console.log('No contacts found associated with this document.');
    return { success: true, links: [] };
  }

  // Get unique contact IDs using a Set
  const uniqueContactIds = [
    ...new Set(fieldContacts.map((fc) => fc.contact_id)),
  ];

  console.log(
    `Found ${uniqueContactIds.length} unique contacts:`,
    uniqueContactIds,
  );

  // 2. Prepare SigningLinkInsert objects for each unique contact
  const signingLinksToInsert: SigningLinkInsert[] = uniqueContactIds.map(
    (contactId) => ({
      document_id: documentId,
      contact_id: contactId,
      user_id: user.id,
      status: 'pending', // Default status
      // expires_at: calculateExpiration(), // Implement if using expiration
    }),
  );

  // 3. Save the signing links to the database
  const result = await saveSigningLinks({ signingLinks: signingLinksToInsert });

  if (!result.success) {
    // Error is logged within saveSigningLinks
    throw new Error('Failed to save signing links.');
  }

  console.log(`Successfully generated ${result.links.length} signing links.`);

  // Optional: Revalidate paths if needed
  // revalidatePath(`/documents/${documentId}`);

  // Return the generated links (token + contact_id)
  return {
    success: true,
    links: result.links.map((link) => ({
      url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/sign/${link.token}`,
      contact_id: link.contact_id,
    })),
  };
};

// Helper function if expiration is needed
// function calculateExpiration(days = 7): string {
//   const date = new Date();
//   date.setDate(date.getDate() + days);
//   return date.toISOString();
// }

// Schema for fetching signing data
const fetchSigningDataSchema = z.object({
  token: z.string().min(1), // Basic validation for token presence
});

// Define the expected return type for the action
interface SigningDataPayload {
  document: Document | null;
  fields: ContractField[];
  contact: Contact | null;
  link: SigningLink | null;
}

// Server action to fetch data for the public signing page
export const fetchSigningData = async (
  input: z.infer<typeof fetchSigningDataSchema>,
): Promise<SigningDataPayload | null> => {
  const parseResult = fetchSigningDataSchema.safeParse(input);
  if (!parseResult.success) {
    console.error('Invalid token input for fetchSigningData');
    return null; // Or throw an error
  }
  const { token } = parseResult.data;

  console.log(`Fetching signing data for token: ${token}`);

  try {
    // Call the query function to get data based on the token
    const signingData = await getPublicSigningDataByToken({ token });

    if (!signingData) {
      console.log(`No valid signing data found for token ${token}.`);
      return null;
    }

    console.log(
      `Successfully fetched data for document: ${signingData.document?.id}, contact: ${signingData.contact?.id}`,
    );
    return signingData;
  } catch (error) {
    console.error(
      `Error in fetchSigningData action for token ${token}:`,
      error,
    );
    // Depending on desired behavior, could return null or re-throw
    return null;
  }
};

// Schema for submitting signed document data
const submitSignedDocumentSchema = z.object({
  token: z.string().min(1),
  // Expecting field values as a record: { fieldId: value }
  fieldValues: z.record(z.string().uuid(), z.string().nullable()),
});

// Server action to handle submission from the public signing page
export const submitSignedDocument = async (
  input: z.infer<typeof submitSignedDocumentSchema>,
): Promise<{ success: boolean; message?: string }> => {
  const parseResult = submitSignedDocumentSchema.safeParse(input);
  if (!parseResult.success) {
    console.error('Invalid input for submitSignedDocument:', parseResult.error);
    return { success: false, message: 'Invalid submission data.' };
  }
  const { token, fieldValues } = parseResult.data;

  console.log(`Processing submission for signing token: ${token}`);

  try {
    // 1. Fetch the signing link data again to verify the token is still valid
    //    and get necessary IDs (user_id, document_id, contact_id).
    const signingData = await getPublicSigningDataByToken({ token });

    // Validate signingData exists and the link is still active
    if (
      !signingData ||
      !signingData.link ||
      !signingData.document ||
      !signingData.contact
    ) {
      console.warn(`Invalid or expired token used for submission: ${token}`);
      return {
        success: false,
        message: 'This signing link is invalid, expired, or already completed.',
      };
    }

    if (
      signingData.link.status !== 'pending' &&
      signingData.link.status !== 'viewed'
    ) {
      console.warn(
        `Attempt to submit already completed/expired link: ${token}, status: ${signingData.link.status}`,
      );
      return {
        success: false,
        message: 'This signing link is invalid, expired, or already completed.',
      };
    }

    const { user_id, document_id, contact_id } = signingData.link;

    // 2. Prepare the batch update payload
    //    Ensure submitted field IDs actually belong to this contact/document.
    const fieldsToUpdate = Object.entries(fieldValues)
      .map(([fieldId, value]) => {
        // Find the corresponding field definition fetched earlier
        const fieldDefinition = signingData.fields.find(
          (f) => f.id === fieldId,
        );
        // Security check: Ensure the field belongs to the correct contact and document
        if (
          fieldDefinition &&
          fieldDefinition.contact_id === contact_id &&
          fieldDefinition.document_id === document_id
        ) {
          return { id: fieldId, fieldValue: value };
        } else {
          console.warn(
            `Submission attempt for invalid/mismatched field ID: ${fieldId} for token ${token}`,
          );
          return null; // Ignore invalid field IDs
        }
      })
      .filter(
        (update): update is { id: string; fieldValue: string | null } =>
          !!update,
      );

    if (fieldsToUpdate.length === 0) {
      console.log('No valid fields submitted for update.');
      // Might happen if all submitted IDs were invalid
      return { success: false, message: 'No valid fields submitted.' };
    }

    // 3. Update the contract fields in the database
    await updateContractFieldsBatch({
      fieldUpdates: fieldsToUpdate,
      userId: user_id, // Use the owner's ID from the link for RLS
      documentId: document_id,
    });

    // 4. Update the signing link status to 'completed'
    await updateSigningLinkStatus({ token, status: 'completed' });

    console.log(`Successfully processed submission for token: ${token}`);

    // Optional: Trigger notifications, revalidate paths, etc.
    revalidatePath(`/documents/${document_id}`); // Revalidate document page

    return { success: true, message: 'Document submitted successfully!' };
  } catch (error) {
    console.error(`Error processing submission for token ${token}:`, error);
    // Return a generic error message to the client
    return {
      success: false,
      message: 'An error occurred while submitting the document.',
    };
  }
};

// Schema for getting contacts
const getContactsSchema = z.object({
  documentId: z.string().uuid(),
});

// Action to fetch contacts associated with a document's fields
export const getSigningContactsForDocument = async (
  input: z.infer<typeof getContactsSchema>,
): Promise<{ success: boolean; contacts?: Contact[]; error?: string }> => {
  const parseResult = getContactsSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: `Invalid input: ${parseResult.error.message}`,
    };
  }
  const { documentId } = parseResult.data;

  // Corrected auth() usage
  const user = await auth(); // Returns UserWithWorkspace | null
  if (!user) {
    console.error(
      'Auth error or user not found in getSigningContactsForDocument.',
    );
    return { success: false, error: 'Authentication required' };
  }
  // user is now UserWithWorkspace

  const supabase = await createClient();

  try {
    console.log(
      `Fetching contacts for document ${documentId} by user ${user.id}`,
    );

    // 1. Fetch unique contact IDs associated with this document from contract_fields
    const { data: fieldContacts, error: fieldError } = await supabase
      .from('contract_fields')
      .select('contact_id')
      .eq('document_id', documentId)
      .eq('user_id', user.id);

    if (fieldError) {
      console.error('Error fetching contact IDs for document:', fieldError);
      return {
        success: false,
        error: 'Failed to retrieve document contact IDs.',
      };
    }

    if (!fieldContacts || fieldContacts.length === 0) {
      console.log('No contact IDs found associated with this document.');
      return { success: true, contacts: [] };
    }

    // Get unique contact IDs
    const uniqueContactIds = [
      ...new Set(fieldContacts.map((fc) => fc.contact_id)),
    ];
    console.log(`Found ${uniqueContactIds.length} unique contacts IDs.`);

    // 2. Fetch full contact details for these IDs
    const contacts = await getContactsByIds({ ids: uniqueContactIds });

    return { success: true, contacts };
  } catch (error) {
    console.error('Error in getSigningContactsForDocument action:', error);
    const message =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, error: message };
  }
};

// Schema for saving contact emails
const saveEmailsSchema = z.object({
  // Expecting { contactId: email } format
  emails: z.record(
    z.string().uuid(),
    z.string().email().nullable().or(z.literal('')),
  ),
});

// Action to save contact emails
export const saveContactEmails = async (
  input: z.infer<typeof saveEmailsSchema>,
): Promise<{ success: boolean; error?: string }> => {
  const parseResult = saveEmailsSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: `Invalid input: ${parseResult.error.message}`,
    };
  }
  const { emails } = parseResult.data;

  const user = await auth();
  if (!user) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    const emailUpdates = Object.entries(emails).map(([id, email]) => ({
      id,
      // Convert empty string to null for DB consistency, keep null as null
      email: email === '' ? null : email,
    }));

    if (emailUpdates.length === 0) {
      return { success: true }; // Nothing to update
    }

    console.log(
      `Updating emails for ${emailUpdates.length} contacts by user ${user.id}`,
    );

    // Call the batch update query
    await updateContactEmailsBatch({ emailUpdates, userId: user.id });

    return { success: true };
  } catch (error) {
    console.error('Error in saveContactEmails action:', error);
    const message =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, error: message };
  }
};

// Schema for sending emails with signing links
const sendSigningEmailsSchema = z.object({
  documentId: z.string().uuid(),
  documentTitle: z.string().optional(),
});

// Server action to send emails with signing links to contacts
export const sendSigningEmails = async (
  input: z.infer<typeof sendSigningEmailsSchema>,
): Promise<{ success: boolean; sentCount: number; error?: string }> => {
  const parseResult = sendSigningEmailsSchema.safeParse(input);
  if (!parseResult.success) {
    console.error('Invalid input for sendSigningEmails:', parseResult.error);
    return { success: false, sentCount: 0, error: 'Invalid input data.' };
  }

  const { documentId, documentTitle } = parseResult.data;
  const user = await auth();

  if (!user) {
    return { success: false, sentCount: 0, error: 'Authentication required' };
  }

  try {
    // 1. Get all signing links for this document
    const signingLinks = await getSigningLinksWithContacts({
      documentId,
      userId: user.id,
    });

    if (!signingLinks || signingLinks.length === 0) {
      return {
        success: false,
        sentCount: 0,
        error: 'No signing links found for this document',
      };
    }

    // 2. Filter contacts with valid emails
    const contactsWithEmail = signingLinks.filter(
      (link) => link.contacts?.email && link.contacts.email.trim() !== '',
    );

    if (contactsWithEmail.length === 0) {
      return {
        success: false,
        sentCount: 0,
        error: 'No contacts with email addresses found',
      };
    }

    // 3. Send emails (in a real app, you'd use a service like SendGrid, Postmark, or similar)
    // Here we're simulating successful email sending
    const sentCount = await sendEmailsToContacts({
      links: contactsWithEmail,
      documentTitle: documentTitle || 'Document for signing',
      senderName: user.email || 'Your colleague',
    });

    return {
      success: true,
      sentCount,
      error: sentCount === 0 ? 'Failed to send emails' : undefined,
    };
  } catch (error) {
    console.error('Error sending signing emails:', error);
    return {
      success: false,
      sentCount: 0,
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
};

// Helper function to handle the actual email sending
// This would interface with your email provider (SendGrid, SES, etc.)
async function sendEmailsToContacts({
  links,
  documentTitle,
  senderName,
}: {
  links: any[];
  documentTitle: string;
  senderName: string;
}): Promise<number> {
  // Simulate email sending for now
  // In a real implementation, you would use your email service provider's API
  console.log(
    `Would send ${links.length} emails for document "${documentTitle}"`,
  );

  let sentCount = 0;

  // For each recipient, format and send an email
  for (const link of links) {
    const recipientEmail = link.contacts?.email;
    const recipientName = link.contacts?.name || 'Signer';
    const signingUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/sign/${link.token}`;

    if (!recipientEmail) continue;

    try {
      // In a real implementation, replace this with actual email sending code
      // Example with SendGrid or similar:
      // await sendGrid.send({
      //   to: recipientEmail,
      //   from: 'your-verified-sender@example.com',
      //   subject: `Please sign: ${documentTitle}`,
      //   text: `Hello ${recipientName}, ${senderName} has requested your signature on "${documentTitle}". Please sign using this link: ${signingUrl}`,
      //   html: `<p>Hello ${recipientName},</p><p>${senderName} has requested your signature on "${documentTitle}".</p><p>Please <a href="${signingUrl}">click here to sign</a>.</p>`
      // });

      // For now, we'll just log the email we would send
      console.log(`Email would be sent to: ${recipientEmail}`);
      console.log(`Subject: Please sign: ${documentTitle}`);
      console.log(
        `Body: Hello ${recipientName}, ${senderName} has requested your signature on "${documentTitle}". Please sign using this link: ${signingUrl}`,
      );

      // For demo purposes, we'll count this as sent
      sentCount++;

      // Update the signing link status to 'sent'
      await updateSigningLinkStatusById({
        id: link.id,
        status: 'sent',
      });
    } catch (error) {
      console.error(`Failed to send email to ${recipientEmail}:`, error);
    }
  }

  return sentCount;
}
