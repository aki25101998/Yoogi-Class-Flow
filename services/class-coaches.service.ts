import { createClient } from '@/utils/supabase/server';
import { getCurrentOrganizationContext } from './organization.service';

export type CoachRole = 'HEAD_COACH' | 'ASSISTANT_COACH';

export async function assignCoachToClass(classId: string, coachId: string, role: CoachRole): Promise<{ success: boolean; error?: string }> {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Not authenticated' };

  if (context.membership?.role !== 'admin' && context.membership?.role !== 'owner') {
    return { success: false, error: 'Permission denied' };
  }

  const supabase = await createClient();

  // Verify coach belongs to organization and is active
  const { data: coachData } = await supabase.from('coaches')
    .select('status')
    .eq('id', coachId)
    .eq('organization_id', context.organization.id)
    .single();

  if (!coachData) {
    return { success: false, error: 'Huấn luyện viên không tồn tại trong tổ chức.' };
  }
  if (coachData.status !== 'active') {
    return { success: false, error: 'Huấn luyện viên này hiện đang không hoạt động.' };
  }

  // If HEAD_COACH, check if there's already one
  if (role === 'HEAD_COACH') {
    const { data: existingHead } = await supabase.from('class_coaches')
      .select('id')
      .eq('class_id', classId)
      .eq('role', 'HEAD_COACH')
      .maybeSingle();
    
    if (existingHead) {
      return { success: false, error: 'Lớp này đã có Huấn luyện viên trưởng. Vui lòng gỡ HLV trưởng hiện tại hoặc chuyển đổi vai trò trước.' };
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

export async function changeCoachRole(classId: string, coachId: string, newRole: CoachRole): Promise<{ success: boolean; error?: string }> {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Not authenticated' };

  if (context.membership?.role !== 'admin' && context.membership?.role !== 'owner') {
    return { success: false, error: 'Permission denied' };
  }

  const supabase = await createClient();

  if (newRole === 'HEAD_COACH') {
    // Check for existing HEAD_COACH
    const { data: existingHead } = await supabase.from('class_coaches')
      .select('id, coach_id')
      .eq('class_id', classId)
      .eq('role', 'HEAD_COACH')
      .maybeSingle();

    if (existingHead && existingHead.coach_id !== coachId) {
      // Demote existing head coach first to avoid unique constraint violation
      const { error: demoteError } = await supabase.from('class_coaches')
        .update({ role: 'ASSISTANT_COACH' })
        .eq('id', existingHead.id);
        
      if (demoteError) return { success: false, error: demoteError.message };
    }
  }

  const { error } = await supabase.from('class_coaches')
    .update({ role: newRole })
    .eq('class_id', classId)
    .eq('coach_id', coachId)
    .eq('organization_id', context.organization.id);

  if (error) return { success: false, error: error.message };

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
