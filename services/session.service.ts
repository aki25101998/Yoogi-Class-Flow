import { createClient } from '@/utils/supabase/server';
import { parseBusinessDate } from '@/utils/date';

export interface ClassSession {
  isVirtual: boolean; // True if it's generated from schedule and not yet saved in DB
  sessionId?: string; // class_sessions.id
  classId: string;
  className: string;
  originalCoachId: string;
  currentCoachId: string;
  originalCoachName: string;
  currentCoachName: string;
  venueId: string;
  venueName: string;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  status: 'pending' | 'cancelled' | 'checked_in' | 'approved' | 'rejected' | 'paid' | 'scheduled';
  checkInTime?: string;
  scheduleId?: string; // Made optional for ad-hoc sessions
}

export async function getSessionsForDate(organizationId: string, dateStr: string, filterCoachId?: string): Promise<ClassSession[]> {
  const supabase = await createClient();
  
  // 1. Get day of week
  const dateObj = parseBusinessDate(dateStr);
  const dayOfWeek = dateObj.getDay(); // 0 (Sun) to 6 (Sat)

  // 2. Fetch periodic schedules
  const { data: schedules } = await supabase
    .from('schedules')
    .select('*, venue_classes(name), coaches(organization_members(profiles(name))), venues(name)')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .eq('day_of_week', dayOfWeek);

  // 3. Fetch exceptions / check-ins (class_sessions) including ad-hoc
  const { data: sessionRecords } = await supabase
    .from('class_sessions')
    .select('*, coaches(organization_members(profiles(name))), venue_classes(name, venue_id, venues(name))')
    .eq('organization_id', organizationId)
    .eq('date', dateStr);

  const results: ClassSession[] = [];
  const processedSessionIds = new Set<string>();

  // 4. Merge periodic schedules
  for (const s of (schedules || [])) {
    // Find if there is a session record for this schedule
    const record = (sessionRecords || []).find(r => r.schedule_id === s.id);

    const baseSession: ClassSession = {
      isVirtual: true,
      classId: s.class_id,
      className: s.venue_classes?.name || '',
      originalCoachId: s.coach_id,
      currentCoachId: s.coach_id,
      originalCoachName: s.coaches?.organization_members?.profiles?.name || '',
      currentCoachName: s.coaches?.organization_members?.profiles?.name || '',
      venueId: s.venue_id,
      venueName: s.venues?.name || '',
      date: dateStr,
      startTime: s.start_time,
      endTime: s.end_time,
      status: 'pending',
      scheduleId: s.id,
    };

    if (record) {
      processedSessionIds.add(record.id);
      baseSession.isVirtual = false;
      baseSession.sessionId = record.id;
      baseSession.currentCoachId = record.coach_id;
      baseSession.currentCoachName = record.coaches?.organization_members?.profiles?.name || '';
      baseSession.status = record.status as any;
      baseSession.checkInTime = record.check_in_time;
      baseSession.startTime = record.start_time || s.start_time;
      baseSession.endTime = record.end_time || s.end_time;
    }

    results.push(baseSession);
  }

  // 5. Add Ad-hoc sessions (sessions not linked to the day's active schedules)
  for (const r of (sessionRecords || [])) {
    if (!processedSessionIds.has(r.id)) {
      results.push({
        isVirtual: false,
        sessionId: r.id,
        classId: r.class_id,
        className: r.venue_classes?.name || '',
        originalCoachId: r.original_coach_id || r.coach_id,
        currentCoachId: r.coach_id,
        originalCoachName: r.coaches?.organization_members?.profiles?.name || '',
        currentCoachName: r.coaches?.organization_members?.profiles?.name || '',
        venueId: r.venue_classes?.venue_id || '',
        venueName: r.venue_classes?.venues?.name || '',
        date: r.date,
        startTime: r.start_time || '',
        endTime: r.end_time || '',
        status: r.status as any,
        checkInTime: r.check_in_time,
        scheduleId: r.schedule_id || undefined,
      });
    }
  }

  if (filterCoachId) {
    return results.filter(r => r.currentCoachId === filterCoachId);
  }

  // Sort by start_time
  return results.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
}

export async function cancelSession(organizationId: string, classId: string, dateStr: string, scheduleId?: string, sessionId?: string) {
  const supabase = await createClient();
  
  if (sessionId) {
    return await supabase.from('class_sessions')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('organization_id', organizationId);
  }

  // Otherwise try to find by scheduleId
  if (!scheduleId) {
    return { error: { message: 'Không thể xác định ca học. Vui lòng cung cấp mã lịch học hoặc mã ca học.' } };
  }

  const { data: existing } = await supabase.from('class_sessions')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('schedule_id', scheduleId)
    .eq('date', dateStr)
    .maybeSingle();

  if (existing) {
    return await supabase.from('class_sessions')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', existing.id);
  } else {
    return await supabase.from('class_sessions').insert({
      organization_id: organizationId,
      class_id: classId,
      schedule_id: scheduleId || null,
      date: dateStr,
      status: 'cancelled',
      coach_id: null,
      cancelled_at: new Date().toISOString()
    });
  }
}

export async function overrideCoach(organizationId: string, classId: string, dateStr: string, newCoachId: string, scheduleId?: string, sessionId?: string) {
  const supabase = await createClient();
  
  if (sessionId) {
    return await supabase.from('class_sessions')
      .update({ status: 'scheduled', coach_id: newCoachId })
      .eq('id', sessionId)
      .eq('organization_id', organizationId);
  }

  if (!scheduleId) {
    return { error: { message: 'Không thể xác định ca học. Vui lòng cung cấp mã lịch học hoặc mã ca học.' } };
  }

  const { data: existing } = await supabase.from('class_sessions')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('schedule_id', scheduleId)
    .eq('date', dateStr)
    .maybeSingle();

  if (existing) {
    return await supabase.from('class_sessions')
      .update({ status: 'scheduled', coach_id: newCoachId })
      .eq('id', existing.id);
  } else {
    return await supabase.from('class_sessions').insert({
      organization_id: organizationId,
      class_id: classId,
      schedule_id: scheduleId || null,
      date: dateStr,
      status: 'scheduled',
      coach_id: newCoachId
    });
  }
}
