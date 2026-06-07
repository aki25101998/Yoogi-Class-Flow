// Attendance Review page (Admin)
import { getAttendanceByDate, getCoaches, getVenues, getSchedulesFromVenueCoaches, approveAttendance, rejectAttendance, deleteAttendanceRecord, checkIn } from '../db.js';
import { getTodayStr, formatDate, formatTime, formatCurrency, escapeHtml, getDayOfWeek } from '../utils.js';
import { getCurrentUserData } from '../auth.js';
import { showModal, closeModal, confirmDialog } from '../components/modal.js';
import { showToast } from '../components/toast.js';

let currentDate = getTodayStr();

export async function renderAttendance(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Duyệt Điểm Danh</h1>
        <p class="page-subtitle">Quản lý chấm công hàng ngày</p>
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
    const [attendance, coaches, venues] = await Promise.all([
      getAttendanceByDate(currentDate),
      getCoaches(),
      getVenues()
    ]);

    const coachMap = {};
    coaches.forEach(c => { coachMap[c.id] = c; });
    const venueMap = {};
    venues.forEach(v => { venueMap[v.id] = v; });
    const records = await getAttendanceByDate(currentDate);
    const tableEl = document.getElementById('attendanceTable');
    if (!tableEl) return;
    
    if (records.length === 0) {
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
              <th>Địa điểm</th>
              <th>Check-in</th>
              <th>Trạng thái</th>
              <th>Lương</th>
              <th>Ghi chú</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            ${attendance.map(att => {
              const coach = coachMap[att.coachId];
              const venue = venueMap[att.venueId];
              const statusMap = {
                'checked_in': ['badge-pending', 'Chờ duyệt'],
                'approved': ['badge-approved', 'Đã duyệt'],
                'rejected': ['badge-rejected', 'Từ chối'],
                'absent': ['badge-absent', 'Vắng']
              };
              const [badgeClass, badgeText] = statusMap[att.status] || ['badge-absent', att.status];
              
              let actionsHtml = '';
              if (att.status === 'checked_in') {
                actionsHtml = `
                  <button class="btn btn-sm btn-success" data-approve="${att.id}" title="Duyệt">
                    <span class="material-icons-round">check</span>
                  </button>
                  <button class="btn btn-sm btn-danger" data-reject="${att.id}" title="Từ chối">
                    <span class="material-icons-round">close</span>
                  </button>
                `;
              } else {
                actionsHtml = `
                  <button class="btn btn-sm btn-ghost" data-delete-att="${att.id}" title="Xóa">
                    <span class="material-icons-round">delete</span>
                  </button>
                `;
              }

              return `
                <tr>
                  <td><strong>${escapeHtml(coach?.name || '?')}</strong>${att.isSubstitution ? '<br><span style="font-size:0.7rem;color:var(--accent-warning);">Dạy thế</span>' : ''}</td>
                  <td>${escapeHtml(venue?.name || '?')}</td>
                  <td>${formatTime(att.checkInTime)}</td>
                  <td><span class="badge ${badgeClass}">${badgeText}</span></td>
                  <td style="font-weight:600;">${att.earnings ? formatCurrency(att.earnings) : '—'}</td>
                  <td style="font-size:0.8rem;color:var(--text-secondary);">${escapeHtml(att.note || '')}</td>
                  <td class="table-actions">${actionsHtml}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Approve handlers
    tableEl.querySelectorAll('[data-approve]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const admin = getCurrentUserData();
        btn.disabled = true;
        try {
          await approveAttendance(btn.dataset.approve, admin.id);
          showToast({ message: 'Đã duyệt!', type: 'success' });
          await loadAttendanceData();
        } catch (err) {
          showToast({ message: 'Lỗi: ' + err.message, type: 'error' });
          btn.disabled = false;
        }
      });
    });

    // Reject handlers
    tableEl.querySelectorAll('[data-reject]').forEach(btn => {
      btn.addEventListener('click', async () => {
        showModal({
          title: 'Từ chối điểm danh',
          content: `
            <div class="form-group">
              <label class="form-label">Lý do từ chối</label>
              <textarea class="form-textarea" id="rejectReason" placeholder="Nhập lý do..."></textarea>
            </div>
          `,
          confirmText: 'Từ chối',
          confirmClass: 'btn-danger',
          onConfirm: async () => {
            const reason = document.getElementById('rejectReason').value.trim();
            const admin = getCurrentUserData();
            try {
              await rejectAttendance(btn.dataset.reject, admin.id, reason);
              showToast({ message: 'Đã từ chối', type: 'info' });
              closeModal();
              await loadAttendanceData();
            } catch (err) {
              showToast({ message: 'Lỗi: ' + err.message, type: 'error' });
            }
          }
        });
      });
    });

    // Delete handlers
    tableEl.querySelectorAll('[data-delete-att]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const confirmed = await confirmDialog('Xóa bản ghi', 'Bạn có chắc muốn xóa bản ghi điểm danh này?');
        if (confirmed) {
          await deleteAttendanceRecord(btn.dataset.deleteAtt);
          showToast({ message: 'Đã xóa', type: 'success' });
          await loadAttendanceData();
        }
      });
    });

  } catch (err) {
    showToast({ message: 'Lỗi: ' + err.message, type: 'error' });
  }
}

async function bulkApprove() {
  try {
    const attendance = await getAttendanceByDate(currentDate);
    const pending = attendance.filter(a => a.status === 'checked_in');
    if (pending.length === 0) {
      showToast({ message: 'Không có bản ghi nào chờ duyệt', type: 'info' });
      return;
    }
    const admin = getCurrentUserData();
    for (const att of pending) {
      await approveAttendance(att.id, admin.id);
    }
    showToast({ message: `Đã duyệt ${pending.length} bản ghi!`, type: 'success' });
    await loadAttendanceData();
  } catch (err) {
    showToast({ message: 'Lỗi: ' + err.message, type: 'error' });
  }
}

async function showAdminCheckinForm() {
  const [coaches, venues, schedules] = await Promise.all([
    getCoaches(),
    getVenues(),
    getSchedulesFromVenueCoaches({ dayOfWeek: getDayOfWeek(currentDate) })
  ]);

  const coachOptions = coaches.map(c => 
    `<option value="${c.id}">${escapeHtml(c.name)}</option>`
  ).join('');

  const venueOptions = venues.map(v => 
    `<option value="${v.id}">${escapeHtml(v.name)}</option>`
  ).join('');

  showModal({
    title: 'Check-in giùm HLV',
    confirmText: 'Check-in & Duyệt',
    confirmClass: 'btn-success',
    content: `
      <div class="form-group">
        <label class="form-label">Huấn luyện viên *</label>
        <select class="form-select" id="ciCoach">${coachOptions}</select>
      </div>
      <div class="form-group">
        <label class="form-label">Địa điểm *</label>
        <select class="form-select" id="ciVenue">${venueOptions}</select>
      </div>
      <div class="form-group">
        <label class="form-label">Ca dạy</label>
        <select class="form-select" id="ciSchedule">
          <option value="">-- Chọn ca (tùy chọn) --</option>
          ${schedules.map(s => {
            const coach = coaches.find(c => c.id === s.coachId);
            const venue = venues.find(v => v.id === s.venueId);
            return `<option value="${s.id}" data-coach="${s.coachId}" data-venue="${s.venueId}" data-venue-coach="${s.venueCoachId}">${escapeHtml(coach?.name || '?')} - ${escapeHtml(venue?.name || '?')} (${s.startTime}-${s.endTime})</option>`;
          }).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Ghi chú</label>
        <textarea class="form-textarea" id="ciNote" placeholder="VD: Dạy thế HLV B"></textarea>
      </div>
    `,
    onConfirm: async () => {
      const coachId = document.getElementById('ciCoach').value;
      const venueId = document.getElementById('ciVenue').value;
      const schedSelect = document.getElementById('ciSchedule');
      const scheduleId = schedSelect.value;
      let venueCoachId = '';
      if (schedSelect.selectedIndex > 0) {
        venueCoachId = schedSelect.options[schedSelect.selectedIndex].dataset.venueCoach || '';
      }
      const note = document.getElementById('ciNote').value.trim();
      const admin = getCurrentUserData();

      if (!coachId || !venueId) {
        showToast({ message: 'Vui lòng chọn HLV và địa điểm', type: 'warning' });
        return;
      }

      try {
        await checkIn({
          coachId,
          venueCoachId,
          scheduleId: scheduleId || '',
          venueId,
          date: currentDate,
          checkInBy: admin.id,
          note
        });
        showToast({ message: 'Đã check-in và duyệt thành công!', type: 'success' });
        closeModal();
        await loadAttendanceData();
      } catch (err) {
        showToast({ message: 'Lỗi: ' + err.message, type: 'error' });
      }
    }
  });

  // Auto-fill when selecting a schedule
  setTimeout(() => {
    const schedSelect = document.getElementById('ciSchedule');
    if (schedSelect) {
      schedSelect.addEventListener('change', () => {
        const selected = schedSelect.options[schedSelect.selectedIndex];
        if (selected.dataset.coach) {
          document.getElementById('ciCoach').value = selected.dataset.coach;
        }
        if (selected.dataset.venue) {
          document.getElementById('ciVenue').value = selected.dataset.venue;
        }
      });
    }
  }, 100);
}
