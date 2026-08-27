-- 009_payroll.sql

CREATE TABLE IF NOT EXISTS public.teacher_salaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  coach_id UUID,
  per_session NUMERIC DEFAULT 0,
  per_student NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (organization_id, coach_id) REFERENCES public.coaches(organization_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.teacher_salary_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  coach_id UUID,
  class_id UUID,
  date TEXT NOT NULL,
  check_in_time TIMESTAMPTZ DEFAULT NOW(),
  check_in_by UUID,
  status TEXT DEFAULT 'checked_in',
  calculated_salary NUMERIC DEFAULT 0,
  salary_config_snapshot JSONB,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejected_by UUID,
  rejected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (organization_id, coach_id) REFERENCES public.coaches(organization_id, id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id, class_id) REFERENCES public.venue_classes(organization_id, id) ON DELETE SET NULL,
  FOREIGN KEY (organization_id, check_in_by) REFERENCES public.coaches(organization_id, id) ON DELETE SET NULL,
  FOREIGN KEY (organization_id, approved_by) REFERENCES public.coaches(organization_id, id) ON DELETE SET NULL,
  FOREIGN KEY (organization_id, rejected_by) REFERENCES public.coaches(organization_id, id) ON DELETE SET NULL
);
