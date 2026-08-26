'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { acceptInvitationAction } from './actions';

export default function AcceptInvitePage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function processInvite() {
      const result = await acceptInvitationAction();
      if (result.success) {
        router.push('/dashboard');
      } else {
        setError(result.error || 'Có lỗi xảy ra khi xử lý lời mời.');
        setLoading(false);
      }
    }
    processInvite();
  }, [router]);

  return (
    <div style={{ width: '100%', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--background)' }}>
      <div style={{ backgroundColor: 'var(--surface)', padding: '40px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-light)', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>Đang xử lý lời mời...</h1>
        
        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Vui lòng đợi trong giây lát. Hệ thống đang thiết lập quyền truy cập cho bạn.</p>
        ) : (
          <div>
            <div style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger-text)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '16px', fontSize: '14px', textAlign: 'left' }}>
              {error}
            </div>
            <button 
              onClick={() => router.push('/login')}
              style={{ 
                width: '100%', 
                padding: '12px', 
                backgroundColor: 'var(--primary)', 
                color: 'var(--text-on-primary)', 
                border: 'none', 
                borderRadius: '4px', 
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Quay lại trang Đăng nhập
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
