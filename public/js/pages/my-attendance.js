// My Attendance page (Coach)
import { getAttendanceByCoachMonth, getVenues } from '../db.js';
import { getCurrentUserData } from '../auth.js';
import { getCurrentMonth, formatMonth, formatDate, formatCurrency, escapeHtml, getPrevMonth, getNextMonth } from '../utils.js';
import { showToast } from '../components/toast.js';

let currentMonth = getCurrentMonth();

export async function renderMyAttendance(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Điểm Danh Của Tôi</h1>
        <p class="page-subtitle">Lịch sử chấm công</p>
      </div>
    </div>
    <div class="flex items-center justify-center gap-4 mb-6">
      <button class="btn btn-icon btn-ghost" id="btnPrevM">
        <span class="material-icons-round">chevron_left</span>
      </button>
      <h2 id="monthLabel" style="min-width:180px;text-align:center;">${formatMonth(currentMonth)}</h2>
      <button class="btn btn-icon btn-ghost" id="btnNextM">
        <span class="material-icons-round">chevron_right</span>
      </button>
    </div>
    <div class="stats-grid" id="attStats"></div>
    <div class="card">
      <div id="attList">
        <div style="padding:var(--sp-6);text-align:center;color:var(--text-muted);">Đang tải...</div>
      </div>
    </div>
  `;

  document.getElementById('btnPrevM').addEventListener('click', () => {
    currentMonth = getPrevMonth(currentMonth);
    document.getElementById('monthLabel').textContent = formatMonth(currentMonth);
    loadData();
  });
  document.getElementById('btnNextM').addEventListener('click', () => {
    currentMonth = getNextMonth(currentMonth);
    document.getElementById('monthLabel').textContent = formatMonth(currentMonth);
    loadData();
  });

  await loadData();
}

async function loadData() {
  try {
    const userData = getCurrentUserData();
    const [attendance, venues] = await Promise.all([
      getAttendanceByCoachMonth(userData.id, currentMonth),
      getVenues()
    ]);
    const venueMap = {};
    venues.forEach(v => { venueMap[v.id] = v; });

    const approved = attendance.filter(a => a.status === 'approved');
    const pending = attendance.filter(a => a.status === 'checked_in');
    const rejected = attendance.filter(a => a.status === 'rejected');

    document.getElementById('attStats').innerHTML = `
      <div class="stat-card">
        <div class="stat-icon green"><span class="material-icons-round">check_circle</span></div>
        <div>
          <div class="stat-value">${approved.length}</div>
          <div class="stat-label">Đã duyệt</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon orange"><span class="material-icons-round">pending</span></div>
        <div>
          <div class="stat-value">${pending.length}</div>
          <div class="stat-label">Chờ duyệt</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon red"><span class="material-icons-round">cancel</span></div>
        <div>
          <div class="stat-value">${rejected.length}</div>
          <div class="stat-label">Từ chối</div>
        </div>
      </div>
    `;

    const listEl = document.getElementById('attList');
    if (attendance.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <span class="material-icons-round empty-state-icon">assignment</span>
          <h3 class="empty-state-title">Chưa có dữ liệu</h3>
          <p class="empty-state-text">Tháng ${formatMonth(currentMonth)} chưa có điểm danh</p>
        </div>
      `;
      return;
    }

    attendance.sort((a, b) => b.date.localeCompare(a.date));

    const statusMap = {
      'checked_in': ['badge-pending', 'Chờ duyệt'],
      'approved': ['badge-approved', 'Đã duyệt'],
      'rejected': ['badge-rejected', 'Từ chối']
    };

    listEl.innerHTML = `
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>Ngày</th>
              <th>Địa điểm</th>
              <th>Trạng thái</th>
              <th style="text-align:right;">Lương</th>
            </tr>
          </thead>
          <tbody>
            ${attendance.map(a => {
              const [cls, text] = statusMap[a.status] || ['badge-absent', a.status];
              return `
                <tr>
                  <td>${formatDate(a.date)}</td>
                  <td>${escapeHtml(venueMap[a.venueId]?.name || '?')}</td>
                  <td><span class="badge ${cls}">${text}</span></td>
                  <td style="text-align:right;font-weight:600;">${a.earnings ? formatCurrency(a.earnings) : '—'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    showToast({ message: 'Lỗi: ' + err.message, type: 'error' });
  }
}
