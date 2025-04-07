import { auth } from '@/lib/supabase/server';
import { getChatsByUserId } from '@/lib/db/queries';

export async function GET() {
  const user = await auth();

  if (!user) {
    return Response.json('Unauthorized!', { status: 401 });
  }

  const chats = await getChatsByUserId({ id: user.id });
  return Response.json(chats);
}
