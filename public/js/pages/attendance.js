// Attendance Review page (Admin) - V2 Implementation
import { getTeacherSalarySessionsByDate, getCoaches, getClassesV2, approveAttendanceV2, rejectAttendanceV2, deleteTeacherSalarySession, checkInV2 } from '../db.js';
import { getTodayStr, formatDate, formatTime, escapeHtml } from '../utils.js';
import { getCurrentUserData } from '../auth.js';
import { showModal, closeModal, confirmDialog } from '../components/modal.js';
import { showToast } from '../components/toast.js';

let currentDate = getTodayStr();

export async function renderAttendance(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Duyệt Điểm Danh (HLV)</h1>
        <p class="page-subtitle">Quản lý chấm công và tính lương theo ca</p>
      </div>
      <button class="btn btn-success" id="btnAdminCheckin">
        <span class="material-icons-round">person_pin</span>
        Check-in giùm
      </button>
    </div>
    <div class="filters-bar">
      <div class="filter-group">
        <span class="material-icons-round" style="color:var(--text-secondary);font-size:1.1rem;">calendar_today</span>
        <input type="date" class="form-input" id="filterDate" value="${currentDate}" style="min-width:160px;">
      </div>
      <button class="btn btn-sm btn-primary" id="btnApproveAll">
        <span class="material-icons-round">done_all</span>
        Duyệt tất cả
      </button>
    </div>
    <div class="card">
      <div id="attendanceTable">
        <div style="padding:var(--sp-6);text-align:center;color:var(--text-muted);">Đang tải...</div>
      </div>
    </div>
  `;

  document.getElementById('filterDate').addEventListener('change', (e) => {
    currentDate = e.target.value;
    loadAttendanceData();
  });

  document.getElementById('btnAdminCheckin').addEventListener('click', () => showAdminCheckinForm());
  document.getElementById('btnApproveAll').addEventListener('click', () => bulkApprove());

  await loadAttendanceData();
}

async function loadAttendanceData() {
  try {
    const [attendance, coaches, classes] = await Promise.all([
      getTeacherSalarySessionsByDate(currentDate),
      getCoaches(),
      getClassesV2()
    ]);

    const coachMap = {};
    coaches.forEach(c => { coachMap[c.id] = c; });
    const classMap = {};
    classes.forEach(c => { classMap[c.id] = c; });
    
    const tableEl = document.getElementById('attendanceTable');
    if (!tableEl) return;
    
    if (attendance.length === 0) {
      tableEl.innerHTML = `
        <div class="empty-state">
          <span class="material-icons-round empty-state-icon">event_busy</span>
          <h3 class="empty-state-title">Không có dữ liệu điểm danh</h3>
          <p class="empty-state-text">Ngày ${formatDate(currentDate)} chưa có ai check-in</p>
        </div>
      `;
      return;
    }

    // Sort: pending first, then by check-in time
    attendance.sort((a, b) => {
      if (a.status === 'checked_in' && b.status !== 'checked_in') return -1;
      if (a.status !== 'checked_in' && b.status === 'checked_in') return 1;
      return 0;
    });

    tableEl.innerHTML = `
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>HLV</th>
              <th>Lớp học</th>
              <th>Check-in</th>
              <th>Trạng thái</th>
              <th>Lương tính được</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            ${attendance.map(att => {
              const coach = coachMap[att.coachId];
              const cls = classMap[att.classId];
              
              const statusMap = {
                'checked_in': '<span class="badge badge-pending">Chờ duyệt</span>',
                'approved': '<span class="badge badge-approved">Đã duyệt</span>',
                'rejected': '<span class="badge badge-rejected">Từ chối</span>'
              };

              return `
                <tr>
                  <td>
                    <div style="font-weight:500;">${escapeHtml(coach?.name || 'Không rõ')}</div>
                    <div style="font-size:0.8rem;color:var(--text-secondary);">${escapeHtml(coach?.phone || '')}</div>
                  </td>
                  <td>${escapeHtml(cls?.name || 'Không rõ')}</td>
                  <td>${formatTime(att.checkInTime)}</td>
                  <td>${statusMap[att.status] || att.status}</td>
                  <td style="font-weight:600; color:var(--accent-success);">${att.calculatedSalary ? Number(att.calculatedSalary).toLocaleString('vi-VN') + ' đ' : 'Chưa tính'}</td>
                  <td>
                    <div class="flex gap-2">
                      ${att.status === 'checked_in' ? `
                        <button class="btn btn-sm btn-success" data-approve="${att.id}" title="Duyệt">
                          <span class="material-icons-round" style="font-size:18px;">check</span>
                        </button>
                        <button class="btn btn-sm btn-danger" data-reject="${att.id}" title="Từ chối">
                          <span class="material-icons-round" style="font-size:18px;">close</span>
                        </button>
                      ` : `
                        <button class="btn btn-sm btn-ghost" data-delete="${att.id}" title="Xóa">
                          <span class="material-icons-round" style="font-size:18px;">delete</span>
                        </button>
                      `}
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    tableEl.querySelectorAll('[data-approve]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const admin = getCurrentUserData();
        await approveAttendanceV2(btn.dataset.approve, admin.id);
        showToast({ message: 'Đã duyệt', type: 'success' });
        loadAttendanceData();
      });
    });

    tableEl.querySelectorAll('[data-reject]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const admin = getCurrentUserData();
        await rejectAttendanceV2(btn.dataset.reject, admin.id);
        showToast({ message: 'Đã từ chối', type: 'warning' });
        loadAttendanceData();
      });
    });

    tableEl.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const confirmed = await confirmDialog('Xóa điểm danh', 'Bạn có chắc chắn muốn xóa bản ghi này?');
        if (confirmed) {
          await deleteTeacherSalarySession(btn.dataset.delete);
          showToast({ message: 'Đã xóa', type: 'success' });
          loadAttendanceData();
        }
      });
    });

  } catch (err) {
    console.error(err);
    document.getElementById('attendanceTable').innerHTML = `
      <div class="error-text">Lỗi: ${err.message}</div>
    `;
  }
}

async function bulkApprove() {
  try {
    const records = await getTeacherSalarySessionsByDate(currentDate);
    const pending = records.filter(r => r.status === 'checked_in');
    if (pending.length === 0) {
      return showToast({ message: 'Không có bản ghi nào chờ duyệt', type: 'info' });
    }
    
    const admin = getCurrentUserData();
    for (const r of pending) {
      await approveAttendanceV2(r.id, admin.id);
    }
    showToast({ message: `Đã duyệt ${pending.length} bản ghi`, type: 'success' });
    loadAttendanceData();
  } catch (err) {
    showToast({ message: 'Lỗi: ' + err.message, type: 'error' });
  }
}

async function showAdminCheckinForm() {
  let coaches = [];
  let classes = [];
  try {
    [coaches, classes] = await Promise.all([
      getCoaches(),
      getClassesV2()
    ]);
  } catch (e) {
    return showToast({ message: 'Lỗi tải dữ liệu', type: 'error' });
  }

  const content = `
    <div class="form-group">
      <label class="form-label">Chọn HLV</label>
      <select class="form-select" id="acCoach" required>
        <option value="">-- Chọn HLV --</option>
        ${coaches.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Chọn Lớp học</label>
      <select class="form-select" id="acClass" required>
        <option value="">-- Chọn Lớp --</option>
        ${classes.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
      </select>
    </div>
    <p class="form-hint">Admin check-in giùm sẽ được tự động duyệt ngay lập tức và tính lương.</p>
  `;

  showModal({
    title: 'Check-in Giùm HLV',
    content,
    primaryAction: {
      label: 'Check-in',
      handler: async () => {
        const coachId = document.getElementById('acCoach').value;
        const classId = document.getElementById('acClass').value;
        if (!coachId || !classId) {
          return showToast({ message: 'Vui lòng chọn HLV và Lớp học', type: 'warning' });
        }
        
        try {
          const admin = getCurrentUserData();
          await checkInV2({
            coachId,
            classId,
            date: currentDate,
            checkInBy: admin.id
          });
          closeModal();
          showToast({ message: 'Đã check-in thành công', type: 'success' });
          loadAttendanceData();
        } catch(e) {
          showToast({ message: e.message, type: 'error' });
        }
      }
    }
  });
}
