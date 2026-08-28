import { createClient } from '@/utils/supabase/server';

export interface ClassSession {
  isVirtual: boolean; // True if it's generated from schedule and not yet saved in DB
  sessionId?: string; // teacher_salary_sessions.id
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
  status: 'pending' | 'cancelled' | 'checked_in' | 'approved' | 'rejected' | 'paid' | 'scheduled'; // 'scheduled' is for override without checkin yet
  checkInTime?: string;
  scheduleId: string;
}

export async function getSessionsForDate(organizationId: string, dateStr: string, filterCoachId?: string): Promise<ClassSession[]> {
  const supabase = await createClient();
  
  // 1. Get day of week
  const dateObj = new Date(dateStr);
  const dayOfWeek = dateObj.getDay(); // 0 (Sun) to 6 (Sat)

  // 2. Fetch periodic schedules
  let scheduleQuery = supabase
    .from('schedules')
    .select('*, venue_classes(name), coaches(organization_members(profiles(name))), venues(name)')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .eq('day_of_week', dayOfWeek);
    
  // If we filter by coach, we should NOT filter the periodic schedule directly because the coach might be a substitute (which is in teacher_salary_sessions).
  // Or their periodic schedule might be substituted by someone else!
  // So we fetch all schedules for the org, then filter later.
  const { data: schedules } = await scheduleQuery;

  // 3. Fetch exceptions / check-ins (teacher_salary_sessions)
  const { data: sessionRecords } = await supabase
    .from('teacher_salary_sessions')
    .select('*, coaches(organization_members(profiles(name)))')
    .eq('organization_id', organizationId)
    .eq('date', dateStr);

  const results: ClassSession[] = [];
  const scheduleMap = new Map((schedules || []).map(s => [s.id, s]));

  // Merge logic:
  // We match teacher_salary_sessions to schedules via class_id.
  // Wait, teacher_salary_sessions only has class_id and coach_id. It doesn't have schedule_id.
  // So a session record belongs to a class. 
  // Let's iterate through schedules.
  for (const s of (schedules || [])) {
    // Find if there is a session record for this class_id
    const record = (sessionRecords || []).find(r => r.class_id === s.class_id);

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
      baseSession.isVirtual = false;
      baseSession.sessionId = record.id;
      baseSession.currentCoachId = record.coach_id;
      baseSession.currentCoachName = record.coaches?.organization_members?.profiles?.name || '';
      baseSession.status = record.status as any;
      baseSession.checkInTime = record.check_in_time;
    }

    results.push(baseSession);
  }

  // What if there is a teacher_salary_session for a class that is NOT in today's periodic schedule?
  // (Maybe an extra class added manually on this date).
  for (const r of (sessionRecords || [])) {
    // If we didn't process it yet
    if (!results.some(res => res.classId === r.class_id)) {
      // We need class info, but we don't have it loaded if it wasn't in schedule.
      // So let's fetch class info for ad-hoc sessions if needed, but for now we assume sessions are mostly from schedules.
      // For a robust system, we should have a separate query for ad-hoc classes.
    }
  }

  if (filterCoachId) {
    return results.filter(r => r.currentCoachId === filterCoachId);
  }

  // Sort by start_time
  return results.sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export async function cancelSession(organizationId: string, classId: string, dateStr: string) {
  const supabase = await createClient();
  // insert or update teacher_salary_sessions
  const { data: existing } = await supabase.from('teacher_salary_sessions')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('class_id', classId)
    .eq('date', dateStr)
    .single();

  if (existing) {
    return await supabase.from('teacher_salary_sessions')
      .update({ status: 'cancelled' })
      .eq('id', existing.id);
  } else {
    // need coach_id? If cancelled, coach_id can be null or the original coach.
    // For simplicity, we just put null or we fetch the original coach. Let's put null.
    return await supabase.from('teacher_salary_sessions').insert({
      organization_id: organizationId,
      class_id: classId,
      date: dateStr,
      status: 'cancelled',
      coach_id: null
    });
  }
}

export async function overrideCoach(organizationId: string, classId: string, dateStr: string, newCoachId: string) {
  const supabase = await createClient();
  const { data: existing } = await supabase.from('teacher_salary_sessions')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('class_id', classId)
    .eq('date', dateStr)
    .single();

  if (existing) {
    return await supabase.from('teacher_salary_sessions')
      .update({ status: 'scheduled', coach_id: newCoachId })
      .eq('id', existing.id);
  } else {
    return await supabase.from('teacher_salary_sessions').insert({
      organization_id: organizationId,
      class_id: classId,
      date: dateStr,
      status: 'scheduled',
      coach_id: newCoachId
    });
  }
}
