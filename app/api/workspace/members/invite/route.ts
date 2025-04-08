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

    // Check if the user is already a member or has a pending invitation
    const { data: existingMember } = await supabase
      .from('workspace_users')
      .select('email')
      .eq('workspace_id', workspace.id)
      .eq('email', email)
      .single();

    if (existingMember) {
      return new NextResponse('User is already a member of this workspace', { status: 400 });
    }

    const { data: existingInvitation } = await supabase
      .from('workspace_invitations')
      .select('email')
      .eq('workspace_id', workspace.id)
      .eq('email', email)
      .single();

    if (existingInvitation) {
      return new NextResponse('User already has a pending invitation', { status: 400 });
    }

    // Create a new invitation
    const { data: newInvitation, error: insertError } = await supabase
      .from('workspace_invitations')
      .insert({
        workspace_id: workspace.id,
        email,
        role: 'MEMBER',
        status: 'PENDING',
      })
      .select('id, email, role, status')
      .single();

    if (insertError) {
      console.error('Error creating workspace invitation:', insertError);
      return new NextResponse('Failed to create workspace invitation', { status: 500 });
    }

    // Send invitation email
    const { error: emailError } = await supabase.functions.invoke('send-email', {
      body: {
        to: email,
        template: 'workspace_invitation',
        data: {
          InvitationLink: `${process.env.NEXT_PUBLIC_APP_URL}/workspace/join?invitation=${newInvitation.id}`,
          InviterEmail: user.email,
        },
      },
    });

    if (emailError) {
      console.error('Error sending invitation email:', emailError);
      // Don't fail the request if email sending fails
      // Just log the error and continue
    }

    return NextResponse.json(newInvitation);
  } catch (error) {
    console.error('Error in workspace invitation route:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 