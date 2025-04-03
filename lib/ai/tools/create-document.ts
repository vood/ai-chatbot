import { generateUUID } from '@/lib/utils';
import { type DataStreamWriter, tool } from 'ai';
import { z } from 'zod';
import {
  artifactKinds,
  documentHandlersByArtifactKind,
} from '@/lib/artifacts/server';

interface CreateDocumentProps {
  user: { id?: string };
  dataStream: DataStreamWriter;
}

export const createDocument = ({ user, dataStream }: CreateDocumentProps) =>
  tool({
    description: `
Create a document for a writing or content creation activities. 
A document is an artifact that can be used for writing, editing, and other content creation tasks.
This tool will call other functions that will generate the contents of the document based on the title and kind.

    **When to use \`createDocument\`:**
- For substantial content (>10 lines) or code
- For content users will likely save/reuse (emails, code, essays, etc.)
- When explicitly requested to create a document
- For when content contains a single code snippet

**When NOT to use \`createDocument\`:**
- For informational/explanatory content
- For conversational responses
- When asked to keep it in chat

Do not return the document in the conversation, it's already in the artifact and shown to the user.
      `,
    parameters: z.object({
      title: z.string(),
      kind: z.enum(artifactKinds),
    }),
    execute: async ({ title, kind }) => {
      const id = generateUUID();

      dataStream.writeData({
        type: 'kind',
        content: kind,
      });

      dataStream.writeData({
        type: 'id',
        content: id,
      });

      dataStream.writeData({
        type: 'title',
        content: title,
      });

      dataStream.writeData({
        type: 'clear',
        content: '',
      });

      const documentHandler = documentHandlersByArtifactKind.find(
        (documentHandlerByArtifactKind) =>
          documentHandlerByArtifactKind.kind === kind,
      );

      if (!documentHandler) {
        throw new Error(`No document handler found for kind: ${kind}`);
      }

      await documentHandler.onCreateDocument({
        id,
        title,
        dataStream,
        user,
      });

      dataStream.writeData({ type: 'finish', content: '' });

      return {
        id,
        title,
        kind,
        content: 'A document was created and is now visible to the user.',
      };
    },
  });
