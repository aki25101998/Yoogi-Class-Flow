// Admin Dashboard page
import { getCoaches, getSchedules, getAttendanceByDate, getAttendanceByMonth, getVenues, checkIn, approveAttendance } from '../db.js';
import { getTodayStr, getTodayDisplay, getDayOfWeek, formatCurrency, formatTime, getCurrentMonth, escapeHtml } from '../utils.js';
import { getCurrentUserData } from '../auth.js';
import { showToast } from '../components/toast.js';

/**
 * Render admin dashboard
 * @param {HTMLElement} container
 */
export async function renderDashboard(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Dashboard</h1>
        <p class="page-subtitle">${getTodayDisplay()}</p>
      </div>
    </div>
    <div class="stats-grid" id="statsGrid">
      ${skeletonStats()}
    </div>
    <div class="card mb-6">
      <div class="card-header">
        <h3 class="card-title">📋 Lịch dạy hôm nay</h3>
      </div>
      <div id="todaySchedule">${skeletonTable()}</div>
    </div>
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">💰 Tổng lương tháng này</h3>
      </div>
      <div id="monthSummary">${skeletonTable()}</div>
    </div>
  `;

  await loadDashboardData();
}

async function loadDashboardData() {
  try {
    const today = getTodayStr();
    const dow = getDayOfWeek(today);
    const month = getCurrentMonth();

    const [coaches, venues, todaySchedules, todayAttendance, monthAttendance] = await Promise.all([
      getCoaches(),
      getVenues(),
      getSchedules({ dayOfWeek: dow }),
      getAttendanceByDate(today),
      getAttendanceByMonth(month)
    ]);

    const coachMap = {};
    coaches.forEach(c => { coachMap[c.id] = c; });
    const venueMap = {};
    venues.forEach(v => { venueMap[v.id] = v; });

    // Build attendance lookup: coachId+scheduleId -> attendance record
    const attMap = {};
    todayAttendance.forEach(a => {
      attMap[`${a.coachId}_${a.scheduleId}`] = a;
    });

    const pendingCount = todayAttendance.filter(a => a.status === 'checked_in').length;
    const checkedInCount = todayAttendance.length;
    const approvedMonth = monthAttendance.filter(a => a.status === 'approved');
    const totalPayroll = approvedMonth.reduce((sum, a) => sum + (a.earnings || 0), 0);

    // Stats
    const statsGrid = document.getElementById('statsGrid');
    if (!statsGrid) return;
    statsGrid.innerHTML = `
      <div class="stat-card">
        <div class="stat-icon purple">
          <span class="material-icons-round">people</span>
        </div>
        <div>
          <div class="stat-value">${coaches.length}</div>
          <div class="stat-label">HLV đang hoạt động</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon blue">
          <span class="material-icons-round">event</span>
        </div>
        <div>
          <div class="stat-value">${todaySchedules.length}</div>
          <div class="stat-label">Buổi dạy hôm nay</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green">
          <span class="material-icons-round">check_circle</span>
        </div>
        <div>
          <div class="stat-value">${checkedInCount}</div>
          <div class="stat-label">Đã check-in</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon orange">
          <span class="material-icons-round">pending</span>
        </div>
        <div>
          <div class="stat-value">${pendingCount}</div>
          <div class="stat-label">Chờ duyệt</div>
        </div>
      </div>
    `;

    // Today's schedule
      const todayScheduleEl = document.getElementById('todaySchedule');
      if (todayScheduleEl) todayScheduleEl.innerHTML = `
        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th>HLV</th>
                <th>Địa điểm</th>
                <th>Giờ</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              ${todaySchedules.length === 0 ? `<tr><td colspan="5" style="text-align:center; padding: 2rem;">Không có lịch dạy</td></tr>` : todaySchedules.map(s => {
                const coach = coachMap[s.coachId];
                const venue = venueMap[s.venueId];
                const att = attMap[`${s.coachId}_${s.id}`];
                const statusHtml = att
                  ? `<span class="badge badge-${att.status === 'approved' ? 'approved' : att.status === 'rejected' ? 'rejected' : 'pending'}">${att.status === 'approved' ? 'Đã duyệt' : att.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt'}</span>`
                  : `<span class="badge badge-absent">Chưa check-in</span>`;
                
                let actionsHtml = '';
                if (!att) {
                  actionsHtml = `<button class="btn btn-sm btn-success" data-action="checkin" data-coach="${s.coachId}" data-schedule="${s.id}" data-venue="${s.venueId}">Check-in giùm</button>`;
                } else if (att.status === 'checked_in') {
                  actionsHtml = `<button class="btn btn-sm btn-primary" data-action="approve" data-att="${att.id}">Duyệt</button>`;
                }
                
                return `
                  <tr>
                    <td><strong>${escapeHtml(coach?.name || '?')}</strong></td>
                    <td>${escapeHtml(venue?.name || '?')}</td>
                    <td>${s.startTime} - ${s.endTime}</td>
                    <td>${statusHtml}</td>
                    <td class="table-actions">${actionsHtml}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;

      // Action handlers
      document.querySelectorAll('[data-action="checkin"]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const coachId = btn.dataset.coach;
          const scheduleId = btn.dataset.schedule;
          const venueId = btn.dataset.venue;
          const admin = getCurrentUserData();
          btn.disabled = true;
          try {
            await checkIn({ coachId, scheduleId, venueId, date: today, checkInBy: admin.id });
            showToast({ message: 'Đã check-in và duyệt thành công!', type: 'success' });
            await loadDashboardData();
          } catch (err) {
            showToast({ message: 'Lỗi: ' + err.message, type: 'error' });
            btn.disabled = false;
          }
        });
      });

      document.querySelectorAll('[data-action="approve"]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const attId = btn.dataset.att;
          const admin = getCurrentUserData();
          btn.disabled = true;
          try {
            await approveAttendance(attId, admin.id);
            showToast({ message: 'Đã duyệt!', type: 'success' });
            await loadDashboardData();
          } catch (err) {
            showToast({ message: 'Lỗi: ' + err.message, type: 'error' });
            btn.disabled = false;
          }
        });
      });

    // Monthly summary
    const payrollByCoach = {};
    approvedMonth.forEach(a => {
      if (!payrollByCoach[a.coachId]) {
        payrollByCoach[a.coachId] = { sessions: 0, total: 0 };
      }
      payrollByCoach[a.coachId].sessions++;
      payrollByCoach[a.coachId].total += (a.earnings || 0);
    });

    const payrollEntries = Object.entries(payrollByCoach)
      .map(([id, data]) => ({ coachId: id, ...data }))
      .sort((a, b) => b.total - a.total);

      const monthSummaryEl = document.getElementById('monthSummary');
      if (monthSummaryEl) monthSummaryEl.innerHTML = `
        <div style="padding: var(--sp-4) 0;">
          <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: var(--sp-3); padding: 0 var(--sp-4);">Tổng chi lương tháng</p>
          <p class="payroll-total" style="padding: 0 var(--sp-4); margin-bottom: var(--sp-5);">${formatCurrency(totalPayroll)}</p>
        </div>
        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th>HLV</th>
                <th>Số buổi</th>
                <th style="text-align:right;">Tổng lương</th>
              </tr>
            </thead>
            <tbody>
              ${payrollEntries.map(p => `
                <tr>
                  <td><strong>${escapeHtml(coachMap[p.coachId]?.name || '?')}</strong></td>
                  <td>${p.sessions}</td>
                  <td style="text-align:right; font-weight:600;">${formatCurrency(p.total)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
  } catch (err) {
    console.error('Dashboard error:', err);
    showToast({ message: 'Lỗi tải dữ liệu: ' + err.message, type: 'error' });
  }
}

function skeletonStats() {
  return Array(4).fill(`
    <div class="stat-card">
      <div class="skeleton skeleton-avatar"></div>
      <div style="flex:1;">
        <div class="skeleton skeleton-title" style="width:40%;"></div>
        <div class="skeleton skeleton-text" style="width:60%;"></div>
      </div>
    </div>
  `).join('');
}

function skeletonTable() {
  return `
    <div style="padding: var(--sp-4);">
      <div class="skeleton skeleton-text" style="width:80%;"></div>
      <div class="skeleton skeleton-text" style="width:60%;"></div>
      <div class="skeleton skeleton-text" style="width:70%;"></div>
    </div>
  `;
}
