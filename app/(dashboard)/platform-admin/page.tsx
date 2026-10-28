import React from 'react';
import { requireAuth } from '@/utils/auth/requireAuth';
import { FOUNDER_EMAIL, isFounderEmail, getPlatformOrganizations } from '@/services/platform-admin.service';
import PlatformAdminClient from './PlatformAdminClient';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Yoogi Platform Admin — Cổng Quản Trị Founder',
  description: 'Trang quản trị toàn hệ thống dành riêng cho Nhà sáng lập',
};

export default async function PlatformAdminPage() {
  const { user } = await requireAuth();

  const isFounder = isFounderEmail(user?.email);

  if (!isFounder) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        minHeight: '60vh'
      }}>
        <div style={{
          maxWidth: '480px',
          width: '100%',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-2xl)',
          padding: '40px',
          textAlign: 'center',
          boxShadow: 'var(--shadow-md)'
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
          
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
            403 — Từ Chối Truy Cập
          </h1>
          
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '20px' }}>
            Khu vực này được bảo vệ nghiêm ngặt và chỉ dành riêng cho <strong>Nhà sáng lập nền tảng ({FOUNDER_EMAIL})</strong>.
          </p>

          <div style={{
            padding: '12px 16px',
            backgroundColor: 'var(--surface-hover)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.8125rem',
            color: 'var(--text-muted)',
            marginBottom: '24px',
            wordBreak: 'break-all'
          }}>
            Email hiện tại: <strong style={{ color: 'var(--text-main)' }}>{user?.email}</strong>
          </div>

          <Link
            href="/dashboard"
            style={{
              display: 'inline-flex',
              padding: '10px 24px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--primary)',
              color: '#fff',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: 600
            }}
          >
            Về Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { data, stats, error } = await getPlatformOrganizations();

  return (
    <PlatformAdminClient
      initialOrgs={data || []}
      initialStats={stats}
    />
  );
}
