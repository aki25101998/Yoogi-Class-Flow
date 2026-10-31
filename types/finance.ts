export type FinanceTransactionType = 'income' | 'expense';
export type FinancePaymentMethod = 'cash' | 'bank_transfer' | 'other';

export interface FinanceCategory {
  id: string;
  organization_id: string;
  parent_id: string | null;
  name: string;
  type: FinanceTransactionType;
  icon?: string;
  display_order: number;
  is_system: boolean;
  created_at?: string;
  updated_at?: string;
  subcategories?: FinanceCategory[];
}

export interface FinanceTransaction {
  id: string;
  organization_id: string;
  type: FinanceTransactionType;
  category: string; // Legacy fallback
  category_id?: string | null;
  parent_category?: string | null;
  sub_category?: string | null;
  amount: number;
  date: string; // YYYY-MM-DD
  description?: string | null;
  reference_id?: string | null;
  source_type?: 'MANUAL' | 'TUITION_PAYMENT' | 'PAYROLL_PAYMENT' | string;
  venue_id?: string | null;
  payment_method?: FinancePaymentMethod;
  created_at?: string;
  updated_at?: string;
  venues?: {
    id: string;
    name: string;
  } | null;
}

export type TimeRangePreset = 
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'this_year'
  | 'custom';

export interface FinanceFilters {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  venueId?: 'all' | 'unassigned' | string;
  type?: 'all' | 'income' | 'expense';
  paymentMethod?: 'all' | FinancePaymentMethod;
}

export interface FinanceSummary {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  cashAmount: number;
  bankAmount: number;
  cashRatio: number; // 0 to 100
  bankRatio: number; // 0 to 100
  profitMargin: number; // 0 to 100
}

export interface CashflowDataPoint {
  date: string;
  label: string; // e.g. "25/10" or "T10"
  income: number;
  expense: number;
  net: number;
}

export interface ExpenseDistributionItem {
  parentCategory: string;
  icon: string;
  amount: number;
  percentage: number; // 0 to 100
}
