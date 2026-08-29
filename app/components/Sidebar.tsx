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
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
  const [isSwitchingWorkspace, setIsSwitchingWorkspace] = useState(false);

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
        <div className="sidebar-header" style={{ height: 'auto', padding: '20px 16px 24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="sidebar-logo">
              <span className="material-icons-round" style={{ fontSize: '1.2rem' }}>sports_martial_arts</span>
            </div>
            <div className="sidebar-brand" style={{ margin: 0 }}>
              YOOGI
            </div>
          </div>
          
          <div style={{ position: 'relative' }}>
            {context?.allMemberships && context.allMemberships.length > 1 ? (
              <>
                <button
                  onClick={() => !isSwitchingWorkspace && setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
                  disabled={isSwitchingWorkspace}
                  style={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: '10px 12px',
                    background: 'var(--surface-hover)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    cursor: isSwitchingWorkspace ? 'wait' : 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSwitchingWorkspace) {
                      e.currentTarget.style.borderColor = 'var(--border)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSwitchingWorkspace) {
                      e.currentTarget.style.borderColor = 'var(--border-light)';
                    }
                  }}
                >
                  <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Workspace
                  </span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingRight: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {context.organization?.name || 'Unknown'}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-secondary)' }}>
                        {isSwitchingWorkspace ? 'Đang chuyển...' : displayRole}
                      </span>
                    </div>
                    {isSwitchingWorkspace ? (
                      <span className="material-icons-round" style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>sync</span>
                    ) : (
                      <span className="material-icons-round" style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>unfold_more</span>
                    )}
                  </div>
                </button>

                {isWorkspaceDropdownOpen && (
                  <>
                    <div 
                      style={{ position: 'fixed', inset: 0, zIndex: 99 }} 
                      onClick={() => setIsWorkspaceDropdownOpen(false)}
                    />
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: '4px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border-light)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: 'var(--shadow-lg)',
                      zIndex: 100,
                      maxHeight: '300px',
                      overflowY: 'auto',
                      padding: '4px'
                    }}>
                      <div style={{ padding: '8px 12px', fontSize: '10px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                        Chọn Workspace
                      </div>
                      {context.allMemberships.map((m: any) => {
                        const mRole = m.role === 'owner' ? 'Owner' : m.role === 'admin' ? 'Admin' : m.role === 'head_coach' ? 'Head Coach' : 'Assistant Coach';
                        const isActive = m.organization_id === context.organization?.id;
                        return (
                          <button
                            key={m.organization_id}
                            onClick={async () => {
                              setIsWorkspaceDropdownOpen(false);
                              if (isActive) return;
                              setIsSwitchingWorkspace(true);
                              try {
                                queryClient.clear();
                                await switchWorkspace(m.organization_id);
                              } catch (e) {
                                console.error(e);
                                setIsSwitchingWorkspace(false);
                              }
                            }}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              background: isActive ? 'var(--primary-light)' : 'transparent',
                              border: 'none',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                              textAlign: 'left',
                              transition: 'background 0.2s',
                              marginBottom: '2px'
                            }}
                            onMouseEnter={(e) => {
                              if (!isActive) e.currentTarget.style.background = 'var(--surface-hover)';
                            }}
                            onMouseLeave={(e) => {
                              if (!isActive) e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingRight: '8px' }}>
                              <span style={{ 
                                fontSize: '13px', 
                                fontWeight: isActive ? 600 : 500, 
                                color: isActive ? 'var(--primary)' : 'var(--text-main)',
                                whiteSpace: 'nowrap', 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis' 
                              }}>
                                {m.organization.name}
                              </span>
                              <span style={{ fontSize: '12px', color: isActive ? 'var(--primary)' : 'var(--text-secondary)', opacity: isActive ? 0.8 : 1 }}>
                                {mRole}
                              </span>
                            </div>
                            {isActive && (
                              <span className="material-icons-round" style={{ fontSize: '16px', color: 'var(--primary)' }}>check</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '10px 12px',
                background: 'var(--surface-hover)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)'
              }}>
                <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Workspace
                </span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                  {context?.organization?.name || 'Unknown'}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-secondary)' }}>
                  {displayRole}
                </span>
              </div>
            )}
          </div>
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
