import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';

import { Chat } from '@/components/chat';
import { getChatById, getMessagesByChatId } from '@/lib/db/queries';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import type { Tables } from '@/supabase/types';
import type { Attachment, UIMessage } from 'ai';
import { auth } from '@/lib/supabase/server';
import type { VisibilityType } from '@/components/visibility-selector';

// Define the model type based on the API response
interface OpenRouterModel {
  slug: string;
  endpoint?: {
    supports_tool_parameters: boolean;
  };
  // Add other fields if needed for type safety, but only slug and endpoint are used here
}

// Function to fetch details for a specific model from our proxy
async function fetchModelDetails(
  slug: string,
): Promise<OpenRouterModel | null> {
  try {
    // Construct the absolute URL for server-side fetch
    const host = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'; // Fallback for local dev

    // Ensure host has protocol
    const baseUrl = host.startsWith('http') ? host : `http://${host}`;

    // URL-encode the slug before appending it to the path
    const encodedSlug = encodeURIComponent(slug);
    const fetchUrl = `${baseUrl}/api/models/${encodedSlug}`;

    // Fetch from our internal proxy API route for the specific slug
    const response = await fetch(fetchUrl); // Use the absolute URL
    if (!response.ok) {
      console.error(
        `Failed to fetch model details for ${slug} from ${fetchUrl}: ${response.status} ${response.statusText}`,
      );
      return null; // Return null on fetch error
    }
    const data = await response.json();
    return data as OpenRouterModel;
  } catch (error) {
    console.error(`Error fetching model details for ${slug}:`, error);
    return null; // Return null on general error
  }
}

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;

  const cookieStore = await cookies();
  const selectedModelId =
    cookieStore.get('chat-model')?.value || DEFAULT_CHAT_MODEL;

  // Fetch chat data and the selected model details concurrently
  const [chat, messagesFromDb, selectedModelData] = await Promise.all([
    getChatById({ id }),
    getMessagesByChatId({ id }),
    fetchModelDetails(selectedModelId), // Fetch only the selected model
  ]);

  if (!chat) {
    notFound();
  }

  const user = await auth();

  if (chat.sharing === 'private') {
    if (!user) {
      return notFound();
    }

    if (user.id !== chat.user_id) {
      return notFound();
    }
  }

  function convertToUIMessages(
    messages: Array<Tables<'messages'>>,
  ): Array<UIMessage> {
    return messages.map((message) => ({
      id: message.id,
      parts: message.parts as UIMessage['parts'],
      role: message.role as UIMessage['role'],
      // Note: content will soon be deprecated in @ai-sdk/react
      content: '',
      created_at: new Date(message.created_at),
      experimental_attachments:
        (message.attachments as unknown as Array<Attachment>) ?? [],
    }));
  }

  // Determine if the selected model supports tools from the fetched data
  const supportsTools =
    selectedModelData?.endpoint?.supports_tool_parameters ?? true; // Default to true if not found or fetch failed

  return (
    <>
      <Chat
        id={chat.id}
        initialMessages={convertToUIMessages(messagesFromDb)}
        selectedChatModel={selectedModelId} // Use determined ID
        selectedVisibilityType={chat.sharing as VisibilityType}
        isReadonly={user?.id !== chat.user_id}
        supportsTools={supportsTools} // Pass the flag
      />
      <DataStreamHandler id={id} />
    </>
  );
}
