import { createClient, auth } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// API route for saving workspace-level API keys
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

    // Save the API keys directly to the workspaces table fields
    const { error } = await supabase
      .from('workspaces')
      .update({
        updated_at: new Date().toISOString(),
        // Add API keys directly to table fields instead of a settings JSON
        openai_api_key: data.openai_api_key,
        openai_organization_id: data.openai_organization_id,
        use_azure_openai: data.use_azure_openai,
        azure_openai_api_key: data.azure_openai_api_key,
        azure_openai_endpoint: data.azure_openai_endpoint,
        azure_openai_35_turbo_id: data.azure_openai_35_turbo_id,
        azure_openai_45_turbo_id: data.azure_openai_45_turbo_id,
        azure_openai_45_vision_id: data.azure_openai_45_vision_id,
        azure_openai_embeddings_id: data.azure_openai_embeddings_id,
        anthropic_api_key: data.anthropic_api_key,
        google_gemini_api_key: data.google_gemini_api_key,
        mistral_api_key: data.mistral_api_key,
        groq_api_key: data.groq_api_key,
        perplexity_api_key: data.perplexity_api_key,
        openrouter_api_key: data.openrouter_api_key,
        use_bedrock: data.use_bedrock,
      })
      .eq('id', workspaceId);

    if (error) {
      console.error('Error saving workspace API keys:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in workspace API keys API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// API route for getting workspace-level API keys
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
        openai_api_key,
        openai_organization_id,
        use_azure_openai,
        azure_openai_api_key,
        azure_openai_endpoint,
        azure_openai_35_turbo_id,
        azure_openai_45_turbo_id,
        azure_openai_45_vision_id,
        azure_openai_embeddings_id,
        anthropic_api_key,
        google_gemini_api_key,
        mistral_api_key,
        groq_api_key,
        perplexity_api_key,
        openrouter_api_key,
        use_bedrock
      `)
      .eq('id', workspaceId)
      .single();

    if (error) {
      console.error('Error fetching workspace API keys:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return API keys or empty object if not found
    return NextResponse.json(data || {});
  } catch (error: any) {
    console.error('Error in workspace API keys API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 