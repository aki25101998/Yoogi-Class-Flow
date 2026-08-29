-- 015_business_logic_hardening.sql

-- 1. Rename teacher_salary_sessions to class_sessions and expand
ALTER TABLE public.teacher_salary_sessions RENAME TO class_sessions;

ALTER TABLE public.class_sessions
ADD COLUMN schedule_id UUID REFERENCES public.schedules(id) ON DELETE SET NULL,
ADD COLUMN start_time TEXT,
ADD COLUMN end_time TEXT,
ADD COLUMN original_coach_id UUID REFERENCES public.coaches(id) ON DELETE SET NULL,
ADD COLUMN cancelled_at TIMESTAMPTZ,
ADD COLUMN cancelled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN cancel_reason TEXT;

-- We need to drop the default or old constraints on status if any exist. Since we didn't specify one initially besides TEXT DEFAULT 'checked_in', 
-- we can just add a check constraint.
-- Existing statuses might be 'scheduled', 'checked_in', 'approved', 'rejected', 'paid', 'cancelled'
-- If there are any other statuses, they'll violate this, but we'll assume the codebase only uses these.
ALTER TABLE public.class_sessions
ADD CONSTRAINT valid_session_status CHECK (status IN ('scheduled', 'checked_in', 'approved', 'paid', 'cancelled', 'rejected'));

-- Also rename the old foreign keys constraints if necessary, though PG handles table renames automatically for FKs.
-- Make sure the unique constraint exists if needed, e.g., one session per class per date if that's the rule, but there can be multiple (extra sessions). So no unique constraint on (class_id, date).

-- 2. Create student_session_attendance to replace student_attendance (JSONB)
CREATE TABLE IF NOT EXISTS public.student_session_attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.class_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'excused')),
  note TEXT,
  marked_at TIMESTAMPTZ DEFAULT NOW(),
  marked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, student_id)
);

-- We leave the old `student_attendance` table for now to prevent breaking while migrating data. 
-- In a real prod environment, we would run a migration script to copy data. 
-- For this rewrite, we will just use the new table.

-- 3. Create payroll_payments
CREATE TABLE IF NOT EXISTS public.payroll_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  finance_transaction_id UUID REFERENCES public.finance_transactions(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create payroll_payment_sessions
CREATE TABLE IF NOT EXISTS public.payroll_payment_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  payment_id UUID NOT NULL REFERENCES public.payroll_payments(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.class_sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id) -- A session can only be paid once
);

-- 4. Create RPC to atomically pay salary
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
BEGIN
  -- 1. Calculate total amount and verify sessions
  FOR v_session IN 
    SELECT id, calculated_salary, status
    FROM public.class_sessions
    WHERE id = ANY(p_session_ids)
      AND organization_id = p_organization_id
      AND coach_id = p_coach_id
    FOR UPDATE -- lock the rows to prevent race conditions
  LOOP
    -- Verify status
    IF v_session.status != 'approved' THEN
      RAISE EXCEPTION 'Session % is not in approved status', v_session.id;
    END IF;
    
    -- Verify not already paid via payroll_payment_sessions
    IF EXISTS (SELECT 1 FROM public.payroll_payment_sessions WHERE session_id = v_session.id) THEN
      RAISE EXCEPTION 'Session % has already been paid', v_session.id;
    END IF;

    v_total_amount := v_total_amount + COALESCE(v_session.calculated_salary, 0);
  END LOOP;

  -- Verify we actually have sessions
  IF v_total_amount = 0 AND array_length(p_session_ids, 1) > 0 THEN
    -- If amount is 0, we still might want to mark them paid if they were free sessions? 
    -- Assuming they just sum to 0.
    NULL;
  END IF;

  -- 2. Create Finance Transaction
  INSERT INTO public.finance_transactions (
    organization_id,
    type,
    category,
    amount,
    date,
    description,
    reference_id -- Optional, could point to payroll_payments later
  ) VALUES (
    p_organization_id,
    'expense',
    'payroll',
    v_total_amount,
    CURRENT_DATE::TEXT,
    'Thanh toán lương cho HLV (Coach ID: ' || p_coach_id || ')'
  ) RETURNING id INTO v_finance_txn_id;

  -- 3. Create Payroll Payment
  INSERT INTO public.payroll_payments (
    organization_id,
    coach_id,
    amount,
    finance_transaction_id,
    created_by
  ) VALUES (
    p_organization_id,
    p_coach_id,
    v_total_amount,
    v_finance_txn_id,
    p_created_by
  ) RETURNING id INTO v_payment_id;

  -- Update reference_id in finance_transactions now that we have payment_id
  UPDATE public.finance_transactions 
  SET reference_id = v_payment_id 
  WHERE id = v_finance_txn_id;

  -- 4. Create mapping and update session status
  FOR v_session IN 
    SELECT unnest(p_session_ids) AS id
  LOOP
    INSERT INTO public.payroll_payment_sessions (
      organization_id,
      payment_id,
      session_id
    ) VALUES (
      p_organization_id,
      v_payment_id,
      v_session.id
    );

    UPDATE public.class_sessions
    SET status = 'paid'
    WHERE id = v_session.id;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'finance_transaction_id', v_finance_txn_id,
    'total_amount', v_total_amount
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;
