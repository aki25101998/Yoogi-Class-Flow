import { createClient } from '@/utils/supabase/server';
import { getCurrentOrganizationContext } from '@/services/organization.service';
import CoachesClient from './CoachesClient';

export default async function CoachesPage() {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return <div>Access Denied</div>;

  const supabase = await createClient();
  
  // Lấy danh sách members đang active hoặc suspended
  const { data: members } = await supabase
    .from('organization_members')
    .select('*, profiles(email, name), coaches(id, status)')
    .eq('organization_id', context.organization.id)
    .in('status', ['active', 'suspended']);
    
  // Tính số lượng lớp mỗi coach phụ trách
  const memberWithClassCount = await Promise.all((members || []).map(async (m: any) => {
    let classCount = 0;
    if (m.coaches && m.coaches.length > 0) {
       const coachId = m.coaches[0].id;
       const { count } = await supabase.from('class_coaches')
         .select('*', { count: 'exact', head: true })
         .eq('coach_id', coachId);
       classCount = count || 0;
    }
    return { ...m, classCount };
  }));

  // Lấy danh sách lời mời (invitations)
  const { data: invitations } = await supabase
    .from('organization_invitations')
    .select('*')
    .eq('organization_id', context.organization.id)
    .in('status', ['pending']);

  return (
    <div className="page" style={{ padding: '24px' }}>
      <CoachesClient 
        initialMembers={memberWithClassCount} 
        initialInvitations={invitations || []} 
        currentUserRole={context.membership?.role as string}
        currentUserId={context.membership?.id as string}
      />
    </div>
  );
}
