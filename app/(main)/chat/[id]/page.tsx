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

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;

  const cookieStore = await cookies();
  const selectedModelId =
    cookieStore.get('chat-model')?.value || DEFAULT_CHAT_MODEL;

  // Fetch only chat data and messages
  const [chat, messagesFromDb] = await Promise.all([
    getChatById({ id }),
    getMessagesByChatId({ id }),
  ]);

  if (!chat) {
    notFound();
  }

  const user = await auth();

  if (chat.sharing === 'private') {
    if (!user || user.id !== chat.user_id) {
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

  return (
    <>
      <Chat
        id={chat.id}
        initialMessages={convertToUIMessages(messagesFromDb)}
        selectedChatModel={selectedModelId} // Pass initial model ID
        selectedVisibilityType={chat.sharing as VisibilityType}
        isReadonly={user?.id !== chat.user_id}
      />
      <DataStreamHandler id={id} />
    </>
  );
}
