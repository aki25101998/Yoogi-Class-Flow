// ============================================================
// Salary Engine — Type Definitions
// ============================================================

// --- Enums (matching database CHECK constraints) ---

export type CalculationType =
  | 'FIXED_MONTHLY'
  | 'FIXED_PER_SESSION'
  | 'PER_STUDENT'
  | 'PERCENT_REVENUE'
  | 'TIERED_STUDENT_COUNT'
  | 'BONUS'
  | 'ALLOWANCE'
  | 'DEDUCTION';

export type ScopeType =
  | 'ORGANIZATION'
  | 'VENUE'
  | 'CLASS'
  | 'COACH'
  | 'COACH_ROLE'
  | 'CLASS_TYPE';

export type MergeMode = 'ADD' | 'REPLACE';

export type CoachRole = 'HEAD_COACH' | 'ASSISTANT_COACH';

export type ClassType = 'GROUP' | 'PRIVATE' | 'SEMI_PRIVATE' | 'EVENT' | 'COMPETITION' | 'OTHER';

export type RuleStatus = 'active' | 'inactive' | 'archived';

export type RevenueSource = 'GROSS_REVENUE' | 'COLLECTED_REVENUE';

export type BonusConditionType = 'SESSION_COUNT' | 'ATTENDANCE_COUNT' | 'REVENUE_THRESHOLD';

export type AdjustmentType = 'BONUS' | 'ALLOWANCE' | 'DEDUCTION' | 'CORRECTION';

export type AdjustmentStatus = 'pending' | 'approved' | 'rejected' | 'paid';

export type PayrollPeriodStatus = 'open' | 'calculated' | 'review' | 'approved' | 'paid';

export type SessionStatus = 'scheduled' | 'checked_in' | 'approved' | 'paid' | 'cancelled' | 'rejected';

export type AuditAction =
  | 'CREATE_RULE'
  | 'UPDATE_RULE'
  | 'DEACTIVATE_RULE'
  | 'CHANGE_PROFILE'
  | 'APPROVE_PAYROLL'
  | 'REJECT_PAYROLL'
  | 'PAY_PAYROLL'
  | 'CREATE_ADJUSTMENT';

export type AuditTargetType =
  | 'salary_rule'
  | 'salary_profile'
  | 'payroll_period'
  | 'class_session'
  | 'salary_adjustment'
  | 'payment';

// --- Database Row Types ---

export interface SalaryRule {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  calculation_type: CalculationType;
  scope_type: ScopeType;
  scope_venue_id: string | null;
  scope_class_id: string | null;
  scope_coach_id: string | null;
  scope_coach_role: CoachRole | null;
  scope_class_type: ClassType | null;
  merge_mode: MergeMode;
  priority: number;
  amount: number;
  percentage: number | null;
  revenue_source: RevenueSource | null;
  minimum_salary: number | null;
  maximum_salary: number | null;
  condition_days_of_week: number[] | null;
  condition_start_time: string | null;
  condition_end_time: string | null;
  bonus_condition_type: BonusConditionType | null;
  bonus_condition_threshold: number | null;
  effective_from: string;
  effective_to: string | null;
  status: RuleStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data (optional, depends on query)
  tiers?: SalaryRuleTier[];
  scope_venue?: { id: string; name: string } | null;
  scope_class?: { id: string; name: string } | null;
  scope_coach?: { id: string; name: string } | null;
}

export interface SalaryRuleTier {
  id: string;
  rule_id: string;
  min_students: number;
  max_students: number | null;
  amount: number;
  created_at: string;
}

export interface SalaryProfile {
  id: string;
  organization_id: string;
  coach_id: string;
  rule_id: string;
  created_at: string;
  // Joined
  salary_rules?: SalaryRule;
}

