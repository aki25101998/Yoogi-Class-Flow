-- 011_rls.sql

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_belts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_salaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_salary_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tuition ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;

-- Helpers
CREATE OR REPLACE FUNCTION public.get_user_organizations()
RETURNS SETOF UUID AS $$
  SELECT organization_id FROM public.organization_members
  JOIN public.profiles ON profiles.id = organization_members.user_id
  WHERE profiles.auth_user_id = auth.uid() AND organization_members.status = 'active';
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_org_admin(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members
    JOIN public.profiles ON profiles.id = organization_members.user_id
    WHERE profiles.auth_user_id = auth.uid() 
      AND organization_members.organization_id = org_id
      AND (organization_members.role = 'admin' OR organization_members.role = 'owner')
      AND organization_members.status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_my_coach_id()
RETURNS SETOF UUID AS $$
  SELECT coaches.id FROM public.coaches
  JOIN public.organization_members ON organization_members.id = coaches.organization_member_id
  JOIN public.profiles ON profiles.id = organization_members.user_id
  WHERE profiles.auth_user_id = auth.uid() AND organization_members.status = 'active';
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_my_class_ids()
RETURNS SETOF UUID AS $$
  SELECT class_id FROM public.class_coaches
  WHERE coach_id IN (SELECT public.get_my_coach_id());
$$ LANGUAGE sql SECURITY DEFINER;

-- Profiles
DROP POLICY IF EXISTS "Users can view profiles in their organizations" ON public.profiles;
CREATE POLICY "Users can view profiles in their organizations" ON public.profiles FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_members.user_id = profiles.id
    AND organization_members.organization_id IN (SELECT public.get_user_organizations())
  )
);
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth_user_id = auth.uid());
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth_user_id = auth.uid());
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth_user_id = auth.uid());

-- Organizations
DROP POLICY IF EXISTS "Org members can view their organizations" ON public.organizations;
CREATE POLICY "Org members can view their organizations" ON public.organizations FOR SELECT USING (id IN (SELECT public.get_user_organizations()));
DROP POLICY IF EXISTS "Org admins can update organizations" ON public.organizations;
CREATE POLICY "Org admins can update organizations" ON public.organizations FOR UPDATE USING (public.is_org_admin(id));

-- Organization Members
DROP POLICY IF EXISTS "Members can view other members in same org" ON public.organization_members;
CREATE POLICY "Members can view other members in same org" ON public.organization_members FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));
DROP POLICY IF EXISTS "Org admins can manage members" ON public.organization_members;
CREATE POLICY "Org admins can manage members" ON public.organization_members FOR ALL USING (public.is_org_admin(organization_id));

-- Invitations
DROP POLICY IF EXISTS "Members can view invitations in same org" ON public.organization_invitations;
CREATE POLICY "Members can view invitations in same org" ON public.organization_invitations FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));
DROP POLICY IF EXISTS "Org admins can manage invitations" ON public.organization_invitations;
CREATE POLICY "Org admins can manage invitations" ON public.organization_invitations FOR ALL USING (public.is_org_admin(organization_id));
DROP POLICY IF EXISTS "Invitee can view their invitations" ON public.organization_invitations;
CREATE POLICY "Invitee can view their invitations" ON public.organization_invitations FOR SELECT USING (
  email IN (SELECT email FROM public.profiles WHERE auth_user_id = auth.uid())
);

-- Coaches
DROP POLICY IF EXISTS "Admin can do all on coaches" ON public.coaches;
CREATE POLICY "Admin can do all on coaches" ON public.coaches FOR ALL USING (public.is_org_admin(organization_id));
DROP POLICY IF EXISTS "Coaches can view profiles in their org" ON public.coaches;
CREATE POLICY "Coaches can view profiles in their org" ON public.coaches FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));
DROP POLICY IF EXISTS "Coaches can update their own profile" ON public.coaches;
CREATE POLICY "Coaches can update their own profile" ON public.coaches FOR UPDATE USING (id IN (SELECT public.get_my_coach_id()));

