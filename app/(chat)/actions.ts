'use server';

import { generateText } from 'ai';
import type { Message } from 'ai';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

import {
  deleteMessagesByChatIdAfterTimestamp,
  getMessageById,
  updateChatSharingById,
  getCurrentUserProfile,
} from '@/lib/db/queries';
import type { VisibilityType } from '@/components/visibility-selector';
import { myProvider } from '@/lib/ai/providers';

export async function saveChatModelAsCookie(model: string) {
  const cookieStore = await cookies();
  cookieStore.set('chat-model', model);
}

// Get the current user's display name with fallback
export async function getUserDisplayName(): Promise<{
  displayName: string;
  isLoggedIn: boolean;
}> {
  try {
    const profile = await getCurrentUserProfile();
    return {
      displayName: profile?.display_name || 'there',
      isLoggedIn: !!profile,
    };
  } catch (error) {
    console.error('Error getting user display name:', error);
    return { displayName: 'there', isLoggedIn: false };
  }
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
