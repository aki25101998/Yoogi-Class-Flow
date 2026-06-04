// Sidebar navigation component
import { isAdmin, getCurrentUser, getCurrentUserData, signOutUser, hasPermission } from '../auth.js';
import { navigate } from '../router.js';
import { showToast } from './toast.js';

const ADMIN_NAV = [
  { section: 'Tổng quan', items: [
    { icon: 'dashboard', label: 'Dashboard', route: '#/dashboard', permission: null }
  ]},
  { section: 'Quản lý', items: [
    { icon: 'people', label: 'Huấn luyện viên', route: '#/coaches', permission: 'manage_coaches' },
    { icon: 'school', label: 'Học viên', route: '#/students', permission: 'manage_students' },
    { icon: 'location_on', label: 'Địa điểm', route: '#/venues', permission: 'manage_venues' },
    { icon: 'calendar_month', label: 'Lịch dạy', route: '#/schedule', permission: 'manage_schedule' }
  ]},
  { section: 'Chấm công', items: [
    { icon: 'fact_check', label: 'Điểm danh', route: '#/attendance', permission: 'manage_attendance' },
    { icon: 'payments', label: 'Bảng lương', route: '#/payroll', permission: 'view_payroll' }
  ]}
];

const COACH_NAV = [
  { section: 'Cá nhân', items: [
    { icon: 'calendar_month', label: 'Lịch của tôi', route: '#/my-schedule' },
    { icon: 'fingerprint', label: 'Check-in', route: '#/my-checkin' },
    { icon: 'assignment_turned_in', label: 'Điểm danh', route: '#/my-attendance' },
    { icon: 'local_activity', label: 'Hoạt động', route: '#/my-earnings' }
  ]}
];

/**
 * Render the app layout with sidebar and main content area
 * @param {HTMLElement} container - #app element
 */
export function renderLayout(container) {
  const user = getCurrentUser();
  const userData = getCurrentUserData();
  const admin = isAdmin();
  const navSections = [
    ...(admin ? [] : COACH_NAV),
    ...ADMIN_NAV.map(section => ({
      ...section,
      items: section.items.filter(item => !item.permission || hasPermission(item.permission))
    })).filter(section => section.items.length > 0)
  ];

  const navItemsHtml = navSections.map(section => `
    <div class="nav-section">
      <div class="nav-section-title">${section.section}</div>
      ${section.items.map(item => `
        <div class="nav-item" data-route="${item.route}" id="nav-${item.route.replace('#/', '')}">
          <span class="material-icons-round">${item.icon}</span>
          <span>${item.label}</span>
        </div>
      `).join('')}
    </div>
  `).join('');

  const avatarHtml = user?.photoURL
    ? `<img src="${user.photoURL}" alt="Avatar" class="user-avatar" referrerpolicy="no-referrer">`
    : `<div class="user-avatar-placeholder">${(userData?.name || 'U').charAt(0).toUpperCase()}</div>`;

  container.innerHTML = `
    <!-- Mobile Top Bar -->
    <div class="mobile-topbar">
      <button class="btn-hamburger" id="btnHamburger" aria-label="Menu">
        <span class="material-icons-round">menu</span>
      </button>
      <div class="sidebar-logo">
        <span class="material-icons-round" style="font-size: 1.2rem;">sports_martial_arts</span>
      </div>
      <span style="font-weight: 700; font-size: 0.9rem;">Chấm Công HLV</span>
    </div>

    <!-- Sidebar Overlay (mobile) -->
    <div class="sidebar-overlay" id="sidebarOverlay"></div>

    <!-- Sidebar -->
    <nav class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <span class="material-icons-round" style="font-size: 1.2rem;">sports_martial_arts</span>
        </div>
        <div class="sidebar-brand">
          Chấm Công HLV
          <small>${admin ? 'Quản trị viên' : 'Huấn luyện viên'}</small>
        </div>
      </div>

      <div class="sidebar-nav">
        ${navItemsHtml}
      </div>

      <div class="sidebar-footer">
        <div class="sidebar-user">
          ${avatarHtml}
          <div class="user-info">
            <div class="user-name">${userData?.name || user?.displayName || 'User'}</div>
            <div class="user-role">${admin ? 'Admin' : 'HLV'}</div>
          </div>
          <button class="btn-logout" id="btnLogout" title="Đăng xuất">
            <span class="material-icons-round">logout</span>
          </button>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="main-content" id="mainContent">
    </main>
  `;

  // Event: nav item clicks
  container.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const route = item.getAttribute('data-route');
      navigate(route);
      closeSidebar();
    });
  });

  // Event: logout
  document.getElementById('btnLogout').addEventListener('click', async () => {
    try {
      await signOutUser();
      showToast({ message: 'Đã đăng xuất', type: 'info' });
    } catch (err) {
      showToast({ message: 'Lỗi đăng xuất: ' + err.message, type: 'error' });
    }
  });

  // Event: hamburger menu
  const hamburger = document.getElementById('btnHamburger');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');

  if (hamburger) {
    hamburger.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('active');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', closeSidebar);
  }
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('active');
}
