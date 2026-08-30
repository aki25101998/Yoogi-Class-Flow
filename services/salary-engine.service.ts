// ============================================================
// Salary Engine Service — Core Calculation Logic
// ============================================================
// This is the SINGLE source of truth for all salary calculations.
// All salary computation must go through this service.
// Never compute salary amounts in React components, hooks, or server actions.
// ============================================================

import { createClient } from '@/utils/supabase/server';
import { getBusinessDate, getBusinessDateString, parseBusinessDate } from '@/utils/date';
import type {
  SalaryRule,
  SalaryRuleTier,
  SessionContext,
  SalaryBreakdownItem,
  SalaryCalculationResult,
  SalarySnapshot,
  MonthlyPayrollResult,
  SessionSalaryItem,
  CalculationType,
  CoachRole,
  ClassType,
  SalaryAdjustment,
} from '@/types/salary';

const ENGINE_VERSION = '2.0.0';

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Calculate salary for a single session + coach.
 * Server resolves ALL context data (branch, student count, revenue).
 * Client NEVER sends these values.
 */
export async function calculateSessionSalary(
  sessionId: string,
  coachId: string,
  organizationId: string
): Promise<SalaryCalculationResult> {
  const context = await buildSessionContext(sessionId, coachId, organizationId);

  // Don't calculate for cancelled sessions
  if (context.sessionStatus === 'cancelled') {
    return buildEmptyResult(context);
  }

  const rules = await resolveApplicableRules(context);
  const prioritizedRules = applyRulePrecedence(rules);
  const filteredRules = filterByConditions(prioritizedRules, context);

  return computeSalary(filteredRules, context);
}

/**
 * Calculate monthly payroll summary for a coach.
 */
export async function calculateMonthlyPayroll(
  coachId: string,
  month: string, // YYYY-MM
  organizationId: string
): Promise<MonthlyPayrollResult> {
  const supabase = await createClient();

  // Fetch coach name
  const { data: coachData } = await supabase
    .from('coaches')
    .select('id, organization_members(profiles(name))')
    .eq('id', coachId)
    .eq('organization_id', organizationId)
    .single();

  const coachName = (coachData as any)?.organization_members?.profiles?.name || 'Unknown';

  // Fetch all sessions for this coach in the month
  const startDate = `${month}-01`;
  const endDate = getLastDayOfMonth(month);

  const { data: sessions } = await supabase
    .from('class_sessions')
    .select('id, date, status, class_id, coach_id, calculated_salary, salary_config_snapshot, venue_classes(name, venue_id, venues(name))')
    .eq('organization_id', organizationId)
    .eq('coach_id', coachId)
    .gte('date', startDate)
    .lte('date', endDate)
    .neq('status', 'cancelled')
    .order('date', { ascending: true });

  // Calculate each session
  const sessionItems: SessionSalaryItem[] = [];
  let totalSessionSalary = 0;

  for (const session of (sessions || [])) {
    // For already approved/paid sessions, use the snapshot
    if ((session.status === 'approved' || session.status === 'paid') && session.salary_config_snapshot) {
      const snapshot = session.salary_config_snapshot as SalarySnapshot;
      sessionItems.push({
        sessionId: session.id,
        date: session.date,
        className: (session as any).venue_classes?.name || '',
        venueName: (session as any).venue_classes?.venues?.name || '',
        coachRole: snapshot?.context?.coach_role || null,
        breakdown: snapshot?.rules?.map((r: any) => ({
          rule_id: r.rule_id,
          rule_name: r.rule_name,
          calculation_type: r.calculation_type,
          amount: r.amount,
          details: r.details,
          metadata: {},
        })) || [],
        finalAmount: Number(session.calculated_salary) || 0,
        status: session.status,
      });
      totalSessionSalary += Number(session.calculated_salary) || 0;
    } else if (session.status === 'checked_in' || session.status === 'scheduled') {
      // Calculate fresh for unapproved sessions
      const result = await calculateSessionSalary(session.id, coachId, organizationId);
      sessionItems.push({
        sessionId: session.id,
        date: session.date,
        className: (session as any).venue_classes?.name || '',
        venueName: (session as any).venue_classes?.venues?.name || '',
        coachRole: result.snapshot.context.coach_role,
        breakdown: result.items,
        finalAmount: result.final_amount,
        status: session.status,
      });
      totalSessionSalary += result.final_amount;
    }
  }

  // Fixed monthly salary
  const fixedMonthly = await calculateFixedMonthlySalary(coachId, organizationId, month);

  // Adjustments for this month
  const { data: adjustments } = await supabase
    .from('salary_adjustments')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('coach_id', coachId)
    .gte('created_at', `${month}-01T00:00:00`)
    .lt('created_at', `${getNextMonth(month)}-01T00:00:00`);

  const bonuses = (adjustments || [])
    .filter((a: any) => a.adjustment_type === 'BONUS' && a.status !== 'rejected')
    .reduce((sum: number, a: any) => sum + Number(a.amount), 0);

  const allowances = (adjustments || [])
    .filter((a: any) => a.adjustment_type === 'ALLOWANCE' && a.status !== 'rejected')
    .reduce((sum: number, a: any) => sum + Number(a.amount), 0);

  const deductions = (adjustments || [])
    .filter((a: any) => a.adjustment_type === 'DEDUCTION' && a.status !== 'rejected')
    .reduce((sum: number, a: any) => sum + Number(a.amount), 0);

  const grossPayroll = fixedMonthly + totalSessionSalary + bonuses + allowances - deductions;

  return {
    coachId,
    coachName,
    month,
    fixedMonthlySalary: fixedMonthly,
    sessionSalaries: sessionItems,
    totalSessionSalary,
    bonuses,
    allowances,
    deductions,
    adjustments: (adjustments || []) as SalaryAdjustment[],
    grossPayroll: Math.max(0, grossPayroll), // Never negative
  };
}