export interface PayrollPeriod {
  id: string;
  organization_id: string;
  month: string;
  status: PayrollPeriodStatus;
  total_amount: number;
  coach_count: number;
  session_count: number;
  opened_by: string | null;
  calculated_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  paid_by: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalaryAdjustment {
  id: string;
  organization_id: string;
  coach_id: string;
  session_id: string | null;
  payroll_period_id: string | null;
  adjustment_type: AdjustmentType;
  amount: number;
  reason: string;
  status: AdjustmentStatus;
  approved_by: string | null;
  approved_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface SalaryAuditLog {
  id: string;
  organization_id: string;
  action: AuditAction;
  target_type: AuditTargetType;
  target_id: string | null;
  actor_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  reason: string | null;
  created_at: string;
}

// --- Calculation Types ---

/** Context data server resolves for a session (never from client) */
export interface SessionContext {
  sessionId: string;
  organizationId: string;
  coachId: string;
  coachRole: CoachRole | null;
  classId: string;
  className: string;
  classType: ClassType | null;
  venueId: string;
  venueName: string;
  date: string;            // YYYY-MM-DD
  dayOfWeek: number;       // 0=Sun ... 6=Sat
  startTime: string;       // HH:MM
  endTime: string;         // HH:MM
  sessionStatus: SessionStatus;
  studentsPresentCount: number;  // present + late
  studentsAbsentCount: number;
  collectedRevenue: number | null;
  grossRevenue: number | null;
}

/** One line item in a salary breakdown */
export interface SalaryBreakdownItem {
  rule_id: string;
  rule_name: string;
  calculation_type: CalculationType;
  amount: number;
  details: string;           // Human-readable explanation, e.g. "12 học viên × 20,000đ"
  metadata: Record<string, unknown>;  // Raw data: students_count, tier, percentage, etc.
}

/** Result of calculateSessionSalary() */
export interface SalaryCalculationResult {
  items: SalaryBreakdownItem[];
  subtotal: number;
  bonuses: number;
  allowances: number;
  deductions: number;
  minimum_applied: boolean;
  minimum_salary: number | null;
  maximum_applied: boolean;
  maximum_salary: number | null;
  final_amount: number;
  snapshot: SalarySnapshot;
}

/** Immutable snapshot stored in class_sessions.salary_config_snapshot */
export interface SalarySnapshot {
  engine_version: string;    // e.g. "2.0.0"
  calculated_at: string;     // ISO timestamp
  context: {
    session_id: string;
    coach_id: string;
    coach_role: CoachRole | null;
    class_id: string;
    venue_id: string;
    date: string;
    students_present: number;
  };
  rules: Array<{
    rule_id: string;
    rule_name: string;
    calculation_type: CalculationType;
    amount: number;
    details: string;
  }>;
  subtotal: number;
  bonuses: number;
  allowances: number;
  deductions: number;
  minimum_applied: boolean;
  minimum_salary: number | null;
  maximum_applied: boolean;
  maximum_salary: number | null;
  final_amount: number;
}

/** Result of calculateMonthlyPayroll() */
export interface MonthlyPayrollResult {
  coachId: string;
  coachName: string;
  month: string; // YYYY-MM
  fixedMonthlySalary: number;
  sessionSalaries: SessionSalaryItem[];
  totalSessionSalary: number;
  bonuses: number;
  allowances: number;
  deductions: number;
  adjustments: SalaryAdjustment[];
  grossPayroll: number;
}

export interface SessionSalaryItem {
  sessionId: string;
  date: string;
  className: string;
  venueName: string;
  coachRole: CoachRole | null;
  breakdown: SalaryBreakdownItem[];
  finalAmount: number;
  status: SessionStatus;
}

// --- Form/Action Types ---

export interface CreateSalaryRuleInput {
  name: string;
  description?: string;
  calculation_type: CalculationType;
  scope_type: ScopeType;
  scope_venue_id?: string;
  scope_class_id?: string;
  scope_coach_id?: string;
  scope_coach_role?: CoachRole;
  scope_class_type?: ClassType;
  merge_mode: MergeMode;
  priority: number;
  amount: number;
  percentage?: number;
  revenue_source?: RevenueSource;
  minimum_salary?: number;
  maximum_salary?: number;
  condition_days_of_week?: number[];
  condition_start_time?: string;
  condition_end_time?: string;
  bonus_condition_type?: BonusConditionType;
  bonus_condition_threshold?: number;
  effective_from: string;
  effective_to?: string;
  tiers?: CreateTierInput[];
  assign_to_coach_ids?: string[]; // Auto-create salary_profiles
}

export interface CreateTierInput {
  min_students: number;
  max_students?: number;
  amount: number;
}

export interface SalaryPreviewParams {
  venueId?: string;
  classId?: string;
  coachId?: string;
  coachRole?: CoachRole;
  classType?: ClassType;
  studentCount: number;
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  date?: string;
}

export interface RuleConflict {
  conflict_rule_id: string;
  conflict_rule_name: string;
  conflict_reason: string;
}

// --- UI Display Helpers ---

export const CALCULATION_TYPE_LABELS: Record<CalculationType, string> = {
  FIXED_MONTHLY: 'Lương cứng theo tháng',
  FIXED_PER_SESSION: 'Lương cố định theo buổi',
  PER_STUDENT: 'Lương theo số học viên',
  PERCENT_REVENUE: 'Lương theo % doanh thu',
  TIERED_STUDENT_COUNT: 'Lương theo bậc học viên',
  BONUS: 'Thưởng',
  ALLOWANCE: 'Phụ cấp',
  DEDUCTION: 'Khấu trừ',
};

export const SCOPE_TYPE_LABELS: Record<ScopeType, string> = {
  ORGANIZATION: 'Toàn tổ chức',
  VENUE: 'Theo chi nhánh',
  CLASS: 'Theo lớp',
  COACH: 'Theo HLV',
  COACH_ROLE: 'Theo vai trò HLV',
  CLASS_TYPE: 'Theo loại lớp',
};

export const MERGE_MODE_LABELS: Record<MergeMode, string> = {
  ADD: 'Cộng thêm',
  REPLACE: 'Thay thế',
};

export const CLASS_TYPE_LABELS: Record<ClassType, string> = {
  GROUP: 'Nhóm',
  PRIVATE: 'Cá nhân',
  SEMI_PRIVATE: 'Bán cá nhân',
  EVENT: 'Sự kiện',
  COMPETITION: 'Thi đấu',
  OTHER: 'Khác',
};

export const COACH_ROLE_LABELS: Record<CoachRole, string> = {
  HEAD_COACH: 'HLV Trưởng',
  ASSISTANT_COACH: 'HLV Phụ',
};

export const ADJUSTMENT_TYPE_LABELS: Record<AdjustmentType, string> = {
  BONUS: 'Thưởng',
  ALLOWANCE: 'Phụ cấp',
  DEDUCTION: 'Khấu trừ',
  CORRECTION: 'Điều chỉnh',
};

export const PAYROLL_PERIOD_STATUS_LABELS: Record<PayrollPeriodStatus, string> = {
  open: 'Đang mở',
  calculated: 'Đã tính',
  review: 'Đang duyệt',
  approved: 'Đã duyệt',
  paid: 'Đã thanh toán',
};
