import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  
  console.log("Auth callback accessed. URL:", request.url);

  if (code) {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet: any[]) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `setAll` method was called from a Server Component.
            }
          },
        },
      }
    )
    
    console.log("Exchanging code for session...");
    const { data: authData, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error("Error exchanging code for session:", error);
      return NextResponse.redirect(`${origin}/login?error=auth_failed&details=${encodeURIComponent(error.message)}`)
    } else {
      console.log("Exchange successful. User ID:", authData?.user?.id);
    }
    
    if (authData?.user) {
      // Custom Logic: Check if user exists in coaches table
      const email = authData.user.email?.toLowerCase().trim();
      const { data: coaches } = await supabase.from('coaches').select('*').eq('email', email);
      
      if (coaches && coaches.length > 0) {
        // User exists, redirect to dashboard
        return NextResponse.redirect(`${origin}${next}`)
      } else {
        // Check if ANY coaches exist
        const { count } = await supabase.from('coaches').select('*', { count: 'exact', head: true });
        if (count === 0) {
          // First user -> make admin
          console.log("First user, creating admin record for", email);
          const { error: insertError } = await supabase.from('coaches').insert([{
            name: authData.user.user_metadata?.full_name || 'Admin',
            email: email,
            role: 'admin',
            status: 'active'
          }]);
          if (insertError) console.error("Insert error:", insertError);
          return NextResponse.redirect(`${origin}${next}`)
        } else {
          // Unauthorized -> sign out and redirect back to login with error
          console.log("Unauthorized user. Count:", count);
          await supabase.auth.signOut();
          return NextResponse.redirect(`${origin}/login?error=unauthorized`)
        }
      }
    }
  } else {
    console.error("No code present in the URL parameters.");
    const providerError = searchParams.get('error')
    const providerErrorDescription = searchParams.get('error_description')
    if (providerError) {
      return NextResponse.redirect(`${origin}/login?error=auth_failed&details=${encodeURIComponent(providerErrorDescription || providerError)}`)
    }
    return NextResponse.redirect(`${origin}/login?error=auth_failed&details=No_code_provided_in_URL`)
  }

  // Fallback
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
