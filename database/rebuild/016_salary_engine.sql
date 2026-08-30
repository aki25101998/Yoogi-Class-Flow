-- 016_salary_engine.sql
-- Flexible Salary Engine — Database Schema & Migration
-- This migration adds a configurable salary rule system to replace the simple per_session + per_student model.
-- Existing data is preserved and migrated. No tables are dropped.

-- ============================================================
-- 1. SALARY RULES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.salary_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Calculation type
  calculation_type TEXT NOT NULL CHECK (calculation_type IN (
    'FIXED_MONTHLY',
    'FIXED_PER_SESSION',
    'PER_STUDENT',
    'PERCENT_REVENUE',
    'TIERED_STUDENT_COUNT',
    'BONUS',
    'ALLOWANCE',
    'DEDUCTION'
  )),
  
  -- Scope targeting (determines what this rule applies to)
  scope_type TEXT NOT NULL DEFAULT 'ORGANIZATION' CHECK (scope_type IN (
    'ORGANIZATION',
    'VENUE',
    'CLASS',
    'COACH',
    'COACH_ROLE',
    'CLASS_TYPE'
  )),
  scope_venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
  scope_class_id UUID,
  scope_coach_id UUID,
  scope_coach_role TEXT CHECK (scope_coach_role IS NULL OR scope_coach_role IN ('HEAD_COACH', 'ASSISTANT_COACH')),
  scope_class_type TEXT CHECK (scope_class_type IS NULL OR scope_class_type IN (
    'GROUP', 'PRIVATE', 'SEMI_PRIVATE', 'EVENT', 'COMPETITION', 'OTHER'
  )),
  
  -- Merge behavior: ADD accumulates with other rules, REPLACE overrides lower-priority rules of same type
  merge_mode TEXT NOT NULL DEFAULT 'ADD' CHECK (merge_mode IN ('ADD', 'REPLACE')),
  
  -- Priority: higher number = more specific / takes precedence
  -- Recommended defaults: Organization=10, Venue=20, Class=30, Coach=40
  priority INTEGER NOT NULL DEFAULT 10,
  
  -- Calculation values
  amount NUMERIC NOT NULL DEFAULT 0,
  
  -- For PERCENT_REVENUE
  percentage NUMERIC CHECK (percentage IS NULL OR (percentage >= 0 AND percentage <= 100)),
  revenue_source TEXT DEFAULT 'COLLECTED_REVENUE' CHECK (
    revenue_source IS NULL OR revenue_source IN ('GROSS_REVENUE', 'COLLECTED_REVENUE')
  ),
  
  -- Min/Max caps (applied per session for session-based rules, per month for monthly rules)
  minimum_salary NUMERIC CHECK (minimum_salary IS NULL OR minimum_salary >= 0),
  maximum_salary NUMERIC CHECK (maximum_salary IS NULL OR maximum_salary >= 0),
  
  -- Time-based conditions
  condition_days_of_week INTEGER[], -- 0=Sun, 1=Mon, ..., 6=Sat; NULL = all days
  condition_start_time TEXT,         -- HH:MM format; NULL = no time constraint
  condition_end_time TEXT,           -- HH:MM format; NULL = no time constraint
  
  -- Bonus conditions (only for calculation_type = 'BONUS')
  bonus_condition_type TEXT CHECK (
    bonus_condition_type IS NULL OR bonus_condition_type IN (
      'SESSION_COUNT', 'ATTENDANCE_COUNT', 'REVENUE_THRESHOLD'
    )
  ),
  bonus_condition_threshold NUMERIC,
  
  -- Effective period
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE, -- NULL = no end date (ongoing)
  
  -- Status management
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  
  -- Audit
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Foreign keys
  FOREIGN KEY (scope_class_id) REFERENCES public.venue_classes(id) ON DELETE SET NULL,
  FOREIGN KEY (scope_coach_id) REFERENCES public.coaches(id) ON DELETE CASCADE
);

