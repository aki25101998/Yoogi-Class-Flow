import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { FOUNDER_EMAIL, isFounderEmail } from '@/services/platform-admin.service';
import Link from 'next/link';

export const metadata = {
  title: 'Yoogi Platform Admin — Cổng Quản Trị Founder',
  description: 'Trang quản trị toàn hệ thống dành riêng cho Nhà sáng lập',
};

export default async function PlatformAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/platform-admin');
  }

  const isFounder = isFounderEmail(user.email);

  if (!isFounder) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--background)',
        padding: '24px'
      }}>
        <div style={{
          maxWidth: '480px',
          width: '100%',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border-light)',
          borderRadius: '16px',
          padding: '36px',
          textAlign: 'center',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: '32px'
          }}>
            <span className="material-icons-round">gpp_bad</span>
          </div>
          
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
            403 — Từ Chối Truy Cập
          </h1>
          
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '20px' }}>
            Khu vực này được bảo vệ nghiêm ngặt và chỉ dành riêng cho <strong>Nhà sáng lập nền tảng ({FOUNDER_EMAIL})</strong>.
          </p>

          <div style={{
            padding: '12px 16px',
            backgroundColor: 'var(--surface-hover)',
            borderRadius: '8px',
            fontSize: '13px',
            color: 'var(--text-muted)',
            marginBottom: '24px',
            wordBreak: 'break-all'
          }}>
            Email hiện tại: <strong style={{ color: 'var(--text-main)' }}>{user.email}</strong>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Link
              href="/dashboard"
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                backgroundColor: 'var(--primary)',
                color: '#fff',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 600,
                transition: 'opacity 0.2s'
              }}
            >
              Về Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--background)',
      color: 'var(--text-main)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Top Founder Navigation Bar */}
      <header style={{
        height: '68px',
        backgroundColor: 'var(--surface)',
        borderBottom: '1px solid var(--border-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
      }}>
        {/* Brand & Area Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--primary) 0%, #0d9488 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 4px 14px rgba(20, 184, 166, 0.35)'
          }}>
            <span className="material-icons-round" style={{ fontSize: '22px' }}>sports_martial_arts</span>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '17px', fontWeight: 900, letterSpacing: '-0.3px', color: 'var(--text-main)' }}>
                YOOGI PLATFORM
              </span>
              <span style={{
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                padding: '3px 10px',
                borderRadius: '100px',
                backgroundColor: 'rgba(20, 184, 166, 0.12)',
                color: 'var(--primary)',
                border: '1px solid rgba(20, 184, 166, 0.25)'
              }}>
                Founder Area
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Cổng quản trị cấp phép & bản quyền trung tâm
            </div>
          </div>
        </div>

        {/* User Badge & Back to App */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            backgroundColor: 'var(--surface-hover)',
            border: '1px solid var(--border-light)',
            borderRadius: '100px',
            fontSize: '13px',
            color: 'var(--text-main)',
            fontWeight: 500
          }}>
            <span className="material-icons-round" style={{ fontSize: '18px', color: 'var(--primary)' }}>
              verified_user
            </span>
            <span>{FOUNDER_EMAIL}</span>
          </div>

          <Link
            href="/dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 18px',
              borderRadius: '10px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text-main)',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: 600,
              boxShadow: 'var(--shadow-sm)',
              transition: 'all 0.15s'
            }}
          >
            <span className="material-icons-round" style={{ fontSize: '18px', color: 'var(--primary)' }}>
              arrow_back
            </span>
            <span>Vào ứng dụng</span>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, maxWidth: '1360px', width: '100%', margin: '0 auto', padding: '36px 32px 64px' }}>
        {children}
      </main>
    </div>
  );
}
