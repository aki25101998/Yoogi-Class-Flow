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
  { section: 'TỔNG QUAN', items: [
    { icon: 'dashboard', label: 'Dashboard', route: '/dashboard', permission: null }
  ]},
  { section: 'VẬN HÀNH', items: [
    { icon: 'people', label: 'Huấn luyện viên', route: '/coaches', permission: 'manage_coaches' },
    { icon: 'school', label: 'Học viên', route: '/students', permission: 'manage_students' },
    { icon: 'class', label: 'Lớp học', submenus: [
        { label: 'Lớp học', route: '/classes', permission: 'manage_classes' },
        { label: 'Địa điểm', route: '/venues', permission: 'manage_venues' }
    ]},
    { icon: 'calendar_month', label: 'Lịch dạy', submenus: [
        { label: 'Lịch', route: '/schedule', permission: 'manage_schedule' },
        { label: 'Điểm danh', route: '/attendance', permission: 'manage_attendance' }
    ]}
  ]},
  { section: 'TÀI CHÍNH', items: [
    { icon: 'payments', label: 'Bảng lương', route: '/payroll', permission: 'view_payroll' },
    { icon: 'receipt_long', label: 'Tài chính', submenus: [
        { label: 'Học phí', route: '/tuition', permission: 'manage_tuition' },
        { label: 'Sổ quỹ', route: '/finance', permission: 'manage_finance' }
    ]}
  ]},
  { section: 'HỆ THỐNG', items: [
    { icon: 'settings', label: 'Cài đặt', submenus: [
        { label: 'Thông tin trung tâm', route: '/settings', permission: 'manage_settings', exact: true },
        { label: 'Thành viên', route: '/settings/members', permission: 'manage_members' },
        { label: 'Cấp đai', route: '/settings/belts', permission: 'manage_settings' }
    ]}
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

function NavItemComponent({ item, pathname, checkIsActive, setIsSidebarOpen, prefetch, hasPermission }: any) {
  const hasSub = !!item.submenus;
  const isAnySubActive = hasSub && item.submenus.some((sub: any) => checkIsActive(sub.route, sub.exact));
  const isActive = hasSub ? isAnySubActive : checkIsActive(item.route, item.exact);
  
  const [isOpen, setIsOpen] = useState(isAnySubActive);
  
  useEffect(() => {
    if (isAnySubActive) {
      setIsOpen(true);
    }
  }, [isAnySubActive, pathname]);

  if (hasSub) {
    const visibleSubs = item.submenus.filter((sub: any) => !sub.permission || hasPermission(sub.permission));
    if (visibleSubs.length === 0) return null;
    
    return (
      <div className="nav-item-group" style={{ marginBottom: '2px' }}>
        <div 
          className={`nav-item ${isAnySubActive ? 'active' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
          style={{ cursor: 'pointer', marginBottom: 0 }}
        >
          <span className="material-icons-round">{item.icon}</span>
          <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
          <span className="material-icons-round" style={{ fontSize: '18px', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none' }}>
            expand_more
          </span>
        </div>
        {isOpen && (
          <div className="submenu" style={{ paddingLeft: '32px', marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {visibleSubs.map((sub: any, idx: number) => {
              const isSubActive = checkIsActive(sub.route, sub.exact);
              return (
                <Link
                  key={idx}
                  href={sub.route}
                  className="submenu-item"
                  onClick={() => setIsSidebarOpen(false)}
                  onMouseEnter={() => prefetch(sub.route)}
                  style={{
                    display: 'block',
                    padding: '8px 12px',
                    fontSize: '13px',
                    color: isSubActive ? 'var(--primary)' : 'var(--text-secondary)',
                    fontWeight: isSubActive ? 600 : 500,
                    textDecoration: 'none',
                    borderRadius: 'var(--radius-md)',
                    background: isSubActive ? 'var(--primary-light)' : 'transparent',
                    transition: 'all 0.2s'
                  }}
                  onMouseLeave={(e) => {
                    if (!isSubActive) e.currentTarget.style.background = 'transparent';
                    if (!isSubActive) e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                  onMouseOver={(e) => {
                    if (!isSubActive) e.currentTarget.style.background = 'var(--surface-hover)';
                    if (!isSubActive) e.currentTarget.style.color = 'var(--text-main)';
                  }}
                >
                  {sub.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (item.permission && !hasPermission(item.permission)) return null;

  return (
    <Link 
      href={item.route} 
      className={`nav-item ${isActive ? 'active' : ''}`}
      onClick={() => setIsSidebarOpen(false)}
      onMouseEnter={() => prefetch(item.route)}
    >
      <span className="material-icons-round">{item.icon}</span>
      <span>{item.label}</span>
    </Link>
  );
}

export default function Sidebar({ isSidebarOpen, setIsSidebarOpen }: SidebarProps) {
  const pathname = usePathname();
  const { user, userData, context } = useDashboardContext();
  const queryClient = useQueryClient();
  
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
  const [isSwitchingWorkspace, setIsSwitchingWorkspace] = useState(false);

  useEffect(() => {
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
  
  const role = context?.membership?.role || userData?.role;
  const isAdminOrOwner = role === 'admin' || role === 'owner';
  
  const hasPermission = (perm: string) => {
    if (isAdminOrOwner) return true;
    const permissions = context?.permissions || userData?.permissions || [];
    return permissions.includes(perm);
  };

  const checkIsActive = (route?: string, exact = false) => {
    if (!route) return false;
    if (exact) {
      return pathname === route;
    }
    if (pathname === route) return true;
    if (route === '/dashboard') return false;
    if (route === '/settings') {
      return pathname === '/settings';
    }
    if (route === '/schedule') {
      return pathname === '/schedule';
    }
    return pathname.startsWith(`${route}/`);
  };

  const prefetch = (route: string) => {
    prefetchRouteData(queryClient, route, context?.organization?.id, isAdminOrOwner, context?.coach?.id);
  };

  const navSections = [
    ...(isAdminOrOwner ? [] : COACH_NAV),
    ...ADMIN_NAV
  ];

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const displayName = context?.profile?.name || userData?.name || user?.user_metadata?.full_name || 'User';
  const displayRole = role === 'owner' ? 'Owner' : role === 'admin' ? 'Admin' : role === 'head_coach' ? 'Head Coach' : 'Assistant Coach';

  const multiWorkspace = context?.allMemberships && context.allMemberships.length > 1;

  return (
    <>
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`} 
        onClick={() => setIsSidebarOpen(false)}
      ></div>

      <nav className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header" style={{ height: 'auto', padding: '16px 16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="sidebar-logo">
              <span className="material-icons-round" style={{ fontSize: '1.2rem' }}>sports_martial_arts</span>
            </div>
            <div className="sidebar-brand" style={{ margin: 0 }}>
              YOOGI
            </div>
          </div>
          
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => multiWorkspace && !isSwitchingWorkspace && setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
              disabled={isSwitchingWorkspace || !multiWorkspace}
              style={{
                width: '100%',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 12px',
                background: 'var(--surface-hover)',
                border: '1px solid var(--border-light)',
                borderRadius: '8px',
                cursor: multiWorkspace ? (isSwitchingWorkspace ? 'wait' : 'pointer') : 'default',
                transition: 'all 0.2s ease',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => {
                if (multiWorkspace && !isSwitchingWorkspace) {
                  e.currentTarget.style.borderColor = 'var(--border)';
                }
              }}
              onMouseLeave={(e) => {
                if (multiWorkspace && !isSwitchingWorkspace) {
                  e.currentTarget.style.borderColor = 'var(--border-light)';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden', whiteSpace: 'nowrap', paddingRight: '8px', flex: 1 }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {context?.organization?.name || 'Unknown'}
                </span>
                <span style={{ color: 'var(--text-muted)', margin: '0 6px', fontWeight: 600 }}>·</span>
                <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-secondary)', flexShrink: 0 }}>
                  {isSwitchingWorkspace ? 'Đang chuyển...' : displayRole}
                </span>
              </div>
              {multiWorkspace && (
                isSwitchingWorkspace ? (
                  <span className="material-icons-round" style={{ fontSize: '18px', color: 'var(--text-secondary)', flexShrink: 0 }}>sync</span>
                ) : (
                  <span className="material-icons-round" style={{ fontSize: '18px', color: 'var(--text-secondary)', flexShrink: 0 }}>arrow_drop_down</span>
                )
              )}
            </button>

            {isWorkspaceDropdownOpen && multiWorkspace && (
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
                  borderRadius: '8px',
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
          </div>
        </div>

        <div className="sidebar-nav">
          {navSections.map((section, idx) => {
            const visibleItems = section.items.filter((item: any) => {
              if (item.submenus) {
                return item.submenus.some((sub: any) => !sub.permission || hasPermission(sub.permission));
              }
              return !item.permission || hasPermission(item.permission);
            });

            if (visibleItems.length === 0) return null;

            return (
              <div className="nav-section" key={idx}>
                <div className="nav-section-title">{section.section}</div>
                {visibleItems.map((item, itemIdx) => (
                  <NavItemComponent 
                    key={itemIdx} 
                    item={item} 
                    pathname={pathname} 
                    checkIsActive={checkIsActive} 
                    setIsSidebarOpen={setIsSidebarOpen} 
                    prefetch={prefetch} 
                    hasPermission={hasPermission} 
                  />
                ))}
              </div>
            );
          })}
        </div>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px', padding: '0 8px' }}>
            <Link 
              href="/settings/version-history"
              onClick={() => setIsSidebarOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                borderRadius: '8px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-main)';
                e.currentTarget.style.background = 'var(--surface-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <span className="material-icons-round" style={{ fontSize: '20px' }}>history</span>
              <span style={{ fontSize: '13px', fontWeight: 500 }}>Lịch sử phiên bản</span>
            </Link>

            <button 
              onClick={toggleTheme}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                color: 'var(--text-secondary)',
                background: 'transparent',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                width: '100%',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-main)';
                e.currentTarget.style.background = 'var(--surface-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <span className="material-icons-round" style={{ fontSize: '20px' }}>
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
              <span style={{ fontSize: '13px', fontWeight: 500 }}>
                {theme === 'dark' ? 'Light mode' : 'Dark mode'}
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
