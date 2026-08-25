import { createClient } from '@/utils/supabase/server';
import { getCurrentOrganizationContext } from '@/services/organization.service';
import MembersClient from './MembersClient';

export default async function MembersPage() {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return <div>Access Denied</div>;

  const supabase = await createClient();
  
  // Get members
  const { data: members } = await supabase
    .from('organization_members')
    .select('*, profiles(email, name)')
    .eq('organization_id', context.organization.id)
    .eq('status', 'active');

  // Get invitations
  const { data: invitations } = await supabase
    .from('organization_invitations')
    .select('*')
    .eq('organization_id', context.organization.id)
    .in('status', ['pending']);

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Quản lý Thành viên</h1>
      <MembersClient 
        initialMembers={members || []} 
        initialInvitations={invitations || []} 
        currentUserRole={context.membership?.role as string}
        currentUserId={context.membership?.id as string}
      />
    </div>
  );
}
