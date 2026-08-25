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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
      <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>Đang xử lý lời mời...</h1>
        
        {loading ? (
          <p style={{ color: '#4b5563' }}>Vui lòng đợi trong giây lát. Hệ thống đang thiết lập quyền truy cập cho bạn.</p>
        ) : (
          <div>
            <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '12px', borderRadius: '4px', marginBottom: '16px', fontSize: '14px', textAlign: 'left' }}>
              {error}
            </div>
            <button 
              onClick={() => router.push('/login')}
              style={{ 
                width: '100%', 
                padding: '12px', 
                backgroundColor: '#2563eb', 
                color: 'white', 
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
