-- Enable RLS for all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_salaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_salary_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;

-- Helper Functions
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

-- 1. Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth_user_id = auth.uid());
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth_user_id = auth.uid());
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth_user_id = auth.uid());

-- 2. Policies for organizations
CREATE POLICY "Org members can view their organizations" ON public.organizations FOR SELECT USING (id IN (SELECT public.get_user_organizations()));
CREATE POLICY "Org admins can update organizations" ON public.organizations FOR UPDATE USING (public.is_org_admin(id));

-- 3. Policies for organization_members
CREATE POLICY "Members can view other members in same org" ON public.organization_members FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));
CREATE POLICY "Org admins can manage members" ON public.organization_members FOR ALL USING (public.is_org_admin(organization_id));

-- 4. Policies for organization_invitations
CREATE POLICY "Members can view invitations in same org" ON public.organization_invitations FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));
CREATE POLICY "Org admins can manage invitations" ON public.organization_invitations FOR ALL USING (public.is_org_admin(organization_id));
CREATE POLICY "Invitee can view their invitations" ON public.organization_invitations FOR SELECT USING (
  email IN (SELECT email FROM public.profiles WHERE auth_user_id = auth.uid())
);

-- 5. Policies for coaches
CREATE POLICY "Admin can do all on coaches" ON public.coaches FOR ALL USING (public.is_org_admin(organization_id));
CREATE POLICY "Coaches can view profiles in their org" ON public.coaches FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));
CREATE POLICY "Coaches can update their own profile" ON public.coaches FOR UPDATE USING (id IN (SELECT public.get_my_coach_id()));

-- 6. Policies for venues
CREATE POLICY "Admin can do all on venues" ON public.venues FOR ALL USING (public.is_org_admin(organization_id));
CREATE POLICY "Coaches can view venues in their org" ON public.venues FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));

-- 7. Policies for venue_coaches
CREATE POLICY "Admin can do all on venue_coaches" ON public.venue_coaches FOR ALL USING (public.is_org_admin(organization_id));
CREATE POLICY "Coaches can view venue assignments in their org" ON public.venue_coaches FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));

-- 8. Policies for venue_classes
CREATE POLICY "Admin can do all on venue_classes" ON public.venue_classes FOR ALL USING (public.is_org_admin(organization_id));
CREATE POLICY "Coaches can view classes in their org" ON public.venue_classes FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));

-- 9. Policies for schedules
CREATE POLICY "Admin can do all on schedules" ON public.schedules FOR ALL USING (public.is_org_admin(organization_id));
CREATE POLICY "Coaches can view schedules in their org" ON public.schedules FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));

-- 10. Policies for attendance
CREATE POLICY "Admin can do all on attendance" ON public.attendance FOR ALL USING (public.is_org_admin(organization_id));
CREATE POLICY "Coaches can view attendance in their org" ON public.attendance FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));
CREATE POLICY "Coaches can insert their own attendance" ON public.attendance 
  FOR INSERT WITH CHECK (organization_id IN (SELECT public.get_user_organizations()) AND coach_id IN (SELECT public.get_my_coach_id()));

-- 11. Policies for teacher_salaries
CREATE POLICY "Admin can do all on teacher_salaries" ON public.teacher_salaries FOR ALL USING (public.is_org_admin(organization_id));
CREATE POLICY "Coaches can view own salaries" ON public.teacher_salaries FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()) AND coach_id IN (SELECT public.get_my_coach_id()));

-- 12. Policies for teacher_salary_sessions
CREATE POLICY "Admin can do all on teacher_salary_sessions" ON public.teacher_salary_sessions FOR ALL USING (public.is_org_admin(organization_id));
CREATE POLICY "Coaches can view own salary sessions" ON public.teacher_salary_sessions FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()) AND coach_id IN (SELECT public.get_my_coach_id()));

-- 13. Policies for student_attendance
CREATE POLICY "Admin can do all on student_attendance" ON public.student_attendance FOR ALL USING (public.is_org_admin(organization_id));
CREATE POLICY "Coaches can view student attendance in their org" ON public.student_attendance FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));
