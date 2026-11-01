import { TimeRangePreset } from '@/types/finance';

export interface FinancialReportFilters {
  preset: TimeRangePreset;
  customStartDate?: string;
  customEndDate?: string;
  venueId?: string; // 'ALL', 'SHARED', or specific venue UUID
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
