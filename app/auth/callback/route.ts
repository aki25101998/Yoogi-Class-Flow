import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  
  console.log("Auth callback accessed. URL:", request.url);

  if (code) {
    const cookieStore = cookies()
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        auth: {
          flowType: 'pkce',
          storage: {
            getItem: (key) => {
              let val = cookieStore.get(key)?.value;
              // Robust fallback: if not found, find ANY code verifier cookie
              if (!val && key.includes('code-verifier')) {
                val = cookieStore.getAll().find(c => c.name.includes('code-verifier'))?.value;
              }
              return val ?? null;
            },
            setItem: (key, value) => {
              try { cookieStore.set({ name: key, value, path: '/', sameSite: 'lax', secure: true }) } catch {}
            },
            removeItem: (key) => {
              try { cookieStore.set({ name: key, value: '', maxAge: 0, path: '/' }) } catch {}
            }
          },
          storageKey: 'sb-yoogi',
        }
      }
    )
    
    console.log("Exchanging code for session...");
    const { data: authData, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error("Error exchanging code for session:", error);
      const cookieNames = cookieStore.getAll().map((c: any) => c.name).join(', ');
      return NextResponse.redirect(`${origin}/login?error=auth_failed&details=${encodeURIComponent(error.message + ' | Cookies present: ' + (cookieNames || 'none'))}`)
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
