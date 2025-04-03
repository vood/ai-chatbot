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
  const chat = await getChatById({ id });

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

  const messagesFromDb = await getMessagesByChatId({
    id,
  });

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

  const cookieStore = await cookies();
  const chatModelFromCookie = cookieStore.get('chat-model');

  if (!chatModelFromCookie) {
    return (
      <>
        <Chat
          id={chat.id}
          initialMessages={convertToUIMessages(messagesFromDb)}
          selectedChatModel={DEFAULT_CHAT_MODEL}
          selectedVisibilityType={chat.sharing as VisibilityType}
          isReadonly={user?.id !== chat.user_id}
        />
        <DataStreamHandler id={id} />
      </>
    );
  }

  return (
    <>
      <Chat
        id={chat.id}
        initialMessages={convertToUIMessages(messagesFromDb)}
        selectedChatModel={chatModelFromCookie.value}
        selectedVisibilityType={chat.sharing as VisibilityType}
        isReadonly={user?.id !== chat.user_id}
      />
      <DataStreamHandler id={id} />
    </>
  );
}
