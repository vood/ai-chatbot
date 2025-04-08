import { createClient, auth } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

// API route for saving workspace data
export async function POST(req: NextRequest) {
  try {
    const user = await auth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current workspace from the user JWT claims
    const workspaceId = user.current_workspace;
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 });
    }

    const supabase = await createClient();
    const data = await req.json();

    // Check if user has access to this workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id')
      .eq('id', workspaceId)
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json({ error: 'Workspace not found or access denied' }, { status: 403 });
    }

    // Save the workspace data directly to the workspaces table fields
    const { error } = await supabase
      .from('workspaces')
      .update({
        updated_at: new Date().toISOString(),
        // Add workspace fields directly
        name: data.name,
        image_path: data.image_path,
        default_context_length: data.default_context_length,
        default_model: data.default_model,
        default_prompt: data.default_prompt,
        default_temperature: data.default_temperature,
      })
      .eq('id', workspaceId);

    if (error) {
      console.error('Error saving workspace data:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in workspace API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// API route for getting workspace data
export async function GET() {
  try {
    const user = await auth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current workspace from the user JWT claims
    const workspaceId = user.current_workspace;
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('workspaces')
      .select(`
        name,
        image_path,
        default_context_length,
        default_model,
        default_prompt,
        default_temperature
      `)
      .eq('id', workspaceId)
      .single();

    if (error) {
      console.error('Error fetching workspace data:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return workspace data or empty object if not found
    return NextResponse.json(data || {});
  } catch (error: any) {
    console.error('Error in workspace API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// API route for deleting a workspace
export async function DELETE() {
  try {
    const user = await auth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current workspace from the user JWT claims
    const workspaceId = user.current_workspace;
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 });
    }

    const supabase = await createClient();

    // Check if user has permission to delete this workspace
    // You might want to add additional permission checks here
    // For example, only workspace owners should be able to delete workspaces
    const { error: permissionError } = await supabase
      .from('workspace_users')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .single();

    if (permissionError) {
      return NextResponse.json({ error: 'You do not have permission to delete this workspace' }, { status: 403 });
    }

    // Delete all workspace-related data first
    // This assumes you have cascade deletion set up or you handle each table separately
    
    // Delete the workspace
    const { error } = await supabase
      .from('workspaces')
      .delete()
      .eq('id', workspaceId);

    if (error) {
      console.error('Error deleting workspace:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in delete workspace API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 