-- Class Coaches
DROP POLICY IF EXISTS "Admin can do all on class_coaches" ON public.class_coaches;
CREATE POLICY "Admin can do all on class_coaches" ON public.class_coaches FOR ALL USING (public.is_org_admin(organization_id));
DROP POLICY IF EXISTS "Coaches can view their own assignments" ON public.class_coaches;
CREATE POLICY "Coaches can view their own assignments" ON public.class_coaches FOR SELECT USING (coach_id IN (SELECT public.get_my_coach_id()));
DROP POLICY IF EXISTS "Coaches can view other assignments in their classes" ON public.class_coaches;
CREATE POLICY "Coaches can view other assignments in their classes" ON public.class_coaches FOR SELECT USING (class_id IN (SELECT public.get_my_class_ids()));

-- Entities (Venues, Classes, Students, etc.)
DROP POLICY IF EXISTS "Admin can do all on venues" ON public.venues;
CREATE POLICY "Admin can do all on venues" ON public.venues FOR ALL USING (public.is_org_admin(organization_id));
DROP POLICY IF EXISTS "Coaches can view venues in their org" ON public.venues;
CREATE POLICY "Coaches can view venues in their org" ON public.venues FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));

DROP POLICY IF EXISTS "Admin can do all on venue_classes" ON public.venue_classes;
CREATE POLICY "Admin can do all on venue_classes" ON public.venue_classes FOR ALL USING (public.is_org_admin(organization_id));
DROP POLICY IF EXISTS "Coaches can view assigned classes" ON public.venue_classes;
CREATE POLICY "Coaches can view assigned classes" ON public.venue_classes FOR SELECT USING (
  id IN (SELECT public.get_my_class_ids()) OR 
  public.is_org_admin(organization_id)
);

DROP POLICY IF EXISTS "Admin can do all on students" ON public.students;
CREATE POLICY "Admin can do all on students" ON public.students FOR ALL USING (public.is_org_admin(organization_id));
DROP POLICY IF EXISTS "Coaches can view assigned students" ON public.students;
CREATE POLICY "Coaches can view assigned students" ON public.students FOR SELECT USING (
  id IN (SELECT student_id FROM public.class_students WHERE class_id IN (SELECT public.get_my_class_ids())) OR 
  public.is_org_admin(organization_id)
);

DROP POLICY IF EXISTS "Admin can do all on class_students" ON public.class_students;
CREATE POLICY "Admin can do all on class_students" ON public.class_students FOR ALL USING (public.is_org_admin(organization_id));
DROP POLICY IF EXISTS "Coaches can view assigned class_students" ON public.class_students;
CREATE POLICY "Coaches can view assigned class_students" ON public.class_students FOR SELECT USING (
  class_id IN (SELECT public.get_my_class_ids()) OR 
  public.is_org_admin(organization_id)
);

DROP POLICY IF EXISTS "Admin can do all on schedules" ON public.schedules;
CREATE POLICY "Admin can do all on schedules" ON public.schedules FOR ALL USING (public.is_org_admin(organization_id));
DROP POLICY IF EXISTS "Coaches can view assigned schedules" ON public.schedules;
CREATE POLICY "Coaches can view assigned schedules" ON public.schedules FOR SELECT USING (
  class_id IN (SELECT public.get_my_class_ids()) OR 
  coach_id IN (SELECT public.get_my_coach_id()) OR 
  public.is_org_admin(organization_id)
);

-- Attendance
DROP POLICY IF EXISTS "Admin can do all on attendance" ON public.attendance;
CREATE POLICY "Admin can do all on attendance" ON public.attendance FOR ALL USING (public.is_org_admin(organization_id));
DROP POLICY IF EXISTS "Coaches can view attendance for their classes or themselves" ON public.attendance;
CREATE POLICY "Coaches can view attendance for their classes or themselves" ON public.attendance FOR SELECT USING (
  schedule_id IN (SELECT id FROM public.schedules WHERE class_id IN (SELECT public.get_my_class_ids())) OR 
  coach_id IN (SELECT public.get_my_coach_id()) OR 
  public.is_org_admin(organization_id)
);
DROP POLICY IF EXISTS "Coaches can insert their own attendance" ON public.attendance;
CREATE POLICY "Coaches can insert their own attendance" ON public.attendance 
  FOR INSERT WITH CHECK (organization_id IN (SELECT public.get_user_organizations()) AND coach_id IN (SELECT public.get_my_coach_id()));

