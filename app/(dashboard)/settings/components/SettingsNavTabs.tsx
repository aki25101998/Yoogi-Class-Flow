'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface TabItem {
  label: string;
  icon: string;
  route: string;
  exact?: boolean;
}

const SETTINGS_TABS: TabItem[] = [
  { label: 'Thông tin trung tâm', icon: 'apartment', route: '/settings', exact: true },
  { label: 'Thành viên & Đội ngũ', icon: 'manage_accounts', route: '/settings/members' },
  { label: 'Vai trò & Phân quyền', icon: 'admin_panel_settings', route: '/settings/roles' },
  { label: 'Hệ thống cấp đai', icon: 'military_tech', route: '/settings/belts' },
  { label: 'Lịch sử phiên bản', icon: 'history', route: '/settings/version-history' },
];

export function SettingsNavTabs() {
  const pathname = usePathname();

  const isTabActive = (tab: TabItem) => {
    if (tab.exact) {
      return pathname === tab.route;
    }
    return pathname.startsWith(tab.route);
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '6px',
      background: 'var(--surface)',
      border: '1px solid var(--border-light)',
      borderRadius: 'var(--radius-full)',
      boxShadow: 'var(--shadow-sm)',
      overflowX: 'auto',
      whiteSpace: 'nowrap',
      scrollbarWidth: 'none',
      width: '100%',
      maxWidth: '100%',
      marginBottom: 'var(--space-2)'
    }}>
      {SETTINGS_TABS.map((tab) => {
        const active = isTabActive(tab);
        return (
          <Link
            key={tab.route}
            href={tab.route}
            prefetch={true}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.875rem',
              fontWeight: active ? 700 : 500,
              textDecoration: 'none',
              background: active ? 'var(--primary)' : 'transparent',
              color: active ? '#ffffff' : 'var(--text-secondary)',
              boxShadow: active ? 'var(--shadow-teal-glow)' : 'none',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              flexShrink: 0
            }}
          >
            <span 
              className="material-icons-round" 
              style={{ 
                fontSize: '18px',
                color: active ? '#ffffff' : 'var(--text-muted)'
              }}
            >
              {tab.icon}
            </span>
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

