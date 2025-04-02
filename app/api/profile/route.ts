import { createClient, auth, createServiceRoleClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// API route for saving profile data
export async function POST(req: NextRequest) {
  try {
    const user = await auth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const data = await req.json();

    // Save the profile data directly to the profile fields
    const { error } = await supabase
      .from('profiles')
      .upsert({
        user_id: user.id,
        updated_at: new Date().toISOString(),
        // Add profile fields directly
        name: data.name,
        email: data.email,
        avatar_url: data.avatar_url,
        profile_context: data.profile_context,
        system_prompt_template: data.system_prompt_template,
        large_text_threshold: data.large_text_threshold,
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('Error saving profile data:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in profile API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// API route for getting profile data
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
        display_name,
        image_url,
        image_path,
        profile_context,
        system_prompt_template,
        large_text_paste_threshold
      `)
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile data:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return profile data or empty object if not found
    return NextResponse.json({
      data: {
        ...user,  
        ...data
      },
      error: error || null
    });
  } catch (error: any) {
    console.error('Error in profile API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// API route for deleting a user account
export async function DELETE() {
  try {
    const user = await auth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServiceRoleClient();
    // Finally, delete the user's auth account
    const { error: authError } = await supabase.auth.admin.deleteUser(user.id, true);

    if (authError) {
      console.error('Error deleting user auth:', authError);
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in delete account API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 