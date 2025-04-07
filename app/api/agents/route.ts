import { NextResponse } from 'next/server';
import { auth } from '@/lib/supabase/server';
import {
  getAgentsForUser,
  createAgent,
  updateAgent,
  deleteAgent,
  type AgentInsert,
} from '@/lib/db/queries/agents';

export async function GET() {
  try {
    const user = await auth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaceId = user.current_workspace;
    if (!workspaceId) {
      return NextResponse.json(
        { error: 'No workspace selected' },
        { status: 400 },
      );
    }

    const agents = await getAgentsForUser(user.id, workspaceId);
    return NextResponse.json(agents);
  } catch (error: any) {
    console.error('Error in agents API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await auth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaceId = user.current_workspace;
    if (!workspaceId) {
      return NextResponse.json(
        { error: 'No workspace selected' },
        { status: 400 },
      );
    }

    const body = await request.json();
    const agentData: AgentInsert = {
      ...body,
      user_id: user.id,
    };

    const agent = await createAgent(agentData, workspaceId);
    return NextResponse.json(agent);
  } catch (error: any) {
    console.error('Error in agents API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
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
      return NextResponse.json({ error: 'Missing agent ID' }, { status: 400 });
    }

    const body = await request.json();
    const agent = await updateAgent(id, body);
    return NextResponse.json(agent);
  } catch (error: any) {
    console.error('Error in agents API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
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
      return NextResponse.json({ error: 'Missing agent ID' }, { status: 400 });
    }

    await deleteAgent(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in agents API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