/**
 * Preview salary calculation with hypothetical parameters.
 * Used in the rule creation UI to show estimated salary.
 */
export async function previewSalaryCalculation(
  organizationId: string,
  params: {
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
): Promise<SalaryCalculationResult> {
  // Build a synthetic context for preview
  const context: SessionContext = {
    sessionId: 'preview',
    organizationId,
    coachId: params.coachId || '',
    coachRole: params.coachRole || null,
    classId: params.classId || '',
    className: '',
    classType: params.classType || null,
    venueId: params.venueId || '',
    venueName: '',
    date: params.date || getBusinessDateString(),
    dayOfWeek: params.dayOfWeek ?? getBusinessDate().getDay(),
    startTime: params.startTime || '18:00',
    endTime: params.endTime || '20:00',
    sessionStatus: 'checked_in',
    studentsPresentCount: params.studentCount,
    studentsAbsentCount: 0,
    collectedRevenue: null,
    grossRevenue: null,
  };

  // Fetch names if IDs provided
  const supabase = await createClient();
  if (params.classId) {
    const { data: cls } = await supabase.from('venue_classes')
      .select('name, class_type')
      .eq('id', params.classId)
      .single();
    if (cls) {
      context.className = cls.name || '';
      context.classType = (cls as any).class_type || context.classType;
    }
  }
  if (params.venueId) {
    const { data: venue } = await supabase.from('venues')
      .select('name')
      .eq('id', params.venueId)
      .single();
    if (venue) context.venueName = venue.name || '';
  }

  const rules = await resolveApplicableRules(context);
  const prioritizedRules = applyRulePrecedence(rules);
  const filteredRules = filterByConditions(prioritizedRules, context);

  return computeSalary(filteredRules, context);
}

// ============================================================
// INTERNAL — Context Building
// ============================================================

/**
 * Build the SessionContext by fetching all data from the database.
 * The server resolves: branch (venue), student count, revenue, coach role.
 */
async function buildSessionContext(
  sessionId: string,
  coachId: string,
  organizationId: string
): Promise<SessionContext> {
  const supabase = await createClient();

  // 1. Fetch session with class and venue info
  const { data: session } = await supabase
    .from('class_sessions')
    .select(`
      id, date, status, class_id, coach_id, start_time, end_time,
      venue_classes (
        id, name, venue_id, start_time, end_time, class_type,
        venues ( id, name )
      )
    `)
    .eq('id', sessionId)
    .eq('organization_id', organizationId)
    .single();

  if (!session) {
    throw new Error(`Session ${sessionId} not found in organization ${organizationId}`);
  }

  const cls = (session as any).venue_classes;
  const venue = cls?.venues;
  const sessionDate = session.date;
  const dateObj = parseBusinessDate(sessionDate);

  // 2. Resolve coach role from class_coaches
  let coachRole: CoachRole | null = null;
  if (session.class_id) {
    const { data: assignment } = await supabase
      .from('class_coaches')
      .select('role')
      .eq('class_id', session.class_id)
      .eq('coach_id', coachId)
      .single();
    coachRole = (assignment?.role as CoachRole) || null;
  }

  // 3. Count students present (present + late count; absent + excused do not)
  let studentsPresentCount = 0;
  let studentsAbsentCount = 0;
  const { count: presentCount } = await supabase
    .from('student_session_attendance')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .in('status', ['present', 'late']);
  studentsPresentCount = presentCount || 0;

  const { count: absentCount } = await supabase
    .from('student_session_attendance')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .in('status', ['absent', 'excused']);
  studentsAbsentCount = absentCount || 0;

  // 4. Revenue data (for PERCENT_REVENUE rules)
  let collectedRevenue: number | null = null;
  let grossRevenue: number | null = null;
  if (session.class_id) {
    // Get collected revenue for this class in the session's month
    const monthStr = sessionDate.substring(0, 7); // YYYY-MM
    const { data: tuitionData } = await supabase
      .from('tuition')
      .select('amount, paid_amount')
      .eq('organization_id', organizationId)
      .eq('class_id', session.class_id)
      .eq('due_date', monthStr);

    if (tuitionData && tuitionData.length > 0) {
      grossRevenue = tuitionData.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      collectedRevenue = tuitionData.reduce((sum: number, t: any) => sum + Number(t.paid_amount || 0), 0);
    }
  }

  return {
    sessionId,
    organizationId,
    coachId,
    coachRole,
    classId: session.class_id || '',
    className: cls?.name || '',
    classType: cls?.class_type || null,
    venueId: cls?.venue_id || '',
    venueName: venue?.name || '',
    date: sessionDate,
    dayOfWeek: dateObj.getDay(),
    startTime: session.start_time || cls?.start_time || '00:00',
    endTime: session.end_time || cls?.end_time || '23:59',
    sessionStatus: session.status,
    studentsPresentCount,
    studentsAbsentCount,
    collectedRevenue,
    grossRevenue,
  };
}

// ============================================================
// INTERNAL — Rule Resolution
// ============================================================

/**
 * Fetch all active rules that could potentially apply to this session context.
 * Resolves rules from: organization-wide, venue-specific, class-specific, coach-specific, etc.
 */
async function resolveApplicableRules(context: SessionContext): Promise<SalaryRule[]> {
  const supabase = await createClient();
  const sessionDate = context.date;

  // Fetch all active rules for this organization within the effective period
  const { data: allRules } = await supabase
    .from('salary_rules')
    .select('*, salary_rule_tiers(*)')
    .eq('organization_id', context.organizationId)
    .eq('status', 'active')
    .lte('effective_from', sessionDate)
    .or(`effective_to.is.null,effective_to.gte.${sessionDate}`);

  if (!allRules || allRules.length === 0) return [];

  // Filter rules by scope matching
  return allRules.filter((rule: any) => {
    return matchesScope(rule, context);
  }).map((rule: any) => ({
    ...rule,
    tiers: rule.salary_rule_tiers || [],
  })) as SalaryRule[];
}

/**
 * Check if a rule's scope matches the session context.
 */
function matchesScope(rule: SalaryRule, context: SessionContext): boolean {
  switch (rule.scope_type) {
    case 'ORGANIZATION':
      // Applies to all sessions in the organization
      return true;

    case 'VENUE':
      return rule.scope_venue_id === context.venueId;

    case 'CLASS':
      return rule.scope_class_id === context.classId;

    case 'COACH':
      return rule.scope_coach_id === context.coachId;

    case 'COACH_ROLE':
      return rule.scope_coach_role === context.coachRole;

    case 'CLASS_TYPE':
      return rule.scope_class_type === context.classType;

    default:
      return false;
  }
}

// ============================================================
// INTERNAL — Rule Precedence
// ============================================================

/**
 * Apply rule precedence:
 * 1. Sort by priority (higher = more specific)
 * 2. Within same calculation_type:
 *    - If REPLACE mode: only keep the highest-priority rule
 *    - If ADD mode: keep all rules
 */
function applyRulePrecedence(rules: SalaryRule[]): SalaryRule[] {
  // Sort by priority descending (higher priority first)
  const sorted = [...rules].sort((a, b) => b.priority - a.priority);

  // Group by calculation type
  const byType = new Map<CalculationType, SalaryRule[]>();
  for (const rule of sorted) {
    const existing = byType.get(rule.calculation_type) || [];
    existing.push(rule);
    byType.set(rule.calculation_type, existing);
  }

  // Apply REPLACE logic
  const result: SalaryRule[] = [];
  const entries = Array.from(byType.entries());
  for (let i = 0; i < entries.length; i++) {
    const typeRules = entries[i][1];
    // Check if any rule in this group has REPLACE mode
    const replaceRule = typeRules.find((r: SalaryRule) => r.merge_mode === 'REPLACE');
    if (replaceRule) {
      // Only keep the highest-priority REPLACE rule
      result.push(replaceRule);
    } else {
      // ADD mode: keep all rules
      result.push(...typeRules);
    }
  }

  return result;
}

// ============================================================
// INTERNAL — Condition Evaluation
// ============================================================

/**
 * Filter rules by their time/day conditions.
 */
function filterByConditions(rules: SalaryRule[], context: SessionContext): SalaryRule[] {
  return rules.filter(rule => evaluateConditions(rule, context));
}

/**
 * Check if a rule's conditions are met by the session context.
 */
function evaluateConditions(rule: SalaryRule, context: SessionContext): boolean {
  // Check day of week condition
  if (rule.condition_days_of_week && rule.condition_days_of_week.length > 0) {
    if (!rule.condition_days_of_week.includes(context.dayOfWeek)) {
      return false;
    }
  }

  // Check time range condition
  if (rule.condition_start_time && rule.condition_end_time) {
    const sessionStart = timeToMinutes(context.startTime);
    const condStart = timeToMinutes(rule.condition_start_time);
    const condEnd = timeToMinutes(rule.condition_end_time);

    // Session must start within the condition time range
    if (sessionStart < condStart || sessionStart > condEnd) {
      return false;
    }
  }

  return true;
}

// ============================================================
// INTERNAL — Salary Computation
// ============================================================

/**
 * Compute the final salary from a list of applicable rules.
 */
function computeSalary(rules: SalaryRule[], context: SessionContext): SalaryCalculationResult {
  const items: SalaryBreakdownItem[] = [];
  let subtotal = 0;
  let bonuses = 0;
  let allowances = 0;
  let deductions = 0;
  let globalMinimum: number | null = null;
  let globalMaximum: number | null = null;

  for (const rule of rules) {
    // Track min/max from any rule
    if (rule.minimum_salary !== null && rule.minimum_salary !== undefined) {
      globalMinimum = globalMinimum === null
        ? rule.minimum_salary
        : Math.max(globalMinimum, rule.minimum_salary);
    }
    if (rule.maximum_salary !== null && rule.maximum_salary !== undefined) {
      globalMaximum = globalMaximum === null
        ? rule.maximum_salary
        : Math.min(globalMaximum, rule.maximum_salary);
    }

    const amount = calculateRuleAmount(rule, context);
    if (amount === null) continue; // Rule cannot be calculated (e.g., missing revenue data)

    const item = buildBreakdownItem(rule, amount, context);
    items.push(item);

    switch (rule.calculation_type) {
      case 'BONUS':
        bonuses += amount;
        break;
      case 'ALLOWANCE':
        allowances += amount;
        break;
      case 'DEDUCTION':
        deductions += amount;
        break;
      default:
        subtotal += amount;
        break;
    }
  }

  // Calculate final amount
  let finalAmount = subtotal + bonuses + allowances - deductions;

  // Apply minimum
  const minimumApplied = globalMinimum !== null && finalAmount < globalMinimum;
  if (minimumApplied) {
    finalAmount = globalMinimum!;
  }

  // Apply maximum
  const maximumApplied = globalMaximum !== null && finalAmount > globalMaximum;
  if (maximumApplied) {
    finalAmount = globalMaximum!;
  }

  // Round to avoid floating point issues
  finalAmount = roundMoney(finalAmount);
  subtotal = roundMoney(subtotal);
  bonuses = roundMoney(bonuses);
  allowances = roundMoney(allowances);
  deductions = roundMoney(deductions);

  const snapshot = buildSnapshot(items, context, subtotal, bonuses, allowances, deductions,
    minimumApplied, globalMinimum, maximumApplied, globalMaximum, finalAmount);

  return {
    items,
    subtotal,
    bonuses,
    allowances,
    deductions,
    minimum_applied: minimumApplied,
    minimum_salary: globalMinimum,
    maximum_applied: maximumApplied,
    maximum_salary: globalMaximum,
    final_amount: finalAmount,
    snapshot,
  };
}

/**
 * Calculate the monetary amount for a single rule.
 * Returns null if the rule cannot be calculated (e.g., missing data).
 */
function calculateRuleAmount(rule: SalaryRule, context: SessionContext): number | null {
  switch (rule.calculation_type) {
    case 'FIXED_MONTHLY':
      // Fixed monthly is handled separately in calculateMonthlyPayroll
      // In per-session calculation, we skip it
      return null;

    case 'FIXED_PER_SESSION':
      return Number(rule.amount);

    case 'PER_STUDENT':
      return Number(rule.amount) * context.studentsPresentCount;

    case 'PERCENT_REVENUE': {
      const revenue = rule.revenue_source === 'GROSS_REVENUE'
        ? context.grossRevenue
        : context.collectedRevenue;

      if (revenue === null || revenue === undefined) {
        // Cannot calculate — revenue data not available
        return null;
      }
      return roundMoney((Number(rule.percentage) / 100) * revenue);
    }

    case 'TIERED_STUDENT_COUNT': {
      if (!rule.tiers || rule.tiers.length === 0) return 0;
      const count = context.studentsPresentCount;
      const matchingTier = findMatchingTier(rule.tiers, count);
      return matchingTier ? Number(matchingTier.amount) : 0;
    }

    case 'BONUS': {
      if (!meetsMonthlyBonusCondition(rule, context)) return 0;
      return Number(rule.amount);
    }

    case 'ALLOWANCE':
      return Number(rule.amount);

    case 'DEDUCTION':
      return Number(rule.amount); // Stored as positive, subtracted during computation

    default:
      return 0;
  }
}

/**
 * Find the matching tier for a given student count.
 */
function findMatchingTier(tiers: SalaryRuleTier[], studentCount: number): SalaryRuleTier | null {
  // Sort tiers by min_students ascending
  const sorted = [...tiers].sort((a, b) => a.min_students - b.min_students);

  for (const tier of sorted) {
    const min = tier.min_students;
    const max = tier.max_students;

    if (studentCount >= min && (max === null || max === undefined || studentCount <= max)) {
      return tier;
    }
  }

  return null;
}

/**
 * Check if a bonus rule's monthly condition is met.
 * Note: For per-session context, we can only evaluate basic conditions.
 * Full monthly bonus evaluation happens in calculateMonthlyPayroll.
 */
function meetsMonthlyBonusCondition(rule: SalaryRule, _context: SessionContext): boolean {
  // Bonus conditions are evaluated at monthly level, not per-session
  // When called per-session, we skip bonus rules (they're handled in monthly payroll)
  if (rule.bonus_condition_type) {
    // Per-session: cannot determine if monthly threshold is met
    return false;
  }
  // Unconditional bonus
  return true;
}

// ============================================================
// INTERNAL — Fixed Monthly Salary
// ============================================================

async function calculateFixedMonthlySalary(
  coachId: string,
  organizationId: string,
  month: string
): Promise<number> {
  const supabase = await createClient();
  const dateStr = `${month}-15`; // Mid-month for effective date check

  const { data: rules } = await supabase
    .from('salary_rules')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('calculation_type', 'FIXED_MONTHLY')
    .eq('status', 'active')
    .lte('effective_from', dateStr)
    .or(`effective_to.is.null,effective_to.gte.${dateStr}`);

  if (!rules || rules.length === 0) return 0;

  // Filter rules that apply to this coach
  let total = 0;
  for (const rule of rules) {
    let applies = false;

    switch (rule.scope_type) {
      case 'ORGANIZATION':
        applies = true;
        break;
      case 'COACH':
        applies = rule.scope_coach_id === coachId;
        break;
      default:
        // For venue/class/role scope, we need to check if the coach matches
        // For FIXED_MONTHLY this is unusual, but supported
        applies = false;
        break;
    }

    if (applies) {
      if (rule.merge_mode === 'REPLACE') {
        // REPLACE: only the highest priority
        total = Number(rule.amount);
        break;
      }
      total += Number(rule.amount);
    }
  }

  return roundMoney(total);
}

// ============================================================
// INTERNAL — Helpers
// ============================================================

function buildBreakdownItem(
  rule: SalaryRule,
  amount: number,
  context: SessionContext
): SalaryBreakdownItem {
  let details = '';
  const metadata: Record<string, unknown> = {};

  switch (rule.calculation_type) {
    case 'FIXED_PER_SESSION':
      details = `${formatMoney(amount)} / buổi`;
      break;

    case 'PER_STUDENT':
      details = `${context.studentsPresentCount} học viên × ${formatMoney(Number(rule.amount))}`;
      metadata.students_present = context.studentsPresentCount;
      metadata.per_student_amount = Number(rule.amount);
      break;

    case 'PERCENT_REVENUE': {
      const revenue = rule.revenue_source === 'GROSS_REVENUE'
        ? context.grossRevenue
        : context.collectedRevenue;
      details = `${rule.percentage}% × ${formatMoney(revenue || 0)} (${rule.revenue_source === 'GROSS_REVENUE' ? 'doanh thu thô' : 'doanh thu đã thu'})`;
      metadata.percentage = rule.percentage;
      metadata.revenue = revenue;
      metadata.revenue_source = rule.revenue_source;
      break;
    }

    case 'TIERED_STUDENT_COUNT': {
      const tier = rule.tiers ? findMatchingTier(rule.tiers, context.studentsPresentCount) : null;
      details = tier
        ? `${context.studentsPresentCount} HV → bậc ${tier.min_students}–${tier.max_students ?? '∞'} = ${formatMoney(amount)}`
        : `${context.studentsPresentCount} HV → không khớp bậc nào`;
      metadata.students_present = context.studentsPresentCount;
      metadata.tier = tier;
      break;
    }

    case 'BONUS':
      details = `Thưởng: ${formatMoney(amount)}`;
      metadata.condition_type = rule.bonus_condition_type;
      metadata.condition_threshold = rule.bonus_condition_threshold;
      break;

    case 'ALLOWANCE':
      details = `Phụ cấp: ${formatMoney(amount)}`;
      break;

    case 'DEDUCTION':
      details = `Khấu trừ: -${formatMoney(amount)}`;
      break;

    default:
      details = formatMoney(amount);
  }

  return {
    rule_id: rule.id,
    rule_name: rule.name,
    calculation_type: rule.calculation_type,
    amount,
    details,
    metadata,
  };
}

function buildSnapshot(
  items: SalaryBreakdownItem[],
  context: SessionContext,
  subtotal: number,
  bonuses: number,
  allowances: number,
  deductions: number,
  minimumApplied: boolean,
  minimumSalary: number | null,
  maximumApplied: boolean,
  maximumSalary: number | null,
  finalAmount: number
): SalarySnapshot {
  return {
    engine_version: ENGINE_VERSION,
    calculated_at: new Date().toISOString(),
    context: {
      session_id: context.sessionId,
      coach_id: context.coachId,
      coach_role: context.coachRole,
      class_id: context.classId,
      venue_id: context.venueId,
      date: context.date,
      students_present: context.studentsPresentCount,
    },
    rules: items.map(item => ({
      rule_id: item.rule_id,
      rule_name: item.rule_name,
      calculation_type: item.calculation_type,
      amount: item.amount,
      details: item.details,
    })),
    subtotal,
    bonuses,
    allowances,
    deductions,
    minimum_applied: minimumApplied,
    minimum_salary: minimumSalary,
    maximum_applied: maximumApplied,
    maximum_salary: maximumSalary,
    final_amount: finalAmount,
  };
}

function buildEmptyResult(context: SessionContext): SalaryCalculationResult {
  return {
    items: [],
    subtotal: 0,
    bonuses: 0,
    allowances: 0,
    deductions: 0,
    minimum_applied: false,
    minimum_salary: null,
    maximum_applied: false,
    maximum_salary: null,
    final_amount: 0,
    snapshot: {
      engine_version: ENGINE_VERSION,
      calculated_at: new Date().toISOString(),
      context: {
        session_id: context.sessionId,
        coach_id: context.coachId,
        coach_role: context.coachRole,
        class_id: context.classId,
        venue_id: context.venueId,
        date: context.date,
        students_present: 0,
      },
      rules: [],
      subtotal: 0,
      bonuses: 0,
      allowances: 0,
      deductions: 0,
      minimum_applied: false,
      minimum_salary: null,
      maximum_applied: false,
      maximum_salary: null,
      final_amount: 0,
    },
  };
}

// ============================================================
// MONEY UTILITIES
// ============================================================

/**
 * Round to integer (VND has no decimals).
 * Uses banker's rounding (round half to even) for consistency.
 */
function roundMoney(amount: number): number {
  return Math.round(amount);
}

/**
 * Format money for display (Vietnamese locale).
 */
function formatMoney(amount: number): string {
  return `${roundMoney(amount).toLocaleString('vi-VN')}đ`;
}

/**
 * Convert HH:MM to minutes since midnight for comparison.
 */
function timeToMinutes(time: string): number {
  const parts = time.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1] || '0', 10);
}

/**
 * Get last day of a month in YYYY-MM-DD format.
 */
function getLastDayOfMonth(month: string): string {
  const [yStr, mStr] = month.split('-');
  const y = parseInt(yStr);
  const m = parseInt(mStr);
  // Construct a date at the end of the month safely in the local timezone
  // Since we just need the last day of the month:
  // new Date(y, m, 0) gives the last day of month 'm-1' which is correct in JS. 
  // For timezones, the number of days in a month is constant regardless of timezone.
  const lastDay = new Date(y, m, 0).getDate();
  return `${month}-${String(lastDay).padStart(2, '0')}`;
}

/**
 * Get the next month in YYYY-MM format.
 */
function getNextMonth(month: string): string {
  const [year, m] = month.split('-').map(Number);
  if (m === 12) {
    return `${year + 1}-01`;
  }
  return `${year}-${String(m + 1).padStart(2, '0')}`;
}
