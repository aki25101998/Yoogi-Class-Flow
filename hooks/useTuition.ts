import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';

export function useTuition(organizationId: string | undefined) {
  const supabase = createClient();

  const { data: tuitionList = [], isLoading: isTuitionLoading } = useQuery({
    queryKey: ['tuition', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('tuition')
        .select('*, students(name), venue_classes(name)')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: students = [], isLoading: isStudentsLoading } = useQuery({
    queryKey: ['activeStudents', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('students')
        .select('id, name')
        .eq('organization_id', organizationId)
        .eq('status', 'active');
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: classes = [], isLoading: isClassesLoading } = useQuery({
    queryKey: ['activeClasses', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('venue_classes')
        .select('id, name')
        .eq('organization_id', organizationId)
        .eq('status', 'active');
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  return {
    tuitionList,
    students,
    classes,
    isLoading: isTuitionLoading || isStudentsLoading || isClassesLoading,
  };
}
