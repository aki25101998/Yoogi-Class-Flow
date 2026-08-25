import { createClient } from '@/utils/supabase/server';
import { getCurrentOrganizationContext } from './organization.service';

export async function assignCoachToClass(classId: string, coachId: string, role: 'HEAD_COACH' | 'ASSISTANT_COACH'): Promise<{ success: boolean; error?: string }> {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Not authenticated' };

  if (context.membership?.role !== 'admin' && context.membership?.role !== 'owner') {
    return { success: false, error: 'Permission denied' };
  }

  const supabase = await createClient();

  // If HEAD_COACH, check if there's already one, because a class can only have 1 HEAD_COACH
  if (role === 'HEAD_COACH') {
    const { data: existingHead } = await supabase.from('class_coaches')
      .select('id')
      .eq('class_id', classId)
      .eq('role', 'HEAD_COACH')
      .single();
    
    if (existingHead) {
      // either update it or return error. Let's return error to be safe.
      return { success: false, error: 'Lớp này đã có Huấn luyện viên trưởng. Vui lòng gỡ HLV trưởng hiện tại trước.' };
    }
  }

  const { error } = await supabase.from('class_coaches').insert([{
    organization_id: context.organization.id,
    class_id: classId,
    coach_id: coachId,
    role
  }]);

  if (error) {
    if (error.code === '23505') { // unique violation
      return { success: false, error: 'Huấn luyện viên này đã được phân công vào lớp này.' };
    }
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function removeCoachFromClass(classId: string, coachId: string): Promise<{ success: boolean; error?: string }> {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Not authenticated' };

  if (context.membership?.role !== 'admin' && context.membership?.role !== 'owner') {
    return { success: false, error: 'Permission denied' };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('class_coaches')
    .delete()
    .eq('class_id', classId)
    .eq('coach_id', coachId)
    .eq('organization_id', context.organization.id);

  if (error) return { success: false, error: error.message };

  return { success: true };
}
