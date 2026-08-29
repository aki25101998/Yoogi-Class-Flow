import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import type { SalaryRule } from '@/types/salary';

export function useSalaryRules(organizationId: string | undefined) {
  const supabase = createClient();

  const { data: rules = [], isLoading, error, refetch } = useQuery({
    queryKey: ['salaryRules', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('salary_rules')
        .select(`
          *,
          salary_rule_tiers(*),
          venues:scope_venue_id(id, name),
          venue_classes:scope_class_id(id, name),
          coaches:scope_coach_id(id, organization_members(profiles(name)))
        `)
        .eq('organization_id', organizationId)
        .neq('status', 'archived')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((rule: any) => ({
        ...rule,
        tiers: rule.salary_rule_tiers || [],
        scope_venue: rule.venues || null,
        scope_class: rule.venue_classes || null,
        scope_coach: rule.coaches ? {
          id: rule.coaches.id,
          name: rule.coaches.organization_members?.profiles?.name || 'Unknown',
        } : null,
      })) as SalaryRule[];
    },
    enabled: !!organizationId,
  });

  return { rules, isLoading, error, refetch };
}
