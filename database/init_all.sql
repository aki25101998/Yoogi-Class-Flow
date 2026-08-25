CREATE TABLE IF NOT EXISTS public.coaches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT DEFAULT '',
  cccd TEXT DEFAULT '',
  level TEXT DEFAULT '',
  membership_number TEXT DEFAULT '',
  role TEXT DEFAULT 'coach',
  permissions JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'active',
  photo_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.venues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.venue_coaches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES public.coaches(id) ON DELETE CASCADE,
  rate_type TEXT DEFAULT 'per_session',
  rate NUMERIC DEFAULT 0,
  schedule_days JSONB DEFAULT '[]'::jsonb,
  start_time TEXT DEFAULT '18:00',
  end_time TEXT DEFAULT '20:00',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.venue_classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
  name TEXT DEFAULT '',
  start_time TEXT DEFAULT '18:00',
  end_time TEXT DEFAULT '20:00',
  schedule_days JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID REFERENCES public.coaches(id) ON DELETE CASCADE,
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,
  start_time TEXT,
  end_time TEXT,
  rate_type TEXT DEFAULT 'per_session',
  rate NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID REFERENCES public.coaches(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES public.schedules(id) ON DELETE SET NULL,
  venue_coach_id UUID REFERENCES public.venue_coaches(id) ON DELETE SET NULL,
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
CREATE TABLE IF NOT EXISTS public.teacher_salaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID REFERENCES public.coaches(id) ON DELETE CASCADE,
  per_session NUMERIC DEFAULT 0,
  per_student NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.teacher_salary_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID REFERENCES public.coaches(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.venue_classes(id) ON DELETE SET NULL,
  date TEXT NOT NULL,
  check_in_time TIMESTAMPTZ DEFAULT NOW(),
  check_in_by UUID REFERENCES public.coaches(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'checked_in',
  calculated_salary NUMERIC DEFAULT 0,
  salary_config_snapshot JSONB,
  approved_by UUID REFERENCES public.coaches(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES public.coaches(id) ON DELETE SET NULL,
  rejected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.student_attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID REFERENCES public.venue_classes(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  records JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Disable Row Level Security temporarily to allow client side access like Firestore
-- In a real production setup with Supabase Auth, you should enable RLS and write proper policies.
ALTER TABLE public.coaches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_coaches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_salaries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_salary_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_attendance DISABLE ROW LEVEL SECURITY;
