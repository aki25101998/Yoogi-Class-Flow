import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import type { 
  FinanceFilters, 
  FinanceTransaction, 
  FinanceSummary, 
  CashflowDataPoint, 
  ExpenseDistributionItem 
} from '@/types/finance';

export function useFinance(
  organizationId: string | undefined,
  filters?: FinanceFilters
) {
  const supabase = createClient();

  const startDate = filters?.startDate;
  const endDate = filters?.endDate;
  const venueId = filters?.venueId || 'all';
  const typeFilter = filters?.type || 'all';
  const paymentMethodFilter = filters?.paymentMethod || 'all';

  const { data: rawTransactions = [], isLoading, error } = useQuery({
    queryKey: ['financeTransactions', organizationId, startDate, endDate, venueId],
    queryFn: async (): Promise<FinanceTransaction[]> => {
      if (!organizationId) return [];

      let query = supabase
        .from('finance_transactions')
        .select(`
          id,
          organization_id,
          type,
          category,
          category_id,
          parent_category,
          sub_category,
          amount,
          date,
          description,
          reference_id,
          source_type,
          venue_id,
          payment_method,
          created_at,
          updated_at,
          venues:venue_id (
            id,
            name
          )
        `)
        .eq('organization_id', organizationId);

      if (startDate) {
        query = query.gte('date', startDate);
      }
      if (endDate) {
        query = query.lte('date', endDate);
      }

      if (venueId === 'unassigned') {
        query = query.is('venue_id', null);
      } else if (venueId && venueId !== 'all') {
        query = query.eq('venue_id', venueId);
      }

      const { data, error } = await query
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as FinanceTransaction[];
    },
    enabled: !!organizationId,
  });

  // 1. Calculate KPI Summary across ALL transactions in the selected date & venue
  const totalIncome = rawTransactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const totalExpense = rawTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const netProfit = totalIncome - totalExpense;

  const cashAmount = rawTransactions
    .filter(t => t.payment_method === 'cash')
    .reduce((acc, t) => acc + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0);

  const bankAmount = rawTransactions
    .filter(t => t.payment_method === 'bank_transfer')
    .reduce((acc, t) => acc + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0);

  const totalAbsCashflow = Math.abs(cashAmount) + Math.abs(bankAmount);
  const cashRatio = totalAbsCashflow > 0 ? Math.round((Math.abs(cashAmount) / totalAbsCashflow) * 100) : 50;
  const bankRatio = totalAbsCashflow > 0 ? 100 - cashRatio : 50;
  const profitMargin = totalIncome > 0 ? Math.round((netProfit / totalIncome) * 100) : 0;

  const summary: FinanceSummary = {
    totalIncome,
    totalExpense,
    netProfit,
    cashAmount,
    bankAmount,
    cashRatio,
    bankRatio,
    profitMargin,
  };

  // 2. Calculate Cashflow Trends (Dynamic daily or monthly aggregation)
  let cashflowTrends: CashflowDataPoint[] = [];
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (diffDays <= 31) {
      // Group by Day
      const dailyMap = new Map<string, { income: number; expense: number }>();
      rawTransactions.forEach(t => {
        if (!dailyMap.has(t.date)) {
          dailyMap.set(t.date, { income: 0, expense: 0 });
        }
        const bucket = dailyMap.get(t.date)!;
        if (t.type === 'income') bucket.income += Number(t.amount || 0);
        else bucket.expense += Number(t.amount || 0);
      });

      // Sort chronological
      cashflowTrends = Array.from(dailyMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, val]) => {
          const parts = date.split('-');
          return {
            date,
            label: parts.length === 3 ? `${parts[2]}/${parts[1]}` : date,
            income: val.income,
            expense: val.expense,
            net: val.income - val.expense,
          };
        });
    } else {
      // Group by Month (e.g. YYYY-MM)
      const monthlyMap = new Map<string, { income: number; expense: number }>();
      rawTransactions.forEach(t => {
        const monthKey = t.date.slice(0, 7); // "YYYY-MM"
        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, { income: 0, expense: 0 });
        }
        const bucket = monthlyMap.get(monthKey)!;
        if (t.type === 'income') bucket.income += Number(t.amount || 0);
        else bucket.expense += Number(t.amount || 0);
      });

      cashflowTrends = Array.from(monthlyMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([monthKey, val]) => {
          const parts = monthKey.split('-');
          return {
            date: monthKey,
            label: parts.length === 2 ? `T${parseInt(parts[1], 10)}/${parts[0]}` : monthKey,
            income: val.income,
            expense: val.expense,
            net: val.income - val.expense,
          };
        });
    }
  }

  // 3. Calculate Expense Distribution by Parent Category
  const expenseCategoryMap = new Map<string, { amount: number; icon: string }>();
  rawTransactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      const parentName = t.parent_category || t.category || 'Chi phí khác';
      if (!expenseCategoryMap.has(parentName)) {
        expenseCategoryMap.set(parentName, { amount: 0, icon: 'category' });
      }
      expenseCategoryMap.get(parentName)!.amount += Number(t.amount || 0);
    });

  const expenseDistribution: ExpenseDistributionItem[] = Array.from(expenseCategoryMap.entries())
    .map(([parentCategory, data]) => ({
      parentCategory,
      icon: data.icon,
      amount: data.amount,
      percentage: totalExpense > 0 ? Math.round((data.amount / totalExpense) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // 4. Memory-filtered transactions for Table display
  const transactions = rawTransactions.filter(t => {
    if (typeFilter !== 'all' && t.type !== typeFilter) return false;
    if (paymentMethodFilter !== 'all' && t.payment_method !== paymentMethodFilter) return false;
    return true;
  });

  return {
    rawTransactions,
    transactions,
    summary,
    cashflowTrends,
    expenseDistribution,
    isLoading,
    error,
  };
}
