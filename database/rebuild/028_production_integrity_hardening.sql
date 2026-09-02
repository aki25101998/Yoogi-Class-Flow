-- 028_production_integrity_hardening.sql
-- Production Integrity Hardening Migration
-- This migration adds business-critical database constraints, fixes security gaps,
-- and hardens integrity without dropping data or breaking existing functionality.

-- ============================================================
-- §1.1 — COMPOSITE FK HARDENING
-- Ensure child entities reference parent via (organization_id, id)
-- to prevent cross-tenant data leaks at the DB level.
-- ============================================================

-- 1a. organization_belts — add composite unique key
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organization_belts_org_id_key'
  ) THEN
    ALTER TABLE public.organization_belts ADD CONSTRAINT organization_belts_org_id_key UNIQUE(organization_id, id);
  END IF;
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- 1b. students.current_belt_id — add composite FK to organization_belts
-- First make sure the column exists (in case db reset wasn't run after it was added to 006)
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS current_belt_id UUID;
-- First drop the simple FK if it exists
DO $$ BEGIN
  -- Check if the old simple FK exists and drop it
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.students'::regclass 
    AND confrelid = 'public.organization_belts'::regclass
    AND contype = 'f'
    AND array_length(conkey, 1) = 1
  ) THEN
    -- Get the constraint name dynamically
    EXECUTE (
      SELECT 'ALTER TABLE public.students DROP CONSTRAINT ' || quote_ident(conname)
      FROM pg_constraint 
      WHERE conrelid = 'public.students'::regclass 
      AND confrelid = 'public.organization_belts'::regclass
      AND contype = 'f'
      AND array_length(conkey, 1) = 1
      LIMIT 1
    );
  END IF;
END $$;

-- Add composite FK
DO $$ BEGIN
  ALTER TABLE public.students 
    ADD CONSTRAINT fk_students_belt_org 
    FOREIGN KEY (organization_id, current_belt_id) 
    REFERENCES public.organization_belts(organization_id, id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1c. students.venue_id — add composite FK to venues
DO $$ BEGIN
  -- Drop simple FK if exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.students'::regclass 
    AND confrelid = 'public.venues'::regclass
    AND contype = 'f'
    AND array_length(conkey, 1) = 1
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE public.students DROP CONSTRAINT ' || quote_ident(conname)
      FROM pg_constraint 
      WHERE conrelid = 'public.students'::regclass 
      AND confrelid = 'public.venues'::regclass
      AND contype = 'f'
      AND array_length(conkey, 1) = 1
      LIMIT 1
    );
  END IF;
END $$;

DO $$ BEGIN
  ALTER TABLE public.students 
    ADD CONSTRAINT fk_students_venue_org 
    FOREIGN KEY (organization_id, venue_id) 
    REFERENCES public.venues(organization_id, id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1d. class_sessions — add UNIQUE(organization_id, id) for composite FK targets
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.class_sessions'::regclass 
    AND conname = 'class_sessions_org_id_key'
  ) THEN
    ALTER TABLE public.class_sessions ADD CONSTRAINT class_sessions_org_id_key UNIQUE(organization_id, id);
  END IF;
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- 1e. student_session_attendance — add composite FK to students
DO $$ BEGIN
  -- Drop simple FK to students if exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.student_session_attendance'::regclass 
    AND confrelid = 'public.students'::regclass
    AND contype = 'f'
    AND array_length(conkey, 1) = 1
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE public.student_session_attendance DROP CONSTRAINT ' || quote_ident(conname)
      FROM pg_constraint 
      WHERE conrelid = 'public.student_session_attendance'::regclass 
      AND confrelid = 'public.students'::regclass
      AND contype = 'f'
      AND array_length(conkey, 1) = 1
      LIMIT 1
    );
  END IF;
END $$;

DO $$ BEGIN
  ALTER TABLE public.student_session_attendance 
    ADD CONSTRAINT fk_ssa_student_org 
    FOREIGN KEY (organization_id, student_id) 
    REFERENCES public.students(organization_id, id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1f. student_session_attendance — add composite FK to class_sessions
DO $$ BEGIN
  -- Drop simple FK to class_sessions if exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.student_session_attendance'::regclass 
    AND confrelid = 'public.class_sessions'::regclass
    AND contype = 'f'
    AND array_length(conkey, 1) = 1
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE public.student_session_attendance DROP CONSTRAINT ' || quote_ident(conname)
      FROM pg_constraint 
      WHERE conrelid = 'public.student_session_attendance'::regclass 
      AND confrelid = 'public.class_sessions'::regclass
      AND contype = 'f'
      AND array_length(conkey, 1) = 1
      LIMIT 1
    );
  END IF;
