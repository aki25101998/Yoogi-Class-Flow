import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  
  if (code) {
    const supabase = createClient();
    const { data: authData, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Auth error:", error.message);
      return NextResponse.redirect(`${origin}/login?error=auth_failed`);
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
  }

  // No code present
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
