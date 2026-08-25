"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { User } from '@supabase/supabase-js';
import { Coach } from '@/types/coach';

const ADMIN_NAV = [
  { section: 'Tổng quan', items: [
    { icon: 'dashboard', label: 'Dashboard', route: '/dashboard', permission: null }
  ]},
  { section: 'Quản lý', items: [
    { icon: 'people', label: 'Huấn luyện viên', route: '/coaches', permission: 'manage_coaches' },
    { icon: 'school', label: 'Học viên', route: '/students', permission: 'manage_students' },
    { icon: 'location_on', label: 'Địa điểm', route: '/venues', permission: 'manage_venues' },
    { icon: 'class', label: 'Lớp học', route: '/classes', permission: 'manage_classes' },
    { icon: 'calendar_month', label: 'Lịch dạy', route: '/schedule', permission: 'manage_schedule' },
    { icon: 'settings', label: 'Cài đặt', route: '/settings', permission: 'manage_settings' }
  ]},
  { section: 'Chấm công', items: [
    { icon: 'fact_check', label: 'Điểm danh', route: '/attendance', permission: 'manage_attendance' },
    { icon: 'payments', label: 'Bảng lương', route: '/payroll', permission: 'view_payroll' }
  ]},
  { section: 'Tài chính - Kế toán', items: [
    { icon: 'account_balance_wallet', label: 'Học phí', route: '/tuition', permission: 'manage_venues' },
    { icon: 'receipt_long', label: 'Sổ quỹ', route: '/finance', permission: 'manage_venues' }
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
  user: User | null;
  userData: Coach | null;
  context?: any;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

export default function Sidebar({ user, userData, context, isSidebarOpen, setIsSidebarOpen }: SidebarProps) {
  const pathname = usePathname();
  
  // Use context if available, otherwise fallback to userData
  const role = context?.membership?.role || userData?.role;
  const isAdminOrOwner = role === 'admin' || role === 'owner';
  
  // Simplified permissions check
  const hasPermission = (perm: string) => {
    if (isAdminOrOwner) return true;
    const permissions = context?.permissions || userData?.permissions || [];
    return permissions.includes(perm);
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
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="material-icons-round" style={{ fontSize: '1.2rem' }}>sports_martial_arts</span>
          </div>
          <div className="sidebar-brand">
            {context?.organization?.name || 'Chấm Công HLV'}
            <small>{displayRole}</small>
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
                  className={`nav-item ${pathname === item.route ? 'active' : ''}`}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <span className="material-icons-round">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
              
              {/* Insert Members link under Cài đặt for admins */}
              {section.section === 'Quản lý' && isAdminOrOwner && (
                <Link 
                  href="/settings/members" 
                  className={`nav-item ${pathname === '/settings/members' ? 'active' : ''}`}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <span className="material-icons-round">group</span>
                  <span>Thành viên</span>
                </Link>
              )}
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
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