-- Validation: amount must be >= 0 for non-deduction types
-- (Deductions store positive amounts but are subtracted during calculation)
ALTER TABLE public.salary_rules ADD CONSTRAINT salary_rules_amount_check
  CHECK (
    calculation_type = 'DEDUCTION' 
    OR calculation_type = 'PERCENT_REVENUE'
    OR amount >= 0
  );

-- Validation: effective_to must be after effective_from if set
ALTER TABLE public.salary_rules ADD CONSTRAINT salary_rules_effective_period_check
  CHECK (effective_to IS NULL OR effective_to >= effective_from);

-- Indexes for efficient rule resolution
CREATE INDEX IF NOT EXISTS idx_salary_rules_org_status ON public.salary_rules(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_salary_rules_scope_venue ON public.salary_rules(scope_venue_id) WHERE scope_venue_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_salary_rules_scope_class ON public.salary_rules(scope_class_id) WHERE scope_class_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_salary_rules_scope_coach ON public.salary_rules(scope_coach_id) WHERE scope_coach_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_salary_rules_effective ON public.salary_rules(effective_from, effective_to);

-- ============================================================
-- 2. SALARY RULE TIERS (for TIERED_STUDENT_COUNT)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.salary_rule_tiers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID NOT NULL REFERENCES public.salary_rules(id) ON DELETE CASCADE,
  min_students INTEGER NOT NULL CHECK (min_students >= 0),
  max_students INTEGER CHECK (max_students IS NULL OR max_students >= min_students),
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rule_id, min_students)
);

CREATE INDEX IF NOT EXISTS idx_salary_rule_tiers_rule ON public.salary_rule_tiers(rule_id);

-- ============================================================
-- 3. SALARY PROFILES (links coaches to specific rules)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.salary_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL,
  rule_id UUID NOT NULL REFERENCES public.salary_rules(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (coach_id) REFERENCES public.coaches(id) ON DELETE CASCADE,
  UNIQUE(coach_id, rule_id)
);

CREATE INDEX IF NOT EXISTS idx_salary_profiles_coach ON public.salary_profiles(coach_id);
CREATE INDEX IF NOT EXISTS idx_salary_profiles_org ON public.salary_profiles(organization_id);

-- ============================================================
-- 4. PAYROLL PERIODS (monthly grouping)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payroll_periods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- YYYY-MM format
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'calculated', 'review', 'approved', 'paid')),
  total_amount NUMERIC DEFAULT 0,
  coach_count INTEGER DEFAULT 0,
  session_count INTEGER DEFAULT 0,
  opened_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  calculated_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  paid_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, month)
);

-- ============================================================
-- 5. SALARY ADJUSTMENTS (post-payment corrections)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.salary_adjustments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL,
  session_id UUID REFERENCES public.class_sessions(id) ON DELETE SET NULL,
  payroll_period_id UUID REFERENCES public.payroll_periods(id) ON DELETE SET NULL,
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('BONUS', 'ALLOWANCE', 'DEDUCTION', 'CORRECTION')),
  amount NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (coach_id) REFERENCES public.coaches(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_salary_adjustments_coach ON public.salary_adjustments(coach_id);
CREATE INDEX IF NOT EXISTS idx_salary_adjustments_org ON public.salary_adjustments(organization_id);

-- ============================================================
-- 6. SALARY AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.salary_audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'CREATE_RULE', 'UPDATE_RULE', 'DEACTIVATE_RULE', 'APPROVE_PAYROLL', 'REJECT_PAYROLL', 'PAY_PAYROLL', 'CREATE_ADJUSTMENT'
  target_type TEXT NOT NULL, -- 'salary_rule', 'salary_profile', 'payroll_period', 'class_session', 'salary_adjustment', 'payment'
  target_id UUID,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_salary_audit_org ON public.salary_audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_salary_audit_target ON public.salary_audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_salary_audit_created ON public.salary_audit_logs(created_at);

-- ============================================================
-- 7. ADD class_type TO venue_classes
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'venue_classes' AND column_name = 'class_type'
  ) THEN
    ALTER TABLE public.venue_classes
    ADD COLUMN class_type TEXT DEFAULT 'GROUP'
    CHECK (class_type IN ('GROUP', 'PRIVATE', 'SEMI_PRIVATE', 'EVENT', 'COMPETITION', 'OTHER'));
  END IF;
