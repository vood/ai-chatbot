import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Create a supabase client on the browser with project specific url and anon key
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
} 