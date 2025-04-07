import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  // Create a supabase client on the browser with project specific url and anon key
  return createBrowserClient(
    // biome-ignore lint/style/noNonNullAssertion: Supabase URL is always set
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    // biome-ignore lint/style/noNonNullAssertion: Supabase anon key is always set
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export const supabase = createClient();