END $$;

-- ============================================================
-- 8. RLS POLICIES
-- ============================================================

-- salary_rules
ALTER TABLE public.salary_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can do all on salary_rules" ON public.salary_rules;
CREATE POLICY "Admin can do all on salary_rules" ON public.salary_rules
  FOR ALL USING (public.is_org_admin(organization_id));

DROP POLICY IF EXISTS "Coaches can view salary_rules in their org" ON public.salary_rules;
CREATE POLICY "Coaches can view salary_rules in their org" ON public.salary_rules
  FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));

-- salary_rule_tiers
ALTER TABLE public.salary_rule_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can do all on salary_rule_tiers" ON public.salary_rule_tiers;
CREATE POLICY "Admin can do all on salary_rule_tiers" ON public.salary_rule_tiers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.salary_rules sr
      WHERE sr.id = salary_rule_tiers.rule_id
      AND public.is_org_admin(sr.organization_id)
    )
  );

DROP POLICY IF EXISTS "Coaches can view salary_rule_tiers" ON public.salary_rule_tiers;
CREATE POLICY "Coaches can view salary_rule_tiers" ON public.salary_rule_tiers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.salary_rules sr
      WHERE sr.id = salary_rule_tiers.rule_id
      AND sr.organization_id IN (SELECT public.get_user_organizations())
    )
  );

-- salary_profiles
ALTER TABLE public.salary_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can do all on salary_profiles" ON public.salary_profiles;
CREATE POLICY "Admin can do all on salary_profiles" ON public.salary_profiles
  FOR ALL USING (public.is_org_admin(organization_id));

DROP POLICY IF EXISTS "Coaches can view own salary_profiles" ON public.salary_profiles;
CREATE POLICY "Coaches can view own salary_profiles" ON public.salary_profiles
  FOR SELECT USING (
    organization_id IN (SELECT public.get_user_organizations())
    AND coach_id IN (SELECT public.get_my_coach_id())
  );

-- payroll_periods
ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can do all on payroll_periods" ON public.payroll_periods;
CREATE POLICY "Admin can do all on payroll_periods" ON public.payroll_periods
  FOR ALL USING (public.is_org_admin(organization_id));

DROP POLICY IF EXISTS "Coaches can view payroll_periods in their org" ON public.payroll_periods;
CREATE POLICY "Coaches can view payroll_periods in their org" ON public.payroll_periods
  FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));

-- salary_adjustments
ALTER TABLE public.salary_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can do all on salary_adjustments" ON public.salary_adjustments;
CREATE POLICY "Admin can do all on salary_adjustments" ON public.salary_adjustments
  FOR ALL USING (public.is_org_admin(organization_id));

DROP POLICY IF EXISTS "Coaches can view own salary_adjustments" ON public.salary_adjustments;
CREATE POLICY "Coaches can view own salary_adjustments" ON public.salary_adjustments
  FOR SELECT USING (
    organization_id IN (SELECT public.get_user_organizations())
    AND coach_id IN (SELECT public.get_my_coach_id())
  );

-- salary_audit_logs
ALTER TABLE public.salary_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can view salary_audit_logs" ON public.salary_audit_logs;
CREATE POLICY "Admin can view salary_audit_logs" ON public.salary_audit_logs
  FOR SELECT USING (public.is_org_admin(organization_id));

