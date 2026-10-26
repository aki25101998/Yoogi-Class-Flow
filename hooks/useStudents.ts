import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';

export interface StudentStats {
  total: number;
  active: number;
  unpaidTuition: number;
  attendanceRate: number;
}

export function useStudents(organizationId: string | undefined) {
  const supabase = createClient();

  const {
    data: students = [],
    isLoading: isStudentsLoading,
    error: studentsError,
  } = useQuery({
    queryKey: ['students', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          organization_belts(id, name, display_order),
          venues(id, name),
          class_students(
            id,
            class_id,
            status,
            venue_classes(id, name, venue_id, venues(id, name))
          )
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Filter out non-active classes
      const activeStudents = data?.map(student => ({
        ...student,
        class_students: student.class_students?.filter((cs: any) => cs.status === 'active') || []
      })) || [];
      
      return activeStudents;
    },
    enabled: !!organizationId,
  });

  // KPI Stats Query
  const {
    data: stats = { total: 0, active: 0, unpaidTuition: 0, attendanceRate: 100 },
    isLoading: isStatsLoading,
  } = useQuery<StudentStats>({
    queryKey: ['student_kpi_stats', organizationId],
    queryFn: async () => {
      if (!organizationId) return { total: 0, active: 0, unpaidTuition: 0, attendanceRate: 100 };

      // 1. Total & Active Students
      const { data: stData, error: stErr } = await supabase
        .from('students')
        .select('id, status')
        .eq('organization_id', organizationId);
      
      if (stErr) console.error('Error fetching students count:', stErr);
      const total = stData?.length || 0;
      const active = stData?.filter(s => s.status === 'active').length || 0;

      // 2. Unpaid or Partial Tuition count (unique students with pending tuition)
      const { data: tData, error: tErr } = await supabase
        .from('tuition')
        .select('student_id, status')
        .eq('organization_id', organizationId)
        .in('status', ['unpaid', 'partial']);

      if (tErr) console.error('Error fetching unpaid tuition:', tErr);
      const unpaidStudentIds = new Set(tData?.map(t => t.student_id));
      const unpaidTuition = unpaidStudentIds.size;

      // 3. Attendance Rate
      const { data: attData, error: attErr } = await supabase
        .from('student_session_attendance')
        .select('status')
        .eq('organization_id', organizationId);

      if (attErr) console.error('Error fetching attendance stats:', attErr);
      let attendanceRate = 100;
      if (attData && attData.length > 0) {
        const presentCount = attData.filter(a => a.status === 'present').length;
        attendanceRate = Math.round((presentCount / attData.length) * 100);
      }

      return {
        total,
        active,
        unpaidTuition,
        attendanceRate,
      };
    },
    enabled: !!organizationId,
  });

  const {
    data: availableClasses = [],
    isLoading: isClassesLoading,
  } = useQuery({
    queryKey: ['activeClasses', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('venue_classes')
        .select('id, name, venue_id, start_time, end_time, venues(id, name)')
        .eq('organization_id', organizationId)
        .eq('status', 'active');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const {
    data: availableBelts = [],
    isLoading: isBeltsLoading,
  } = useQuery({
    queryKey: ['activeBelts', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('organization_belts')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const {
    data: availableVenues = [],
    isLoading: isVenuesLoading,
  } = useQuery({
    queryKey: ['activeVenues', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('venues')
        .select('id, name')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  return {
    students,
    stats,
    availableClasses,
    availableBelts,
    availableVenues,
    isLoading: isStudentsLoading,
    isStatsLoading,
    error: studentsError,
  };
}
