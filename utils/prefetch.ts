import { QueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { fetchDashboardStats } from '@/hooks/useDashboardStats';
import { getBusinessDateString } from '@/utils/date';

export const prefetchRouteData = (
  queryClient: QueryClient,
  route: string,
  organizationId: string | undefined,
  isAdminOrOwner: boolean,
  coachId: string | undefined
) => {
  if (!organizationId) return;

  const supabase = createClient();

  switch (route) {
    case '/dashboard':
      queryClient.prefetchQuery({
        queryKey: ['dashboard-stats', organizationId],
        queryFn: () => fetchDashboardStats(supabase, organizationId, isAdminOrOwner, coachId)
      });
      queryClient.prefetchQuery({
        queryKey: ['activeCoaches', organizationId],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('coaches')
            .select('id, role, organization_members(profiles(name))')
            .eq('organization_id', organizationId)
            .eq('status', 'active');
          if (error) throw error;
          return (data || []).map((coach: any) => ({
            id: coach.id,
            role: coach.role,
            name: coach.organization_members?.profiles?.name || 'Unknown'
          }));
        }
      });
      break;

    case '/coaches':
      queryClient.prefetchQuery({
        queryKey: ['coaches', organizationId],
        queryFn: async () => {
          const { data: membersData, error: membersError } = await supabase
            .from('organization_members')
            .select('*, profiles(email, name, avatar_url), coaches(id, status, nickname, photo_url)')
            .eq('organization_id', organizationId)
            .in('status', ['active', 'suspended']);
          if (membersError) throw membersError;

          const coachIds = (membersData || [])
            .map((m: any) => m.coaches?.[0]?.id)
            .filter(Boolean);

          let classCountsByCoach: Record<string, number> = {};
          if (coachIds.length > 0) {
            const { data: classCoachesData } = await supabase
              .from('class_coaches')
              .select('coach_id')
              .in('coach_id', coachIds);
            if (classCoachesData) {
              classCountsByCoach = classCoachesData.reduce((acc: Record<string, number>, row: any) => {
                acc[row.coach_id] = (acc[row.coach_id] || 0) + 1;
                return acc;
              }, {});
            }
          }

          return (membersData || []).map((m: any) => {
            const originalName = m.profiles?.name || m.profiles?.email || '-';
            const nickname = m.coaches?.[0]?.nickname?.trim() || '';
            const photoUrl = m.coaches?.[0]?.photo_url || m.profiles?.avatar_url || '';
            const classCount = m.coaches?.[0]?.id ? (classCountsByCoach[m.coaches[0].id] || 0) : 0;
            return {
              ...m,
              name: nickname || originalName,
              originalName,
              nickname,
              email: m.profiles?.email || '-',
              coachId: m.coaches?.[0]?.id,
              photoUrl,
              classCount
            };
          });
        }
      });
      queryClient.prefetchQuery({
        queryKey: ['invitations', organizationId],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('organization_invitations')
            .select('*')
            .eq('organization_id', organizationId)
            .in('status', ['pending']);
          if (error) throw error;
          return data || [];
        }
      });
      break;

    case '/training':
      queryClient.prefetchQuery({
        queryKey: ['training', organizationId, 'venues'],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('venues')
            .select(`
              id, 
              name, 
              address,
              status,
              image_url,
              image_position,
              venue_classes(id, status, class_students(id, status))
            `)
            .eq('organization_id', organizationId)
            .order('name');
          if (error) throw error;
          return (data || []).map((venue: any) => {
            const activeClasses = venue.venue_classes?.filter((c: any) => c.status === 'active') || [];
            const studentsCount = activeClasses.reduce((acc: number, c: any) => {
              return acc + (c.class_students?.filter((s: any) => s.status === 'active').length || 0);
            }, 0);
            return {
              id: venue.id,
              name: venue.name,
              address: venue.address,
              status: venue.status,
              image_url: venue.image_url || '',
              image_position: venue.image_position || '50% 50%',
              activeClassesCount: activeClasses.length,
              totalStudentsCount: studentsCount
            };
          });
        }
      });
      break;

    case '/schedule':
      queryClient.prefetchQuery({
        queryKey: ['schedules', organizationId],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('schedules')
            .select('*, venue_classes(name), coaches(id, organization_members(profiles(name))), venues(name)')
            .eq('organization_id', organizationId)
            .eq('status', 'active')
            .order('start_time', { ascending: true });
          if (error) throw error;
          return (data || []).map((s: any) => {
            let coachName = '';
            if (s.coaches) {
              const members = s.coaches.organization_members;
              coachName = Array.isArray(members) ? (members[0]?.profiles?.name || '') : (members?.profiles?.name || '');
            }
            return {
              ...s,
              coachName: coachName || 'Chưa gán HLV',
            };
          });
        }
      });
      queryClient.prefetchQuery({
        queryKey: ['activeClasses', organizationId],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('venue_classes')
            .select('id, name, start_time, end_time, venues(name)')
            .eq('organization_id', organizationId)
            .eq('status', 'active');
          if (error) throw error;
          return data || [];
        }
      });
      queryClient.prefetchQuery({
        queryKey: ['activeCoaches', organizationId],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('coaches')
            .select('id, role, organization_members(profiles(name))')
            .eq('organization_id', organizationId)
            .eq('status', 'active');
          if (error) throw error;
          return (data || []).map((coach: any) => ({
            id: coach.id,
            name: coach.organization_members?.profiles?.name || 'Unknown'
          }));
        }
      });
      break;

    case '/attendance':
      queryClient.prefetchQuery({
        queryKey: ['activeClasses', organizationId],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('venue_classes')
            .select('id, name, start_time, end_time, venues(name)')
            .eq('organization_id', organizationId)
            .eq('status', 'active');
          if (error) throw error;
          return data || [];
        }
      });
      break;

    case '/students':
      queryClient.prefetchQuery({
        queryKey: ['students', organizationId],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('students')
            .select(`
              *,
              organization_belts(id, name, display_order),
              venues(id, name),
              class_students(
                id,
                class_id,
                status,
                venue_classes(id, name, venue_id, venues(id, name))
              )
            `)
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false });
          if (error) throw error;
          return data?.map(student => ({
            ...student,
            class_students: student.class_students?.filter((cs: any) => cs.status === 'active') || []
          })) || [];
        }
      });
      queryClient.prefetchQuery({
        queryKey: ['activeClasses', organizationId],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('venue_classes')
            .select('id, name, venue_id, start_time, end_time, venues(id, name)')
            .eq('organization_id', organizationId)
            .eq('status', 'active');
          if (error) throw error;
          return data || [];
        }
      });
      queryClient.prefetchQuery({
        queryKey: ['activeBelts', organizationId],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('organization_belts')
            .select('id, name, display_order')
            .eq('organization_id', organizationId)
            .order('display_order', { ascending: true });
          if (error) throw error;
          return data || [];
        }
      });
      break;

    case '/tuition':
      queryClient.prefetchQuery({
        queryKey: ['tuition', organizationId],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('tuition')
            .select(`
              *,
              students (id, name, avatar_url, phone),
              venue_classes (id, name, venue_id, default_tuition_fee)
            `)
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false });
          if (error) throw error;
          return data || [];
        }
      });
      queryClient.prefetchQuery({
        queryKey: ['activeStudents', organizationId],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('students')
            .select('id, name, avatar_url, phone')
            .eq('organization_id', organizationId)
            .eq('status', 'active');
          if (error) throw error;
          return data || [];
        }
      });
      queryClient.prefetchQuery({
        queryKey: ['activeClasses', organizationId],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('venue_classes')
            .select('id, name, venue_id, default_tuition_fee, status')
            .eq('organization_id', organizationId)
            .eq('status', 'active');
          if (error) throw error;
          return data || [];
        }
      });
      break;

    case '/payroll':
      queryClient.prefetchQuery({
        queryKey: ['activeCoaches', organizationId],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('coaches')
            .select('id, role, organization_members(profiles(name))')
            .eq('organization_id', organizationId)
            .eq('status', 'active');
          if (error) throw error;
          return (data || []).map((coach: any) => ({
            id: coach.id,
            role: coach.role,
            name: coach.organization_members?.profiles?.name || 'Unknown'
          }));
        }
      });
      queryClient.prefetchQuery({
        queryKey: ['salaryConfigs', organizationId],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('teacher_salaries')
            .select('*')
            .eq('organization_id', organizationId);
          if (error) throw error;
          return data || [];
        }
      });
      queryClient.prefetchQuery({
        queryKey: ['salarySessions', organizationId],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('class_sessions')
            .select('*, venue_classes(name)')
            .eq('organization_id', organizationId)
            .order('date', { ascending: false });
          if (error) throw error;
          return data || [];
        }
      });
      break;

    case '/finance': {
      const now = new Date();
      const curStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const curEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;

      queryClient.prefetchQuery({
        queryKey: ['venues', organizationId],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('venues')
            .select('id, name')
            .eq('organization_id', organizationId)
            .eq('status', 'active')
            .order('name');
          if (error) throw error;
          return data || [];
        }
      });
      queryClient.prefetchQuery({
        queryKey: ['financeCategories', organizationId],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('finance_categories')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('is_active', true)
            .order('sort_order', { ascending: true });
          if (error) throw error;
          return data || [];
        }
      });
      queryClient.prefetchQuery({
        queryKey: ['financeTransactions', organizationId, curStart, curEnd, 'all'],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('finance_transactions')
            .select(`
              id,
              organization_id,
              type,
              category,
              category_id,
              parent_category,
              sub_category,
              amount,
              date,
              description,
              reference_id,
              source_type,
              venue_id,
              payment_method,
              created_at,
              updated_at,
              venues:venue_id (id, name)
            `)
            .eq('organization_id', organizationId)
            .gte('date', curStart)
            .lte('date', curEnd)
            .order('date', { ascending: false })
            .order('created_at', { ascending: false });
          if (error) throw error;
          return data || [];
        }
      });
      break;
    }

    case '/settings/finance-categories':
      queryClient.prefetchQuery({
        queryKey: ['financeCategories', organizationId],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('finance_categories')
            .select('*')
            .eq('organization_id', organizationId)
            .order('display_order', { ascending: true })
            .order('created_at', { ascending: true });
          if (error) return [];
          return data || [];
        }
      });
      break;

    default:
      break;
  }
};
