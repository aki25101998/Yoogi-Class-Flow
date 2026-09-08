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
  coaches?: {
    coachId: string;
    coachName: string;
    status?: string;
    isSubstitute?: boolean;
  }[];
}

export async function getSessionsForDate(organizationId: string, dateStr: string, filterCoachId?: string): Promise<ClassSession[]> {
  const supabase = await createClient();
  
  // 1. Get day of week
  const dateObj = parseBusinessDate(dateStr);
  const dayOfWeek = dateObj.getDay(); // 0 (Sun) to 6 (Sat)

  // 2. Fetch periodic schedules
  const { data: schedules } = await supabase
    .from('schedules')
    .select(`
      *, 
      venue_classes(name), 
      coaches(organization_members(profiles(name))), 
      venues(name),
      schedule_coaches(coach_id, role, coaches(organization_members(profiles(name))))
    `)
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .eq('day_of_week', dayOfWeek);

  // 3. Fetch exceptions / check-ins (class_sessions) including ad-hoc
  const { data: sessionRecords } = await supabase
    .from('class_sessions')
    .select(`
      *, 
      coaches(organization_members(profiles(name))), 
      venue_classes(name, venue_id, venues(name)),
      session_coaches(coach_id, status, is_substitute, coaches(organization_members(profiles(name))))
    `)
    .eq('organization_id', organizationId)
    .eq('date', dateStr);

  const results: ClassSession[] = [];
  const processedSessionIds = new Set<string>();

  // Helper to extract coach name from the nested object
  const getCoachName = (coachObj: any) => {
    if (Array.isArray(coachObj?.organization_members)) {
      return coachObj?.organization_members[0]?.profiles?.name || '';
    }
    return coachObj?.organization_members?.profiles?.name || '';
  };

  // 4. Merge periodic schedules
  for (const s of (schedules || [])) {
    // Find if there is a session record for this schedule
    const record = (sessionRecords || []).find(r => r.schedule_id === s.id);

    // Build the coaches array for Virtual Session
    let baseCoaches = [];
    if (s.schedule_coaches && s.schedule_coaches.length > 0) {
      baseCoaches = s.schedule_coaches.map((sc: any) => ({
        coachId: sc.coach_id,
        coachName: getCoachName(sc.coaches),
        status: 'pending'
      }));
    } else if (s.coach_id) {
      // Legacy fallback
      baseCoaches = [{
        coachId: s.coach_id,
        coachName: getCoachName(s.coaches),
        status: 'pending'
      }];
    }

    const primaryCoachId = baseCoaches.length > 0 ? baseCoaches[0].coachId : s.coach_id;
    const allCoachNames = baseCoaches.map((c: any) => c.coachName).join(', ') || getCoachName(s.coaches);

    const baseSession: ClassSession = {
      isVirtual: true,
      classId: s.class_id,
      className: s.venue_classes?.name || '',
      originalCoachId: primaryCoachId,
      currentCoachId: primaryCoachId,
      originalCoachName: allCoachNames,
      currentCoachName: allCoachNames,
      venueId: s.venue_id,
      venueName: s.venues?.name || '',
      date: dateStr,
      startTime: s.start_time,
      endTime: s.end_time,
      status: 'pending',
      scheduleId: s.id,
      coaches: baseCoaches
    };

    if (record) {
      processedSessionIds.add(record.id);
      baseSession.isVirtual = false;
      baseSession.sessionId = record.id;
      baseSession.status = record.status as any;
      baseSession.checkInTime = record.check_in_time;
      baseSession.startTime = record.start_time || s.start_time;
      baseSession.endTime = record.end_time || s.end_time;

      // Build the actual coaches array from session_coaches
      let actualCoaches = [];
      if (record.session_coaches && record.session_coaches.length > 0) {
        actualCoaches = record.session_coaches.map((sc: any) => ({
          coachId: sc.coach_id,
          coachName: getCoachName(sc.coaches),
          status: sc.status,
          isSubstitute: sc.is_substitute
        }));
      } else if (record.coach_id) {
        // Legacy fallback
        actualCoaches = [{
          coachId: record.coach_id,
          coachName: getCoachName(record.coaches),
          status: record.status,
          isSubstitute: false
        }];
      }
      
      const actualPrimaryId = actualCoaches.length > 0 ? actualCoaches[0].coachId : record.coach_id;
      const actualCoachNames = actualCoaches.map((c: any) => c.coachName).join(', ') || getCoachName(record.coaches);

      baseSession.currentCoachId = actualPrimaryId;
      baseSession.currentCoachName = actualCoachNames;
      baseSession.coaches = actualCoaches;
    }

    results.push(baseSession);
  }

  // 5. Add Ad-hoc sessions (sessions not linked to the day's active schedules)
  for (const r of (sessionRecords || [])) {
    if (!processedSessionIds.has(r.id)) {
      let actualCoaches = [];
      if (r.session_coaches && r.session_coaches.length > 0) {
        actualCoaches = r.session_coaches.map((sc: any) => ({
          coachId: sc.coach_id,
          coachName: getCoachName(sc.coaches),
          status: sc.status,
          isSubstitute: sc.is_substitute
        }));
      } else if (r.coach_id) {
        actualCoaches = [{
          coachId: r.coach_id,
          coachName: getCoachName(r.coaches),
          status: r.status,
          isSubstitute: false
        }];
      }

      const actualPrimaryId = actualCoaches.length > 0 ? actualCoaches[0].coachId : r.coach_id;
      const actualCoachNames = actualCoaches.map((c: any) => c.coachName).join(', ') || getCoachName(r.coaches);
      
      const originalPrimaryId = r.original_coach_id || actualPrimaryId;

      results.push({
        isVirtual: false,
        sessionId: r.id,
        classId: r.class_id,
        className: r.venue_classes?.name || '',
        originalCoachId: originalPrimaryId,
        currentCoachId: actualPrimaryId,
        originalCoachName: actualCoachNames,
        currentCoachName: actualCoachNames,
        venueId: r.venue_classes?.venue_id || '',
        venueName: r.venue_classes?.venues?.name || '',
        date: r.date,
        startTime: r.start_time || '',
        endTime: r.end_time || '',
        status: r.status as any,
        checkInTime: r.check_in_time,
        scheduleId: r.schedule_id || undefined,
        coaches: actualCoaches
      });
    }
  }

  if (filterCoachId) {
    // Filter if the coach is in the coaches array
    return results.filter(r => r.coaches?.some(c => c.coachId === filterCoachId) || r.currentCoachId === filterCoachId);
  }

  // Sort by start_time
  return results.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
}

