import {
  type UIMessage,
  appendResponseMessages,
  convertToCoreMessages,
  createDataStreamResponse,
  smoothStream,
  streamText,
} from 'ai';
import { auth } from '@/lib/supabase/server';
import { systemPrompt } from '@/lib/ai/prompts';
import {
  deleteChatById,
  getChatById,
  saveChat,
  saveMessages,
} from '@/lib/db/queries';
import {
  generateUUID,
  getMostRecentUserMessage,
  getTrailingMessageId,
} from '@/lib/utils';
import { generateTitleFromUserMessage } from '../../actions';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { isProductionEnvironment } from '@/lib/constants';
import { myProvider } from '@/lib/ai/providers';
import type { Json } from '@/supabase/types';
import webSearch from '@/lib/ai/tools/web-search';
import { requestContractFields } from '@/lib/ai/tools/request-contract-fields';
import { sendDocumentForSigning } from '@/lib/ai/tools/send-document-for-signing';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const {
      id,
      messages,
      selectedChatModel,
    }: {
      id: string;
      messages: Array<UIMessage>;
      selectedChatModel: string;
    } = await request.json();

    const authResult = await auth();
    if (!authResult) {
      return new Response('Unauthorized', { status: 401 });
    }
    const user = authResult;

    const userMessage = getMostRecentUserMessage(messages);

    if (!userMessage) {
      return new Response('No user message found', { status: 400 });
    }

    const chat = await getChatById({ id });

    if (!chat) {
      const title = await generateTitleFromUserMessage({
        message: userMessage,
      });

      await saveChat({
        id,
        name: title,
        userId: user.id,
        workspace_id: user.current_workspace,
        model: selectedChatModel,
        prompt: '',
        context_length: 1000,
        embeddings_provider: 'openai',
        include_profile_context: true,
        include_workspace_instructions: true,
        temperature: 0.5,
        assistant_id: null,
        folder_id: null,
        sharing: 'private',
      });
    } else {
      if (chat.user_id !== user.id) {
        return new Response('Unauthorized', { status: 401 });
      }
    }

    await saveMessages({
      messages: [
        {
          chat_id: id,
          id: userMessage.id,
          role: 'user',
          parts: userMessage.parts as unknown as Json,
          attachments: (userMessage.experimental_attachments ??
            []) as unknown as Json,
          created_at: new Date().toISOString(),
          content: userMessage.content,
          image_paths: [],
          model: selectedChatModel,
          sequence_number: 0,
          user_id: user.id,
          word_count: 0,
        },
      ],
    });

    return createDataStreamResponse({
      execute: (dataStream) => {
        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: systemPrompt({ selectedChatModel }),
          messages: convertToCoreMessages(messages),
          maxSteps: 5,
          experimental_activeTools: [
            'getWeather',
            'createDocument',
            'updateDocument',
            'requestSuggestions',
            'requestContractFields',
            'webSearch',
            'sendDocumentForSigning',
          ],
          experimental_transform: smoothStream({ chunking: 'word' }),
          experimental_generateMessageId: generateUUID,
          tools: {
            getWeather,
            createDocument: createDocument({ user: user, dataStream }),
            updateDocument: updateDocument({ user: user, dataStream }),
            requestContractFields: requestContractFields({
              user: user,
              dataStream,
            }),
            requestSuggestions: requestSuggestions({
              user: user,
              dataStream,
            }),
            webSearch: webSearch,
            sendDocumentForSigning: sendDocumentForSigning({
              user: user,
              dataStream,
            }),
          },
          onFinish: async ({ response }) => {
            if (user.id) {
              try {
                const assistantId = getTrailingMessageId({
                  messages: response.messages.filter(
                    (message) => message.role === 'assistant',
                  ),
                });

                if (!assistantId) {
                  throw new Error('No assistant message found!');
                }

                const [, assistantMessage] = appendResponseMessages({
                  messages: [userMessage],
                  responseMessages: response.messages,
                });

                await saveMessages({
                  messages: [
                    {
                      id: assistantId,
                      chat_id: id,
                      role: assistantMessage.role,
                      parts: assistantMessage.parts as Json,
                      attachments: (assistantMessage.experimental_attachments ??
                        []) as unknown as Json,
                      created_at: new Date().toISOString(),
                      content: assistantMessage.content,
                      image_paths: [],
                      model: selectedChatModel,
                      sequence_number: 0,
                      user_id: user.id,
                      word_count: 0,
                    },
                  ],
                });
              } catch (_) {
                console.error('Failed to save chat');
              }
            }
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: 'stream-text',
          },
        });

        result.consumeStream();

        result.mergeIntoDataStream(dataStream, {
          sendReasoning: true,
        });
      },
      onError: (error) => {
        console.error(error);
        return 'Oops, an error occured!';
      },
    });
  } catch (error) {
    console.error(error);
    return new Response('An error occurred while processing your request!', {
      status: 404,
    });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Not Found', { status: 404 });
  }

  const user = await auth();

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (!chat) {
      return new Response('Chat Not Found', { status: 404 });
    }

    if (chat.user_id !== user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    await deleteChatById({ id });

    return new Response('Chat deleted', { status: 200 });
  } catch (error) {
    return new Response('An error occurred while processing your request!', {
      status: 500,
    });
  }
}
