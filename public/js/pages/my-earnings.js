// My Earnings page (Coach) — Shows sessions instead of money
import { calculateCoachPayroll, getVenues } from '../db.js';
import { getCurrentUserData } from '../auth.js';
import { getCurrentMonth, formatMonth, formatDate, escapeHtml, getPrevMonth, getNextMonth } from '../utils.js';
import { showToast } from '../components/toast.js';

let currentMonth = getCurrentMonth();

export async function renderMyEarnings(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Hoạt Động</h1>
        <p class="page-subtitle">Tổng hợp số buổi dạy hàng tháng</p>
      </div>
    </div>
    <div class="flex items-center justify-center gap-4 mb-6">
      <button class="btn btn-icon btn-ghost" id="btnPrevE">
        <span class="material-icons-round">chevron_left</span>
      </button>
      <h2 id="monthLabelE" style="min-width:180px;text-align:center;">${formatMonth(currentMonth)}</h2>
      <button class="btn btn-icon btn-ghost" id="btnNextE">
        <span class="material-icons-round">chevron_right</span>
      </button>
    </div>
    <div id="earningsContent">
      <div style="padding:var(--sp-8);text-align:center;color:var(--text-muted);">Đang tải...</div>
    </div>
  `;

  document.getElementById('btnPrevE').addEventListener('click', () => {
    currentMonth = getPrevMonth(currentMonth);
    document.getElementById('monthLabelE').textContent = formatMonth(currentMonth);
    loadEarnings();
  });
  document.getElementById('btnNextE').addEventListener('click', () => {
    currentMonth = getNextMonth(currentMonth);
    document.getElementById('monthLabelE').textContent = formatMonth(currentMonth);
    loadEarnings();
  });

  await loadEarnings();
}

async function loadEarnings() {
  try {
    const userData = getCurrentUserData();
    const [payroll, venues] = await Promise.all([
      calculateCoachPayroll(userData.id, currentMonth),
      getVenues()
    ]);
    const venueMap = {};
    venues.forEach(v => { venueMap[v.id] = v; });

    const content = document.getElementById('earningsContent');

    content.innerHTML = `
      <div class="card mb-6" style="text-align:center; padding: var(--sp-8);">
        <div style="font-size:0.875rem;color:var(--text-secondary);margin-bottom:var(--sp-2);">
          Số buổi dạy đã duyệt ${formatMonth(currentMonth)}
        </div>
        <div class="payroll-total" style="font-size:3.5rem;font-weight:800;color:var(--accent-primary);">
          ${payroll.totalSessions}
        </div>
        <div style="margin-top:var(--sp-3);font-size:0.875rem;color:var(--text-secondary);">
          Buổi
        </div>
      </div>

      ${payroll.records.length > 0 ? `
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Chi tiết từng buổi</h3>
          </div>
          <div class="table-wrapper">
            <table class="table">
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th>Địa điểm</th>
                  <th style="text-align:right;">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                ${payroll.records.sort((a, b) => a.date.localeCompare(b.date)).map(r => `
                  <tr>
                    <td>${formatDate(r.date)}</td>
                    <td>${escapeHtml(venueMap[r.venueId]?.name || '?')}${r.isSubstitution ? ' <span style="color:var(--accent-warning);font-size:0.7rem;">(thế)</span>' : ''}</td>
                    <td style="text-align:right;">
                      <span class="badge badge-approved">Đã duyệt ✓</span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : `
        <div class="card">
          <div class="empty-state">
            <span class="material-icons-round empty-state-icon">assignment_turned_in</span>
            <h3 class="empty-state-title">Chưa có buổi nào được duyệt</h3>
            <p class="empty-state-text">Tháng ${formatMonth(currentMonth)} chưa có buổi dạy nào được admin xác nhận</p>
          </div>
        </div>
      `}
    `;
  } catch (err) {
    showToast({ message: 'Lỗi: ' + err.message, type: 'error' });
  }
}
