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
        .filter((row: any) => row.students && row.students.status === 'active')
        .map((row: any) => ({
          id: row.id,
          student_id: row.student_id,
          name: row.students.name,
          avatar_url: row.students.avatar_url,
          phone: row.students.phone,
        }));
    },
    enabled: !!classId && !!organizationId,
  });
}
