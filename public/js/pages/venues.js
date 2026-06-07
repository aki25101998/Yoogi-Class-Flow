// Venue Management page (Admin) — Venue-Centric Coach Management
import { getVenues, addVenue, updateVenue, deleteVenue, getVenueCoaches, addVenueCoach, updateVenueCoach, removeVenueCoach, getCoaches, getStudentsByVenue, addStudent, getSettings, deleteStudent, updateStudent } from '../db.js';
import { showStudentForm } from './students.js';
import { escapeHtml, formatCurrency, formatDayOfWeek, formatDayShort } from '../utils.js';
import { showModal, closeModal, confirmDialog } from '../components/modal.js';
import { showToast } from '../components/toast.js';

let coachesCache = [];
const expandedVenues = new Set();

export async function renderVenues(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Quản Lý Địa Điểm</h1>
        <p class="page-subtitle">Các chi nhánh, HLV, lịch dạy & mức lương</p>
      </div>
      <button class="btn btn-primary" id="btnAddVenue">
        <span class="material-icons-round">add_location</span>
        Thêm địa điểm
      </button>
    </div>
    <div id="venuesContainer">
      ${Array(3).fill('<div class="skeleton skeleton-card" style="height:140px;"></div>').join('')}
    </div>
  `;

  document.getElementById('btnAddVenue').addEventListener('click', () => showVenueForm());
  
  // Preload coaches for assignment
  try {
    coachesCache = await getCoaches();
  } catch (e) {
    coachesCache = [];
  }
  
  await loadVenues();
}

async function loadVenues() {
  try {
    const venues = await getVenues();
    const container = document.getElementById('venuesContainer');
    if (!container) return;

    if (venues.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1;">
          <span class="material-icons-round empty-state-icon">add_location</span>
          <h3 class="empty-state-title">Chưa có địa điểm nào</h3>
          <p class="empty-state-text">Bấm "Thêm địa điểm" để thêm chi nhánh đầu tiên</p>
        </div>
      `;
      return;
    }

    // Load venue coaches and students for all venues
    const venueDataPromises = venues.map(async venue => {
      const venueCoaches = await getVenueCoaches(venue.id);
      const venueStudents = await getStudentsByVenue(venue.id);
      return { venue, venueCoaches, venueStudents };
    });
    const venueDataList = await Promise.all(venueDataPromises);

    // Build coach lookup
    const coachMap = {};
    coachesCache.forEach(c => { coachMap[c.id] = c; });

    container.innerHTML = venueDataList.map(({ venue, venueCoaches, venueStudents }) => `
      <div class="venue-detail-card card mb-6" data-venue-id="${venue.id}">
        <div class="venue-card-header" data-toggle="${venue.id}">
          <div class="flex items-center gap-3" style="flex:1;">
            <div class="stat-icon purple" style="width:44px;height:44px;">
              <span class="material-icons-round">location_on</span>
            </div>
            <div>
              <div style="font-weight:700;font-size:1.05rem;">${escapeHtml(venue.name)}</div>
              <div style="font-size:0.8rem;color:var(--text-secondary);">${escapeHtml(venue.address || 'Chưa có địa chỉ')}</div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="badge badge-active" style="font-size:0.7rem;">${venueCoaches.length} HLV</span>
            <span class="badge badge-pending" style="font-size:0.7rem;">${venueStudents.length} Học viên</span>
            <button class="btn btn-sm btn-secondary" data-edit-venue="${venue.id}" title="Sửa địa điểm">
              <span class="material-icons-round" style="font-size:1rem;">edit</span>
            </button>
            <button class="btn btn-sm btn-ghost" data-delete-venue="${venue.id}" data-name="${escapeHtml(venue.name)}" title="Xóa địa điểm">
              <span class="material-icons-round" style="font-size:1rem;">delete</span>
            </button>
            <span class="material-icons-round venue-toggle-icon" data-toggle-icon="${venue.id}" style="transition:transform 0.3s;cursor:pointer;${expandedVenues.has(venue.id) ? 'transform:rotate(180deg);' : ''}">expand_more</span>
          </div>
        </div>

        <div class="venue-detail-body" id="venueBody_${venue.id}" style="display:${expandedVenues.has(venue.id) ? 'block' : 'none'};padding-top:var(--sp-4);border-top:1px solid var(--border-color);margin-top:var(--sp-4);">
          <div class="flex items-center justify-between mb-4">
            <h4 style="font-size:0.9rem;color:var(--text-secondary);font-weight:600;">
              <span class="material-icons-round" style="font-size:1rem;vertical-align:middle;">people</span>
              Huấn luyện viên tại ${escapeHtml(venue.name)}
            </h4>
            <button class="btn btn-sm btn-primary" data-add-coach="${venue.id}">
              <span class="material-icons-round" style="font-size:0.9rem;">person_add</span>
              Thêm HLV
            </button>
          </div>

          ${venueCoaches.length === 0 ? `
            <div style="text-align:center;padding:var(--sp-6);color:var(--text-muted);font-size:0.85rem;">
              <span class="material-icons-round" style="font-size:2.5rem;display:block;margin-bottom:var(--sp-2);opacity:0.3;">person_off</span>
              Chưa có HLV nào được gán.<br>Bấm "Thêm HLV" để gán huấn luyện viên.
            </div>
          ` : `
            <div class="venue-coaches-list">
              ${venueCoaches.map(vc => {
                const coach = coachMap[vc.coachId];
                const days = (vc.scheduleDays || []).sort((a,b) => a - b);
                return `
                  <div class="venue-coach-item">
                    <div class="flex items-center gap-3" style="flex:1;min-width:0;">
                      <div class="user-avatar-placeholder" style="width:36px;height:36px;font-size:0.8rem;flex-shrink:0;">
                        ${(coach?.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div style="min-width:0;flex:1;">
                        <div style="font-weight:600;font-size:0.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                          ${escapeHtml(coach?.name || 'HLV không xác định')}
                        </div>
                        <div style="font-size:0.75rem;color:var(--text-secondary);display:flex;flex-wrap:wrap;gap:4px;margin-top:2px;">
                          ${days.map(d => `<span class="day-chip">${formatDayShort(d)}</span>`).join('')}
                          ${days.length > 0 ? `<span style="color:var(--text-muted);">| ${vc.startTime} - ${vc.endTime}</span>` : '<span style="color:var(--text-muted);font-style:italic;">Chưa có lịch</span>'}
                        </div>
                      </div>
                    </div>
                    <div class="flex items-center gap-2" style="flex-shrink:0;">
                      <div style="text-align:right;margin-right:var(--sp-2);">
                        <div style="font-weight:700;font-size:0.85rem;color:var(--accent-success);">${formatCurrency(vc.rate)}</div>
                        <div style="font-size:0.65rem;color:var(--text-muted);">/${vc.rateType === 'per_hour' ? 'giờ' : 'buổi'}</div>
                      </div>
                      <button class="btn btn-sm btn-secondary" data-edit-vc="${vc.id}" data-venue="${venue.id}" title="Sửa">
                        <span class="material-icons-round" style="font-size:0.9rem;">edit</span>
                      </button>
                      <button class="btn btn-sm btn-ghost" data-remove-vc="${vc.id}" data-venue="${venue.id}" data-coach-name="${escapeHtml(coach?.name || '?')}" title="Xóa">
                        <span class="material-icons-round" style="font-size:0.9rem;">person_remove</span>
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}

          <div class="flex items-center justify-between mb-4 mt-6">
            <h4 style="font-size:0.9rem;color:var(--text-secondary);font-weight:600;">
              <span class="material-icons-round" style="font-size:1rem;vertical-align:middle;">school</span>
              Học viên tại ${escapeHtml(venue.name)}
            </h4>
            <button class="btn btn-sm btn-primary" data-add-student="${venue.id}" data-venue-name="${escapeHtml(venue.name)}">
              <span class="material-icons-round" style="font-size:0.9rem;">person_add</span>
              Thêm học viên
            </button>
          </div>

          ${venueStudents.length === 0 ? `
            <div style="text-align:center;padding:var(--sp-6);color:var(--text-muted);font-size:0.85rem;">
              <span class="material-icons-round" style="font-size:2.5rem;display:block;margin-bottom:var(--sp-2);opacity:0.3;">person_off</span>
              Chưa có học viên nào tại địa điểm này.
            </div>
          ` : `
            <div class="venue-coaches-list">
              ${venueStudents.map(student => `
                <div class="venue-coach-item">
                  <div class="flex items-center gap-3" style="flex:1;min-width:0;">
                    <div class="user-avatar-placeholder" style="width:36px;height:36px;font-size:0.8rem;flex-shrink:0;">
                      ${(student.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div style="min-width:0;flex:1;">
                      <div style="font-weight:600;font-size:0.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                        ${escapeHtml(student.name)}
                      </div>
                      <div style="font-size:0.75rem;color:var(--text-secondary);display:flex;flex-wrap:wrap;gap:4px;margin-top:2px;">
                        ${student.beltRank ? `<span class="badge" style="background:var(--bg-secondary); color:var(--text-primary); font-size: 0.7rem; padding: 2px 6px;">${escapeHtml(student.beltRank)}</span>` : ''}
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center gap-2" style="flex-shrink:0;">
                    <button class="btn btn-sm btn-secondary" data-edit-student="${student.id}" data-venue="${venue.id}" title="Sửa thông tin học viên">
                      <span class="material-icons-round" style="font-size:0.9rem;">edit</span>
                    </button>
                    <button class="btn btn-sm btn-secondary" data-transfer-student="${student.id}" data-venue="${venue.id}" title="Chuyển cơ sở">
                      <span class="material-icons-round" style="font-size:0.9rem;">swap_horiz</span>
                    </button>
                    <button class="btn btn-sm btn-ghost" data-remove-student="${student.id}" data-venue="${venue.id}" data-student-name="${escapeHtml(student.name)}" title="Xóa học viên">
                      <span class="material-icons-round" style="font-size:0.9rem;">person_remove</span>
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `).join('');

    // Toggle venue details
    container.querySelectorAll('[data-toggle]').forEach(header => {
      header.addEventListener('click', (e) => {
        // Don't toggle if clicking buttons
        if (e.target.closest('button')) return;
        const venueId = header.dataset.toggle;
        const body = document.getElementById(`venueBody_${venueId}`);
        const icon = document.querySelector(`[data-toggle-icon="${venueId}"]`);
        if (body.style.display === 'none') {
          body.style.display = 'block';
          expandedVenues.add(venueId);
          if (icon) icon.style.transform = 'rotate(180deg)';
        } else {
          body.style.display = 'none';
          expandedVenues.delete(venueId);
          if (icon) icon.style.transform = 'rotate(0deg)';
        }
      });
    });

    // Edit venue handlers
    container.querySelectorAll('[data-edit-venue]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const venue = venues.find(v => v.id === btn.dataset.editVenue);
        if (venue) showVenueForm(venue);
      });
    });

    // Delete venue handlers
    container.querySelectorAll('[data-delete-venue]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const confirmed = await confirmDialog(
          'Xóa địa điểm',
          `Bạn có chắc muốn xóa địa điểm <strong>${btn.dataset.name}</strong>?`
        );
        if (confirmed) {
          await deleteVenue(btn.dataset.deleteVenue);
          showToast({ message: 'Đã xóa địa điểm', type: 'success' });
          await loadVenues();
        }
      });
    });

    // Add coach to venue handlers
    container.querySelectorAll('[data-add-coach]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const venueId = btn.dataset.addCoach;
        const venue = venues.find(v => v.id === venueId);
        const existingCoachIds = venueDataList.find(d => d.venue.id === venueId)?.venueCoaches.map(vc => vc.coachId) || [];
        showVenueCoachForm(venueId, venue?.name, null, existingCoachIds);
      });
    });

    // Edit venue coach handlers
    container.querySelectorAll('[data-edit-vc]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const venueId = btn.dataset.venue;
        const venue = venues.find(v => v.id === venueId);
        const vcId = btn.dataset.editVc;
        const vd = venueDataList.find(d => d.venue.id === venueId);
        const vc = vd?.venueCoaches.find(c => c.id === vcId);
        if (vc) showVenueCoachForm(venueId, venue?.name, vc, []);
      });
    });

    // Remove venue coach handlers
    container.querySelectorAll('[data-remove-vc]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const confirmed = await confirmDialog(
          'Xóa HLV khỏi địa điểm',
          `Bạn có chắc muốn xóa <strong>${btn.dataset.coachName}</strong> khỏi địa điểm này?`
        );
        if (confirmed) {
          const item = btn.closest('.venue-coach-item');
          if (item) item.style.opacity = '0.5';
          await removeVenueCoach(btn.dataset.venue, btn.dataset.removeVc);
          showToast({ message: 'Đã xóa HLV khỏi địa điểm', type: 'success' });
          await loadVenues();
        }
      });
    });

    // Add student handlers
    container.querySelectorAll('[data-add-student]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const venueId = btn.dataset.addStudent;
        showStudentForm(null, venueId, loadVenues);
      });
    });

    // Edit student handlers
    container.querySelectorAll('[data-edit-student]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const studentId = btn.dataset.editStudent;
        const venueId = btn.dataset.venue;
        const vd = venueDataList.find(d => d.venue.id === venueId);
        const student = vd?.venueStudents.find(s => s.id === studentId);
        if (student) showStudentForm(student, venueId, loadVenues);
      });
    });

    // Transfer student handlers
    container.querySelectorAll('[data-transfer-student]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const studentId = btn.dataset.transferStudent;
        const currentVenueId = btn.dataset.venue;
        showTransferStudentForm(studentId, currentVenueId);
      });
    });

    // Remove student handlers
    container.querySelectorAll('[data-remove-student]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const confirmed = await confirmDialog(
          'Xóa học viên',
          `Bạn có chắc muốn xóa học viên <strong>${btn.dataset.studentName}</strong> khỏi cơ sở này?`
        );
        if (confirmed) {
          const item = btn.closest('.venue-coach-item');
          if (item) item.style.opacity = '0.5';
          try {
            await deleteStudent(btn.dataset.removeStudent);
            showToast({ message: 'Đã xóa học viên', type: 'success' });
            await loadVenues();
          } catch (err) {
            showToast({ message: 'Lỗi: ' + err.message, type: 'error' });
            if (item) item.style.opacity = '1';
          }
        }
      });
    });

  } catch (err) {
    showToast({ message: 'Lỗi tải danh sách: ' + err.message, type: 'error' });
  }
}

