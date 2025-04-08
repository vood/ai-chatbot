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
    const { email, role } = await request.json();

    if (!email || !role) {
      return new NextResponse('Email and role are required', { status: 400 });
    }

    if (role !== 'OWNER' && role !== 'MEMBER') {
      return new NextResponse('Invalid role', { status: 400 });
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
      return new NextResponse('Only workspace owners can change roles', { status: 403 });
    }

    // Update the member's role
    const { data: updatedMember, error: updateError } = await supabase
      .from('workspace_users')
      .update({ role })
      .eq('workspace_id', workspace.id)
      .eq('email', email)
      .select('email, role, status')
      .single();

    if (updateError) {
      console.error('Error updating workspace member role:', updateError);
      return new NextResponse('Failed to update workspace member role', { status: 500 });
    }

    return NextResponse.json(updatedMember);
  } catch (error) {
    console.error('Error in workspace member role update route:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 