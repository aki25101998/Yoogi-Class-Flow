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
  console.log(`[Auth Callback] Origin: ${origin}`);
  console.log(`[Auth Callback] Pathname: ${pathname}`);
  console.log(`[Auth Callback] Has Code: ${!!code}`);
  console.log(`[Auth Callback] Has Provider Error: ${!!providerError}`);

  // Safe cookie logging (names only)
  const allCookies = request.cookies.getAll();
  const cookieNames = allCookies.map(c => c.name);
  console.log(`[Auth Callback] Received Cookie Names:`, cookieNames);
  
  const hasPkceVerifier = cookieNames.some(name => name.includes('code-verifier'));
  console.log(`[Auth Callback] PKCE_VERIFIER_PRESENT=${hasPkceVerifier}`);


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
      const user = authData.user;
      const email = user.email?.toLowerCase().trim();
      
      // 1. Check or Create Profile
      let { data: profile } = await supabase.from('profiles').select('*').eq('auth_user_id', user.id).single();
      
      if (!profile) {
        // Fallback for legacy profile by email
        let { data: legacyProfile } = await supabase.from('profiles').select('*').eq('email', email).single();
        if (legacyProfile) {
          const { data: updatedProfile } = await supabase.from('profiles')
            .update({ auth_user_id: user.id })
            .eq('id', legacyProfile.id)
            .select()
            .single();
          profile = updatedProfile;
        } else {
          const { data: newProfile, error: profileErr } = await supabase.from('profiles').insert([{
            auth_user_id: user.id,
            email: email,
            name: user.user_metadata?.full_name || email?.split('@')[0] || 'User',
            avatar_url: user.user_metadata?.avatar_url || ''
          }]).select().single();
          
          if (profileErr) console.error("Profile insert error:", profileErr);
          profile = newProfile;
        }
      }

      if (profile) {
        // 2. Check for pending invitations
        const { data: invitations } = await supabase.from('organization_invitations')
          .select('*')
          .eq('email', email)
          .eq('status', 'pending');
          
        if (invitations && invitations.length > 0) {
          return NextResponse.redirect(`${origin}/accept-invite`);
        }

        // 3. Check for active organization memberships
        const { data: memberships } = await supabase.from('organization_members')
          .select('*')
          .eq('user_id', profile.id)
          .eq('status', 'active');

        if (memberships && memberships.length > 0) {
          return NextResponse.redirect(`${origin}${next}`);
        } else {
          // No organization, redirect to create one
          return NextResponse.redirect(`${origin}/create-organization`);
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
