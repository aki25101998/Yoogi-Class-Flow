-- 008_attendance.sql

CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES public.coaches(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES public.schedules(id) ON DELETE SET NULL,
  venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  date TEXT NOT NULL,
  check_in_time TIMESTAMPTZ DEFAULT NOW(),
  check_in_by UUID REFERENCES public.coaches(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'checked_in',
  approved_by UUID REFERENCES public.coaches(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  earnings NUMERIC DEFAULT 0,
  note TEXT DEFAULT '',
  is_substitution BOOLEAN DEFAULT FALSE,
  original_coach_id UUID REFERENCES public.coaches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: student_attendance still uses records JSONB for backward compatibility 
-- as requested to audit before removal. It will be replaced with pivot table later.
CREATE TABLE IF NOT EXISTS public.student_attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.venue_classes(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  records JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
