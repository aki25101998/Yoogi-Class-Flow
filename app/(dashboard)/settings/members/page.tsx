import { createClient } from '@/utils/supabase/server';
import { getCurrentOrganizationContext } from '@/services/organization.service';
import MembersClient from './MembersClient';
import { redirect } from 'next/navigation';

export default async function MembersPage() {
  const context = await getCurrentOrganizationContext();
  
  if (!context || !context.organization) {
    redirect('/auth/login');
  }

  // Ensure user has access
  const isAdminOrOwner = context.membership?.role === 'admin' || context.membership?.role === 'owner';
  const hasManageMembersPermission = context.permissions?.includes('manage_members');

  if (!isAdminOrOwner && !hasManageMembersPermission) {
    redirect('/dashboard');
  }

  const supabase = await createClient();

  const membersQuery = supabase
    .from('organization_members')
    .select('*, profiles(name, email)')
    .eq('organization_id', context.organization.id)
    .neq('status', 'removed')
    .order('created_at', { ascending: false });

  const invitationsQuery = supabase
    .from('organization_invitations')
    .select('*')
    .eq('organization_id', context.organization.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  const [{ data: members }, { data: invitations }] = await Promise.all([
    membersQuery,
    invitationsQuery
  ]);

  return (
    <div style={{ padding: '24px' }}>
      <MembersClient 
        initialMembers={members || []}
        initialInvitations={invitations || []}
        currentUserRole={context.membership?.role}
        currentUserId={context.membership?.id}
      />
    </div>
  );
}
