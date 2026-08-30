import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { parseBusinessDate } from '@/utils/date';

export interface AttendanceSessionInfo {
  sessionId?: string; // from class_sessions (null if virtual)
  scheduleId?: string; // from schedules
  classId: string;
  className: string;
  startTime: string;
  endTime: string;
  status: string; // from class_sessions
  students: {
    student_id: string;
    name: string;
  }[];
  attendanceRecords: {
    student_id: string;
    status: string;
    note: string;
  }[];
}

export function useAttendance(organizationId: string | undefined, dateStr: string) {
  const supabase = createClient();

  const {
    data: sessions = [],
    isLoading,
  } = useQuery({
    queryKey: ['attendanceData', organizationId, dateStr],
    queryFn: async () => {
      if (!organizationId || !dateStr) return [];

      // 1. Fetch periodic schedules for the day of week
      const dateObj = parseBusinessDate(dateStr);
      const dayOfWeek = dateObj.getDay();

      const { data: schedules } = await supabase
        .from('schedules')
        .select('id, class_id, start_time, end_time, venue_classes!inner(name, class_students(student_id, students(name)))')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .eq('day_of_week', dayOfWeek);

      // 2. Fetch class_sessions for the date
      const { data: classSessions } = await supabase
        .from('class_sessions')
        .select('id, schedule_id, class_id, start_time, end_time, status, venue_classes!inner(name, class_students(student_id, students(name))), student_session_attendance(student_id, status, note)')
        .eq('organization_id', organizationId)
        .eq('date', dateStr);

      const results: AttendanceSessionInfo[] = [];
      const processedSessionIds = new Set<string>();

      // 3. Merge schedules with class_sessions
      for (const s of (schedules || [])) {
        const sessionRecord = (classSessions || []).find(r => r.schedule_id === s.id);
        const venueClass = (s.venue_classes as any);
        
        const base: AttendanceSessionInfo = {
          sessionId: sessionRecord?.id,
          scheduleId: s.id,
          classId: s.class_id,
          className: venueClass?.name || '',
          startTime: sessionRecord?.start_time || s.start_time,
          endTime: sessionRecord?.end_time || s.end_time,
          status: sessionRecord?.status || 'pending',
          students: (venueClass?.class_students || []).map((cs: any) => ({
            student_id: cs.student_id,
            name: cs.students?.name || ''
          })),
          attendanceRecords: sessionRecord?.student_session_attendance || []
        };
        
        if (sessionRecord) {
          processedSessionIds.add(sessionRecord.id);
        }
        
        results.push(base);
      }

      // 4. Add ad-hoc sessions
      for (const r of (classSessions || [])) {
        if (!processedSessionIds.has(r.id)) {
          const venueClass = (r.venue_classes as any);
          results.push({
            sessionId: r.id,
            scheduleId: r.schedule_id || undefined,
            classId: r.class_id,
            className: venueClass?.name || '',
            startTime: r.start_time || '',
            endTime: r.end_time || '',
            status: r.status,
            students: (venueClass?.class_students || []).map((cs: any) => ({
              student_id: cs.student_id,
              name: cs.students?.name || ''
            })),
            attendanceRecords: r.student_session_attendance || []
          });
        }
      }
      
      // Sort by start time
      return results.sort((a, b) => a.startTime.localeCompare(b.startTime));
    },
    enabled: !!organizationId && !!dateStr,
  });

  return {
    sessions,
    isLoading
  };
}
