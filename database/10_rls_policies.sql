-- Bật lại RLS cho tất cả các bảng
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_salaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_salary_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;

-- Hàm Helper cho RLS (Security Definer để tránh đệ quy vô hạn khi query bảng coaches)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.coaches
    WHERE auth_user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_my_coach_id()
RETURNS UUID AS $$
DECLARE
  my_id UUID;
BEGIN
  SELECT id INTO my_id FROM public.coaches WHERE auth_user_id = auth.uid() LIMIT 1;
  RETURN my_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Policies cho coaches
CREATE POLICY "Admin can do all on coaches" ON public.coaches FOR ALL USING (public.is_admin());
CREATE POLICY "Coaches can view their own profile" ON public.coaches FOR SELECT USING (auth_user_id = auth.uid());

-- 2. Policies cho venues
CREATE POLICY "Admin can do all on venues" ON public.venues FOR ALL USING (public.is_admin());
CREATE POLICY "Coaches can view venues" ON public.venues FOR SELECT USING (auth.uid() IS NOT NULL);

-- 3. Policies cho venue_coaches
CREATE POLICY "Admin can do all on venue_coaches" ON public.venue_coaches FOR ALL USING (public.is_admin());
CREATE POLICY "Coaches can view their venue assignments" ON public.venue_coaches FOR SELECT USING (coach_id = public.get_my_coach_id());

-- 4. Policies cho venue_classes
CREATE POLICY "Admin can do all on venue_classes" ON public.venue_classes FOR ALL USING (public.is_admin());
CREATE POLICY "Coaches can view classes" ON public.venue_classes FOR SELECT USING (auth.uid() IS NOT NULL);

-- 5. Policies cho schedules
CREATE POLICY "Admin can do all on schedules" ON public.schedules FOR ALL USING (public.is_admin());
CREATE POLICY "Coaches can view schedules" ON public.schedules FOR SELECT USING (auth.uid() IS NOT NULL);

-- 6. Policies cho attendance
CREATE POLICY "Admin can do all on attendance" ON public.attendance FOR ALL USING (public.is_admin());
CREATE POLICY "Coaches can view their own attendance" ON public.attendance 
  FOR SELECT USING (coach_id = public.get_my_coach_id());
CREATE POLICY "Coaches can insert their own attendance" ON public.attendance 
  FOR INSERT WITH CHECK (coach_id = public.get_my_coach_id());

-- 7. Policies cho teacher_salaries
CREATE POLICY "Admin can do all on teacher_salaries" ON public.teacher_salaries FOR ALL USING (public.is_admin());
CREATE POLICY "Coaches can view own salaries" ON public.teacher_salaries FOR SELECT USING (coach_id = public.get_my_coach_id());

-- 8. Policies cho teacher_salary_sessions
CREATE POLICY "Admin can do all on teacher_salary_sessions" ON public.teacher_salary_sessions FOR ALL USING (public.is_admin());
CREATE POLICY "Coaches can view own salary sessions" ON public.teacher_salary_sessions FOR SELECT USING (
  salary_id IN (SELECT id FROM public.teacher_salaries WHERE coach_id = public.get_my_coach_id())
);

-- 9. Policies cho student_attendance
CREATE POLICY "Admin can do all on student_attendance" ON public.student_attendance FOR ALL USING (public.is_admin());
CREATE POLICY "Coaches can view and manage student attendance" ON public.student_attendance FOR ALL USING (auth.uid() IS NOT NULL);
