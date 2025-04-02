'use server';

import { generateText, Message } from 'ai';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

import {
  deleteMessagesByChatIdAfterTimestamp,
  getMessageById,
  updateChatSharingById,
} from '@/lib/db/queries';
import { VisibilityType } from '@/components/visibility-selector';
import { myProvider } from '@/lib/ai/providers';

export async function saveChatModelAsCookie(model: string) {
  const cookieStore = await cookies();
  cookieStore.set('chat-model', model);
}

export async function generateTitleFromUserMessage({
  message,
}: {
  message: Message;
}) {
  const { text: title } = await generateText({
    model: myProvider.languageModel('title-model'),
    system: `\n
    - you will generate a short title based on the first message a user begins a conversation with
    - ensure it is not more than 80 characters long
    - the title should be a summary of the user's message
    - do not use quotes or colons`,
    prompt: JSON.stringify(message),
  });

  return title;
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const message = await getMessageById({ id });

  if (!message) {
    console.error(`Message with id ${id} not found for deletion.`);
    return;
  }

  const created_atDate = new Date(message.created_at);

  await deleteMessagesByChatIdAfterTimestamp({
    chatId: message.chat_id,
    timestamp: created_atDate,
  });
}

export async function updateChatVisibility({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  await updateChatSharingById({ chatId, sharing: visibility });
  revalidatePath('/');
  revalidatePath(`/chat/${chatId}`);
}
