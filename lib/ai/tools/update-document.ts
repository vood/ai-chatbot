import { type DataStreamWriter, tool } from 'ai';
import { z } from 'zod';
import { getDocumentById, } from '@/lib/db/queries';
import { documentHandlersByArtifactKind } from '@/lib/artifacts/server';

interface UpdateDocumentProps {
  user: { id?: string };
  dataStream: DataStreamWriter;
}

export const updateDocument = ({ user, dataStream }: UpdateDocumentProps) =>
  tool({
    description: `Update a document with the given description.
A document is an artifact that can be used for writing, editing, and other content creation tasks.

**Using \`updateDocument\`:**
- Default to full document rewrites for major changes
- Use targeted updates only for specific, isolated changes
- Follow user instructions for which parts to modify

**When NOT to use \`updateDocument\`:**
- Immediately after creating a document

Do not return the document in the conversation, it's already in the artifact and shown to the user.
    `,
    parameters: z.object({
      id: z.string().describe('The ID of the document to update'),
      description: z
        .string()
        .describe('The description of changes that need to be made'),
    }),
    execute: async ({ id, description }) => {
      const document = await getDocumentById({ id });

      if (!document) {
        return {
          error: 'Document not found',
        };
      }

      dataStream.writeData({
        type: 'clear',
        content: document.title,
      });

      const documentHandler = documentHandlersByArtifactKind.find(
        (documentHandlerByArtifactKind) =>
          documentHandlerByArtifactKind.kind === document.kind,
      );

      if (!documentHandler) {
        throw new Error(`No document handler found for kind: ${document.kind}`);
      }

      await documentHandler.onUpdateDocument({
        document,
        description,
        dataStream,
        user,
      });

      dataStream.writeData({ type: 'finish', content: '' });

      return {
        id,
        title: document.title,
        kind: document.kind,
        content: 'The document has been updated successfully.',
      };
    },
  });
