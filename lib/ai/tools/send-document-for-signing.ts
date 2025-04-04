import { z } from 'zod';
import { type DataStreamWriter, tool } from 'ai';
import { getDocumentById } from '@/lib/db/queries'; // Needed to get document title
import { generateSigningLinks } from '@/lib/actions/signing'; // Import the action
import { myProvider } from '../providers'; // Assuming this might be needed for context, though not calling LLM here

interface SendDocumentForSigningProps {
  user: { id?: string };
  dataStream: DataStreamWriter;
}

export const sendDocumentForSigning = ({
  user,
  dataStream,
}: SendDocumentForSigningProps) =>
  tool({
    description: `Send a document for signing by generating unique signing links for each contact associated with fields in the document. 
    This prepares the document for signature collection. It does not collect emails or send notifications.`,
    parameters: z.object({
      documentId: z
        .string()
        .describe('The ID of the document to prepare for signing.'),
    }),
    execute: async ({ documentId }) => {
      dataStream.writeData({
        type: 'tool-status',
        content: {
          toolName: 'sendDocumentForSigning',
          status: 'running',
          message: 'Preparing document for signing...',
        },
      });

      if (!user.id) {
        dataStream.writeData({
          type: 'tool-status',
          content: {
            toolName: 'sendDocumentForSigning',
            status: 'error',
            message: 'User authentication required.',
          },
        });
        return { error: 'Authentication required' };
      }

      try {
        // Fetch document title for richer messages (optional)
        const document = await getDocumentById({ id: documentId });
        const docTitle =
          document?.title || `Document (${documentId.substring(0, 6)}...)`;

        dataStream.writeData({
          type: 'tool-status',
          content: {
            toolName: 'sendDocumentForSigning',
            status: 'running',
            message: `Generating signing links for "${docTitle}"...`,
          },
        });

        // Call the existing server action to generate links
        const result = await generateSigningLinks({ documentId });

        if (result.success && result.links.length > 0) {
          const message = `Successfully generated ${result.links.length} signing link(s) for "${docTitle}". You can now manage signing via the document interface.`;
          dataStream.writeData({
            type: 'tool-status',
            content: {
              toolName: 'sendDocumentForSigning',
              status: 'complete',
              message,
            },
          });
          return {
            documentId,
            linksGenerated: result.links.length,
            message,
          };
        } else if (result.success && result.links.length === 0) {
          const message = `No contacts with fields found in "${docTitle}" to generate signing links for.`;
          dataStream.writeData({
            type: 'tool-status',
            content: {
              toolName: 'sendDocumentForSigning',
              status: 'complete',
              message,
            },
          });
          return { documentId, linksGenerated: 0, message };
        } else {
          // Should be caught by catch block if action throws
          const message = `Failed to generate signing links for "${docTitle}".`;
          dataStream.writeData({
            type: 'tool-status',
            content: {
              toolName: 'sendDocumentForSigning',
              status: 'error',
              message,
            },
          });
          return { error: message };
        }
      } catch (error) {
        console.error('Error in sendDocumentForSigning tool:', error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'An unknown error occurred during link generation.';
        dataStream.writeData({
          type: 'tool-status',
          content: {
            toolName: 'sendDocumentForSigning',
            status: 'error',
            message: errorMessage,
          },
        });
        return { error: errorMessage };
      }
    },
  });