export async function cancelSession(organizationId: string, classId: string, dateStr: string, scheduleId?: string, sessionId?: string) {
  const supabase = await createClient();
  
  if (sessionId) {
    // §4.4 — Validate session can be cancelled (state machine enforced at DB level too)
    const { data: session } = await supabase
      .from('class_sessions')
      .select('id, status')
      .eq('id', sessionId)
      .eq('organization_id', organizationId)
      .single();

    if (!session) {
      return { error: { message: 'Không tìm thấy ca học hoặc không thuộc tổ chức này.' } };
    }

    if (session.status === 'approved' || session.status === 'paid') {
      return { error: { message: `Không thể hủy buổi học ở trạng thái "${session.status}". Vui lòng liên hệ quản trị viên.` } };
    }

    if (session.status === 'cancelled') {
      return { error: { message: 'Buổi học này đã được hủy trước đó.' } };
    }

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
    .select('id, status')
    .eq('organization_id', organizationId)
    .eq('schedule_id', scheduleId)
    .eq('date', dateStr)
    .maybeSingle();

  if (existing) {
    if (existing.status === 'approved' || existing.status === 'paid') {
      return { error: { message: `Không thể hủy buổi học ở trạng thái "${existing.status}".` } };
    }
    return await supabase.from('class_sessions')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', existing.id);
  } else {
    // Insert new cancelled session
    const { data: insertedSession, error } = await supabase.from('class_sessions').insert({
      organization_id: organizationId,
      class_id: classId,
      schedule_id: scheduleId || null,
      date: dateStr,
      status: 'cancelled',
      coach_id: null,
      cancelled_at: new Date().toISOString()
    }).select('id').single();

    if (error) return { error };

    // Since it's cancelled, we might not need session_coaches, but for consistency we leave it empty.
    return { data: insertedSession };
  }
}

export async function overrideCoach(organizationId: string, classId: string, dateStr: string, newCoachId: string, scheduleId?: string, sessionId?: string) {
  const supabase = await createClient();

  // §4.3 — Verify coach exists, is active, and belongs to org
  const { data: coach } = await supabase
    .from('coaches')
    .select('id, status')
    .eq('id', newCoachId)
    .eq('organization_id', organizationId)
    .single();

  if (!coach) {
    return { error: { message: 'Huấn luyện viên không tồn tại trong tổ chức này.' } };
  }

  if (coach.status !== 'active') {
    return { error: { message: 'Huấn luyện viên này hiện đang không hoạt động.' } };
  }
  
  if (sessionId) {
    // §4.4 — Block override for approved/paid sessions
    const { data: session } = await supabase
      .from('class_sessions')
      .select('id, status')
      .eq('id', sessionId)
      .eq('organization_id', organizationId)
      .single();

    if (!session) {
      return { error: { message: 'Không tìm thấy ca học.' } };
    }

    if (session.status === 'approved' || session.status === 'paid') {
      return { error: { message: `Không thể thay đổi HLV cho buổi học ở trạng thái "${session.status}".` } };
    }

    const { error: updateError } = await supabase.from('class_sessions')
      .update({ status: 'scheduled', coach_id: newCoachId }) // legacy write
      .eq('id', sessionId)
      .eq('organization_id', organizationId);
      
    if (updateError) return { error: updateError };

    // Dual-write: Add as a substitute coach in session_coaches
    await supabase.from('session_coaches').upsert({
      organization_id: organizationId,
      session_id: sessionId,
      coach_id: newCoachId,
      status: 'scheduled',
      is_substitute: true
    }, { onConflict: 'session_id, coach_id' });

    return { success: true };
  }

  if (!scheduleId) {
    return { error: { message: 'Không thể xác định ca học. Vui lòng cung cấp mã lịch học hoặc mã ca học.' } };
  }

  const { data: existing } = await supabase.from('class_sessions')
    .select('id, status')
    .eq('organization_id', organizationId)
    .eq('schedule_id', scheduleId)
    .eq('date', dateStr)
    .maybeSingle();

  if (existing) {
    if (existing.status === 'approved' || existing.status === 'paid') {
      return { error: { message: `Không thể thay đổi HLV cho buổi học ở trạng thái "${existing.status}".` } };
    }
    const { error: updateError } = await supabase.from('class_sessions')
      .update({ status: 'scheduled', coach_id: newCoachId }) // legacy
      .eq('id', existing.id);
      
    if (updateError) return { error: updateError };

    // Dual-write: Add as substitute
    await supabase.from('session_coaches').upsert({
      organization_id: organizationId,
      session_id: existing.id,
      coach_id: newCoachId,
      status: 'scheduled',
      is_substitute: true
    }, { onConflict: 'session_id, coach_id' });

    return { success: true };
  } else {
    // Insert new session with new coach
    const { data: newSession, error: insertError } = await supabase.from('class_sessions').insert({
      organization_id: organizationId,
      class_id: classId,
      schedule_id: scheduleId || null,
      date: dateStr,
      status: 'scheduled',
      coach_id: newCoachId // legacy
    }).select('id').single();
    
    if (insertError) return { error: insertError };
    
    // Dual-write: Add as substitute
    await supabase.from('session_coaches').insert({
      organization_id: organizationId,
      session_id: newSession.id,
      coach_id: newCoachId,
      status: 'scheduled',
      is_substitute: true
    });

    return { success: true };
  }
}
