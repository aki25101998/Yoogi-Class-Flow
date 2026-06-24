// Admin Dashboard page - V2 Implementation
import { getCoaches, getClassesV2, getClassSchedules, getTeacherSalarySessionsByDate, calculateMonthlyPayrollV2, checkInV2, approveAttendanceV2, getFinanceTransactions } from '../db.js';
import { getTodayStr, getTodayDisplay, getDayOfWeek, formatCurrency, getCurrentMonth, escapeHtml } from '../utils.js';
import { getCurrentUserData } from '../auth.js';
import { showToast } from '../components/toast.js';

export async function renderDashboard(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Dashboard (V2)</h1>
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
        <h3 class="card-title">💰 Tổng quan tài chính tháng này</h3>
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

    const [coaches, classes, todaySessions, payroll, financeTransactions] = await Promise.all([
      getCoaches(),
      getClassesV2(),
      getTeacherSalarySessionsByDate(today),
      calculateMonthlyPayrollV2(month),
      getFinanceTransactions()
    ]);

    const coachMap = {};
    coaches.forEach(c => { coachMap[c.id] = c; });
    const classMap = {};
    classes.forEach(c => { classMap[c.id] = c; });

    // Build today schedules from all classes
    const todaySchedules = [];
    for (const cls of classes) {
      if (cls.status !== 'active') continue;
      const schedules = await getClassSchedules(cls.id);
      const todaySch = schedules.filter(s => s.dayOfWeek === dow);
      for (const sch of todaySch) {
        todaySchedules.push({
          classId: cls.id,
          className: cls.name,
          startTime: sch.startTime,
          endTime: sch.endTime,
          scheduleKey: `${cls.id}_${sch.id}`
        });
      }
    }

    // Attendance map
    const attMap = {};
    todaySessions.forEach(a => {
      attMap[a.classId] = a;
    });

    const pendingCount = todaySessions.filter(a => a.status === 'checked_in').length;
    const checkedInCount = todaySessions.length;
    const totalPayroll = payroll.reduce((sum, p) => sum + p.totalEarnings, 0);

    // Calculate month income/outcome
    let monthIncome = 0;
    let monthExpense = 0;
    financeTransactions.forEach(t => {
      if (t.date && t.date.startsWith(month)) {
        if (t.type === 'income') monthIncome += Number(t.amount);
        else if (t.type === 'expense') monthExpense += Number(t.amount);
      }
    });

    // Stats
    const statsGrid = document.getElementById('statsGrid');
    if (!statsGrid) return;
    statsGrid.innerHTML = `
      <div class="stat-card">
        <div class="stat-icon purple">
          <span class="material-icons-round">class</span>
        </div>
        <div>
          <div class="stat-value">${classes.length}</div>
          <div class="stat-label">Tổng Lớp học</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon blue">
          <span class="material-icons-round">event</span>
        </div>
        <div>
          <div class="stat-value">${todaySchedules.length}</div>
          <div class="stat-label">Ca dạy hôm nay</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green">
          <span class="material-icons-round">account_balance_wallet</span>
        </div>
        <div>
          <div class="stat-value">${formatCurrency(monthIncome)}</div>
          <div class="stat-label">Tổng Thu tháng này</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon orange">
          <span class="material-icons-round">payments</span>
        </div>
        <div>
          <div class="stat-value">${formatCurrency(monthExpense)}</div>
          <div class="stat-label">Tổng Chi tháng này</div>
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
              <th>Lớp học</th>
              <th>Giờ</th>
              <th>Trạng thái HLV Check-in</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            ${todaySchedules.length === 0 ? `<tr><td colspan="4" style="text-align:center; padding: 2rem;">Không có lịch dạy hôm nay</td></tr>` : todaySchedules.map(s => {
              const att = attMap[s.classId];
              const statusHtml = att
                ? `<span class="badge badge-${att.status === 'approved' ? 'approved' : att.status === 'rejected' ? 'rejected' : 'pending'}">${att.status === 'approved' ? 'Đã duyệt' : att.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt'}</span>`
                : `<span class="badge badge-absent">Chưa check-in</span>`;
              
              let actionsHtml = '';
              if (!att) {
                // Cannot easily auto-checkin here because we don't know which coach to check in (class may have multiple coaches)
                // Just display a message
                actionsHtml = '<span style="font-size:0.8rem; color:var(--text-secondary);">Chờ HLV check-in</span>';
              } else if (att.status === 'checked_in') {
                actionsHtml = `<button class="btn btn-sm btn-primary" data-action="approve" data-att="${att.id}">Duyệt</button>`;
              } else if (att.status === 'approved') {
                actionsHtml = `<span style="color:var(--accent-success); font-weight:600; font-size:0.85rem;">${formatCurrency(att.calculatedSalary || 0)}</span>`;
              }
              
              return `
                <tr>
                  <td><strong>${escapeHtml(s.className)}</strong></td>
                  <td>${s.startTime} - ${s.endTime}</td>
                  <td>
                    ${statusHtml}
                    ${att ? `<div style="font-size:0.75rem; color:var(--text-secondary); margin-top:4px;">bởi: ${escapeHtml(coachMap[att.coachId]?.name || '?')}</div>` : ''}
                  </td>
                  <td class="table-actions">${actionsHtml}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Action handlers
    document.querySelectorAll('[data-action="approve"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const attId = btn.dataset.att;
        const admin = getCurrentUserData();
        btn.disabled = true;
        try {
          await approveAttendanceV2(attId, admin.id);
          showToast({ message: 'Đã duyệt!', type: 'success' });
          await loadDashboardData();
        } catch (err) {
          showToast({ message: 'Lỗi: ' + err.message, type: 'error' });
          btn.disabled = false;
        }
      });
    });

    // Monthly summary
    const monthSummaryEl = document.getElementById('monthSummary');
    if (monthSummaryEl) monthSummaryEl.innerHTML = `
      <div style="display:flex; flex-wrap:wrap; gap:var(--sp-6); padding: var(--sp-4);">
        <div style="flex:1; min-width: 250px;">
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: var(--sp-1);">Tổng Thu (Học phí, khác)</p>
          <p style="font-size: 1.5rem; font-weight: 700; color: var(--accent-success);">${formatCurrency(monthIncome)}</p>
        </div>
        <div style="flex:1; min-width: 250px;">
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: var(--sp-1);">Tổng Chi (Bao gồm quỹ lương)</p>
          <p style="font-size: 1.5rem; font-weight: 700; color: var(--accent-danger);">${formatCurrency(monthExpense)}</p>
        </div>
        <div style="flex:1; min-width: 250px;">
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: var(--sp-1);">Tổng quỹ lương ước tính (Đã tính)</p>
          <p style="font-size: 1.5rem; font-weight: 700; color: var(--accent-warning);">${formatCurrency(totalPayroll)}</p>
        </div>
      </div>
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>HLV</th>
              <th>Số ca dạy đã duyệt</th>
              <th style="text-align:right;">Lương dự tính</th>
            </tr>
          </thead>
          <tbody>
            ${payroll.map(p => `
              <tr>
                <td>
                  <strong>${escapeHtml(p.coachName)}</strong>
                  <div style="font-size:0.75rem; color:var(--text-secondary);">Cơ bản: ${formatCurrency(p.baseSalary)}</div>
                </td>
                <td>${p.totalSessions}</td>
                <td style="text-align:right; font-weight:600;">${formatCurrency(p.totalEarnings)}</td>
              </tr>
            `).join('')}
            ${payroll.length === 0 ? '<tr><td colspan="3" style="text-align:center;">Chưa có dữ liệu lương tháng này</td></tr>' : ''}
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
    <div style="padding: 1rem;">
      <div class="skeleton skeleton-title" style="margin-bottom: 1rem;"></div>
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-text"></div>
    </div>
  `;
}
