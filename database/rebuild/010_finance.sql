-- 010_finance.sql

CREATE TABLE IF NOT EXISTS public.tuition (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  class_id UUID,
  amount NUMERIC NOT NULL DEFAULT 0,
  due_date TEXT, -- YYYY-MM
  status TEXT DEFAULT 'unpaid', -- unpaid, partial, paid
  paid_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (organization_id, student_id) REFERENCES public.students(organization_id, id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id, class_id) REFERENCES public.venue_classes(organization_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.finance_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- income, expense
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  date TEXT NOT NULL, -- YYYY-MM-DD
  description TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
