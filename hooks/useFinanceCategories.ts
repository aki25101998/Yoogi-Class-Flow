import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import type { FinanceCategory } from '@/types/finance';

export function useFinanceCategories(organizationId: string | undefined) {
  const supabase = createClient();

  const { data: rawCategories = [], isLoading, error } = useQuery({
    queryKey: ['financeCategories', organizationId],
    queryFn: async (): Promise<FinanceCategory[]> => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('finance_categories')
        .select('*')
        .eq('organization_id', organizationId)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) {
        // If table doesn't exist yet or query fails, return empty gracefully
        console.warn('Error fetching finance categories:', error.message);
        return [];
      }

      return (data || []) as FinanceCategory[];
    },
    enabled: !!organizationId,
    staleTime: 10 * 60 * 1000, // 10 minutes cache
  });

  // Build 2-level hierarchy: Parents (parent_id is null) with subcategories
  const parentCategories = rawCategories.filter(c => !c.parent_id);
  const childCategories = rawCategories.filter(c => !!c.parent_id);

  const categoriesTree: FinanceCategory[] = parentCategories.map(parent => ({
    ...parent,
    subcategories: childCategories
      .filter(child => child.parent_id === parent.id)
      .sort((a, b) => a.display_order - b.display_order),
  }));

  const incomeCategories = categoriesTree.filter(c => c.type === 'income');
  const expenseCategories = categoriesTree.filter(c => c.type === 'expense');

  return {
    rawCategories,
    categoriesTree,
    incomeCategories,
    expenseCategories,
    isLoading,
    error,
  };
}
