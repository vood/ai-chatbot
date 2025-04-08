import { type DataStreamWriter, JSONValue, tool } from 'ai';
import { z } from 'zod';
import { getDocumentById } from '@/lib/db/queries';
import {
  artifactKinds,
  documentHandlersByArtifactKind,
} from '@/lib/artifacts/server';

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

NEVER RUN updateDocument right after createDocument.

Do not return the document in the conversation, it's already in the artifact and shown to the user.
    `,
    parameters: z
      .object({
        id: z.string().describe('The ID of the document to update'),
        description: z
          .string()
          .describe('The description of changes that need to be made'),
        kind: z.enum(artifactKinds),
        metadata: z.object({
          language: z
            .string()
            .optional()
            .describe(
              'The programming language of the document. Only required when kind is "code". I.e. "python", "javascript", "typescript", "html", "css", "markdown", etc.',
            ),
        }),
      })
      .refine(
        (data) => {
          if (data.kind === 'code' && !data.metadata.language) {
            return false;
          }

          return true;
        },
        (data) => {
          if (data.kind === 'code' && !data.metadata.language) {
            return {
              message: 'Language is required when kind is "code"',
              path: ['metadata', 'language'],
            };
          }

          return {
            message: 'Language should only be provided when kind is "code"',
            path: ['metadata', 'language'],
          };
        },
      ),
    execute: async ({ id, description, metadata }) => {
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

      if (metadata) {
        dataStream.writeData({
          type: 'metadata',
          content: metadata as JSONValue,
        });
      }

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
        metadata,
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
