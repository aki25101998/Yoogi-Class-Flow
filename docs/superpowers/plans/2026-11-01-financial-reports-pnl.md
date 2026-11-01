# Financial Reports & Venue P&L Analytics Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a comprehensive Financial Reports & Venue P&L Analytics suite for Yoogi Class Flow (`/finance?tab=reports`) featuring dynamic P&L statements, multi-venue comparisons with explicit overhead isolation, period-over-period (MoM/QoQ) growth tracking, lightweight SVG/CSS visual analytics, professional Excel export (`.xlsx`), and print-friendly reporting.

**Architecture:** 
1. TypeScript domain types in `types/financeReport.ts` defining P&L hierarchy, multi-venue breakdowns, and growth indicators.
2. Client-side dynamic aggregator hook `useFinancialReport.ts` fetching all transactions across current & previous periods from `finance_transactions` and active venues from `venues`, computing revenue/expense tree groups, MoM/QoQ growth rates with division-by-zero protection, and venue profitability ranking.
3. Spreadsheet generator utility `utils/exportPnLExcel.ts` leveraging project's existing `xlsx` library to generate formatted multi-venue financial statements with VND currency formatting.
4. Vibrant Athletic & Martial Arts styled UI components: `FinanceReportFiltersBar`, `FinanceReportKpiGrid`, `FinanceReportCharts` (venue comparison bars + cost breakdown), and `FinanceReportTable` (hierarchical accordion matrix table).
5. Tabbed integration in `FinanceClient.tsx` with URL search param persistence (`?tab=reports`).
6. Verification via `cmd /c "npm run build"` (35/35 routes), `CONSTITUTION.md` update (v1.9.2), and automated GitHub push to `main`.

**Tech Stack:** Next.js 14 App Router, TypeScript, React Query v5, Supabase PostgreSQL, SheetJS (`xlsx`), Pure CSS Modules (Vibrant Athletic design system).

---

### Task 1: Type Definitions (`types/financeReport.ts`)

**Files:**
- Create: `types/financeReport.ts`

- [ ] **Step 1: Write `types/financeReport.ts`**
  Define `FinancialReportFilters`, `PnLSubCategoryItem`, `PnLCategoryGroup`, `VenuePnlSummary`, and `FinancialReportData`. Re-use `TimeRangePreset` from `@/types/finance`.

```typescript
import { TimeRangePreset } from '@/types/finance';

export interface FinancialReportFilters {
  preset: TimeRangePreset;
  customStartDate?: string;
  customEndDate?: string;
  venueId?: string; // 'ALL' or specific venue UUID
}

export interface PnLSubCategoryItem {
  name: string;
  total: number;
  byVenue: Record<string, number>; // venueId or 'SHARED' -> amount
  prevTotal: number;
  growthRate: number | null; // % delta MoM/QoQ
}

export interface PnLCategoryGroup {
  parentCategory: string;
  total: number;
  byVenue: Record<string, number>;
  prevTotal: number;
  growthRate: number | null;
  items: PnLSubCategoryItem[];
}

export interface VenuePnlSummary {
  venueId: string;
  venueName: string;
  // Current Period
  revenue: number;
  expense: number;
  netProfit: number;
  profitMargin: number; // percentage (0-100)
  revenueContribution: number; // percentage of total revenue
  // Previous Period
  prevRevenue: number;
  prevExpense: number;
  prevNetProfit: number;
  prevProfitMargin: number;
  // Growth Rates
  revenueGrowthRate: number | null;
  expenseGrowthRate: number | null;
  profitGrowthRate: number | null;
}

export interface FinancialReportData {
  currentPeriod: { startDate: string; endDate: string };
  previousPeriod: { startDate: string; endDate: string };

  // Organization-Wide Totals (or Selected Venue Totals)
  totalRevenue: number;
  totalExpense: number;
  netProfit: number;
  profitMargin: number;

  // Organization-Wide Previous Period
  prevRevenue: number;
  prevExpense: number;
  prevNetProfit: number;
  prevProfitMargin: number;
  revenueGrowthRate: number | null;
  expenseGrowthRate: number | null;
  profitGrowthRate: number | null;

  // Hierarchical P&L Matrix
  revenueGroups: PnLCategoryGroup[];
  expenseGroups: PnLCategoryGroup[];

  // Venue Breakdowns
  venueSummaries: VenuePnlSummary[];
  sharedSummary: VenuePnlSummary;

  // Cost Structure Breakdown (% of operating expense)
  expenseStructure: {
    category: string;
    amount: number;
    percentage: number;
  }[];

  // Top Performing Venue
  topVenue: VenuePnlSummary | null;
}
```