DROP POLICY IF EXISTS "Admin can do all on student_attendance" ON public.student_attendance;
CREATE POLICY "Admin can do all on student_attendance" ON public.student_attendance FOR ALL USING (public.is_org_admin(organization_id));
DROP POLICY IF EXISTS "Coaches can view assigned class student attendance" ON public.student_attendance;
CREATE POLICY "Coaches can view assigned class student attendance" ON public.student_attendance FOR SELECT USING (
  class_id IN (SELECT public.get_my_class_ids()) OR 
  public.is_org_admin(organization_id)
);
DROP POLICY IF EXISTS "Coaches can manage assigned class student attendance" ON public.student_attendance;
CREATE POLICY "Coaches can manage assigned class student attendance" ON public.student_attendance FOR ALL USING (
  class_id IN (SELECT public.get_my_class_ids()) OR 
  public.is_org_admin(organization_id)
);

-- Finance / Payroll
DROP POLICY IF EXISTS "Admin can do all on teacher_salaries" ON public.teacher_salaries;
CREATE POLICY "Admin can do all on teacher_salaries" ON public.teacher_salaries FOR ALL USING (public.is_org_admin(organization_id));
DROP POLICY IF EXISTS "Coaches can view own salaries" ON public.teacher_salaries;
CREATE POLICY "Coaches can view own salaries" ON public.teacher_salaries FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()) AND coach_id IN (SELECT public.get_my_coach_id()));

DROP POLICY IF EXISTS "Admin can do all on teacher_salary_sessions" ON public.teacher_salary_sessions;
CREATE POLICY "Admin can do all on teacher_salary_sessions" ON public.teacher_salary_sessions FOR ALL USING (public.is_org_admin(organization_id));
DROP POLICY IF EXISTS "Coaches can view own salary sessions" ON public.teacher_salary_sessions;
CREATE POLICY "Coaches can view own salary sessions" ON public.teacher_salary_sessions FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()) AND coach_id IN (SELECT public.get_my_coach_id()));

DROP POLICY IF EXISTS "Admin can do all on tuition" ON public.tuition;
CREATE POLICY "Admin can do all on tuition" ON public.tuition FOR ALL USING (public.is_org_admin(organization_id));
DROP POLICY IF EXISTS "Coaches can view tuition in their org" ON public.tuition;
CREATE POLICY "Coaches can view tuition in their org" ON public.tuition FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));

DROP POLICY IF EXISTS "Admin can do all on finance_transactions" ON public.finance_transactions;
CREATE POLICY "Admin can do all on finance_transactions" ON public.finance_transactions FOR ALL USING (public.is_org_admin(organization_id));
DROP POLICY IF EXISTS "Coaches can view finance_transactions in their org" ON public.finance_transactions;
CREATE POLICY "Coaches can view finance_transactions in their org" ON public.finance_transactions FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));

-- Belts
DROP POLICY IF EXISTS "Admin can do all on organization_belts" ON public.organization_belts;
DROP POLICY IF EXISTS "Everyone can view belts in their org" ON public.organization_belts;
DROP POLICY IF EXISTS "Admin can insert organization_belts" ON public.organization_belts;
DROP POLICY IF EXISTS "Admin can update organization_belts" ON public.organization_belts;
DROP POLICY IF EXISTS "Admin can delete organization_belts" ON public.organization_belts;
DROP POLICY IF EXISTS "Members can view organization_belts" ON public.organization_belts;

CREATE POLICY "Admin can insert organization_belts" ON public.organization_belts FOR INSERT WITH CHECK (public.is_org_admin(organization_id));
CREATE POLICY "Admin can update organization_belts" ON public.organization_belts FOR UPDATE USING (public.is_org_admin(organization_id)) WITH CHECK (public.is_org_admin(organization_id));
CREATE POLICY "Admin can delete organization_belts" ON public.organization_belts FOR DELETE USING (public.is_org_admin(organization_id));
CREATE POLICY "Members can view organization_belts" ON public.organization_belts FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));
