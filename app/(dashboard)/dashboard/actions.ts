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
  const orgId = context.organization.id;
  
  let primaryCoachId = context.membership.user_id; // Default to current user
  
  if (sessionId) {
    // If we have a sessionId, the session already exists in DB
    const { data: existing } = await supabase.from('class_sessions')
      .select('id, coach_id')
      .eq('id', sessionId)
      .single();

    if (existing) {
      if (existing.coach_id) primaryCoachId = existing.coach_id;
      const { error } = await supabase.from('class_sessions')
        .update({ 
          status: status,
          check_in_time: new Date().toISOString()
        })
        .eq('id', existing.id);
      
      if (error) return { success: false, error: error.message };
      
      // Update session_coaches status as well
      await supabase.from('session_coaches')
        .update({ status: status })
        .eq('session_id', existing.id)
        .eq('organization_id', orgId);
    }
  } else {
    // We need to fetch original coach_id from schedule if we want to record who checked in
    let originalCoachId = null;
    let startTime = null;
    let endTime = null;
    let scheduleCoaches: any[] = [];
    
    if (scheduleId) {
       const { data: schedule } = await supabase.from('schedules')
         .select('coach_id, start_time, end_time, schedule_coaches(coach_id)')
         .eq('id', scheduleId)
         .single();
       if (schedule) {
         originalCoachId = schedule.coach_id;
         startTime = schedule.start_time;
         endTime = schedule.end_time;
         primaryCoachId = schedule.coach_id;
         if (schedule.schedule_coaches) {
           scheduleCoaches = schedule.schedule_coaches;
         }
       }
    }

    try {
      // Upsert to prevent race conditions on double click
      const sessionData = {
        organization_id: orgId,
        class_id: classId,
        schedule_id: scheduleId || null,
        date: dateStr,
        status: status,
        coach_id: primaryCoachId,
        original_coach_id: originalCoachId,
        start_time: startTime,
        end_time: endTime
      };

      let query = supabase.from('class_sessions').upsert(sessionData, { 
        onConflict: scheduleId ? 'organization_id, schedule_id, date' : undefined 
      }).select('id').single();

      const { data: session, error } = await query;
      
      if (error) {
         return { success: false, error: error.message };
      }

      // Dual Write: Insert to session_coaches
      if (session) {
        if (scheduleCoaches.length > 0) {
          const sessionCoachesData = scheduleCoaches.map((sc: any) => ({
            organization_id: orgId,
            session_id: session.id,
            coach_id: sc.coach_id,
            status: status
          }));
          
          await supabase.from('session_coaches').upsert(sessionCoachesData, { onConflict: 'session_id, coach_id' });
        } else if (primaryCoachId) {
          // Fallback legacy
          await supabase.from('session_coaches').upsert({
            organization_id: orgId,
            session_id: session.id,
            coach_id: primaryCoachId,
            status: status
          }, { onConflict: 'session_id, coach_id' });
        }
      }
    } catch (e: any) {
      return { success: false, error: e.message || 'Lỗi khi tạo ca học.' };
    }
  }

  revalidatePath('/dashboard');
  return { success: true };
}
