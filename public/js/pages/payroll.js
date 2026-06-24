// Payroll page (Admin) - V2 Implementation
import { calculateMonthlyPayrollV2, paySalaryTransaction, getClassesV2 } from '../db.js';
import { getCurrentMonth, formatMonth, formatCurrency, formatDate, escapeHtml, getPrevMonth, getNextMonth } from '../utils.js';
import { showModal, closeModal, confirmDialog } from '../components/modal.js';
import { showToast } from '../components/toast.js';

let currentMonth = getCurrentMonth();

export async function renderPayroll(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Bảng Lương HLV</h1>
        <p class="page-subtitle">Tổng hợp và thanh toán lương hàng tháng</p>
      </div>
      <button class="btn btn-secondary" id="btnPrint" onclick="window.print()">
        <span class="material-icons-round">print</span>
        In bảng lương
      </button>
    </div>
    <div class="flex items-center justify-center gap-4 mb-6">
      <button class="btn btn-icon btn-ghost" id="btnPrevMonth">
        <span class="material-icons-round">chevron_left</span>
      </button>
      <h2 id="monthLabel" style="min-width:180px;text-align:center;">${formatMonth(currentMonth)}</h2>
      <button class="btn btn-icon btn-ghost" id="btnNextMonth">
        <span class="material-icons-round">chevron_right</span>
      </button>
    </div>
    <div class="stats-grid" id="payrollStats">
      ${Array(3).fill('<div class="skeleton skeleton-card" style="height:80px;"></div>').join('')}
    </div>
    <div class="card">
      <div id="payrollTable">
        <div style="padding:var(--sp-6);text-align:center;color:var(--text-muted);">Đang tải...</div>
      </div>
    </div>
  `;

  document.getElementById('btnPrevMonth').addEventListener('click', () => {
    currentMonth = getPrevMonth(currentMonth);
    document.getElementById('monthLabel').textContent = formatMonth(currentMonth);
    loadPayrollData();
  });

  document.getElementById('btnNextMonth').addEventListener('click', () => {
    currentMonth = getNextMonth(currentMonth);
    document.getElementById('monthLabel').textContent = formatMonth(currentMonth);
    loadPayrollData();
  });

  await loadPayrollData();
}

async function loadPayrollData() {
  try {
    const payroll = await calculateMonthlyPayrollV2(currentMonth);
    const classes = await getClassesV2();
    const classMap = {};
    classes.forEach(v => { classMap[v.id] = v; });

    const totalPayroll = payroll.reduce((sum, p) => sum + p.totalEarnings, 0);
    const totalSessions = payroll.reduce((sum, p) => sum + p.totalSessions, 0);

    const payrollStats = document.getElementById('payrollStats');
    if (payrollStats) payrollStats.innerHTML = `
      <div class="stat-card">
        <div class="stat-icon green">
          <span class="material-icons-round">payments</span>
        </div>
        <div>
          <div class="stat-value payroll-total" style="font-size:1.25rem;">${formatCurrency(totalPayroll)}</div>
          <div class="stat-label">Tổng quỹ lương</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon blue">
          <span class="material-icons-round">event_available</span>
        </div>
        <div>
          <div class="stat-value">${totalSessions}</div>
          <div class="stat-label">Tổng ca dạy</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon purple">
          <span class="material-icons-round">people</span>
        </div>
        <div>
          <div class="stat-value">${payroll.length}</div>
          <div class="stat-label">Số HLV</div>
        </div>
      </div>
    `;

    const tableEl = document.getElementById('payrollTable');
    if (!tableEl) return;

    if (payroll.length === 0) {
      tableEl.innerHTML = `
        <div class="empty-state">
          <span class="material-icons-round empty-state-icon">receipt_long</span>
          <h3 class="empty-state-title">Chưa có dữ liệu</h3>
          <p class="empty-state-text">Tháng ${formatMonth(currentMonth)} chưa có ca dạy nào được duyệt</p>
        </div>
      `;
      return;
    }

    tableEl.innerHTML = `
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>#</th>
              <th>HLV</th>
              <th style="text-align:right;">Lương cứng</th>
              <th style="text-align:center;">Số ca</th>
              <th style="text-align:right;">Lương ca</th>
              <th style="text-align:right;">Tổng lương</th>
              <th style="text-align:center;">Hành động</th>
            </tr>
          </thead>
          <tbody>
            ${payroll.map((p, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>
                  <strong>${escapeHtml(p.coachName)}</strong>
                  <br><span style="font-size:0.7rem;color:var(--text-secondary);">${escapeHtml(p.coachEmail)}</span>
                </td>
                <td style="text-align:right;">${formatCurrency(p.baseSalary)}</td>
                <td style="text-align:center;">${p.totalSessions}</td>
                <td style="text-align:right;">${formatCurrency(p.sessionEarnings)}</td>
                <td style="text-align:right;font-weight:700;color:var(--accent-success);">${formatCurrency(p.totalEarnings)}</td>
                <td style="text-align:center;">
                  <button class="btn btn-sm btn-ghost" data-detail="${p.coachId}" title="Chi tiết">
                    <span class="material-icons-round">visibility</span>
                  </button>
                  ${p.totalEarnings > 0 ? `
                    <button class="btn btn-sm btn-primary" data-pay="${p.coachId}" data-name="${escapeHtml(p.coachName)}" data-amount="${p.totalEarnings}" title="Thanh toán">
                      <span class="material-icons-round">payments</span> Thanh toán
                    </button>
                  ` : ''}
                </td>
              </tr>
            `).join('')}
            <tr style="background: rgba(255,255,255,0.03);">
              <td colspan="3" style="font-weight:700;">TỔNG CỘNG</td>
              <td style="text-align:center;font-weight:700;">${totalSessions}</td>
              <td></td>
              <td style="text-align:right;font-weight:800;font-size:1rem;color:var(--accent-success);">${formatCurrency(totalPayroll)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    // Detail handlers
    tableEl.querySelectorAll('[data-detail]').forEach(btn => {
      btn.addEventListener('click', () => {
        const coachId = btn.dataset.detail;
        const p = payroll.find(x => x.coachId === coachId);
        if (p) showCoachDetail(p, classMap);
      });
    });

    // Pay handlers
    tableEl.querySelectorAll('[data-pay]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const coachId = btn.dataset.pay;
        const name = btn.dataset.name;
        const amount = Number(btn.dataset.amount);
        
        const ok = await confirmDialog('Thanh toán Lương', `Tạo phiếu chi lương <strong>${formatCurrency(amount)}</strong> cho HLV ${name} trong tháng ${currentMonth}?<br><small style="color:var(--text-secondary);">Phiếu chi sẽ được lưu vào Sổ quỹ chung.</small>`);
        if (ok) {
          try {
            await paySalaryTransaction(coachId, name, currentMonth, amount);
            showToast({ message: 'Đã thanh toán và ghi nhận vào sổ quỹ', type: 'success' });
            loadPayrollData();
          } catch(e) {
            showToast({ message: 'Lỗi: ' + e.message, type: 'error' });
          }
        }
      });
    });

  } catch (err) {
    showToast({ message: 'Lỗi: ' + err.message, type: 'error' });
  }
}

function showCoachDetail(p, classMap) {
  const sortedRecords = [...p.records].sort((a, b) => a.date.localeCompare(b.date));
  
  showModal({
    title: `Chi tiết lương — ${p.coachName}`,
    showFooter: false,
    wide: true,
    content: `
      <div style="margin-bottom: var(--sp-4);">
        <span style="font-size:0.8rem;color:var(--text-secondary);">Tháng ${formatMonth(currentMonth)}</span>
        <div class="payroll-total" style="font-size:1.5rem;margin-top:var(--sp-2);">${formatCurrency(p.totalEarnings)}</div>
        <div style="font-size:0.9rem; color:var(--text-secondary); margin-top:var(--sp-2);">
          <div>Lương cứng: <strong>${formatCurrency(p.baseSalary)}</strong></div>
          <div>Lương ca dạy (${sortedRecords.length} ca): <strong>${formatCurrency(p.sessionEarnings)}</strong></div>
        </div>
      </div>
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>Ngày</th>
              <th>Lớp học</th>
              <th style="text-align:right;">Lương ca</th>
              <th style="text-align:center;">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            ${sortedRecords.map(r => `
              <tr>
                <td>${formatDate(r.date)}</td>
                <td>${escapeHtml(classMap[r.classId]?.name || '?')}</td>
                <td style="text-align:right;font-weight:600;">${formatCurrency(r.calculatedSalary || 0)}</td>
                <td style="text-align:center;">
                  ${r.status === 'paid' ? '<span class="badge badge-success">Đã thanh toán</span>' : '<span class="badge badge-approved">Chờ TT</span>'}
                </td>
              </tr>
            `).join('')}
            ${sortedRecords.length === 0 ? '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">Không có ca dạy nào</td></tr>' : ''}
          </tbody>
        </table>
      </div>
    `
  });
}
