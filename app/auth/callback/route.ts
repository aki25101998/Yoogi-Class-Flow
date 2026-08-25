import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams, origin, pathname } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  
  // Extract OAuth error parameters safely
  const providerError = searchParams.get('error');
  const error_description = searchParams.get('error_description');
  const error_code = searchParams.get('error_code');
  const error_uri = searchParams.get('error_uri');

  // Log safe info before exchange
  console.log(`[Auth Callback] Pathname: ${pathname}`);
  console.log(`[Auth Callback] Has Code: ${!!code}`);
  console.log(`[Auth Callback] Has Provider Error: ${!!providerError}`);

  if (code) {
    const supabase = await createClient();
    const { data: authData, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[Auth Callback] Exchange Error:", {
        message: error.message,
        name: error.name,
        status: error.status,
        // @ts-ignore
        code: error.code
      });
      
      const safeErrorMessage = encodeURIComponent(error.message || 'unknown_exchange_error');
      return NextResponse.redirect(`${origin}/login?error=auth_failed&debug=${safeErrorMessage}`);
    }

    if (authData?.user) {
      const email = authData.user.email?.toLowerCase().trim();
      const { data: coaches } = await supabase.from('coaches').select('*').eq('email', email);

      if (coaches && coaches.length > 0) {
        return NextResponse.redirect(`${origin}${next}`);
      } else {
        const { count } = await supabase.from('coaches').select('*', { count: 'exact', head: true });
        
        if (count === 0) {
          // First user -> make admin
          const { error: insertError } = await supabase.from('coaches').insert([{
            name: authData.user.user_metadata?.full_name || 'Admin',
            email: email,
            role: 'admin',
            status: 'active'
          }]);
          
          if (insertError) {
            console.error("Insert error:", insertError);
          }
          return NextResponse.redirect(`${origin}${next}`);
        } else {
          // Unauthorized
          await supabase.auth.signOut();
          return NextResponse.redirect(`${origin}/login?error=unauthorized`);
        }
      }
    }
  } else if (providerError) {
    console.error("[Auth Callback] Provider Error:", {
      error: providerError,
      description: error_description,
      code: error_code,
      uri: error_uri
    });
    
    const safeErrorMessage = encodeURIComponent(error_description || providerError || 'provider_error');
    return NextResponse.redirect(`${origin}/login?error=auth_failed&debug=${safeErrorMessage}`);
  }

  // No code present and no specific provider error
  console.log("[Auth Callback] No code and no error in URL");
  return NextResponse.redirect(`${origin}/login?error=auth_failed&debug=no_code_in_url`);
}
