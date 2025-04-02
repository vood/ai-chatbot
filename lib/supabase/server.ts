import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { User } from '@supabase/supabase-js'
import { jwtDecode } from 'jwt-decode'
// Make createClient async and await cookies()
export async function createClient() {
  const cookieStore = await cookies()

  // Create a server supabase client with cookies
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // Now we can safely call .get()
          return cookieStore.getAll()
        },
        setAll(cookies) {
          try {
            // Now we can safely call .set()
            for (const cookie of cookies) {
              cookieStore.set({ name: cookie.name, value: cookie.value, ...cookie.options })
            }
          } catch (error) {
            console.error("Error setting cookies:", error)
          }
        }
      },
    }
  )
}


type JWTData = {
    current_workspace: string
    workspaces: string[]
}


export type UserWithWorkspace = User & JWTData


function getClaimsFromJWT(jwt: string) {
  

  try {
    const decoded = jwtDecode(jwt) as JWTData
    return {
      current_workspace: decoded.current_workspace,
      workspaces: decoded.workspaces || [],
    }
  } catch (error) {
    console.error("Error decoding JWT:", error)
    return null
  }
}

// New helper function to get the user session
export async function auth(): Promise<UserWithWorkspace | null> {
  // Await the async createClient()
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  // get worksspaces from jwt claims
  const { data: session } = await supabase.auth.getSession() 

  const decoded = jwtDecode(session.session?.access_token ?? '')

  // Basic error logging, consider more robust error handling
  if (error) {
      console.log("Error fetching user:", error.message);
      return null;
  }

  const claims = getClaimsFromJWT(session.session?.access_token ?? '')

  if (!claims) {
    console.error("Error getting claims from JWT:", error)
    return null
  }

  return {
    ...data.user,
    ...claims,
  }
} 