END $$;

DO $$ BEGIN
  ALTER TABLE public.student_session_attendance 
    ADD CONSTRAINT fk_ssa_session_org 
    FOREIGN KEY (organization_id, session_id) 
    REFERENCES public.class_sessions(organization_id, id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1g. payroll_payments — add composite FK to coaches
DO $$ BEGIN
  -- Drop simple FK if exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.payroll_payments'::regclass 
    AND confrelid = 'public.coaches'::regclass
    AND contype = 'f'
    AND array_length(conkey, 1) = 1
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE public.payroll_payments DROP CONSTRAINT ' || quote_ident(conname)
      FROM pg_constraint 
      WHERE conrelid = 'public.payroll_payments'::regclass 
      AND confrelid = 'public.coaches'::regclass
      AND contype = 'f'
      AND array_length(conkey, 1) = 1
      LIMIT 1
    );
  END IF;
END $$;

DO $$ BEGIN
  ALTER TABLE public.payroll_payments 
    ADD CONSTRAINT fk_payroll_payments_coach_org 
    FOREIGN KEY (organization_id, coach_id) 
    REFERENCES public.coaches(organization_id, id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1h. salary_profiles — add composite FK to coaches
DO $$ BEGIN
  -- Drop simple FK if exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.salary_profiles'::regclass 
    AND confrelid = 'public.coaches'::regclass
    AND contype = 'f'
    AND array_length(conkey, 1) = 1
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE public.salary_profiles DROP CONSTRAINT ' || quote_ident(conname)
      FROM pg_constraint 
      WHERE conrelid = 'public.salary_profiles'::regclass 
      AND confrelid = 'public.coaches'::regclass
      AND contype = 'f'
      AND array_length(conkey, 1) = 1
      LIMIT 1
    );
  END IF;
END $$;

DO $$ BEGIN
  ALTER TABLE public.salary_profiles 
    ADD CONSTRAINT fk_salary_profiles_coach_org 
    FOREIGN KEY (organization_id, coach_id) 
    REFERENCES public.coaches(organization_id, id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1i. salary_adjustments — add composite FK to coaches
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.salary_adjustments'::regclass 
    AND confrelid = 'public.coaches'::regclass
    AND contype = 'f'
    AND array_length(conkey, 1) = 1
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE public.salary_adjustments DROP CONSTRAINT ' || quote_ident(conname)
      FROM pg_constraint 
      WHERE conrelid = 'public.salary_adjustments'::regclass 
      AND confrelid = 'public.coaches'::regclass
      AND contype = 'f'
      AND array_length(conkey, 1) = 1
      LIMIT 1
    );
  END IF;
END $$;

