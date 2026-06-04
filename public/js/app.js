// Main Application Entry Point
import { onAuthStateChange, isAdmin } from './auth.js';
import { registerRoute, navigate, initRouter } from './router.js';
import { renderLayout } from './components/navbar.js';
import { renderLoginPage } from './pages/login.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderCoaches } from './pages/coaches.js';
import { renderVenues } from './pages/venues.js';
import { renderSchedule } from './pages/schedule.js';
import { renderAttendance } from './pages/attendance.js';
import { renderPayroll } from './pages/payroll.js';
import { renderMySchedule } from './pages/my-schedule.js';
import { renderMyCheckin } from './pages/my-checkin.js';
import { renderMyAttendance } from './pages/my-attendance.js';
import { renderMyEarnings } from './pages/my-earnings.js';
import { renderStudents } from './pages/students.js';

// Register all routes
// Admin / Granular permission routes
registerRoute('#/dashboard', renderDashboard, { role: 'admin' });
registerRoute('#/coaches', renderCoaches, { permission: 'manage_coaches' });
registerRoute('#/students', renderStudents, { permission: 'manage_students' });
registerRoute('#/venues', renderVenues, { permission: 'manage_venues' });
registerRoute('#/schedule', renderSchedule, { permission: 'manage_schedule' });
registerRoute('#/attendance', renderAttendance, { permission: 'manage_attendance' });
registerRoute('#/payroll', renderPayroll, { permission: 'view_payroll' });

// Coach routes
registerRoute('#/my-schedule', renderMySchedule, { role: 'coach' });
registerRoute('#/my-checkin', renderMyCheckin, { role: 'coach' });
registerRoute('#/my-attendance', renderMyAttendance, { role: 'coach' });
registerRoute('#/my-earnings', renderMyEarnings, { role: 'coach' });

// Listen for auth state changes
onAuthStateChange((user, userData) => {
  const app = document.getElementById('app');
  
  if (!user || !userData) {
    // Not authenticated — show login
    renderLoginPage(app);
    return;
  }

  // Authenticated — render app layout
  renderLayout(app);
  
  // Initialize router
  initRouter();

  // Navigate to default route based on role
  const currentHash = window.location.hash;
  if (!currentHash || currentHash === '#/login' || currentHash === '#/') {
    if (isAdmin()) {
      navigate('#/dashboard');
    } else {
      navigate('#/my-checkin');
    }
  } else {
    // Re-trigger current route
    navigate(currentHash);
  }
});

// Global error handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});