function showVenueForm(venue = null) {
  const isEdit = !!venue;

  showModal({
    title: isEdit ? 'Sửa địa điểm' : 'Thêm địa điểm mới',
    confirmText: isEdit ? 'Cập nhật' : 'Thêm',
    content: `
      <div class="form-group">
        <label class="form-label">Tên địa điểm *</label>
        <input type="text" class="form-input" id="venueName" value="${escapeHtml(venue?.name || '')}" placeholder="Chi nhánh Quận 1">
      </div>
      <div class="form-group">
        <label class="form-label">Địa chỉ</label>
        <input type="text" class="form-input" id="venueAddress" value="${escapeHtml(venue?.address || '')}" placeholder="123 Nguyễn Huệ, Q.1, TP.HCM">
      </div>
    `,
    onConfirm: async () => {
      const data = {
        name: document.getElementById('venueName').value.trim(),
        address: document.getElementById('venueAddress').value.trim()
      };

      if (!data.name) {
        showToast({ message: 'Vui lòng nhập tên địa điểm', type: 'warning' });
        return;
      }

      const confirmBtn = document.getElementById('modalConfirmBtn');
      const originalText = confirmBtn ? confirmBtn.innerHTML : '';
      if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<span class="material-icons-round" style="animation: spin 1s linear infinite;">refresh</span> Đang lưu...';
      }

      try {
        if (isEdit) {
          await updateVenue(venue.id, data);
          showToast({ message: 'Đã cập nhật địa điểm', type: 'success' });
        } else {
          await addVenue(data);
          showToast({ message: 'Đã thêm địa điểm mới', type: 'success' });
        }
        closeModal();
        await loadVenues();
      } catch (err) {
        showToast({ message: 'Lỗi: ' + err.message, type: 'error' });
      } finally {
        if (confirmBtn) {
          confirmBtn.disabled = false;
          confirmBtn.innerHTML = originalText;
        }
      }
    }
  });
}

