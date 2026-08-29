import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import type { SalaryProfile } from '@/types/salary';

export function useSalaryProfiles(organizationId: string | undefined, coachId?: string) {
  const supabase = createClient();

  const { data: profiles = [], isLoading, error, refetch } = useQuery({
    queryKey: ['salaryProfiles', organizationId, coachId],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('salary_profiles')
        .select(`
          *,
          salary_rules (
            id, name, calculation_type, scope_type, amount, percentage,
            merge_mode, priority, status, effective_from, effective_to,
            minimum_salary, maximum_salary, condition_days_of_week,
            condition_start_time, condition_end_time,
            salary_rule_tiers(*)
          )
        `)
        .eq('organization_id', organizationId);

      if (coachId) {
        query = query.eq('coach_id', coachId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as SalaryProfile[];
    },
    enabled: !!organizationId,
  });

  return { profiles, isLoading, error, refetch };
}
