import { z } from 'zod';
import { DataStreamWriter, streamObject, tool } from 'ai';
import { getDocumentById, saveSuggestions } from '@/lib/db/queries';
import { generateUUID } from '@/lib/utils';
import { myProvider } from '../providers';
import { Tables } from '@/supabase/types';

interface RequestSuggestionsProps {
  user: { id?: string };
  dataStream: DataStreamWriter;
}

export const requestSuggestions = ({
  user,
  dataStream,
}: RequestSuggestionsProps) =>
  tool({
    description: 'Request suggestions for a document',
    parameters: z.object({
      documentId: z
        .string()
        .describe('The ID of the document to request edits'),
    }),
    execute: async ({ documentId }) => {
      const document = await getDocumentById({ id: documentId });

      if (!document || !document.content) {
        return {
          error: 'Document not found',
        };
      }

      const suggestions: Array<
        Omit<Tables<'suggestions'>, 'user_id' | 'created_at' | 'document_created_at'>
      > = [];

      const { elementStream } = streamObject({
        model: myProvider.languageModel('artifact-model'),
        system:
          'You are a help writing assistant. Given a piece of writing, please offer suggestions to improve the piece of writing and describe the change. It is very important for the edits to contain full sentences instead of just words. Max 5 suggestions.',
        prompt: document.content,
        output: 'array',
        schema: z.object({
          originalSentence: z.string().describe('The original sentence'),
          suggestedSentence: z.string().describe('The suggested sentence'),
          description: z.string().describe('The description of the suggestion'),
        }),
      });

      for await (const element of elementStream) {
        const suggestion = {
          original_text: element.originalSentence,
          suggested_text: element.suggestedSentence,
          description: element.description,
          id: generateUUID(),
          document_id: documentId,
          is_resolved: false,
        };

        dataStream.writeData({
          type: 'suggestion',
          content: suggestion,
        });

        suggestions.push(suggestion);
      }

      if (user.id) {
        const userId = user.id;

        await saveSuggestions({
          suggestions: suggestions.map((suggestion) => ({
            id: suggestion.id,
            document_id: suggestion.document_id,
            original_text: suggestion.original_text,
            suggested_text: suggestion.suggested_text,
            description: suggestion.description,
            is_resolved: suggestion.is_resolved,
            user_id: userId,
            created_at: new Date().toISOString(),
            document_created_at: document.created_at,
          })),
        });
      }

      return {
        id: documentId,
        title: document.title,
        kind: document.kind,
        message: 'Suggestions have been added to the document',
      };
    },
  });