function showVenueCoachForm(venueId, venueName, existingVC = null, existingCoachIds = []) {
  const isEdit = !!existingVC;
  const coachMap = {};
  coachesCache.forEach(c => { coachMap[c.id] = c; });

  // Available coaches = active coaches not already assigned (unless editing)
  const availableCoaches = isEdit 
    ? coachesCache 
    : coachesCache.filter(c => !existingCoachIds.includes(c.id));

  if (!isEdit && availableCoaches.length === 0) {
    showToast({ message: 'Tất cả HLV đã được gán vào địa điểm này', type: 'warning' });
    return;
  }

  const coachOptions = availableCoaches.map(c =>
    `<option value="${c.id}" ${existingVC?.coachId === c.id ? 'selected' : ''}>${escapeHtml(c.name)} (${escapeHtml(c.email)})</option>`
  ).join('');

  const selectedDays = existingVC?.scheduleDays || [];

  showModal({
    title: isEdit ? `Sửa HLV tại ${escapeHtml(venueName)}` : `Thêm HLV vào ${escapeHtml(venueName)}`,
    confirmText: isEdit ? 'Cập nhật' : 'Thêm',
    content: `
      <div class="form-group">
        <label class="form-label">Huấn luyện viên *</label>
        ${isEdit ? `
          <input type="text" class="form-input" value="${escapeHtml(coachMap[existingVC.coachId]?.name || '?')}" disabled style="opacity:0.7;">
        ` : `
          <select class="form-select" id="vcCoach">${coachOptions}</select>
        `}
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Loại tính lương</label>
          <select class="form-select" id="vcRateType">
            <option value="per_session" ${existingVC?.rateType !== 'per_hour' ? 'selected' : ''}>Theo buổi</option>
            <option value="per_hour" ${existingVC?.rateType === 'per_hour' ? 'selected' : ''}>Theo giờ</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Mức lương (VNĐ)</label>
          <input type="number" class="form-input" id="vcRate" value="${existingVC?.rate || ''}" placeholder="200000">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Lịch dạy cố định (chọn các ngày)</label>
        <div class="schedule-days-picker" id="vcDays">
          ${[1,2,3,4,5,6,7].map(d => `
            <label class="day-picker-item ${selectedDays.includes(d) ? 'selected' : ''}">
              <input type="checkbox" value="${d}" ${selectedDays.includes(d) ? 'checked' : ''} style="display:none;">
              <span>${formatDayShort(d)}</span>
            </label>
          `).join('')}
        </div>
        <p class="form-hint">Lịch này sẽ mặc định xuyên suốt, không cần chỉnh mỗi tuần</p>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Giờ bắt đầu</label>
          <input type="time" class="form-input" id="vcStart" value="${existingVC?.startTime || '18:00'}">
        </div>
        <div class="form-group">
          <label class="form-label">Giờ kết thúc</label>
          <input type="time" class="form-input" id="vcEnd" value="${existingVC?.endTime || '20:00'}">
        </div>
      </div>
    `,
    onConfirm: async () => {
      const dayCheckboxes = document.querySelectorAll('#vcDays input[type="checkbox"]');
      const scheduleDays = [];
      dayCheckboxes.forEach(cb => { if (cb.checked) scheduleDays.push(Number(cb.value)); });

      const data = {
        rateType: document.getElementById('vcRateType').value,
        rate: Number(document.getElementById('vcRate').value) || 0,
        scheduleDays,
        startTime: document.getElementById('vcStart').value,
        endTime: document.getElementById('vcEnd').value,
      };

      if (!isEdit) {
        data.coachId = document.getElementById('vcCoach').value;
        if (!data.coachId) {
          showToast({ message: 'Vui lòng chọn HLV', type: 'warning' });
          return;
        }
      }

      const confirmBtn = document.getElementById('modalConfirmBtn');
      const originalText = confirmBtn ? confirmBtn.innerHTML : '';
      if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<span class="material-icons-round" style="animation: spin 1s linear infinite;">refresh</span> Đang lưu...';
      }

      try {
        if (isEdit) {
          await updateVenueCoach(venueId, existingVC.id, data);
          showToast({ message: 'Đã cập nhật thông tin HLV', type: 'success' });
        } else {
          await addVenueCoach(venueId, data);
          showToast({ message: 'Đã thêm HLV vào địa điểm', type: 'success' });
        }
        closeModal();
        await loadVenues();
      } catch (err) {
        showToast({ message: 'Lỗi: ' + err.message, type: 'error' });
      } finally {
        if (confirmBtn) {
          confirmBtn.disabled = false;
          confirmBtn.innerHTML = originalText;
        }
      }
    }
  });

  // Day picker toggle
  setTimeout(() => {
    document.querySelectorAll('.day-picker-item').forEach(item => {
      item.addEventListener('click', () => {
        const cb = item.querySelector('input');
        cb.checked = !cb.checked;
        item.classList.toggle('selected', cb.checked);
      });
    });
  }, 50);
}

