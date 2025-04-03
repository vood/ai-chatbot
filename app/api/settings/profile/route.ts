import { createClient, auth } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// API route for saving profile-level API keys
export async function POST(req: NextRequest) {
  try {
    const user = await auth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const data = await req.json();

    // Save the API keys directly to the profiles table fields
    const { error } = await supabase
      .from('profiles')
      .upsert({
        user_id: user.id,
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
        openrouter_api_key: data.openrouter_api_key
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('Error saving profile API keys:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in profile API keys API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// API route for getting profile-level API keys
export async function GET() {
  try {
    const user = await auth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('profiles')
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
        openrouter_api_key
      `)
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile API keys:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return API keys or empty object if not found
    return NextResponse.json(data || {});
  } catch (error: any) {
    console.error('Error in profile API keys API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 