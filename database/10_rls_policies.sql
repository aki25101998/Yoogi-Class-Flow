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
