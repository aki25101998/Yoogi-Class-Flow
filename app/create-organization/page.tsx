'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

export default function CreateOrganizationPage() {
  const router = useRouter();
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setCurrentUserEmail(user.email);
        if (user.email.toLowerCase().trim() === 'aki251098@gmail.com') {
          // If founder lands here, send to platform admin
          router.replace('/platform-admin');
          return;
        }
      }
      setLoading(false);
    }
    checkUser();
  }, [router]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--background)' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Đang kiểm tra tài khoản...</div>
      </div>
    );
  }

  return (
    <div style={{ 
      width: '100%', 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      backgroundColor: 'var(--background)',
      padding: '24px'
    }}>
      <div style={{ 
        backgroundColor: 'var(--surface)', 
        padding: '40px 32px', 
        borderRadius: '16px', 
        boxShadow: 'var(--shadow-lg)', 
        border: '1px solid var(--border-light)', 
        maxWidth: '460px', 
        width: '100%',
        textAlign: 'center'
      }}>
        {/* Lock Icon */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: 'rgba(20, 184, 166, 0.1)',
          color: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: '32px'
        }}>
          <span className="material-icons-round">domain_disabled</span>
        </div>

        <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '12px', color: 'var(--text-main)' }}>
          Trung Tâm Chưa Được Kích Hoạt
        </h1>

        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
          Tài khoản <strong>{currentUserEmail}</strong> chưa được liên kết hoặc kích hoạt quyền sở hữu trung tâm nào trên nền tảng <strong>Yoogi Class Flow</strong>.
        </p>

        {/* Contact Founder Card */}
        <div style={{
          backgroundColor: 'var(--surface-hover)',
          border: '1px solid var(--border-light)',
          borderRadius: '12px',
          padding: '20px',
          textAlign: 'left',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span className="material-icons-round" style={{ color: 'var(--primary)', fontSize: '20px' }}>
              contact_support
            </span>
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
              Liên hệ Người sáng lập (Founder)
            </span>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 12px 0' }}>
            Để đăng ký gói bản quyền và kích hoạt trung tâm của riêng bạn, vui lòng liên hệ trực tiếp với Nhà sáng lập:
          </p>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--text-main)'
          }}>
            <span className="material-icons-round" style={{ fontSize: '18px', color: 'var(--primary)' }}>email</span>
            <span>aki251098@gmail.com</span>
          </div>

          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '10px', fontStyle: 'italic' }}>
            Sau khi hoàn tất thanh toán bản quyền, trung tâm của bạn sẽ được kích hoạt tự động ngay trên tài khoản này.
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: 'var(--primary)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Đã thanh toán? Bấm để làm mới
          </button>

          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: 'transparent',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontWeight: 500,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            Đăng xuất tài khoản
          </button>
        </div>
      </div>
    </div>
  );
}
