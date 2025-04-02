import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Sign out route handler - creates a server-side logout process
 */
export async function POST(request: NextRequest) {
  const requestUrl = new URL(request.url);
  
  try {
    // Create Supabase server client
    const supabase = await createClient();
    
    // Sign out user from their session
    await supabase.auth.signOut();
    
    // Get the redirect URL - default to homepage
    const redirectTo = requestUrl.searchParams.get('redirectTo') || '/';
    
    // Return success response with redirect URL
    return NextResponse.json(
      { success: true, redirectTo },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error signing out:', error);
    // Return error response
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to sign out' 
      },
      { status: 500 }
    );
  }
} 