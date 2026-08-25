"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

const ADMIN_NAV = [
  { section: 'Tổng quan', items: [
    { icon: 'dashboard', label: 'Dashboard', route: '/dashboard', permission: null }
  ]},
  { section: 'Quản lý', items: [
    { icon: 'people', label: 'Huấn luyện viên', route: '/coaches', permission: 'manage_coaches' },
    { icon: 'school', label: 'Học viên', route: '/students', permission: 'manage_students' },
    { icon: 'location_on', label: 'Địa điểm', route: '/venues', permission: 'manage_venues' },
    { icon: 'class', label: 'Lớp học', route: '/classes', permission: 'manage_venues' },
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

import { User } from '@supabase/supabase-js';
import { Coach } from '@/types/coach';

interface SidebarProps {
  user: User | null;
  userData: Coach | null;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

export default function Sidebar({ user, userData, isSidebarOpen, setIsSidebarOpen }: SidebarProps) {
  const pathname = usePathname();
  const isAdmin = userData?.role === 'admin';

  // Simplified permissions check for the frontend UI rendering
  const hasPermission = (perm: string) => {
    if (isAdmin) return true;
    if (!userData?.permissions) return false;
    return userData.permissions.includes(perm);
  };

  const navSections = [
    ...(isAdmin ? [] : COACH_NAV),
    ...ADMIN_NAV.map(section => ({
      ...section,
      items: section.items.filter(item => !item.permission || hasPermission(item.permission))
    })).filter(section => section.items.length > 0)
  ];

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

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
            Chấm Công HLV
            <small>{isAdmin ? 'Quản trị viên' : 'Huấn luyện viên'}</small>
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
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            {user?.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt="Avatar" className="user-avatar" referrerPolicy="no-referrer" />
            ) : (
              <div className="user-avatar-placeholder">{(userData?.name || 'U').charAt(0).toUpperCase()}</div>
            )}
            <div className="user-info">
              <div className="user-name">{userData?.name || user?.user_metadata?.full_name || 'User'}</div>
              <div className="user-role">{isAdmin ? 'Admin' : 'HLV'}</div>
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
