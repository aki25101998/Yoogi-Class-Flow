export type TuitionStatus = 'unpaid' | 'partial' | 'paid';
export type TuitionPaymentMethod = 'cash' | 'bank_transfer' | 'other';

export interface TuitionItem {
  id: string;
  organization_id: string;
  student_id: string;
  class_id?: string | null;
  amount: number;
  due_date: string; // YYYY-MM
  status: TuitionStatus;
  paid_amount: number;
  payment_method?: TuitionPaymentMethod | null;
  notes?: string | null;
  receipt_number?: string | null;
  paid_at?: string | null;
  created_at?: string;
  updated_at?: string;
  students?: {
    id: string;
    name: string;
    avatar_url?: string | null;
    phone?: string | null;
  } | null;
  venue_classes?: {
    id: string;
    name: string;
    venue_id?: string | null;
    default_tuition_fee?: number | null;
  } | null;
}

export interface TuitionFilters {
  month: string; // YYYY-MM
  classId: 'all' | string;
  status: 'all' | TuitionStatus;
  search: string;
}

export interface TuitionSummary {
  totalExpected: number;
  totalCollected: number;
  totalRemaining: number;
  collectionRate: number; // 0 to 100
  totalStudents: number;
  debtStudentsCount: number;
}

export interface BatchStudentItem {
  student_id: string;
  name: string;
  avatar_url?: string | null;
  phone?: string | null;
  amount: number;
  notes: string;
  isSelected: boolean;
}

export interface ReceiptData {
  receipt_number: string;
  student_name: string;
  class_name: string;
  due_date: string;
  amount: number;
  paid_amount: number;
  remaining: number;
  payment_method: TuitionPaymentMethod;
  paid_at: string;
  notes?: string | null;
  org_name: string;
  bank_name?: string | null;
  bank_account_number?: string | null;
  bank_account_name?: string | null;
}

