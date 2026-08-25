import { createClient } from "@/utils/supabase/server";

export async function getCurrentCoach() {
  const supabase = createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  
  if (authError || !authData?.user) {
    return { user: null, coach: null, error: authError || new Error("Not authenticated") };
  }

  const user = authData.user;
  
  // 1. Try mapping by auth_user_id first
  const { data: coachesById } = await supabase
    .from('coaches')
    .select('*')
    .eq('auth_user_id', user.id);
    
  if (coachesById && coachesById.length > 0) {
    return { user, coach: coachesById[0], error: null };
  }

  // 2. Fallback to email mapping (for backward compatibility during migration)
  const email = user.email?.toLowerCase().trim();
  const { data: coachesByEmail } = await supabase
    .from('coaches')
    .select('*')
    .eq('email', email);
    
  if (coachesByEmail && coachesByEmail.length > 0) {
    return { user, coach: coachesByEmail[0], error: null };
  }

  return { user, coach: null, error: new Error("Coach record not found") };
}
