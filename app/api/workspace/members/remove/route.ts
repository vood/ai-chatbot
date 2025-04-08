import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
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

    // Get the request body
    const { email } = await request.json();

    if (!email) {
      return new NextResponse('Email is required', { status: 400 });
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

    // Check if the current user is the owner
    const { data: currentUserRole } = await supabase
      .from('workspace_users')
      .select('role')
      .eq('workspace_id', workspace.id)
      .eq('email', user.email)
      .single();

    if (!currentUserRole || currentUserRole.role !== 'OWNER') {
      return new NextResponse('Only workspace owners can remove members', { status: 403 });
    }

    // Check if the member to be removed is the owner
    const { data: memberToRemove } = await supabase
      .from('workspace_users')
      .select('role')
      .eq('workspace_id', workspace.id)
      .eq('email', email)
      .single();

    if (memberToRemove?.role === 'OWNER') {
      return new NextResponse('Cannot remove workspace owner', { status: 400 });
    }

    // Remove the member
    const { error: deleteError } = await supabase
      .from('workspace_users')
      .delete()
      .eq('workspace_id', workspace.id)
      .eq('email', email);

    if (deleteError) {
      console.error('Error removing workspace member:', deleteError);
      return new NextResponse('Failed to remove workspace member', { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error in workspace member removal route:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 