import { NextResponse } from 'next/server';
import { auth } from '@/lib/supabase/server';
import {
  getPromptsByUserId,
  createPrompt,
  updatePrompt,
  deletePrompt,
} from '@/lib/db/queries';

export async function GET() {
  try {
    const user = await auth();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const prompts = await getPromptsByUserId({ userId: user.id });
    return NextResponse.json(prompts);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await auth();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, content } = await request.json();

    if (!name || !content) {
      return NextResponse.json(
        { error: 'Name and content are required' },
        { status: 400 },
      );
    }

    const prompt = await createPrompt({
      name,
      content,
      userId: user.id,
    });

    return NextResponse.json(prompt);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const user = await auth();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Prompt ID is required' },
        { status: 400 },
      );
    }

    const { name, content } = await request.json();

    if (!name || !content) {
      return NextResponse.json(
        { error: 'Name and content are required' },
        { status: 400 },
      );
    }

    try {
      const updatedPrompt = await updatePrompt({
        id,
        name,
        content,
        userId: user.id,
      });

      return NextResponse.json(updatedPrompt);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'Prompt not found or permission denied'
      ) {
        return NextResponse.json(
          { error: 'Prompt not found or permission denied' },
          { status: 404 },
        );
      }
      throw error;
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await auth();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Prompt ID is required' },
        { status: 400 },
      );
    }

    await deletePrompt({ id, userId: user.id });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
