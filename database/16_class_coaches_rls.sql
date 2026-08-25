-- 16_class_coaches_rls.sql

-- Helper function to get assigned classes for the current coach
CREATE OR REPLACE FUNCTION public.get_my_class_ids()
RETURNS SETOF UUID AS $$
  SELECT class_id FROM public.class_coaches
  WHERE coach_id IN (SELECT public.get_my_coach_id());
$$ LANGUAGE sql SECURITY DEFINER;

-- Policy for class_coaches itself
CREATE POLICY "Admin can do all on class_coaches" ON public.class_coaches FOR ALL USING (public.is_org_admin(organization_id));
CREATE POLICY "Coaches can view their own assignments" ON public.class_coaches FOR SELECT USING (coach_id IN (SELECT public.get_my_coach_id()));
CREATE POLICY "Coaches can view other assignments in their classes" ON public.class_coaches FOR SELECT USING (class_id IN (SELECT public.get_my_class_ids()));

-- Drop overly permissive coach policies
DROP POLICY IF EXISTS "Coaches can view classes in their org" ON public.venue_classes;
DROP POLICY IF EXISTS "Coaches can view schedules in their org" ON public.schedules;
DROP POLICY IF EXISTS "Coaches can view student attendance in their org" ON public.student_attendance;

-- Recreate policies with class assignment restriction

-- venue_classes
CREATE POLICY "Coaches can view assigned classes" ON public.venue_classes FOR SELECT USING (
  id IN (SELECT public.get_my_class_ids()) OR 
  public.is_org_admin(organization_id)
);

-- student_attendance
CREATE POLICY "Coaches can view assigned class student attendance" ON public.student_attendance FOR SELECT USING (
  class_id IN (SELECT public.get_my_class_ids()) OR 
  public.is_org_admin(organization_id)
);
CREATE POLICY "Coaches can manage assigned class student attendance" ON public.student_attendance FOR ALL USING (
  class_id IN (SELECT public.get_my_class_ids()) OR 
  public.is_org_admin(organization_id)
);

-- attendance, schedules, teacher_salaries do not have class_id, 
-- their isolation will remain coach_id based (they can view their own) as defined in 14_rls_policies.sql
