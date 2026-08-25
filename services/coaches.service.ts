import { createClient } from "@/utils/supabase/server";
import { Coach } from "@/types/coach";

export const CoachesService = {
  async getCoachByAuthId(authUserId: string): Promise<Coach | null> {
    const supabase = createClient();
    const { data } = await supabase
      .from('coaches')
      .select('*')
      .eq('auth_user_id', authUserId)
      .limit(1);
    
    return data && data.length > 0 ? (data[0] as Coach) : null;
  },
  
  async getActiveCoaches(): Promise<Coach[]> {
    const supabase = createClient();
    const { data } = await supabase
      .from('coaches')
      .select('id, name, email, phone, role, photo_url, status')
      .eq('status', 'active');
      
    return (data || []) as Coach[];
  }
};
