import {
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
import { isProductionEnvironment } from '@/lib/constants';
import { myProvider, getLanguageModel } from '@/lib/ai/providers';
import { getAllMCPTools } from '@/lib/ai/mcp-clients';
import type { Json } from '@/supabase/types';
import { z } from 'zod';
import {
  webSearch,
  requestContractFields,
  requestSuggestions,
  imageGenerationTools,
  createDocument,
  updateDocument,
  sendDocumentForSigning,
  getWeather,
} from '@/lib/ai/tools';
export const maxDuration = 60;

// Define Zod schema for the request body
const ChatRequestSchema = z.object({
  id: z.string(),
  // Using z.any() for messages due to complex structure, refine if needed
  messages: z.array(z.any()),
  selectedChatModel: z.string(),
  supportsTools: z.boolean(),
  selectedTools: z.array(z.string()).optional(),
  // Add a data field for additional request data
  data: z.record(z.string(), z.string()).optional(),
});

// Extract all MCP tools for a given server
const getMCPToolsForServer = (
  serverName: string,
  mcpTools: Record<string, any>,
): string[] => {
  return Object.keys(mcpTools).filter((toolName) =>
    toolName.startsWith(`${serverName}_`),
  );
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsedData = ChatRequestSchema.safeParse(body);

    if (!parsedData.success) {
      console.error('Validation Error:', parsedData.error.errors);
      return new Response(
        JSON.stringify({
          error: 'Invalid request body',
          details: parsedData.error.errors,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // Use validated data from here on
    const {
      id,
      messages,
      selectedChatModel,
      selectedTools, // This is already correctly typed by the schema
      data,
    } = parsedData.data;

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

    // Fetch MCP tools from our config
    const mcpTools = await getAllMCPTools();

    // Extract selected MCP tools from the request data if present
    const selectedMcpTools: string[] = [];
    if (data?.mcpTools) {
      try {
        const parsedMcpTools = JSON.parse(data.mcpTools);
        if (Array.isArray(parsedMcpTools)) {
          selectedMcpTools.push(...parsedMcpTools);
        }
      } catch (error) {
        console.error('Error parsing MCP tools:', error);
      }
    }

    // Get unique server names from the selected tools
    const selectedServers = new Set(
      selectedMcpTools.map((toolName) => {
        const parts = toolName.split('_');
        return parts[0]; // Return the server name part
      }),
    );

    // Always enabled tools
    const alwaysEnabledCoreTools = [
      'sendDocumentForSigning',
      'createDocument',
      'updateDocument',
      'requestSuggestions',
      'requestContractFields',
    ];

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
        const tools = {
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
          ...imageGenerationTools,
          ...mcpTools, // Add all available MCP tools
        };

        // Filter valid selected tools that exist in our tools object
        const validSelectedToolNames = (selectedTools ?? []).filter(
          (toolName) => toolName in tools && !toolName.includes('_'), // Exclude MCP tools here
        ) as (keyof typeof tools)[];

        // Only include specifically selected MCP tools
        const validMcpToolNames = selectedMcpTools.filter(
          (toolName) => toolName in tools,
        ) as (keyof typeof tools)[];

        // Get core tools as properly typed
        const coreTools = alwaysEnabledCoreTools.filter(
          (toolName) => toolName in tools,
        ) as (keyof typeof tools)[];

        // Combine all tools with proper typing
        const activeToolNames = [
          ...coreTools,
          ...validMcpToolNames,
          ...validSelectedToolNames,
        ];

        const result = streamText({
          model: selectedChatModel.startsWith('chat-')
            ? myProvider.languageModel(selectedChatModel as any)
            : getLanguageModel(selectedChatModel),
          system: systemPrompt({ selectedChatModel }),
          messages: convertToCoreMessages(messages),
          maxSteps: 50,
          experimental_activeTools: activeToolNames,
          experimental_transform: smoothStream({ chunking: 'word' }),
          experimental_generateMessageId: generateUUID,
          tools: tools,
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
