import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

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
          setAll(cookiesToSet) {
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
    
    const { data: authData, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && authData?.user) {
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
          await supabase.from('coaches').insert([{
            name: authData.user.user_metadata?.full_name || 'Admin',
            email: email,
            role: 'admin',
            status: 'active'
          }]);
          return NextResponse.redirect(`${origin}${next}`)
        } else {
          // Unauthorized -> sign out and redirect back to login with error
          await supabase.auth.signOut();
          return NextResponse.redirect(`${origin}/login?error=unauthorized`)
        }
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
