import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get the user's workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (workspaceError || !workspace) {
      return new NextResponse('Workspace not found', { status: 404 });
    }

    // Get all members of the workspace
    const { data: members, error: membersError } = await supabase
      .from('workspace_users')
      .select('email, role, status')
      .eq('workspace_id', workspace.id);

    if (membersError) {
      console.error('Error fetching workspace members:', membersError);
      return new NextResponse('Failed to fetch workspace members', { status: 500 });
    }

    // Get all pending invitations
    const { data: invitations, error: invitationsError } = await supabase
      .from('workspace_invitations')
      .select('email, role, status')
      .eq('workspace_id', workspace.id);

    if (invitationsError) {
      console.error('Error fetching workspace invitations:', invitationsError);
      return new NextResponse('Failed to fetch workspace invitations', { status: 500 });
    }

    // Combine members and invitations into a single array
    const allMembers = [
      ...(members || []).map(member => ({ ...member, status: 'ACTIVE' })),
      ...(invitations || []).map(invitation => ({ ...invitation, status: 'INVITED' }))
    ];

    return NextResponse.json(allMembers);
  } catch (error) {
    console.error('Error in workspace members route:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 