async function showTransferStudentForm(studentId, currentVenueId) {
  const venues = await getVenues();
  const otherVenues = venues.filter(v => v.id !== currentVenueId);
  
  if (otherVenues.length === 0) {
    showToast({ message: 'Không có cơ sở nào khác để chuyển', type: 'warning' });
    return;
  }
  
  const options = otherVenues.map(v => `<option value="${v.id}">${escapeHtml(v.name)}</option>`).join('');
  
  showModal({
    title: 'Chuyển cơ sở',
    confirmText: 'Chuyển',
    content: `
      <div class="form-group">
        <label class="form-label">Chọn cơ sở mới</label>
        <select class="form-select" id="transferVenueId">
          ${options}
        </select>
      </div>
    `,
    onConfirm: async () => {
      const newVenueId = document.getElementById('transferVenueId').value;
      const confirmBtn = document.getElementById('modalConfirmBtn');
      const originalText = confirmBtn ? confirmBtn.innerHTML : '';
      if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<span class="material-icons-round" style="animation: spin 1s linear infinite;">refresh</span> Đang chuyển...';
      }
      
      try {
        await updateStudent(studentId, { venueId: newVenueId });
        showToast({ message: 'Đã chuyển cơ sở thành công', type: 'success' });
        closeModal();
        await loadVenues();
      } catch (err) {
        showToast({ message: 'Lỗi: ' + err.message, type: 'error' });
      } finally {
        if (confirmBtn) {
          confirmBtn.disabled = false;
          confirmBtn.innerHTML = originalText;
        }
      }
    }
  });
}

