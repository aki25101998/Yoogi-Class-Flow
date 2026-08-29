"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useDashboardContext } from "@/app/(dashboard)/DashboardProvider";
import { useQueryClient } from "@tanstack/react-query";
import { prefetchRouteData } from "@/utils/prefetch";
import { switchWorkspace } from "@/app/actions/workspace.actions";

const ADMIN_NAV = [
  { section: 'Tổng quan', items: [
    { icon: 'dashboard', label: 'Dashboard', route: '/dashboard', permission: null }
  ]},
  { section: 'Quản lý', items: [
    { icon: 'people', label: 'Huấn luyện viên', route: '/coaches', permission: 'manage_coaches' },
    { icon: 'school', label: 'Học viên', route: '/students', permission: 'manage_students' },
    { icon: 'location_on', label: 'Địa điểm', route: '/venues', permission: 'manage_venues' },
    { icon: 'class', label: 'Lớp học', route: '/classes', permission: 'manage_classes' },
    { icon: 'calendar_month', label: 'Lịch dạy', route: '/schedule', permission: 'manage_schedule' }
  ]},
  { section: 'Chấm công', items: [
    { icon: 'fact_check', label: 'Điểm danh', route: '/attendance', permission: 'manage_attendance' },
    { icon: 'payments', label: 'Bảng lương', route: '/payroll', permission: 'view_payroll' }
  ]},
  { section: 'Tài chính - Kế toán', items: [
    { icon: 'account_balance_wallet', label: 'Học phí', route: '/tuition', permission: 'manage_tuition' },
    { icon: 'receipt_long', label: 'Sổ quỹ', route: '/finance', permission: 'manage_finance' }
  ]},
  { section: 'Hệ thống', items: [
    { icon: 'group', label: 'Thành viên', route: '/settings/members', permission: 'manage_members' },
    { icon: 'military_tech', label: 'Cấp đai', route: '/settings/belts', permission: 'manage_settings' },
    { icon: 'settings', label: 'Cài đặt', route: '/settings', permission: 'manage_settings' }
  ]}
];

const COACH_NAV = [
  { section: 'Cá nhân', items: [
    { icon: 'calendar_month', label: 'Lịch của tôi', route: '/my-schedule' },
    { icon: 'fingerprint', label: 'Check-in', route: '/my-checkin' },
    { icon: 'assignment_turned_in', label: 'Điểm danh', route: '/my-attendance' },
    { icon: 'local_activity', label: 'Hoạt động', route: '/my-earnings' }
  ]}
];

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

export default function Sidebar({ isSidebarOpen, setIsSidebarOpen }: SidebarProps) {
  const pathname = usePathname();
  const { user, userData, context } = useDashboardContext();
  const queryClient = useQueryClient();
  
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Read theme from localStorage or document on mount
    const storedTheme = localStorage.getItem('yoogi-theme') as "light" | "dark";
    if (storedTheme) {
      setTheme(storedTheme);
    } else if (typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark') {
      setTheme('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('yoogi-theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  };
  
  // Use context if available, otherwise fallback to userData
  const role = context?.membership?.role || userData?.role;
  const isAdminOrOwner = role === 'admin' || role === 'owner';
  
  // Simplified permissions check
  const hasPermission = (perm: string) => {
    if (isAdminOrOwner) return true;
    const permissions = context?.permissions || userData?.permissions || [];
    return permissions.includes(perm);
  };

  const checkIsActive = (route: string) => {
    if (pathname === route) return true;
    if (route === '/dashboard') return false;
    if (route === '/settings') {
      return pathname === '/settings' || (pathname.startsWith('/settings/') && !pathname.startsWith('/settings/members'));
    }
    if (route === '/settings/members') {
      return pathname.startsWith('/settings/members');
    }
    return pathname.startsWith(`${route}/`);
  };

  const navSections = [
    ...(isAdminOrOwner ? [] : COACH_NAV),
    ...ADMIN_NAV.map(section => ({
      ...section,
      items: section.items.filter(item => !item.permission || hasPermission(item.permission))
    })).filter(section => section.items.length > 0)
  ];

  // If context has settings page access, add Members tab under Settings explicitly, or it's handled by /settings page itself.
  // Actually, standard admin menu has 'Cài đặt' which goes to /settings. Inside /settings they can navigate to members.
  // We can add a sub-menu or just leave it.

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const displayName = context?.profile?.name || userData?.name || user?.user_metadata?.full_name || 'User';
  const displayRole = role === 'owner' ? 'Owner' : role === 'admin' ? 'Admin' : role === 'head_coach' ? 'Head Coach' : 'Assistant Coach';

  return (
    <>
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`} 
        onClick={() => setIsSidebarOpen(false)}
      ></div>

      <nav className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="sidebar-logo">
              <span className="material-icons-round" style={{ fontSize: '1.2rem' }}>sports_martial_arts</span>
            </div>
            <div className="sidebar-brand" style={{ margin: 0 }}>
              YOOGI
            </div>
          </div>
          
          {context?.allMemberships && context.allMemberships.length > 0 ? (
            <select 
              value={context.organization?.id || ''} 
              onChange={async (e) => {
                const orgId = e.target.value;
                queryClient.clear(); // Clear all queries to prevent data leakage
                await switchWorkspace(orgId);
              }}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '8px',
                border: '1px solid var(--border-light)',
                background: 'var(--surface-hover)',
                color: 'var(--text-main)',
                fontSize: '0.9rem',
                fontWeight: 500,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {context.allMemberships.map((m: any) => (
                <option key={m.organization_id} value={m.organization_id}>
                  {m.organization.name} - {m.role === 'owner' ? 'Owner' : m.role === 'admin' ? 'Admin' : m.role === 'head_coach' ? 'Head Coach' : 'Assistant Coach'}
                </option>
              ))}
            </select>
          ) : (
            <div className="sidebar-brand" style={{ fontSize: '0.9rem', marginTop: '8px' }}>
              {context?.organization?.name || 'Chấm Công HLV'}
              <small>{displayRole}</small>
            </div>
          )}
        </div>

        <div className="sidebar-nav">
          {navSections.map((section, idx) => (
            <div className="nav-section" key={idx}>
              <div className="nav-section-title">{section.section}</div>
              {section.items.map((item, itemIdx) => (
                <Link 
                  href={item.route} 
                  key={itemIdx}
                  className={`nav-item ${checkIsActive(item.route) ? 'active' : ''}`}
                  onClick={() => setIsSidebarOpen(false)}
                  onMouseEnter={() => prefetchRouteData(queryClient, item.route, context?.organization?.id, isAdminOrOwner, context?.coach?.id)}
                >
                  <span className="material-icons-round">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', padding: '0 4px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </span>
            <button 
              onClick={toggleTheme}
              style={{
                background: 'var(--surface-hover)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-main)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              title={theme === 'dark' ? 'Chuyển sang Light Mode' : 'Chuyển sang Dark Mode'}
            >
              <span className="material-icons-round" style={{ fontSize: '1.25rem' }}>
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
            </button>
          </div>
          
          <div className="sidebar-user">
            {user?.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt="Avatar" className="user-avatar" referrerPolicy="no-referrer" />
            ) : (
              <div className="user-avatar-placeholder">{displayName.charAt(0).toUpperCase()}</div>
            )}
            <div className="user-info">
              <div className="user-name">{displayName}</div>
              <div className="user-role">{displayRole}</div>
            </div>
            <button className="btn-logout" onClick={handleLogout} title="Đăng xuất">
              <span className="material-icons-round">logout</span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
