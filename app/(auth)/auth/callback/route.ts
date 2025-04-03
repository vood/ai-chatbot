import { createClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * Auth callback route handler - handles redirects from email OTP and OAuth providers
 * This route is hit after a user clicks a magic link or completes OAuth flow
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  
  // If no code in URL, redirect to login
  if (!code) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    // Create Supabase server client
    const supabase = await createClient();
    
    // Exchange code for session
    await supabase.auth.exchangeCodeForSession(code);
    
    // Get the "next" URL parameter (where to redirect after login)
    // Defaulting to '/' (home) if not specified
    const next = requestUrl.searchParams.get('next') || '/';
    
    // Create an absolute URL from the relative "next" path
    const redirectUrl = new URL(next, request.url);
    
    // Redirect user to the specified next page or home
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Error in auth callback:', error);
    // Redirect to login with error
    return NextResponse.redirect(
      new URL('/login?error=Could+not+authenticate+user', request.url)
    );
  }
} 