-- 17_complete_modules_schema.sql

-- 1. Create Students table
CREATE TABLE IF NOT EXISTS public.students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  parent_name TEXT,
  parent_phone TEXT,
  dob TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Class_Students (Enrollments)
CREATE TABLE IF NOT EXISTS public.class_students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.venue_classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active', -- active, dropped
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, student_id)
);

-- 3. Modify Schedules table (Add class_id if it doesn't exist)
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.venue_classes(id) ON DELETE CASCADE;

-- 4. Create Tuition table
CREATE TABLE IF NOT EXISTS public.tuition (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.venue_classes(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  due_date TEXT, -- YYYY-MM
  status TEXT DEFAULT 'unpaid', -- unpaid, partial, paid
  paid_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create Finance Transactions table
CREATE TABLE IF NOT EXISTS public.finance_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- income, expense
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  date TEXT NOT NULL, -- YYYY-MM-DD
  description TEXT,
  reference_id UUID, -- Could be tuition_id, payroll_id etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Enable RLS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tuition ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;

-- 7. Policies for Students
CREATE POLICY "Admin can do all on students" ON public.students FOR ALL USING (public.is_org_admin(organization_id));
CREATE POLICY "Coaches can view students in their org" ON public.students FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));

-- 8. Policies for Class_Students
CREATE POLICY "Admin can do all on class_students" ON public.class_students FOR ALL USING (public.is_org_admin(organization_id));
CREATE POLICY "Coaches can view class_students in their org" ON public.class_students FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));

-- 9. Policies for Tuition
CREATE POLICY "Admin can do all on tuition" ON public.tuition FOR ALL USING (public.is_org_admin(organization_id));
CREATE POLICY "Coaches can view tuition in their org" ON public.tuition FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));

-- 10. Policies for Finance Transactions
CREATE POLICY "Admin can do all on finance_transactions" ON public.finance_transactions FOR ALL USING (public.is_org_admin(organization_id));
CREATE POLICY "Coaches can view finance_transactions in their org" ON public.finance_transactions FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));