- [ ] **Step 2: Run typecheck**
Run: `cmd /c npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**
```bash
git add types/financeReport.ts
git commit -m "feat(types): add financial report and pnl type definitions"
```

---

### Task 2: Data Aggregator Hook (`hooks/useFinancialReport.ts`)

**Files:**
- Create: `hooks/useFinancialReport.ts`

- [ ] **Step 1: Write `hooks/useFinancialReport.ts`**
  Implement:
  1. `calculatePeriodRanges(preset, customStart, customEnd)`: calculates current & previous period start/end dates.
  2. `calculateGrowthRate(current, prev)`: mathematically sound growth rate with full zero/negative handling.
  3. `useFinancialReport(organizationId, filters)`:
     - Fetches all transactions in date window (`previousPeriod.startDate` to `currentPeriod.endDate`).
     - Fetches active venues via `supabase.from('venues').select('id, name').eq('organization_id', orgId)`.
     - Splits transactions into current and previous period.
     - Fallback legacy transactions (`parent_category = parent_category || category || 'Khác'`).
     - Builds category tree groups (`revenueGroups`, `expenseGroups`) with subcategories and venue amounts.
     - Computes venue summaries for all venues (even those with 0 transactions).
     - Identifies `topVenue` by net profit.

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import {
  FinancialReportFilters,
  FinancialReportData,
  PnLCategoryGroup,
  PnLSubCategoryItem,
  VenuePnlSummary,
} from '@/types/financeReport';
import { TimeRangePreset } from '@/types/finance';

/**
 * Calculates current and previous period date ranges based on preset.
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
  const formatYMD = (d: Date) => d.toISOString().split('T')[0];

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
        curStart = new Date(customStart);
        curEnd = new Date(customEnd);
        const diffMs = curEnd.getTime() - curStart.getTime();
        prevEnd = new Date(curStart.getTime() - 86400000);
        prevStart = new Date(prevEnd.getTime() - diffMs);
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

      // 1. Fetch active venues
      const { data: venuesData, error: venuesError } = await supabase
        .from('venues')
        .select('id, name')
        .eq('organization_id', organizationId)
        .order('name');

      if (venuesError) throw venuesError;
      const venues = venuesData || [];

      // 2. Fetch all transactions spanning previousPeriod.startDate to currentPeriod.endDate
      const { data: txnsData, error: txnsError } = await supabase
        .from('finance_transactions')
        .select('id, type, amount, date, venue_id, parent_category, sub_category, category')
        .eq('organization_id', organizationId)
        .gte('date', previousPeriod.startDate)
        .lte('date', currentPeriod.endDate);

      if (txnsError) throw txnsError;
      const allTxns = txnsData || [];

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
          const venueKey = t.venue_id || 'SHARED';
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
        for (const grp of groupMap.values()) {
          const items: PnLSubCategoryItem[] = [];
          for (const itm of grp.itemMap.values()) {
            items.push({
              name: itm.name,
              total: itm.total,
              byVenue: itm.byVenue,
              prevTotal: itm.prevTotal,
              growthRate: calculateGrowthRate(itm.total, itm.prevTotal),
            });
          }
          items.sort((a, b) => b.total - a.total);
          result.push({
            parentCategory: grp.parentCategory,
            total: grp.total,
            byVenue: grp.byVenue,
            prevTotal: grp.prevTotal,
            growthRate: calculateGrowthRate(grp.total, grp.prevTotal),
            items,
          });
        }
        result.sort((a, b) => b.total - a.total);
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

      // Identify selected venue totals or organization totals
      const isSingleVenue = filters.venueId && filters.venueId !== 'ALL';
      const targetVenue = isSingleVenue ? venueSummaries.find((v) => v.venueId === filters.venueId) : null;

      const totalRevenue = targetVenue ? targetVenue.revenue : orgTotalRev;
      const totalExpense = targetVenue ? targetVenue.expense : orgTotalExp;
      const netProfit = totalRevenue - totalExpense;
      const profitMargin = totalRevenue > 0 ? Number(((netProfit / totalRevenue) * 100).toFixed(1)) : 0;

      const prevRevenue = targetVenue ? targetVenue.prevRevenue : orgPrevRev;
      const prevExpense = targetVenue ? targetVenue.prevExpense : orgPrevExp;
      const prevNetProfit = prevRevenue - prevExpense;
      const prevProfitMargin = prevRevenue > 0 ? Number(((prevNetProfit / prevRevenue) * 100).toFixed(1)) : 0;

      // Expense structure percentage
      const expenseStructure = expenseGroups.map((g) => ({
        category: g.parentCategory,
        amount: g.total,
        percentage: totalExpense > 0 ? Number(((g.total / totalExpense) * 100).toFixed(1)) : 0,
      }));

      // Top performing venue (with positive revenue, highest profit)
      const validVenues = [...venueSummaries].filter((v) => v.revenue > 0);
      validVenues.sort((a, b) => b.netProfit - a.netProfit);
      const topVenue = validVenues.length > 0 ? validVenues[0] : null;

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
```

