import { getChatById, getVotesByChatId, voteMessage } from '@/lib/db/queries';
import { auth } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('chatId');

  if (!chatId) {
    return new Response('chatId is required', { status: 400 });
  }

  const user = await auth();

  if (!user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const chat = await getChatById({ id: chatId });

  if (!chat) {
    return new Response('Chat not found', { status: 404 });
  }

  if (chat.user_id !== user.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const votes = await getVotesByChatId({ id: chatId });

  return Response.json(votes, { status: 200 });
}

export async function PATCH(request: Request) {
  const {
    chat_id,
    message_id,
    type,
  }: { chat_id: string; message_id: string; type: 'up' | 'down' } =
    await request.json();

  if (!chat_id || !message_id || !type) {
    return new Response('chat_id, message_id and type are required', { status: 400 });
  }

  const user = await auth();

  if (!user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const chat = await getChatById({ id: chat_id });

  if (!chat) {
    return new Response('Chat not found', { status: 404 });
  }

  if (chat.user_id !== user.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  await voteMessage({
    chat_id,
    message_id,
    type: type,
  });

  return new Response('Message voted', { status: 200 });
}