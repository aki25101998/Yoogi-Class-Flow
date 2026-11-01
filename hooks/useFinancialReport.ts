'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import type {
  FinancialReportFilters,
  FinancialReportData,
  PnLCategoryGroup,
  PnLSubCategoryItem,
  VenuePnlSummary,
} from '@/types/financeReport';
import type { TimeRangePreset } from '@/types/finance';

/**
 * Calculates current and previous period date ranges based on preset.
 * Uses local date parts to prevent UTC timezone shift off-by-one errors (GMT+7).
 */
export function calculatePeriodRanges(
  preset: TimeRangePreset,
  customStart?: string,
  customEnd?: string
): {
  currentPeriod: { startDate: string; endDate: string };
  previousPeriod: { startDate: string; endDate: string };
} {
  const now = new Date();
  const formatYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  let curStart = new Date();
  let curEnd = new Date();
  let prevStart = new Date();
  let prevEnd = new Date();

  switch (preset) {
    case 'today': {
      curStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      curEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      prevStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      break;
    }
    case 'this_week': {
      const day = now.getDay() || 7;
      curStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
      curEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 7);
      prevStart = new Date(curStart.getFullYear(), curStart.getMonth(), curStart.getDate() - 7);
      prevEnd = new Date(curEnd.getFullYear(), curEnd.getMonth(), curEnd.getDate() - 7);
      break;
    }
    case 'this_month': {
      curStart = new Date(now.getFullYear(), now.getMonth(), 1);
      curEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
    }
    case 'last_month': {
      curStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      curEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      prevStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      prevEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0);
      break;
    }
    case 'this_quarter': {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      curStart = new Date(now.getFullYear(), currentQuarter * 3, 1);
      curEnd = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0);
      prevStart = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
      prevEnd = new Date(now.getFullYear(), currentQuarter * 3, 0);
      break;
    }
    case 'this_year': {
      curStart = new Date(now.getFullYear(), 0, 1);
      curEnd = new Date(now.getFullYear(), 11, 31);
      prevStart = new Date(now.getFullYear() - 1, 0, 1);
      prevEnd = new Date(now.getFullYear() - 1, 11, 31);
      break;
    }
    case 'custom': {
      if (customStart && customEnd) {
        const [y1, m1, d1] = customStart.split('-').map(Number);
        const [y2, m2, d2] = customEnd.split('-').map(Number);
        curStart = new Date(y1, m1 - 1, d1);
        curEnd = new Date(y2, m2 - 1, d2);
        if (curStart > curEnd) {
          const temp = curStart;
          curStart = curEnd;
          curEnd = temp;
        }
        const diffDays = Math.round((curEnd.getTime() - curStart.getTime()) / (1000 * 60 * 60 * 24));
        prevEnd = new Date(curStart.getFullYear(), curStart.getMonth(), curStart.getDate() - 1);
        prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), prevEnd.getDate() - diffDays);
      } else {
        curStart = new Date(now.getFullYear(), now.getMonth(), 1);
        curEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      }
      break;
    }
  }

  return {
    currentPeriod: { startDate: formatYMD(curStart), endDate: formatYMD(curEnd) },
    previousPeriod: { startDate: formatYMD(prevStart), endDate: formatYMD(prevEnd) },
  };
}

/**
 * Calculates percentage growth rate avoiding division-by-zero.
 */
export function calculateGrowthRate(current: number, prev: number): number | null {
  if (prev === 0 && current === 0) return null;
  if (prev === 0 && current > 0) return 100;
  if (prev === 0 && current < 0) return -100;
  if (prev > 0 && current === 0) return -100;
  return Number((((current - prev) / Math.abs(prev)) * 100).toFixed(1));
}

/**
 * Custom TanStack React Query hook for aggregating financial transactions into a
 * hierarchical Profit & Loss (P&L) statement and multi-venue analytics model.
 *
 * @param organizationId - Active organization UUID.
 * @param filters - Selected time range preset, custom dates, and venue filter.
 * @returns React Query result carrying `FinancialReportData`.
 */
