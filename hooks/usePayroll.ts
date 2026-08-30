import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';

export function usePayroll(organizationId: string | undefined) {
  const supabase = createClient();

  const { data: coaches = [], isLoading: isCoachesLoading } = useQuery({
    queryKey: ['payrollCoaches', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('coaches')
        .select('id, organization_members(profiles(name))')
        .eq('organization_id', organizationId)
        .eq('status', 'active');
      if (error) throw error;
      return (data || []).map((coach: any) => ({
        id: coach.id,
        name: coach.organization_members?.profiles?.name || 'Unknown'
      }));
    },
    enabled: !!organizationId,
  });

  const { data: salaryConfigs = [], isLoading: isSalaryConfigsLoading } = useQuery({
    queryKey: ['salaryConfigs', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      // @LEGACY: teacher_salaries is maintained for backward compatibility.
      // The true source of truth is now salary_rules + Salary Engine.
      // This will be migrated to use salary_rules natively in the UI later.
      const { data, error } = await supabase
        .from('teacher_salaries')
        .select('*')
        .eq('organization_id', organizationId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: salarySessions = [], isLoading: isSalarySessionsLoading } = useQuery({
    queryKey: ['salarySessions', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('class_sessions')
        .select('*, venue_classes(name)')
        .eq('organization_id', organizationId)
        .order('date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  return {
    coaches,
    salaryConfigs,
    salarySessions,
    isLoading: isCoachesLoading || isSalaryConfigsLoading || isSalarySessionsLoading,
  };
}
