import React from 'react';
import { getPlatformOrganizations } from '@/services/platform-admin.service';
import PlatformAdminClient from './PlatformAdminClient';

export const dynamic = 'force-dynamic';

export default async function PlatformAdminPage() {
  const { data, stats, error } = await getPlatformOrganizations();

  if (error && (!data || data.length === 0)) {
    return (
      <div style={{
        padding: '32px',
        backgroundColor: 'var(--surface)',
        borderRadius: '12px',
        border: '1px solid var(--border-light)',
        textAlign: 'center'
      }}>
        <div style={{ color: '#ef4444', fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
          Không thể tải dữ liệu Platform Admin
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <PlatformAdminClient
      initialOrgs={data}
      initialStats={stats}
    />
  );
}