DROP POLICY IF EXISTS "Admin can insert salary_audit_logs" ON public.salary_audit_logs;
CREATE POLICY "Admin can insert salary_audit_logs" ON public.salary_audit_logs
  FOR INSERT WITH CHECK (public.is_org_admin(organization_id));

-- payroll_payments (add missing RLS — table exists from 015 but had no RLS)
ALTER TABLE public.payroll_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can do all on payroll_payments" ON public.payroll_payments;
CREATE POLICY "Admin can do all on payroll_payments" ON public.payroll_payments
  FOR ALL USING (public.is_org_admin(organization_id));

DROP POLICY IF EXISTS "Coaches can view own payroll_payments" ON public.payroll_payments;
CREATE POLICY "Coaches can view own payroll_payments" ON public.payroll_payments
  FOR SELECT USING (
    organization_id IN (SELECT public.get_user_organizations())
    AND coach_id IN (SELECT public.get_my_coach_id())
  );

-- payroll_payment_sessions
ALTER TABLE public.payroll_payment_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can do all on payroll_payment_sessions" ON public.payroll_payment_sessions;
CREATE POLICY "Admin can do all on payroll_payment_sessions" ON public.payroll_payment_sessions
  FOR ALL USING (public.is_org_admin(organization_id));

DROP POLICY IF EXISTS "Coaches can view own payroll_payment_sessions" ON public.payroll_payment_sessions;
CREATE POLICY "Coaches can view own payroll_payment_sessions" ON public.payroll_payment_sessions
  FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));

