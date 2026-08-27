'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui/Button';
import { acceptInvitationAction } from './actions';
import { createClient } from '@/utils/supabase/client';

interface InviteClientProps {
  invitationId: string;
  invitationEmail: string;
  invitationStatus: string;
  expiresAt: string | null;
  userEmail?: string;
  isLoggedIn: boolean;
}

export default function InviteClient({
  invitationId,
  invitationEmail,
  invitationStatus,
  expiresAt,
  userEmail,
  isLoggedIn,
}: InviteClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  if (invitationStatus === 'revoked') {
    return <div className="text-danger font-medium p-4 bg-danger/10 rounded-lg">Lời mời đã bị thu hồi.</div>;
  }
  if (invitationStatus === 'expired') {
    return <div className="text-warning font-medium p-4 bg-warning/10 rounded-lg">Lời mời đã hết hạn.</div>;
  }
  if (invitationStatus === 'accepted') {
    return <div className="text-success font-medium p-4 bg-success/10 rounded-lg">Lời mời này đã được sử dụng.</div>;
  }
  if (expiresAt && new Date(expiresAt) < new Date()) {
    return <div className="text-warning font-medium p-4 bg-warning/10 rounded-lg">Lời mời đã hết hạn.</div>;
  }

  const handleLogin = async () => {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/invite/${invitationId}`,
        queryParams: {
          prompt: 'select_account',
        },
      },
    });
  };

  const handleAccept = async () => {
    setError('');
    setLoading(true);
    const res = await acceptInvitationAction(invitationId);
    if (res.success) {
      router.push('/dashboard');
      router.refresh();
    } else {
      setError(res.error || 'Đã có lỗi xảy ra.');
      setLoading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <Button 
        className="w-full"
        size="lg" 
        onClick={handleLogin} 
        isLoading={loading}
        leftIcon={<span className="material-icons-round">login</span>}
      >
        Đăng nhập bằng Google để nhận lời mời
      </Button>
    );
  }

  if (userEmail?.toLowerCase() !== invitationEmail.toLowerCase()) {
    return (
      <div className="text-left">
        <div className="text-danger p-4 bg-danger/10 rounded-lg mb-4 text-sm">
          <p className="font-semibold mb-1">Sai tài khoản đăng nhập</p>
          <p>Lời mời này được gửi tới <strong>{invitationEmail}</strong>.</p>
          <p>Vui lòng đăng nhập bằng đúng tài khoản được mời.</p>
        </div>
        <Button variant="outline" className="w-full" onClick={() => {
          const supabase = createClient();
          supabase.auth.signOut().then(() => router.refresh());
        }}>
          Đăng xuất
        </Button>
      </div>
    );
  }

  return (
    <div>
      {error && <div className="text-danger p-3 bg-danger/10 rounded-lg mb-4 text-sm">{error}</div>}
      <Button className="w-full" size="lg" onClick={handleAccept} isLoading={loading} variant="primary">
        Nhận lời mời
      </Button>
    </div>
  );
}
