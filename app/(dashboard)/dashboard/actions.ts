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
  const currentCoachId = context.coach?.id || null;

  // 1. Try atomic Stored Procedure RPC first (bypasses complex multi-table client RLS safely)
  try {
    const { data: rpcResult, error: rpcError } = await supabase.rpc('checkin_session', {
      p_organization_id: orgId,
      p_class_id: classId,
      p_date: dateStr,
      p_schedule_id: scheduleId || null,
      p_session_id: sessionId || null,
      p_coach_id: currentCoachId
    });

    if (!rpcError && rpcResult) {
      if (rpcResult.success) {
        revalidatePath('/dashboard');
        revalidatePath('/my-checkin');
        revalidatePath('/my-schedule');
        revalidatePath('/my-attendance');
        revalidatePath('/my-earnings');
        revalidatePath('/schedule');
        return { success: true };
      } else if (rpcResult.error) {
        return { success: false, error: rpcResult.error };
      }
    }
  } catch (e) {
    console.warn('RPC checkin_session failed, falling back to direct operations:', e);
  }

  // 2. Fallback: Direct table operations
  let primaryCoachId = currentCoachId;
  
  if (sessionId) {
    // If we have a sessionId, the session already exists in DB
    const { data: existing } = await supabase.from('class_sessions')
      .select('id, coach_id')
      .eq('id', sessionId)
      .eq('organization_id', orgId)
      .single();

    if (existing) {
      if (existing.coach_id) primaryCoachId = existing.coach_id;
      const { error } = await supabase.from('class_sessions')
        .update({ 
          status: status,
          check_in_time: new Date().toISOString()
        })
        .eq('id', existing.id)
        .eq('organization_id', orgId);
      
      if (error) return { success: false, error: error.message };
      
      // Update/insert session_coaches status as well
      if (currentCoachId) {
        await supabase.from('session_coaches').upsert({
          organization_id: orgId,
          session_id: existing.id,
          coach_id: currentCoachId,
          status: status
        }, { onConflict: 'session_id, coach_id' });
      }
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
         .eq('organization_id', orgId)
         .single();
       if (schedule) {
         originalCoachId = schedule.coach_id;
         startTime = schedule.start_time;
         endTime = schedule.end_time;
         if (schedule.coach_id) primaryCoachId = schedule.coach_id;
         if (schedule.schedule_coaches && schedule.schedule_coaches.length > 0) {
           scheduleCoaches = schedule.schedule_coaches;
         }
       }
    }

    // Fallback times from class if missing
    if (!startTime || !endTime) {
      const { data: cls } = await supabase.from('venue_classes')
        .select('start_time, end_time')
        .eq('id', classId)
        .eq('organization_id', orgId)
        .single();
      if (cls) {
        startTime = startTime || cls.start_time;
        endTime = endTime || cls.end_time;
      }
    }

    // Check if a session already exists for this class on this date
    const { data: existingForClass } = await supabase.from('class_sessions')
      .select('id, schedule_id, coach_id')
      .eq('organization_id', orgId)
      .eq('class_id', classId)
      .eq('date', dateStr)
      .maybeSingle();

    if (existingForClass) {
      const { error: updateErr } = await supabase.from('class_sessions')
        .update({
          status: status,
          check_in_time: new Date().toISOString(),
          schedule_id: existingForClass.schedule_id || scheduleId || null
        })
        .eq('id', existingForClass.id)
        .eq('organization_id', orgId);

      if (updateErr) return { success: false, error: updateErr.message };

      if (currentCoachId) {
        await supabase.from('session_coaches').upsert({
          organization_id: orgId,
          session_id: existingForClass.id,
          coach_id: currentCoachId,
          status: status
        }, { onConflict: 'session_id, coach_id' });
      }

      revalidatePath('/dashboard');
      revalidatePath('/my-checkin');
      revalidatePath('/my-schedule');
      revalidatePath('/my-attendance');
      revalidatePath('/my-earnings');
      revalidatePath('/schedule');
      return { success: true };
    }

    try {
      // Upsert to prevent race conditions on double click
      const sessionData = {
        organization_id: orgId,
        class_id: classId,
        schedule_id: scheduleId || null,
        date: dateStr,
        status: status,
        check_in_time: new Date().toISOString(),
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
            status: sc.coach_id === currentCoachId ? status : 'scheduled'
          }));
          
          await supabase.from('session_coaches').upsert(sessionCoachesData, { onConflict: 'session_id, coach_id' });
        } else if (currentCoachId) {
          await supabase.from('session_coaches').upsert({
            organization_id: orgId,
            session_id: session.id,
            coach_id: currentCoachId,
            status: status
          }, { onConflict: 'session_id, coach_id' });
        }
      }
    } catch (e: any) {
      return { success: false, error: e.message || 'Lỗi khi tạo ca học.' };
    }
  }

  revalidatePath('/dashboard');
  revalidatePath('/my-checkin');
  revalidatePath('/my-schedule');
  revalidatePath('/my-attendance');
  revalidatePath('/my-earnings');
  revalidatePath('/schedule');
  return { success: true };
}
