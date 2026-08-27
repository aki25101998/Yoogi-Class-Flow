import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import InviteClient from './InviteClient';

export const dynamic = 'force-dynamic';

export default async function InvitePage({ params }: { params: { invitationId: string } }) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  // Use the public RPC to fetch limited data securely for anonymous users
  const { data, error } = await supabase.rpc('get_public_invitation', {
    invitation_id: params.invitationId
  });

  const invitation = data?.[0];

  if (error || !invitation) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Không tìm thấy lời mời</h1>
          <p className="text-secondary">Lời mời này không tồn tại hoặc đã bị xóa.</p>
        </div>
      </div>
    );
  }

  const roleLabels: Record<string, string> = {
    owner: 'Chủ tổ chức',
    admin: 'Quản trị viên',
    head_coach: 'HLV trưởng',
    assistant_coach: 'HLV phụ'
  };

  const roleLabel = roleLabels[invitation.role] || invitation.role;
  const organizationName = invitation.organization_name || 'Tổ chức';

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md p-8 bg-surface rounded-xl shadow-lg border border-border text-center">
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="material-icons-round text-3xl">mail</span>
        </div>
        
        <h1 className="text-2xl font-bold mb-2 text-text">Lời mời tham gia</h1>
        <p className="text-xl font-medium text-primary mb-6">{organizationName}</p>
        
        <div className="bg-surface-hover p-4 rounded-lg mb-8 text-left">
          <div className="mb-2">
            <span className="text-sm text-secondary">Người được mời:</span>
            <div className="font-medium">{invitation.email}</div>
          </div>
          <div>
            <span className="text-sm text-secondary">Vai trò:</span>
            <div className="font-medium">{roleLabel}</div>
          </div>
        </div>

        <InviteClient 
          invitationId={invitation.id} 
          invitationEmail={invitation.email}
          invitationStatus={invitation.status}
          expiresAt={invitation.expires_at}
          userEmail={user?.email} 
          isLoggedIn={!!user}
        />
      </div>
    </div>
  );
}
