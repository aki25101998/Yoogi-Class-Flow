import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { TuitionItem, TuitionSummary } from '@/types/tuition';

export function useTuition(organizationId: string | undefined) {
  const supabase = createClient();

  const { data: tuitionList = [], isLoading: isTuitionLoading, refetch } = useQuery<TuitionItem[]>({
    queryKey: ['tuition', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('tuition')
        .select(`
          *,
          students (id, name, avatar_url, phone),
          venue_classes (id, name, venue_id, default_tuition_fee)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as TuitionItem[];
    },
    enabled: !!organizationId,
  });

  const { data: students = [], isLoading: isStudentsLoading } = useQuery({
    queryKey: ['activeStudents', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('students')
        .select('id, name, avatar_url, phone')
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
        .select('id, name, venue_id, default_tuition_fee, status')
        .eq('organization_id', organizationId)
        .eq('status', 'active');
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Calculate summary based on filtered list
  const calculateSummary = (items: TuitionItem[]): TuitionSummary => {
    let totalExpected = 0;
    let totalCollected = 0;
    const uniqueStudents = new Set<string>();
    const debtStudents = new Set<string>();

    items.forEach((item) => {
      const amount = Number(item.amount) || 0;
      const paid = Number(item.paid_amount) || 0;
      totalExpected += amount;
      totalCollected += paid;
      if (item.student_id) {
        uniqueStudents.add(item.student_id);
        if (amount - paid > 0) {
          debtStudents.add(item.student_id);
        }
      }
    });

    const totalRemaining = Math.max(0, totalExpected - totalCollected);
    const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

    return {
      totalExpected,
      totalCollected,
      totalRemaining,
      collectionRate,
      totalStudents: uniqueStudents.size,
      debtStudentsCount: debtStudents.size,
    };
  };

  return {
    tuitionList,
    students,
    classes,
    calculateSummary,
    refetch,
    isLoading: isTuitionLoading || isStudentsLoading || isClassesLoading,
  };
}
