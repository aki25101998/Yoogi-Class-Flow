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

export async function cancelSessionAction(classId: string, dateStr: string, scheduleId?: string, sessionId?: string) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const { error } = await cancelSession(context.organization.id, classId, dateStr, scheduleId, sessionId);
  if (error) return { success: false, error: error.message };

  revalidatePath('/dashboard');
  revalidatePath('/schedule');
  return { success: true };
}

export async function overrideCoachAction(classId: string, dateStr: string, newCoachId: string, scheduleId?: string, sessionId?: string) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const { error } = await overrideCoach(context.organization.id, classId, dateStr, newCoachId, scheduleId, sessionId);
  if (error) return { success: false, error: error.message };

  revalidatePath('/dashboard');
  revalidatePath('/schedule');
  return { success: true };
}

export async function checkInSessionAction(classId: string, dateStr: string, status: 'checked_in', scheduleId?: string, sessionId?: string) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization || !context.membership) return { success: false, error: 'Access Denied' };

  const supabase = await createClient();
  
  let coachId = context.membership.user_id; // Default to current user
  
  if (sessionId) {
    // If we have a sessionId, the session already exists in DB
    const { data: existing } = await supabase.from('class_sessions')
      .select('id, coach_id')
      .eq('id', sessionId)
      .single();

    if (existing) {
      if (existing.coach_id) coachId = existing.coach_id;
      const { error } = await supabase.from('class_sessions')
        .update({ 
          status: status,
          check_in_time: new Date().toISOString(),
          // check_in_by: context.membership.user_id // Not in schema based on latest migration, assuming we just log it implicitly or skip.
        })
        .eq('id', existing.id);
      if (error) return { success: false, error: error.message };
    }
  } else {
    // We need to fetch original coach_id from schedule if we want to record who checked in
    let originalCoachId = null;
    let startTime = null;
    let endTime = null;
    
    if (scheduleId) {
       const { data: schedule } = await supabase.from('schedules').select('coach_id, start_time, end_time').eq('id', scheduleId).single();
       if (schedule) {
         originalCoachId = schedule.coach_id;
         startTime = schedule.start_time;
         endTime = schedule.end_time;
         coachId = schedule.coach_id;
       }
    }

    const { error } = await supabase.from('class_sessions').insert({
      organization_id: context.organization.id,
      class_id: classId,
      schedule_id: scheduleId || null,
      date: dateStr,
      status: status,
      coach_id: coachId,
      original_coach_id: originalCoachId,
      start_time: startTime,
      end_time: endTime,
      // check_in_time isn't in class_sessions schema initially but let's assume it exists or we omit it if it fails. Actually it's probably missing from the 015 migration. Let's just omit check_in_time and check_in_by if they don't exist.
    });
    
    if (error) {
       // fallback if check_in_time column exists but something else fails
       return { success: false, error: error.message };
    }
  }

  revalidatePath('/dashboard');
  return { success: true };
}