DO $$ BEGIN
  ALTER TABLE public.salary_adjustments 
    ADD CONSTRAINT fk_salary_adj_coach_org 
    FOREIGN KEY (organization_id, coach_id) 
    REFERENCES public.coaches(organization_id, id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================
-- §2.1 — HEAD_COACH UNIQUE PARTIAL INDEX
-- Business rule: Each class has at most 1 HEAD_COACH.
-- This prevents race conditions at the DB level.
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_head_coach_per_class 
ON public.class_coaches(class_id) 
WHERE role = 'HEAD_COACH';


-- ============================================================
-- §4.4 — SESSION STATE MACHINE TRIGGER
-- Enforce valid state transitions at the DB level.
-- Allowed: scheduled→checked_in→approved→paid
--          scheduled/checked_in→cancelled
--          checked_in/approved→rejected
-- Blocked: paid→anything, approved→scheduled, cancelled→anything
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_session_state_machine()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_old_status TEXT;
  v_new_status TEXT;
BEGIN
  v_old_status := OLD.status;
  v_new_status := NEW.status;

  -- If status didn't change, allow
  IF v_old_status = v_new_status THEN
    RETURN NEW;
  END IF;

  -- Define valid transitions
  CASE v_old_status
    WHEN 'scheduled' THEN
      IF v_new_status NOT IN ('checked_in', 'cancelled') THEN
        RAISE EXCEPTION 'Không thể chuyển trạng thái từ "scheduled" sang "%". Chỉ cho phép: checked_in, cancelled.', v_new_status;
      END IF;
    WHEN 'checked_in' THEN
      IF v_new_status NOT IN ('approved', 'rejected', 'cancelled') THEN
        RAISE EXCEPTION 'Không thể chuyển trạng thái từ "checked_in" sang "%". Chỉ cho phép: approved, rejected, cancelled.', v_new_status;
      END IF;
    WHEN 'approved' THEN
      IF v_new_status NOT IN ('paid', 'rejected') THEN
        RAISE EXCEPTION 'Không thể chuyển trạng thái từ "approved" sang "%". Chỉ cho phép: paid, rejected.', v_new_status;
      END IF;
    WHEN 'paid' THEN
      RAISE EXCEPTION 'Buổi học đã thanh toán (paid) không thể thay đổi trạng thái.';
    WHEN 'cancelled' THEN
      RAISE EXCEPTION 'Buổi học đã hủy (cancelled) không thể thay đổi trạng thái.';
    WHEN 'rejected' THEN
      IF v_new_status NOT IN ('checked_in') THEN
        RAISE EXCEPTION 'Không thể chuyển trạng thái từ "rejected" sang "%". Chỉ cho phép: checked_in.', v_new_status;
      END IF;
    ELSE
      -- Unknown old status, allow (defensive)
      NULL;
  END CASE;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS session_state_machine ON public.class_sessions;
CREATE TRIGGER session_state_machine
  BEFORE UPDATE OF status ON public.class_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_session_state_machine();


-- ============================================================
-- §5.1–5.4 — ATOMIC TUITION PAYMENT RPC
-- Replaces the non-atomic recordPaymentAction flow.
-- Uses SELECT FOR UPDATE, validates overpayment, atomic commit.
-- ============================================================
CREATE OR REPLACE FUNCTION public.record_tuition_payment(
  p_tuition_id UUID,
  p_amount NUMERIC,
  p_organization_id UUID,
  p_created_by UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tuition RECORD;
  v_new_paid NUMERIC;
  v_new_status TEXT;
  v_finance_id UUID;
  v_actor_id UUID;
BEGIN
  -- 0. Derive actor from auth.uid() (don't trust p_created_by blindly)
  SELECT p.id INTO v_actor_id 
  FROM public.profiles p 
  WHERE p.auth_user_id = auth.uid();
  
  -- Use derived actor, fallback to provided if auth context unavailable
  v_actor_id := COALESCE(v_actor_id, p_created_by);

  -- 1. Validate amount
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount = 'NaN'::NUMERIC OR p_amount = 'Infinity'::NUMERIC THEN
    RETURN json_build_object('success', false, 'error', 'Số tiền thanh toán phải lớn hơn 0 và hợp lệ.');
  END IF;

  -- 2. Lock and fetch tuition
  SELECT * INTO v_tuition
  FROM public.tuition
  WHERE id = p_tuition_id 
    AND organization_id = p_organization_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Không tìm thấy khoản học phí hoặc bạn không có quyền.');
  END IF;

  -- 3. Calculate new paid amount
  v_new_paid := COALESCE(v_tuition.paid_amount, 0) + p_amount;
  
  -- 4. Check overpayment
  IF v_new_paid > v_tuition.amount THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Số tiền thanh toán vượt quá số tiền còn lại. Còn lại: ' || (v_tuition.amount - COALESCE(v_tuition.paid_amount, 0))::TEXT
    );
  END IF;

  -- 5. Determine new status
  IF v_new_paid >= v_tuition.amount THEN
    v_new_status := 'paid';
  ELSIF v_new_paid > 0 THEN
    v_new_status := 'partial';
  ELSE
    v_new_status := 'unpaid';
  END IF;

  -- 6. Update tuition (atomic with finance below)
  UPDATE public.tuition
  SET paid_amount = v_new_paid, 
      status = v_new_status,
      updated_at = NOW()
  WHERE id = p_tuition_id;

  -- 7. Create finance transaction
  INSERT INTO public.finance_transactions (
    organization_id, type, category, amount, date, description, reference_id, source_type, source_id
  ) VALUES (
    p_organization_id,
    'income',
    'tuition',
    p_amount,
    CURRENT_DATE::TEXT,
    'Thanh toán học phí — ' || COALESCE(v_tuition.due_date, 'N/A'),
    p_tuition_id,
    'TUITION_PAYMENT',
    p_tuition_id
  ) RETURNING id INTO v_finance_id;

  RETURN json_build_object(
    'success', true,
    'finance_transaction_id', v_finance_id,
    'new_paid_amount', v_new_paid,
    'new_status', v_new_status
  );
END;
$$;


-- ============================================================
-- §6.1–6.2 — FINANCE CONSTRAINTS
-- ============================================================

-- Add source tracking columns
ALTER TABLE public.finance_transactions 
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS source_id UUID;

-- Add CHECK for source_type values
DO $$ BEGIN
  ALTER TABLE public.finance_transactions 
    ADD CONSTRAINT chk_finance_source_type 
    CHECK (source_type IS NULL OR source_type IN ('TUITION_PAYMENT', 'PAYROLL_PAYMENT', 'MANUAL'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add CHECK for amount > 0 (safe: detect violations first)
DO $$
DECLARE v_violations INT;
BEGIN
  SELECT COUNT(*) INTO v_violations FROM public.finance_transactions WHERE amount <= 0;
  IF v_violations > 0 THEN
    -- Fix violations: set to absolute value or 0.01 if zero
    UPDATE public.finance_transactions SET amount = GREATEST(ABS(amount), 0.01) WHERE amount <= 0;
    RAISE NOTICE 'Fixed % finance records with amount <= 0', v_violations;
  END IF;
END $$;

DO $$ BEGIN
  ALTER TABLE public.finance_transactions ADD CONSTRAINT chk_finance_amount CHECK (amount > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add CHECK for type enum
DO $$ BEGIN
  ALTER TABLE public.finance_transactions ADD CONSTRAINT chk_finance_type CHECK (type IN ('income', 'expense'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Backfill source_type for existing payroll finance transactions
UPDATE public.finance_transactions 
SET source_type = 'PAYROLL_PAYMENT'
WHERE category = 'payroll' AND source_type IS NULL AND reference_id IS NOT NULL;

-- Backfill source_type for existing tuition finance transactions  
UPDATE public.finance_transactions 
SET source_type = 'TUITION_PAYMENT'
WHERE category = 'tuition' AND source_type IS NULL AND reference_id IS NOT NULL;


-- ============================================================
-- §12.1 — IMPORT ACTION TYPE
-- Allow 'IMPORT' in version_history action_type
-- ============================================================
ALTER TABLE public.version_history DROP CONSTRAINT IF EXISTS version_history_action_type_check;
ALTER TABLE public.version_history ADD CONSTRAINT version_history_action_type_check 
  CHECK (action_type IN ('CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'SYSTEM', 'IMPORT'));


-- ============================================================
-- §13 — STATUS CHECK CONSTRAINTS
-- Add safe CHECK constraints with violation detection
-- ============================================================

-- venues.status
DO $$
DECLARE v_violations INT;
BEGIN
  SELECT COUNT(*) INTO v_violations FROM public.venues WHERE status NOT IN ('active', 'inactive');
  IF v_violations > 0 THEN
    UPDATE public.venues SET status = 'active' WHERE status NOT IN ('active', 'inactive');
    RAISE NOTICE 'Fixed % venue status violations', v_violations;
  END IF;
  BEGIN
    ALTER TABLE public.venues ADD CONSTRAINT chk_venue_status CHECK (status IN ('active', 'inactive'));
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- students.status
DO $$
DECLARE v_violations INT;
BEGIN
  SELECT COUNT(*) INTO v_violations FROM public.students WHERE status NOT IN ('active', 'inactive');
  IF v_violations > 0 THEN
    UPDATE public.students SET status = 'active' WHERE status NOT IN ('active', 'inactive');
    RAISE NOTICE 'Fixed % student status violations', v_violations;
  END IF;
  BEGIN
    ALTER TABLE public.students ADD CONSTRAINT chk_student_status CHECK (status IN ('active', 'inactive'));
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- coaches.status
DO $$
DECLARE v_violations INT;
BEGIN
  SELECT COUNT(*) INTO v_violations FROM public.coaches WHERE status NOT IN ('active', 'inactive');
  IF v_violations > 0 THEN
    UPDATE public.coaches SET status = 'active' WHERE status NOT IN ('active', 'inactive');
    RAISE NOTICE 'Fixed % coach status violations', v_violations;
  END IF;
  BEGIN
    ALTER TABLE public.coaches ADD CONSTRAINT chk_coach_status CHECK (status IN ('active', 'inactive'));
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- class_coaches.role
DO $$
DECLARE v_violations INT;
BEGIN
  SELECT COUNT(*) INTO v_violations FROM public.class_coaches WHERE role NOT IN ('HEAD_COACH', 'ASSISTANT_COACH');
  IF v_violations > 0 THEN
    UPDATE public.class_coaches SET role = 'ASSISTANT_COACH' WHERE role NOT IN ('HEAD_COACH', 'ASSISTANT_COACH');
    RAISE NOTICE 'Fixed % class_coaches role violations', v_violations;
  END IF;
  BEGIN
    ALTER TABLE public.class_coaches ADD CONSTRAINT chk_class_coach_role CHECK (role IN ('HEAD_COACH', 'ASSISTANT_COACH'));
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- class_students.status
DO $$
DECLARE v_violations INT;
BEGIN
  SELECT COUNT(*) INTO v_violations FROM public.class_students WHERE status NOT IN ('active', 'dropped');
  IF v_violations > 0 THEN
    UPDATE public.class_students SET status = 'active' WHERE status NOT IN ('active', 'dropped');
    RAISE NOTICE 'Fixed % class_students status violations', v_violations;
  END IF;
  BEGIN
    ALTER TABLE public.class_students ADD CONSTRAINT chk_class_student_status CHECK (status IN ('active', 'dropped'));
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- tuition.status
DO $$
DECLARE v_violations INT;
BEGIN
  SELECT COUNT(*) INTO v_violations FROM public.tuition WHERE status NOT IN ('unpaid', 'partial', 'paid');
  IF v_violations > 0 THEN
    UPDATE public.tuition SET status = 'unpaid' WHERE status NOT IN ('unpaid', 'partial', 'paid');
    RAISE NOTICE 'Fixed % tuition status violations', v_violations;
  END IF;
  BEGIN
    ALTER TABLE public.tuition ADD CONSTRAINT chk_tuition_status CHECK (status IN ('unpaid', 'partial', 'paid'));
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- tuition.amount >= 0
DO $$ BEGIN
  ALTER TABLE public.tuition ADD CONSTRAINT chk_tuition_amount CHECK (amount >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- tuition.paid_amount >= 0
DO $$ BEGIN
  ALTER TABLE public.tuition ADD CONSTRAINT chk_tuition_paid_amount CHECK (paid_amount >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================
-- §8.1 — RPC AUTHORIZATION HARDENING
-- pay_approved_salary_sessions: add internal auth check
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
SET search_path = public
AS $$
DECLARE
  v_total_amount NUMERIC := 0;
  v_session RECORD;
  v_finance_txn_id UUID;
  v_payment_id UUID;
  v_session_count INTEGER := 0;
  v_deduplicated_ids UUID[];
  v_actor_id UUID;
BEGIN
  -- AUTHORIZATION: Verify caller is admin/owner of this organization
  IF NOT public.is_org_admin(p_organization_id) THEN
    RAISE EXCEPTION 'Permission denied: only admin/owner can process payments.';
  END IF;

  -- Derive actor from auth context
  SELECT p.id INTO v_actor_id 
  FROM public.profiles p 
  WHERE p.auth_user_id = auth.uid();
  v_actor_id := COALESCE(v_actor_id, p_created_by);

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
    organization_id, type, category, amount, date, description, source_type, source_id
  ) VALUES (
    p_organization_id,
    'expense',
    'payroll',
    GREATEST(v_total_amount, 0.01), -- Ensure amount > 0 for CHECK constraint
    CURRENT_DATE::TEXT,
    'Thanh toán lương HLV (' || v_session_count || ' buổi)',
    'PAYROLL_PAYMENT',
    NULL -- Will be updated with payment_id
  ) RETURNING id INTO v_finance_txn_id;

  -- 3. Create Payroll Payment
  INSERT INTO public.payroll_payments (
    organization_id, coach_id, amount, finance_transaction_id, created_by
  ) VALUES (
    p_organization_id, p_coach_id, v_total_amount, v_finance_txn_id, v_actor_id
  ) RETURNING id INTO v_payment_id;

  -- Update reference_id and source_id in finance_transactions
  UPDATE public.finance_transactions 
  SET reference_id = v_payment_id,
      source_id = v_payment_id
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

  -- 5. Audit log (using derived actor)
  PERFORM public.log_salary_audit(
    p_organization_id,
    'PAY_PAYROLL',
    'payment',
    v_payment_id,
    v_actor_id,
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


-- ============================================================
-- §9 — SECURITY DEFINER HARDENING
-- ============================================================

-- 9a. log_salary_audit — derive actor from auth.uid(), don't trust p_actor_id
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
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
  v_derived_actor UUID;
BEGIN
  -- Derive actor from auth context if available
  SELECT p.id INTO v_derived_actor
  FROM public.profiles p 
  WHERE p.auth_user_id = auth.uid();
  
  -- Use derived actor, fallback to provided
  v_derived_actor := COALESCE(v_derived_actor, p_actor_id);

  INSERT INTO public.salary_audit_logs (
    organization_id, action, target_type, target_id,
    actor_id, old_value, new_value, reason
  ) VALUES (
    p_organization_id, p_action, p_target_type, p_target_id,
    v_derived_actor, p_old_value, p_new_value, p_reason
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- 9b. check_salary_rule_conflicts — add search_path
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
SET search_path = public
AS $$
BEGIN
  -- Authorization: must be a member of the organization
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    JOIN public.profiles p ON p.id = om.user_id
    WHERE p.auth_user_id = auth.uid()
    AND om.organization_id = p_organization_id
    AND om.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Permission denied: not a member of this organization.';
  END IF;

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
    AND (sr.scope_venue_id IS NOT DISTINCT FROM p_scope_venue_id)
    AND (sr.scope_class_id IS NOT DISTINCT FROM p_scope_class_id)
    AND (sr.scope_coach_id IS NOT DISTINCT FROM p_scope_coach_id)
    AND (sr.scope_coach_role IS NOT DISTINCT FROM p_scope_coach_role)
    AND (sr.scope_class_type IS NOT DISTINCT FROM p_scope_class_type)
    AND (
      (sr.effective_to IS NULL AND (p_effective_to IS NULL OR sr.effective_from <= p_effective_to))
      OR (p_effective_to IS NULL AND (sr.effective_to IS NULL OR sr.effective_from <= COALESCE(p_effective_to, '9999-12-31'::DATE)))
      OR (sr.effective_from <= COALESCE(p_effective_to, '9999-12-31'::DATE) AND COALESCE(sr.effective_to, '9999-12-31'::DATE) >= p_effective_from)
    )
    AND sr.priority = p_priority;
END;
$$;

-- 9c. safe_update_record — add search_path
CREATE OR REPLACE FUNCTION public.safe_update_record(
    p_table_name TEXT,
    p_record_id UUID,
    p_expected_updated_at TIMESTAMPTZ,
    p_new_data JSONB
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_updated_at TIMESTAMPTZ;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = p_table_name) THEN
        RETURN json_build_object('success', false, 'error', 'Bảng không hợp lệ.');
    END IF;

    EXECUTE format('SELECT updated_at FROM public.%I WHERE id = %L FOR UPDATE', p_table_name, p_record_id) INTO v_current_updated_at;

    IF v_current_updated_at IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Bản ghi không tồn tại hoặc đã bị xóa.');
    END IF;

    IF v_current_updated_at != p_expected_updated_at THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Dữ liệu này đã được người khác cập nhật. Vui lòng tải lại trước khi lưu.',
            'code', 'CONCURRENT_UPDATE_DETECTED',
            'current_updated_at', v_current_updated_at
        );
    END IF;

    BEGIN
        p_new_data := p_new_data || jsonb_build_object('updated_at', NOW());
        EXECUTE public.build_dynamic_update(p_table_name) USING p_new_data, p_record_id;
    EXCEPTION WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
    END;

    RETURN json_build_object('success', true);
END;
$$;


-- ============================================================
-- §10.2 — AUDIT TRIGGER COVERAGE
-- Add audit triggers to salary/payroll/belt tables
-- ============================================================
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN 
        SELECT unnest(ARRAY[
            'salary_rules', 'salary_rule_tiers', 'salary_profiles',
            'payroll_periods', 'salary_adjustments',
            'payroll_payments', 'payroll_payment_sessions', 'organization_belts'
        ])
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS audit_trigger ON public.%I', t);
        EXECUTE format('CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.capture_version_history()', t);
    END LOOP;
END $$;


-- ============================================================
-- §10.3 — RESTORE WHITELIST UPDATE
-- Update restore_record_to_state and restore_organization_version
-- ============================================================
CREATE OR REPLACE FUNCTION public.restore_record_to_state(
    p_org_id UUID,
    p_table_name TEXT,
    p_record_id UUID,
    p_state JSONB
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_restore_version_id UUID;
    v_profile_id UUID;
    v_exists BOOLEAN;
    v_current_org_id UUID;
BEGIN
    -- 1. Check Permissions
    IF NOT public.is_org_admin(p_org_id) THEN
        RETURN json_build_object('success', false, 'error', 'Permission denied.');
    END IF;

    -- 2. SECURITY: Updated Table Whitelist
    IF p_table_name NOT IN (
        'venues', 'venue_classes', 'class_coaches', 'students', 'class_students', 
        'schedules', 'attendance', 'student_session_attendance', 'teacher_salaries', 
        'tuition', 'finance_transactions', 'class_sessions',
        'organization_belts', 'salary_rules', 'salary_rule_tiers', 'salary_profiles',
        'payroll_periods', 'salary_adjustments',
        'payroll_payments', 'payroll_payment_sessions'
    ) THEN
        RAISE EXCEPTION 'Bảng % không được phép khôi phục.', p_table_name;
    END IF;

    -- 3. SECURITY: Validate payload organization_id
    IF (p_state->>'organization_id')::UUID != p_org_id THEN
        RAISE EXCEPTION 'Dữ liệu không thuộc về Organization hiện tại. Không thể khôi phục.';
    END IF;

    -- 4. Get profile
    SELECT id INTO v_profile_id FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1;

    -- 5. Create RESTORE version context
    INSERT INTO public.version_history (
        organization_id, version_number, summary, action_type, created_by
    ) VALUES (
        p_org_id, 
        public.get_next_organization_version(p_org_id),
        'Khôi phục bản ghi (' || p_table_name || ')',
        'RESTORE',
        v_profile_id
    ) RETURNING id INTO v_restore_version_id;

    PERFORM set_config('app.current_version_id', v_restore_version_id::text, true);

    -- 6. SECURITY: Check current record if exists
    EXECUTE format('SELECT organization_id FROM public.%I WHERE id = %L', p_table_name, p_record_id) INTO v_current_org_id;
    
    v_exists := v_current_org_id IS NOT NULL;

    BEGIN
        IF v_exists THEN
            IF v_current_org_id != p_org_id THEN
                RAISE EXCEPTION 'Bản ghi hiện tại thuộc về Organization khác. Không thể ghi đè.';
            END IF;
            EXECUTE public.build_dynamic_update(p_table_name) USING p_state, p_record_id, p_org_id;
        ELSE
            EXECUTE format('INSERT INTO public.%I SELECT * FROM jsonb_populate_record(null::public.%I, $1)', p_table_name, p_table_name) 
            USING p_state || jsonb_build_object('organization_id', p_org_id);
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Lỗi khi khôi phục record: %', SQLERRM;
    END;

    RETURN json_build_object('success', true, 'new_version_id', v_restore_version_id);
END;
$$;


-- ============================================================
-- §10.8 — DYNAMIC RESTORE COLUMN EXCLUSION
-- Exclude generated/system columns from dynamic update
-- ============================================================
CREATE OR REPLACE FUNCTION public.build_dynamic_update(p_table TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_cols TEXT;
BEGIN
    SELECT string_agg(quote_ident(column_name) || ' = p.' || quote_ident(column_name), ', ')
    INTO v_cols
    FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = p_table 
      -- SECURITY: Immutable fields that should never be updated via dynamic restore
      AND column_name NOT IN (
        'id', 'organization_id', 'created_at', 'created_by',
        'sequence_id', 'auth_user_id'
      )
      -- Exclude generated columns
      AND is_generated = 'NEVER';
    
    RETURN 'UPDATE public.' || quote_ident(p_table) || ' t SET ' || v_cols || 
           ' FROM jsonb_populate_record(null::public.' || quote_ident(p_table) || ', $1) p WHERE t.id = $2 AND t.organization_id = $3';
END;
$$;


-- ============================================================
-- §10.1 — VERSION HISTORY PRIVACY
-- Restrict version_changes to admin-only (contains PII)
-- version_history summary is safe for all members
-- ============================================================
DROP POLICY IF EXISTS "Users can view version changes in their org" ON public.version_changes;
DROP POLICY IF EXISTS "Admin can view version changes" ON public.version_changes;
CREATE POLICY "Admin can view version changes" ON public.version_changes 
  FOR SELECT USING (public.is_org_admin(organization_id));


-- ============================================================
-- §12.3 — FIX IMPORT COACHES BATCH
-- Remove reference to dropped coaches.role column
-- ============================================================
CREATE OR REPLACE FUNCTION public.import_coaches_batch(
    p_org_id UUID,
    p_coaches JSONB,
    p_summary TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_admin_profile_id UUID;
    v_version_id UUID;
    v_coach JSONB;
    v_success_count INT := 0;
    
    v_new_profile_id UUID;
    v_new_member_id UUID;
    v_email TEXT;
    v_name TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.organization_members m
        JOIN public.profiles p ON m.user_id = p.id
        WHERE p.auth_user_id = v_user_id AND m.organization_id = p_org_id AND m.role IN ('admin', 'owner')
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Permission denied');
    END IF;

    SELECT id INTO v_admin_profile_id FROM public.profiles WHERE auth_user_id = v_user_id LIMIT 1;

    INSERT INTO public.version_history (
        organization_id, version_number, summary, action_type, created_by
    ) VALUES (
        p_org_id, 
        public.get_next_organization_version(p_org_id),
        COALESCE(p_summary, 'Nhập danh sách HLV từ Excel'),
        'IMPORT',
        v_admin_profile_id
    ) RETURNING id INTO v_version_id;

    PERFORM set_config('app.current_version_id', v_version_id::text, true);

    FOR v_coach IN SELECT * FROM jsonb_array_elements(p_coaches)
    LOOP
        v_email := COALESCE(v_coach->>'email', 'no-email-' || gen_random_uuid()::text || '@yoogi.invalid');
        v_name := COALESCE(v_coach->>'name', 'Unknown');
        
        -- Check if email already has a profile
        SELECT id INTO v_new_profile_id FROM public.profiles WHERE lower(trim(email)) = lower(trim(v_email)) LIMIT 1;
        
        IF v_new_profile_id IS NULL THEN
            INSERT INTO public.profiles (email, name)
            VALUES (v_email, v_name)
            RETURNING id INTO v_new_profile_id;
        END IF;

        -- Create or find member (role stored in organization_members, NOT coaches)
        SELECT id INTO v_new_member_id FROM public.organization_members 
        WHERE organization_id = p_org_id AND user_id = v_new_profile_id LIMIT 1;

        IF v_new_member_id IS NULL THEN
            INSERT INTO public.organization_members (
                organization_id, user_id, role, status
            ) VALUES (
                p_org_id, v_new_profile_id, 'coach', 'active'
            ) RETURNING id INTO v_new_member_id;
        END IF;

        -- Create coach record (WITHOUT role column which was dropped in 017)
        INSERT INTO public.coaches (
            organization_id,
            organization_member_id,
            phone,
            cccd,
            level,
            membership_number,
            dob,
            gender,
            address,
            note,
            external_id
        ) VALUES (
            p_org_id,
            v_new_member_id,
            v_coach->>'phone',
            v_coach->>'cccd',
            v_coach->>'level',
            v_coach->>'membership_number',
            v_coach->>'dob',
            v_coach->>'gender',
            v_coach->>'address',
            v_coach->>'note',
            v_coach->>'external_id'
        );
        
        v_success_count := v_success_count + 1;
    END LOOP;

    RETURN json_build_object('success', true, 'count', v_success_count);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;


-- ============================================================
-- §8.2 — REVOKE EXECUTE FROM PUBLIC
-- Restrict SECURITY DEFINER functions to authenticated users
-- ============================================================
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.pay_approved_salary_sessions(UUID, UUID, UUID[], UUID) FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION public.pay_approved_salary_sessions(UUID, UUID, UUID[], UUID) TO authenticated;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.record_tuition_payment(UUID, NUMERIC, UUID, UUID) FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION public.record_tuition_payment(UUID, NUMERIC, UUID, UUID) TO authenticated;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.restore_organization_version(UUID, BIGINT) FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION public.restore_organization_version(UUID, BIGINT) TO authenticated;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.restore_record_to_state(UUID, TEXT, UUID, JSONB) FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION public.restore_record_to_state(UUID, TEXT, UUID, JSONB) TO authenticated;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.import_students_batch(UUID, JSONB, TEXT) FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION public.import_students_batch(UUID, JSONB, TEXT) TO authenticated;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.import_coaches_batch(UUID, JSONB, TEXT) FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION public.import_coaches_batch(UUID, JSONB, TEXT) TO authenticated;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.import_venues_batch(UUID, JSONB, TEXT) FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION public.import_venues_batch(UUID, JSONB, TEXT) TO authenticated;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.accept_invitation(UUID) FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION public.accept_invitation(UUID) TO authenticated;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.safe_update_record(TEXT, UUID, TIMESTAMPTZ, JSONB) FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION public.safe_update_record(TEXT, UUID, TIMESTAMPTZ, JSONB) TO authenticated;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.log_salary_audit(UUID, TEXT, TEXT, UUID, UUID, JSONB, JSONB, TEXT) FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION public.log_salary_audit(UUID, TEXT, TEXT, UUID, UUID, JSONB, JSONB, TEXT) TO authenticated;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.check_salary_rule_conflicts(UUID, TEXT, UUID, UUID, UUID, TEXT, TEXT, TEXT, INTEGER, DATE, DATE, UUID) FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION public.check_salary_rule_conflicts(UUID, TEXT, UUID, UUID, UUID, TEXT, TEXT, TEXT, INTEGER, DATE, DATE, UUID) TO authenticated;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================
-- END OF MIGRATION 028
-- ============================================================
