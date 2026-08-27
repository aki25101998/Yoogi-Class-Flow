-- 008_attendance.sql

CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  coach_id UUID,
  schedule_id UUID,
  venue_id UUID,
  date TEXT NOT NULL,
  check_in_time TIMESTAMPTZ DEFAULT NOW(),
  check_in_by UUID,
  status TEXT DEFAULT 'checked_in',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  earnings NUMERIC DEFAULT 0,
  note TEXT DEFAULT '',
  is_substitution BOOLEAN DEFAULT FALSE,
  original_coach_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (organization_id, coach_id) REFERENCES public.coaches(organization_id, id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id, schedule_id) REFERENCES public.schedules(organization_id, id) ON DELETE SET NULL,
  FOREIGN KEY (organization_id, venue_id) REFERENCES public.venues(organization_id, id) ON DELETE SET NULL,
  FOREIGN KEY (organization_id, check_in_by) REFERENCES public.coaches(organization_id, id) ON DELETE SET NULL,
  FOREIGN KEY (organization_id, approved_by) REFERENCES public.coaches(organization_id, id) ON DELETE SET NULL,
  FOREIGN KEY (organization_id, original_coach_id) REFERENCES public.coaches(organization_id, id) ON DELETE SET NULL
);

-- Note: student_attendance still uses records JSONB for backward compatibility 
-- as requested to audit before removal. It will be replaced with pivot table later.
CREATE TABLE IF NOT EXISTS public.student_attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  class_id UUID,
  date TEXT NOT NULL,
  records JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (organization_id, class_id) REFERENCES public.venue_classes(organization_id, id) ON DELETE CASCADE
);