export function useFinancialReport(
  organizationId: string | undefined,
  filters: FinancialReportFilters
) {
  const supabase = createClient();
  const { currentPeriod, previousPeriod } = calculatePeriodRanges(
    filters.preset,
    filters.customStartDate,
    filters.customEndDate
  );

  return useQuery({
    queryKey: ['financial-report', organizationId, currentPeriod, previousPeriod, filters.venueId],
    queryFn: async (): Promise<FinancialReportData> => {
      if (!organizationId) throw new Error('Organization ID is required');

      // 1. Parallel fetch: active venues & all transactions spanning both periods
      const [venuesRes, txnsRes] = await Promise.all([
        supabase
          .from('venues')
          .select('id, name')
          .eq('organization_id', organizationId)
          .order('name'),
        supabase
          .from('finance_transactions')
          .select('id, type, amount, date, venue_id, parent_category, sub_category, category')
          .eq('organization_id', organizationId)
          .gte('date', previousPeriod.startDate)
          .lte('date', currentPeriod.endDate),
      ]);

      if (venuesRes.error) throw venuesRes.error;
      if (txnsRes.error) throw txnsRes.error;

      const venues = venuesRes.data || [];
      const venueIdSet = new Set(venues.map((v) => v.id));
      const allTxns = txnsRes.data || [];

      // Split into current and previous
      const curTxns = allTxns.filter(
        (t) => t.date >= currentPeriod.startDate && t.date <= currentPeriod.endDate
      );
      const prevTxns = allTxns.filter(
        (t) => t.date >= previousPeriod.startDate && t.date <= previousPeriod.endDate
      );

      // Helper to build hierarchy groups
      const buildGroups = (type: 'income' | 'expense') => {
        const curTypeTxns = curTxns.filter((t) => t.type === type);
        const prevTypeTxns = prevTxns.filter((t) => t.type === type);

        const groupMap = new Map<
          string,
          {
            parentCategory: string;
            total: number;
            byVenue: Record<string, number>;
            prevTotal: number;
            itemMap: Map<
              string,
              {
                name: string;
                total: number;
                byVenue: Record<string, number>;
                prevTotal: number;
              }
            >;
          }
        >();

        // Process current transactions
        for (const t of curTypeTxns) {
          const parent = t.parent_category || t.category || 'Khác';
          const sub = t.sub_category || 'Chung';
          const venueKey = t.venue_id && venueIdSet.has(t.venue_id) ? t.venue_id : 'SHARED';
          const amt = Number(t.amount) || 0;

          if (!groupMap.has(parent)) {
            groupMap.set(parent, {
              parentCategory: parent,
              total: 0,
              byVenue: {},
              prevTotal: 0,
              itemMap: new Map(),
            });
          }
          const grp = groupMap.get(parent)!;
          grp.total += amt;
          grp.byVenue[venueKey] = (grp.byVenue[venueKey] || 0) + amt;

          if (!grp.itemMap.has(sub)) {
            grp.itemMap.set(sub, {
              name: sub,
              total: 0,
              byVenue: {},
              prevTotal: 0,
            });
          }
          const itm = grp.itemMap.get(sub)!;
          itm.total += amt;
          itm.byVenue[venueKey] = (itm.byVenue[venueKey] || 0) + amt;
        }

        // Process previous transactions
        for (const t of prevTypeTxns) {
          const parent = t.parent_category || t.category || 'Khác';
          const sub = t.sub_category || 'Chung';
          const amt = Number(t.amount) || 0;

          if (!groupMap.has(parent)) {
            groupMap.set(parent, {
              parentCategory: parent,
              total: 0,
              byVenue: {},
              prevTotal: 0,
              itemMap: new Map(),
            });
          }
          const grp = groupMap.get(parent)!;
          grp.prevTotal += amt;

          if (!grp.itemMap.has(sub)) {
            grp.itemMap.set(sub, {
              name: sub,
              total: 0,
              byVenue: {},
              prevTotal: 0,
            });
          }
          const itm = grp.itemMap.get(sub)!;
          itm.prevTotal += amt;
        }

        // Transform to array
        const result: PnLCategoryGroup[] = [];
        for (const grp of Array.from(groupMap.values())) {
          const items: PnLSubCategoryItem[] = [];
          for (const itm of Array.from(grp.itemMap.values())) {
            items.push({
              name: itm.name,
              total: itm.total,
              byVenue: itm.byVenue,
              prevTotal: itm.prevTotal,
              growthRate: calculateGrowthRate(itm.total, itm.prevTotal),
            });
          }
          items.sort((a, b) => b.total - a.total || b.prevTotal - a.prevTotal);
          result.push({
            parentCategory: grp.parentCategory,
            total: grp.total,
            byVenue: grp.byVenue,
            prevTotal: grp.prevTotal,
            growthRate: calculateGrowthRate(grp.total, grp.prevTotal),
            items,
          });
        }
        result.sort((a, b) => b.total - a.total || b.prevTotal - a.prevTotal);
        return result;
      };

      const revenueGroups = buildGroups('income');
      const expenseGroups = buildGroups('expense');

      // Compute venue summaries
      const venueMap = new Map<string, { curRev: number; curExp: number; prevRev: number; prevExp: number }>();
      for (const v of venues) {
        venueMap.set(v.id, { curRev: 0, curExp: 0, prevRev: 0, prevExp: 0 });
      }
      venueMap.set('SHARED', { curRev: 0, curExp: 0, prevRev: 0, prevExp: 0 });

      for (const t of curTxns) {
        const vKey = t.venue_id && venueMap.has(t.venue_id) ? t.venue_id : 'SHARED';
        const v = venueMap.get(vKey)!;
        const amt = Number(t.amount) || 0;
        if (t.type === 'income') v.curRev += amt;
        else v.curExp += amt;
      }

      for (const t of prevTxns) {
        const vKey = t.venue_id && venueMap.has(t.venue_id) ? t.venue_id : 'SHARED';
        const v = venueMap.get(vKey)!;
        const amt = Number(t.amount) || 0;
        if (t.type === 'income') v.prevRev += amt;
        else v.prevExp += amt;
      }

      const orgTotalRev = curTxns.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0);
      const orgTotalExp = curTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0);
      const orgPrevRev = prevTxns.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0);
      const orgPrevExp = prevTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0);

      const venueSummaries: VenuePnlSummary[] = venues.map((v) => {
        const stats = venueMap.get(v.id) || { curRev: 0, curExp: 0, prevRev: 0, prevExp: 0 };
        const netProfit = stats.curRev - stats.curExp;
        const prevNetProfit = stats.prevRev - stats.prevExp;
        const profitMargin = stats.curRev > 0 ? Number(((netProfit / stats.curRev) * 100).toFixed(1)) : 0;
        const prevProfitMargin = stats.prevRev > 0 ? Number(((prevNetProfit / stats.prevRev) * 100).toFixed(1)) : 0;
        const revenueContribution = orgTotalRev > 0 ? Number(((stats.curRev / orgTotalRev) * 100).toFixed(1)) : 0;

        return {
          venueId: v.id,
          venueName: v.name,
          revenue: stats.curRev,
          expense: stats.curExp,
          netProfit,
          profitMargin,
          revenueContribution,
          prevRevenue: stats.prevRev,
          prevExpense: stats.prevExp,
          prevNetProfit,
          prevProfitMargin,
          revenueGrowthRate: calculateGrowthRate(stats.curRev, stats.prevRev),
          expenseGrowthRate: calculateGrowthRate(stats.curExp, stats.prevExp),
          profitGrowthRate: calculateGrowthRate(netProfit, prevNetProfit),
        };
      });

      const sharedStats = venueMap.get('SHARED') || { curRev: 0, curExp: 0, prevRev: 0, prevExp: 0 };
      const sharedNetProfit = sharedStats.curRev - sharedStats.curExp;
      const sharedPrevNetProfit = sharedStats.prevRev - sharedStats.prevExp;
      const sharedProfitMargin = sharedStats.curRev > 0 ? Number(((sharedNetProfit / sharedStats.curRev) * 100).toFixed(1)) : 0;
      const sharedPrevProfitMargin = sharedStats.prevRev > 0 ? Number(((sharedPrevNetProfit / sharedStats.prevRev) * 100).toFixed(1)) : 0;

      const sharedSummary: VenuePnlSummary = {
        venueId: 'SHARED',
        venueName: 'Chung toàn trung tâm',
        revenue: sharedStats.curRev,
        expense: sharedStats.curExp,
        netProfit: sharedNetProfit,
        profitMargin: sharedProfitMargin,
        revenueContribution: orgTotalRev > 0 ? Number(((sharedStats.curRev / orgTotalRev) * 100).toFixed(1)) : 0,
        prevRevenue: sharedStats.prevRev,
        prevExpense: sharedStats.prevExp,
        prevNetProfit: sharedPrevNetProfit,
        prevProfitMargin: sharedPrevProfitMargin,
        revenueGrowthRate: calculateGrowthRate(sharedStats.curRev, sharedStats.prevRev),
        expenseGrowthRate: calculateGrowthRate(sharedStats.curExp, sharedStats.prevExp),
        profitGrowthRate: calculateGrowthRate(sharedNetProfit, sharedPrevNetProfit),
      };

      // Identify selected venue totals or organization totals (case-insensitive check)
      const isSingleVenue = !!filters.venueId && filters.venueId.toUpperCase() !== 'ALL';
      const allSummaries = [...venueSummaries, sharedSummary];
      const targetVenue = isSingleVenue ? allSummaries.find((v) => v.venueId === filters.venueId) : null;

      const totalRevenue = targetVenue ? targetVenue.revenue : orgTotalRev;
      const totalExpense = targetVenue ? targetVenue.expense : orgTotalExp;
      const netProfit = totalRevenue - totalExpense;
      const profitMargin = totalRevenue > 0 ? Number(((netProfit / totalRevenue) * 100).toFixed(1)) : 0;

      const prevRevenue = targetVenue ? targetVenue.prevRevenue : orgPrevRev;
      const prevExpense = targetVenue ? targetVenue.prevExpense : orgPrevExp;
      const prevNetProfit = prevRevenue - prevExpense;
      const prevProfitMargin = prevRevenue > 0 ? Number(((prevNetProfit / prevRevenue) * 100).toFixed(1)) : 0;

      // Expense structure percentage (scoped accurately when a single venue is filtered)
      const expenseStructure = expenseGroups.map((g) => {
        const amount = isSingleVenue && filters.venueId ? (g.byVenue[filters.venueId] || 0) : g.total;
        return {
          category: g.parentCategory,
          amount,
          percentage: totalExpense > 0 ? Number(((amount / totalExpense) * 100).toFixed(1)) : 0,
        };
      });

      // Top performing venue (with positive revenue, highest profit)
      const validVenues = [...venueSummaries].filter((v) => v.revenue > 0);
      validVenues.sort((a, b) => b.netProfit - a.netProfit);
      const topVenue = validVenues.length > 0 && validVenues[0].netProfit > 0 ? validVenues[0] : null;

      return {
        currentPeriod,
        previousPeriod,
        totalRevenue,
        totalExpense,
        netProfit,
        profitMargin,
        prevRevenue,
        prevExpense,
        prevNetProfit,
        prevProfitMargin,
        revenueGrowthRate: calculateGrowthRate(totalRevenue, prevRevenue),
        expenseGrowthRate: calculateGrowthRate(totalExpense, prevExpense),
        profitGrowthRate: calculateGrowthRate(netProfit, prevNetProfit),
        revenueGroups,
        expenseGroups,
        venueSummaries,
        sharedSummary,
        expenseStructure,
        topVenue,
      };
    },
    enabled: !!organizationId,
  });
}
