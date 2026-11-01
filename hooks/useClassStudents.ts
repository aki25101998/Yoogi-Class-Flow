import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';

export interface ClassEnrolledStudent {
  id: string;
  student_id: string;
  name: string;
  avatar_url?: string | null;
  phone?: string | null;
}

export function useClassStudents(classId: string | undefined, organizationId: string | undefined) {
  const supabase = createClient();

  return useQuery<ClassEnrolledStudent[]>({
    queryKey: ['class_students_enrolled', classId, organizationId],
    queryFn: async () => {
      if (!classId || !organizationId) return [];

      const { data, error } = await supabase
        .from('class_students')
        .select(`
          id,
          student_id,
          status,
          students (id, name, avatar_url, phone, status)
        `)
        .eq('class_id', classId)
        .eq('organization_id', organizationId)
        .eq('status', 'active');

      if (error) throw error;

      return (data || [])
        .map((row: any) => {
          const student = Array.isArray(row.students) ? row.students[0] : row.students;
          return {
            id: row.id,
            student_id: row.student_id,
            student,
          };
        })
        .filter((item: any) => item.student && item.student.status === 'active')
        .map((item: any) => ({
          id: item.id,
          student_id: item.student_id,
          name: item.student.name || 'Học viên',
          avatar_url: item.student.avatar_url || null,
          phone: item.student.phone || null,
        }));
    },
    enabled: !!classId && !!organizationId,
  });
}