- [ ] **Step 2: Run typecheck**
Run: `cmd /c npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**
```bash
git add hooks/useFinancialReport.ts
git commit -m "feat(hooks): add useFinancialReport pnl data engine hook"
```

---

### Task 3: Excel Export Utility (`utils/exportPnLExcel.ts`)

**Files:**
- Create: `utils/exportPnLExcel.ts`

- [ ] **Step 1: Write `utils/exportPnLExcel.ts`**
  Generate professional multi-column spreadsheet using `xlsx`:
  - Title block: Organization Name, "BÁO CÁO KẾT QUẢ KINH DOANH (P&L)", Date Range (Từ ngày ... đến ngày ...).
  - Header Row: Hạng Mục | [Venue 1] | [Venue 2] | ... | Chung Toàn Trung Tâm | Tổng Cộng | Tỷ Trọng % | So Với Kỳ Trước.
  - Section I: DOANH THU THUẦN (Revenues) with subcategories and bold group totals.
  - Section II: CHI PHÍ VẬN HÀNH (Operating Expenses) with subcategories and bold group totals.
  - Section III: LỢI NHUẬN RÒNG (Net Profit = I - II).
  - Section IV: TỶ SUẤT LỢI NHUẬN RÒNG (%).
  - Triggers browser download with clean filename: `Bao_Cao_Lai_Lo_[Start]_[End].xlsx`.

```typescript
import * as XLSX from 'xlsx';
import { FinancialReportData } from '@/types/financeReport';

