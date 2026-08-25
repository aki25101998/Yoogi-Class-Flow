import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    // Track all cookies that need to be set on the RESPONSE
    const cookiesToSet: { name: string; value: string; options: any }[] = []

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          get(name: string) {
            // Read from the incoming REQUEST (not from cookies() which is for the response)
            const value = request.cookies.get(name)?.value
            if (value) return value

            // Fallback: if looking for code-verifier, find ANY code-verifier cookie
            if (name.includes('code-verifier')) {
              for (const cookie of request.cookies.getAll()) {
                if (cookie.name.includes('code-verifier')) {
                  return cookie.value
                }
              }
            }

            return undefined
          },
          set(name: string, value: string, options: any) {
            // Don't set on an implicit response — track them for later
            cookiesToSet.push({ name, value, options })
          },
          remove(name: string, options: any) {
            cookiesToSet.push({ name, value: '', options: { ...options, maxAge: 0 } })
          },
        },
        cookieOptions: {
          name: 'sb-yoogi',
        },
      }
    )

    const { data: authData, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error("Error exchanging code for session:", error)
      const cookieNames = request.cookies.getAll().map(c => c.name).join(', ')
      return NextResponse.redirect(
        `${origin}/login?error=auth_failed&details=${encodeURIComponent(error.message + ' | Cookies: ' + (cookieNames || 'none'))}`
      )
    }

    // Helper: create a redirect response WITH all the session cookies attached
    function redirectWithCookies(url: string) {
      const response = NextResponse.redirect(url)
      for (const { name, value, options } of cookiesToSet) {
        response.cookies.set(name, value, options)
      }
      return response
    }

    if (authData?.user) {
      const email = authData.user.email?.toLowerCase().trim()
      const { data: coaches } = await supabase.from('coaches').select('*').eq('email', email)

      if (coaches && coaches.length > 0) {
        return redirectWithCookies(`${origin}${next}`)
      } else {
        const { count } = await supabase.from('coaches').select('*', { count: 'exact', head: true })
        if (count === 0) {
          // First user -> make admin
          const { error: insertError } = await supabase.from('coaches').insert([{
            name: authData.user.user_metadata?.full_name || 'Admin',
            email: email,
            role: 'admin',
            status: 'active'
          }])
          if (insertError) console.error("Insert error:", insertError)
          return redirectWithCookies(`${origin}${next}`)
        } else {
          // Unauthorized
          await supabase.auth.signOut()
          return redirectWithCookies(`${origin}/login?error=unauthorized`)
        }
      }
    }
  } else {
    const providerError = searchParams.get('error')
    const providerErrorDescription = searchParams.get('error_description')
    if (providerError) {
      return NextResponse.redirect(
        `${origin}/login?error=auth_failed&details=${encodeURIComponent(providerErrorDescription || providerError)}`
      )
    }
    return NextResponse.redirect(`${origin}/login?error=auth_failed&details=No_code_provided`)
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
