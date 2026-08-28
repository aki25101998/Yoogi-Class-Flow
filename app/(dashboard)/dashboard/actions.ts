'use server';

import { getCurrentOrganizationContext } from '@/services/organization.service';
import { getSessionsForDate, cancelSession, overrideCoach, ClassSession } from '@/services/session.service';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';

export async function fetchTodaySessionsAction(dateStr: string, coachId?: string): Promise<ClassSession[]> {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return [];
  
  return await getSessionsForDate(context.organization.id, dateStr, coachId);
}

export async function cancelSessionAction(classId: string, dateStr: string) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const { error } = await cancelSession(context.organization.id, classId, dateStr);
  if (error) return { success: false, error: error.message };

  revalidatePath('/dashboard');
  revalidatePath('/schedule');
  return { success: true };
}

export async function overrideCoachAction(classId: string, dateStr: string, newCoachId: string) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const { error } = await overrideCoach(context.organization.id, classId, dateStr, newCoachId);
  if (error) return { success: false, error: error.message };

  revalidatePath('/dashboard');
  revalidatePath('/schedule');
  return { success: true };
}

export async function checkInSessionAction(classId: string, dateStr: string, status: 'checked_in') {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization || !context.membership) return { success: false, error: 'Access Denied' };

  const supabase = await createClient();
  
  // First, verify if there is an existing record
  const { data: existing } = await supabase.from('teacher_salary_sessions')
    .select('id, coach_id')
    .eq('organization_id', context.organization.id)
    .eq('class_id', classId)
    .eq('date', dateStr)
    .single();

  let coachId = context.membership.user_id; // Default to current user
  
  if (existing) {
    if (existing.coach_id) coachId = existing.coach_id; // Keep the overridden coach if exists

    const { error } = await supabase.from('teacher_salary_sessions')
      .update({ 
        status: status,
        check_in_time: new Date().toISOString(),
        check_in_by: context.membership.user_id
      })
      .eq('id', existing.id);
    if (error) return { success: false, error: error.message };
  } else {
    // We need to fetch original coach_id from schedule if we want to record who checked in?
    // Let's just set the coach_id to the person who checked in (assuming it's them).
    const { error } = await supabase.from('teacher_salary_sessions').insert({
      organization_id: context.organization.id,
      class_id: classId,
      date: dateStr,
      status: status,
      coach_id: coachId,
      check_in_time: new Date().toISOString(),
      check_in_by: context.membership.user_id
    });
    if (error) return { success: false, error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}