-- ============================================================
-- 9. CONFLICT DETECTION FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_salary_rule_conflicts(
  p_organization_id UUID,
  p_scope_type TEXT,
  p_scope_venue_id UUID,
  p_scope_class_id UUID,
  p_scope_coach_id UUID,
  p_scope_coach_role TEXT,
  p_scope_class_type TEXT,
  p_calculation_type TEXT,
  p_priority INTEGER,
  p_effective_from DATE,
  p_effective_to DATE,
  p_exclude_rule_id UUID DEFAULT NULL
)
RETURNS TABLE(
  conflict_rule_id UUID,
  conflict_rule_name TEXT,
  conflict_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sr.id AS conflict_rule_id,
    sr.name AS conflict_rule_name,
    CASE
      WHEN sr.priority = p_priority AND sr.calculation_type = p_calculation_type THEN
        'Same priority (' || sr.priority || ') and calculation type (' || sr.calculation_type || ') with overlapping scope and effective period'
      WHEN sr.calculation_type = p_calculation_type AND sr.merge_mode = 'REPLACE' THEN
        'Existing REPLACE rule with same calculation type may cause ambiguity'
      ELSE
        'Overlapping scope and effective period with similar configuration'
    END AS conflict_reason
  FROM public.salary_rules sr
  WHERE sr.organization_id = p_organization_id
    AND sr.status = 'active'
    AND sr.id IS DISTINCT FROM p_exclude_rule_id
    AND sr.calculation_type = p_calculation_type
    AND sr.scope_type = p_scope_type
    -- Match scope fields
    AND (sr.scope_venue_id IS NOT DISTINCT FROM p_scope_venue_id)
    AND (sr.scope_class_id IS NOT DISTINCT FROM p_scope_class_id)
    AND (sr.scope_coach_id IS NOT DISTINCT FROM p_scope_coach_id)
    AND (sr.scope_coach_role IS NOT DISTINCT FROM p_scope_coach_role)
    AND (sr.scope_class_type IS NOT DISTINCT FROM p_scope_class_type)
    -- Check overlapping effective periods
    AND (
      (sr.effective_to IS NULL AND (p_effective_to IS NULL OR sr.effective_from <= p_effective_to))
      OR (p_effective_to IS NULL AND (sr.effective_to IS NULL OR sr.effective_from <= COALESCE(p_effective_to, '9999-12-31'::DATE)))
      OR (sr.effective_from <= COALESCE(p_effective_to, '9999-12-31'::DATE) AND COALESCE(sr.effective_to, '9999-12-31'::DATE) >= p_effective_from)
    )
    -- Same priority = definite conflict
    AND sr.priority = p_priority;
END;
$$;

-- ============================================================
-- 10. AUDIT LOG HELPER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_salary_audit(
  p_organization_id UUID,
  p_action TEXT,
  p_target_type TEXT,
  p_target_id UUID,
  p_actor_id UUID,
  p_old_value JSONB DEFAULT NULL,
  p_new_value JSONB DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.salary_audit_logs (
    organization_id, action, target_type, target_id,
    actor_id, old_value, new_value, reason
  ) VALUES (
    p_organization_id, p_action, p_target_type, p_target_id,
    p_actor_id, p_old_value, p_new_value, p_reason
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- ============================================================
-- 11. DATA MIGRATION — teacher_salaries → salary_rules
-- Converts existing per_session and per_student config to salary rules.
-- Preserves original teacher_salaries table and data intact.
-- ============================================================
DO $$
DECLARE
  v_record RECORD;
  v_rule_id UUID;
BEGIN
  -- Only run if salary_rules is empty (first-time migration)
  IF NOT EXISTS (SELECT 1 FROM public.salary_rules LIMIT 1) THEN
    FOR v_record IN 
      SELECT ts.id, ts.organization_id, ts.coach_id, ts.per_session, ts.per_student
      FROM public.teacher_salaries ts
      WHERE ts.coach_id IS NOT NULL
    LOOP
      -- Create FIXED_PER_SESSION rule if per_session > 0
      IF COALESCE(v_record.per_session, 0) > 0 THEN
        INSERT INTO public.salary_rules (
          organization_id, name, description, calculation_type,
          scope_type, scope_coach_id, merge_mode, priority,
          amount, effective_from, status
        ) VALUES (
          v_record.organization_id,
          'Migrated: Lương theo buổi',
          'Auto-migrated from teacher_salaries.per_session (ID: ' || v_record.id || ')',
          'FIXED_PER_SESSION',
          'COACH',
          v_record.coach_id,
          'ADD',
          40, -- Coach-level priority
          v_record.per_session,
          CURRENT_DATE,
          'active'
        ) RETURNING id INTO v_rule_id;
        
        -- Link to salary profile
        INSERT INTO public.salary_profiles (organization_id, coach_id, rule_id)
        VALUES (v_record.organization_id, v_record.coach_id, v_rule_id)
        ON CONFLICT (coach_id, rule_id) DO NOTHING;
      END IF;
      
      -- Create PER_STUDENT rule if per_student > 0
      IF COALESCE(v_record.per_student, 0) > 0 THEN
        INSERT INTO public.salary_rules (
          organization_id, name, description, calculation_type,
          scope_type, scope_coach_id, merge_mode, priority,
          amount, effective_from, status
        ) VALUES (
          v_record.organization_id,
          'Migrated: Lương theo học viên',
          'Auto-migrated from teacher_salaries.per_student (ID: ' || v_record.id || ')',
          'PER_STUDENT',
          'COACH',
          v_record.coach_id,
          'ADD',
          40, -- Coach-level priority
          v_record.per_student,
          CURRENT_DATE,
          'active'
        ) RETURNING id INTO v_rule_id;
        
        -- Link to salary profile
        INSERT INTO public.salary_profiles (organization_id, coach_id, rule_id)
        VALUES (v_record.organization_id, v_record.coach_id, v_rule_id)
        ON CONFLICT (coach_id, rule_id) DO NOTHING;
      END IF;
    END LOOP;
    
    RAISE NOTICE 'Salary data migration completed successfully.';
  ELSE
    RAISE NOTICE 'Salary rules already exist. Skipping migration.';
  END IF;
END $$;

-- ============================================================
-- 12. UPDATED pay_approved_salary_sessions RPC
-- Enhanced to support the new salary engine's richer snapshot format.
-- The core logic remains: atomic payment with finance transaction.
-- ============================================================
CREATE OR REPLACE FUNCTION public.pay_approved_salary_sessions(
  p_organization_id UUID,
  p_coach_id UUID,
  p_session_ids UUID[],
  p_created_by UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_amount NUMERIC := 0;
  v_session RECORD;
  v_finance_txn_id UUID;
  v_payment_id UUID;
  v_session_count INTEGER := 0;
  v_deduplicated_ids UUID[];
BEGIN
  -- Deduplicate session IDs
  SELECT ARRAY(SELECT DISTINCT unnest(p_session_ids)) INTO v_deduplicated_ids;
  
  -- 1. Calculate total amount and verify sessions
  FOR v_session IN 
    SELECT id, calculated_salary, status
    FROM public.class_sessions
    WHERE id = ANY(v_deduplicated_ids)
      AND organization_id = p_organization_id
      AND coach_id = p_coach_id
    FOR UPDATE -- lock the rows to prevent race conditions
  LOOP
    -- Verify status is approved
    IF v_session.status != 'approved' THEN
      RAISE EXCEPTION 'Session % is not in approved status (current: %)', v_session.id, v_session.status;
    END IF;
    
    -- Verify not already paid via payroll_payment_sessions
    IF EXISTS (SELECT 1 FROM public.payroll_payment_sessions WHERE session_id = v_session.id) THEN
      RAISE EXCEPTION 'Session % has already been paid', v_session.id;
    END IF;

    v_total_amount := v_total_amount + COALESCE(v_session.calculated_salary, 0);
    v_session_count := v_session_count + 1;
  END LOOP;

  -- Verify we found all requested sessions
  IF v_session_count != array_length(v_deduplicated_ids, 1) THEN
    RAISE EXCEPTION 'Some sessions were not found or do not belong to this coach/organization';
  END IF;

  -- 2. Create Finance Transaction
  INSERT INTO public.finance_transactions (
    organization_id, type, category, amount, date, description
  ) VALUES (
    p_organization_id,
    'expense',
    'payroll',
    v_total_amount,
    CURRENT_DATE::TEXT,
    'Thanh toán lương HLV (' || v_session_count || ' buổi)'
  ) RETURNING id INTO v_finance_txn_id;

  -- 3. Create Payroll Payment
  INSERT INTO public.payroll_payments (
    organization_id, coach_id, amount, finance_transaction_id, created_by
  ) VALUES (
    p_organization_id, p_coach_id, v_total_amount, v_finance_txn_id, p_created_by
  ) RETURNING id INTO v_payment_id;

  -- Update reference_id in finance_transactions
  UPDATE public.finance_transactions 
  SET reference_id = v_payment_id 
  WHERE id = v_finance_txn_id;

  -- 4. Create mapping and update session status
  FOR v_session IN 
    SELECT unnest(v_deduplicated_ids) AS id
  LOOP
    INSERT INTO public.payroll_payment_sessions (
      organization_id, payment_id, session_id
    ) VALUES (
      p_organization_id, v_payment_id, v_session.id
    );

    UPDATE public.class_sessions
    SET status = 'paid'
    WHERE id = v_session.id
      AND organization_id = p_organization_id;
  END LOOP;

  -- 5. Audit log
  PERFORM public.log_salary_audit(
    p_organization_id,
    'PAY_PAYROLL',
    'payment',
    v_payment_id,
    p_created_by,
    NULL,
    json_build_object(
      'session_count', v_session_count,
      'total_amount', v_total_amount,
      'coach_id', p_coach_id
    )::JSONB,
    NULL
  );

  RETURN json_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'finance_transaction_id', v_finance_txn_id,
    'total_amount', v_total_amount,
    'session_count', v_session_count
  );
END;
$$;
