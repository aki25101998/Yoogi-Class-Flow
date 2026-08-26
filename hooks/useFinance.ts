import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';

export function useFinance(organizationId: string | undefined) {
  const supabase = createClient();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['financeTransactions', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('finance_transactions')
        .select('*')
        .eq('organization_id', organizationId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  return {
    transactions,
    isLoading,
  };
}