export function exportPnLToExcel(
  reportData: FinancialReportData,
  organizationName: string = 'Yoogi Class Flow'
) {
  const { currentPeriod, revenueGroups, expenseGroups, venueSummaries, sharedSummary, totalRevenue } = reportData;

  const venues = [...venueSummaries, sharedSummary];
  const rows: (string | number)[][] = [];

  // 1. Header Metadata
  rows.push([organizationName.toUpperCase()]);
  rows.push(['BÁO CÁO KẾT QUẢ KINH DOANH (P&L)']);
  rows.push([`Kỳ báo cáo: ${currentPeriod.startDate} đến ${currentPeriod.endDate}`]);
  rows.push([]); // Empty spacer

  // 2. Table Column Headers
  const header = [
    'HẠNG MỤC THU / CHI',
    ...venues.map((v) => v.venueName),
    'TỔNG CỘNG (VND)',
    'TỶ TRỌNG (%)',
    'SO VỚI KỲ TRƯỚC (%)',
  ];
  rows.push(header);

  // Format currency helper
  const fmt = (val: number | undefined) => val || 0;

  // 3. Section I: DOANH THU
  rows.push(['I. DOANH THU THUẦN']);
  for (const grp of revenueGroups) {
    const grpRow = [
      `  ${grp.parentCategory.toUpperCase()}`,
      ...venues.map((v) => fmt(grp.byVenue[v.venueId])),
      grp.total,
      totalRevenue > 0 ? `${((grp.total / totalRevenue) * 100).toFixed(1)}%` : '0%',
      grp.growthRate !== null ? `${grp.growthRate > 0 ? '+' : ''}${grp.growthRate}%` : '-',
    ];
    rows.push(grpRow);

    for (const item of grp.items) {
      const itmRow = [
        `    • ${item.name}`,
        ...venues.map((v) => fmt(item.byVenue[v.venueId])),
        item.total,
        totalRevenue > 0 ? `${((item.total / totalRevenue) * 100).toFixed(1)}%` : '0%',
        item.growthRate !== null ? `${item.growthRate > 0 ? '+' : ''}${item.growthRate}%` : '-',
      ];
      rows.push(itmRow);
    }
  }

  // Total Revenue Row
  rows.push([
    'TỔNG DOANH THU (I)',
    ...venues.map((v) => v.revenue),
    reportData.totalRevenue,
    '100.0%',
    reportData.revenueGrowthRate !== null
      ? `${reportData.revenueGrowthRate > 0 ? '+' : ''}${reportData.revenueGrowthRate}%`
      : '-',
  ]);
  rows.push([]); // Spacer

  // 4. Section II: CHI PHÍ
  rows.push(['II. CHI PHÍ VẬN HÀNH']);
  for (const grp of expenseGroups) {
    const grpRow = [
      `  ${grp.parentCategory.toUpperCase()}`,
      ...venues.map((v) => fmt(grp.byVenue[v.venueId])),
      grp.total,
      totalRevenue > 0 ? `${((grp.total / totalRevenue) * 100).toFixed(1)}%` : '0%',
      grp.growthRate !== null ? `${grp.growthRate > 0 ? '+' : ''}${grp.growthRate}%` : '-',
    ];
    rows.push(grpRow);

    for (const item of grp.items) {
      const itmRow = [
        `    • ${item.name}`,
        ...venues.map((v) => fmt(item.byVenue[v.venueId])),
        item.total,
        totalRevenue > 0 ? `${((item.total / totalRevenue) * 100).toFixed(1)}%` : '0%',
        item.growthRate !== null ? `${item.growthRate > 0 ? '+' : ''}${item.growthRate}%` : '-',
      ];
      rows.push(itmRow);
    }
  }

  // Total Expense Row
  rows.push([
    'TỔNG CHI PHÍ VẬN HÀNH (II)',
    ...venues.map((v) => v.expense),
    reportData.totalExpense,
    totalRevenue > 0 ? `${((reportData.totalExpense / totalRevenue) * 100).toFixed(1)}%` : '0%',
    reportData.expenseGrowthRate !== null
      ? `${reportData.expenseGrowthRate > 0 ? '+' : ''}${reportData.expenseGrowthRate}%`
      : '-',
  ]);
  rows.push([]); // Spacer

  // 5. Section III & IV: LỢI NHUẬN RÒNG & BIÊN LỢI NHUẬN
  rows.push([
    'III. LỢI NHUẬN RÒNG (I - II)',
    ...venues.map((v) => v.netProfit),
    reportData.netProfit,
    '-',
    reportData.profitGrowthRate !== null
      ? `${reportData.profitGrowthRate > 0 ? '+' : ''}${reportData.profitGrowthRate}%`
      : '-',
  ]);

  rows.push([
    'IV. TỶ SUẤT LỢI NHUẬN (%)',
    ...venues.map((v) => `${v.profitMargin}%`),
    `${reportData.profitMargin}%`,
    '-',
    '-',
  ]);

  // Create worksheet & workbook
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths
  ws['!cols'] = [
    { wch: 38 }, // Category name
    ...venues.map(() => ({ wch: 18 })), // Each venue
    { wch: 20 }, // Total
    { wch: 15 }, // Ratio
    { wch: 22 }, // MoM Growth
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Báo Cáo P&L');

  // Trigger file download
  const fileName = `Bao_Cao_Lai_Lo_${currentPeriod.startDate}_den_${currentPeriod.endDate}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
```

- [ ] **Step 2: Run typecheck**
Run: `cmd /c npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**
```bash
git add utils/exportPnLExcel.ts
git commit -m "feat(utils): add exportPnLToExcel spreadsheet generator"
```

---

### Task 4: CSS Modules & Atomic Visual Components

**Files:**
- Create: `app/styles/FinanceReports.module.css`
- Create: `app/(dashboard)/finance/components/FinanceReportFiltersBar.tsx`
- Create: `app/(dashboard)/finance/components/FinanceReportKpiGrid.tsx`
- Create: `app/(dashboard)/finance/components/FinanceReportCharts.tsx`

- [ ] **Step 1: Write `app/styles/FinanceReports.module.css`**
  Athletic styling with CSS variables:
  - `.container`: full width layout.
  - `.filtersBar`: horizontal bar with time presets, venue select, action buttons.
  - `.kpiGrid`: 4 Bento cards with watermark, delta badges, gradient icons.
  - `.chartsGrid`: 2-column responsive layout for Venue Comparison & Cost Breakdown.
  - `.venueChartCard`, `.costChartCard`: generous radii (`24px`), custom SVG / CSS bar charts.
  - `.tableCard`: styled table container, category accordions, sticky headers.
  - `@media print`: clean print styles.

- [ ] **Step 2: Write `FinanceReportFiltersBar.tsx`**
  Props: `filters`, `venues`, `onPresetChange`, `onVenueChange`, `onCustomDateChange`, `onExportExcel`, `onPrint`.
  Features:
  - Preset strip: Hôm nay, Tuần này, Tháng này, Tháng trước, Quý này, Năm nay, Tùy chọn.
  - Date inputs when preset === 'custom'.
  - Venue `<Select>` dropdown.
  - `[ In Báo Cáo ]` and `[ Xuất Excel P&L ]` pill buttons.

- [ ] **Step 3: Write `FinanceReportKpiGrid.tsx`**
  Displays 4 Bento cards:
  1. Doanh Thu Thuần (`totalRevenue`, `revenueGrowthRate`, icon `trending_up`).
  2. Tổng Chi Phí (`totalExpense`, `expenseGrowthRate`, icon `account_balance_wallet`).
  3. Lợi Nhuận Ròng (`netProfit`, `profitGrowthRate`, icon `monetization_on`, color Teal or Coral).
  4. Biên Lợi Nhuận (`profitMargin`, `topVenue` capsule, icon `emoji_events`).

- [ ] **Step 4: Write `FinanceReportCharts.tsx`**
  1. Multi-Venue Comparison Bar Chart:
     - Group of 3 bars per venue: Doanh thu (Teal), Chi phí (Coral), Lợi nhuận (Emerald/Slate).
     - Clean SVG grid lines and amounts.
  2. Cost Breakdown:
     - Horizontal stacked bar showing proportion of each parent expense category.
     - Legend with category dot, name, amount, and percentage.

- [ ] **Step 5: Run typecheck**
Run: `cmd /c npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 6: Commit**
```bash
git add app/styles/FinanceReports.module.css app/\(dashboard\)/finance/components/FinanceReportFiltersBar.tsx app/\(dashboard\)/finance/components/FinanceReportKpiGrid.tsx app/\(dashboard\)/finance/components/FinanceReportCharts.tsx
git commit -m "feat(finance-reports): add css modules, filters bar, kpi grid, and visual charts"
```

---

### Task 5: Hierarchical P&L Matrix Table (`FinanceReportTable.tsx`)

**Files:**
- Create: `app/(dashboard)/finance/components/FinanceReportTable.tsx`

- [ ] **Step 1: Write `FinanceReportTable.tsx`**
  Features:
  - Collapsible category groups: Clicking on a parent category expands/collapses subcategories (`items`).
  - Columns: `Hạng Mục` | `[Cơ sở 1]` | `[Cơ sở 2]` | ... | `Chung Toàn Trung Tâm` | `Tổng Cộng` | `Tỷ Trọng %` | `So Với Kỳ Trước`.
  - Section I (Doanh Thu) with total row.
  - Section II (Chi Phí Vận Hành) with total row.
  - Section III (Lợi Nhuận Ròng) highlighted with athletic teal/coral badge.
  - Section IV (Biên Lợi Nhuận %).
  - Selected venue highlighting: If `filters.venueId` matches a specific venue, highlight that column header and cells with an athletic accent border.
  - Compact toggle button: `[ Mở rộng tất cả ]` / `[ Thu gọn tất cả ]`.

- [ ] **Step 2: Run typecheck**
Run: `cmd /c npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**
```bash
git add app/\(dashboard\)/finance/components/FinanceReportTable.tsx
git commit -m "feat(finance-reports): add hierarchical pnl matrix table with accordion groups"
```

---

### Task 6: Tab Integration & Main Reporting Container

**Files:**
- Create: `app/(dashboard)/finance/FinanceReportsClient.tsx`
- Modify: `app/(dashboard)/finance/FinanceClient.tsx`

- [ ] **Step 1: Write `FinanceReportsClient.tsx`**
  - Manages `filters: FinancialReportFilters` state.
  - Calls `useFinancialReport(organizationId, filters)`.
  - Handles loading skeleton and error states.
  - Connects `FinanceReportFiltersBar`, `FinanceReportKpiGrid`, `FinanceReportCharts`, and `FinanceReportTable`.
  - Implements Excel export trigger calling `exportPnLToExcel(reportData, organization.name)`.
  - Implements print trigger calling `window.print()`.

- [ ] **Step 2: Update `FinanceClient.tsx` with Sub-Nav Tab Switcher**
  - Read active tab from URL query params: `const searchParams = useSearchParams(); const activeTab = searchParams.get('tab') === 'reports' ? 'reports' : 'transactions';`
  - Sub-nav tabs:
    - `[ 📋 Sổ Quỹ Giao Dịch ]` (`router.push('/finance')`)
    - `[ 📊 Báo Cáo Lãi - Lỗ & Phân Tích ]` (`router.push('/finance?tab=reports')`)
  - Conditionally renders existing Transactions UI when `activeTab === 'transactions'` or `FinanceReportsClient` when `activeTab === 'reports'`.
  - Preserves all existing functionality of Phase 1 (`addTransactionAction`, categories modal, filters).

- [ ] **Step 3: Run typecheck and full build**
Run: `cmd /c npx tsc --noEmit`
Run: `cmd /c "npm run build"`
Expected: 35/35 routes compile with 0 errors.

- [ ] **Step 4: Commit**
```bash
git add app/\(dashboard\)/finance/FinanceReportsClient.tsx app/\(dashboard\)/finance/FinanceClient.tsx
git commit -m "feat(finance): integrate financial reports pnl tab with url persistence"
```

---

### Task 7: Verification, Constitution Update (v1.9.2) & Deployment

**Files:**
- Modify: `CONSTITUTION.md`

- [ ] **Step 1: Update `CONSTITUTION.md`**
  - Bump version to `1.9.2` (Date: `2026-11-01`).
  - Section 10 (`HỆ THỐNG TÀI CHÍNH`): Add Section `10.4 Báo Cáo Tài Chính Đa Chiều & Phân Tích Lợi Nhuận (P&L Analytics)` documenting P&L matrix engine, multi-venue overhead isolation rules, period growth rate calculations, and Excel export.
  - Section 15 (`NHẬT KÝ CẬP NHẬT HIẾN PHÁP`): Add entry for version `1.9.2`.

- [ ] **Step 2: Run full build verification**
Run: `cmd /c "npm run build"`
Expected: 35/35 routes compile with 0 errors.

- [ ] **Step 3: Commit and Push to GitHub (MANDATORY RULE)**
```bash
git add CONSTITUTION.md
git commit -m "docs(constitution): bump version to 1.9.2 for financial reports and venue pnl analytics"
git push origin main
```
Expected: All commits pushed to GitHub `origin/main`, triggering Vercel build.
