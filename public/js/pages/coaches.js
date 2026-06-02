// Coach Management page (Admin)
import { getCoaches, getAllCoaches, addCoach, updateCoach, deleteCoach } from '../db.js';
import { escapeHtml } from '../utils.js';
import { showModal, closeModal, confirmDialog } from '../components/modal.js';
import { showToast } from '../components/toast.js';

export async function renderCoaches(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Quản Lý HLV</h1>
        <p class="page-subtitle">Thêm, sửa, quản lý huấn luyện viên</p>
      </div>
      <button class="btn btn-primary" id="btnAddCoach">
        <span class="material-icons-round">person_add</span>
        Thêm HLV
      </button>
    </div>
    <div class="coaches-grid" id="coachesGrid">
      ${Array(3).fill('<div class="skeleton skeleton-card" style="height:200px;"></div>').join('')}
    </div>
  `;

  document.getElementById('btnAddCoach').addEventListener('click', () => showCoachForm());
  await loadCoaches();
}

async function loadCoaches() {
  try {
    const coaches = await getAllCoaches();
    const grid = document.getElementById('coachesGrid');
    
    if (coaches.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1;">
          <span class="material-icons-round empty-state-icon">group_add</span>
          <h3 class="empty-state-title">Chưa có HLV nào</h3>
          <p class="empty-state-text">Bấm "Thêm HLV" để thêm huấn luyện viên đầu tiên</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = coaches.map(coach => `
      <div class="coach-card ${coach.status === 'inactive' ? 'opacity-50' : ''}">
        <div class="coach-card-header">
          <div class="user-avatar-placeholder">${(coach.name || 'U').charAt(0).toUpperCase()}</div>
          <div class="coach-card-info">
            <div class="coach-card-name">${escapeHtml(coach.name)}</div>
            <div class="coach-card-email">${escapeHtml(coach.email)}</div>
          </div>
          <span class="badge ${coach.status === 'active' ? 'badge-active' : 'badge-inactive'}">
            ${coach.status === 'active' ? 'Hoạt động' : 'Ngưng'}
          </span>
        </div>
        <div class="coach-card-details">
          <div class="coach-card-detail">
            <span class="label">Vai trò</span>
            <span class="value">${coach.role === 'admin' ? '👑 Admin' : '🏋️ HLV'}</span>
          </div>
          <div class="coach-card-detail">
            <span class="label">SĐT</span>
            <span class="value">${escapeHtml(coach.phone || '—')}</span>
          </div>
        </div>
        <div class="coach-card-actions">
          <button class="btn btn-sm btn-secondary" data-edit="${coach.id}" style="flex:1;">
            <span class="material-icons-round">edit</span> Sửa
          </button>
          ${coach.status === 'active' ? `
            <button class="btn btn-sm btn-ghost" data-delete="${coach.id}" style="flex:1;">
              <span class="material-icons-round">person_off</span> Ngưng
            </button>
          ` : `
            <button class="btn btn-sm btn-success" data-activate="${coach.id}" style="flex:1;">
              <span class="material-icons-round">person</span> Kích hoạt
            </button>
          `}
        </div>
      </div>
    `).join('');

    // Edit handlers
    grid.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        const coach = coaches.find(c => c.id === btn.dataset.edit);
        if (coach) showCoachForm(coach);
      });
    });

    // Delete handlers
    grid.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const coach = coaches.find(c => c.id === btn.dataset.delete);
        const confirmed = await confirmDialog(
          'Ngưng hoạt động HLV',
          `Bạn có chắc muốn ngưng hoạt động HLV <strong>${escapeHtml(coach?.name)}</strong>?`
        );
        if (confirmed) {
          await deleteCoach(btn.dataset.delete);
          showToast({ message: 'Đã ngưng hoạt động HLV', type: 'success' });
          await loadCoaches();
        }
      });
    });

    // Activate handlers
    grid.querySelectorAll('[data-activate]').forEach(btn => {
      btn.addEventListener('click', async () => {
        await updateCoach(btn.dataset.activate, { status: 'active' });
        showToast({ message: 'Đã kích hoạt lại HLV', type: 'success' });
        await loadCoaches();
      });
    });
  } catch (err) {
    showToast({ message: 'Lỗi tải danh sách HLV: ' + err.message, type: 'error' });
  }
}

function showCoachForm(coach = null) {
  const isEdit = !!coach;
  
  showModal({
    title: isEdit ? 'Sửa thông tin HLV' : 'Thêm HLV mới',
    confirmText: isEdit ? 'Cập nhật' : 'Thêm',
    content: `
      <div class="form-group">
        <label class="form-label">Họ và tên *</label>
        <input type="text" class="form-input" id="coachName" value="${escapeHtml(coach?.name || '')}" placeholder="Nguyễn Văn A" required>
      </div>
      <div class="form-group">
        <label class="form-label">Email Google *</label>
        <input type="email" class="form-input" id="coachEmail" value="${escapeHtml(coach?.email || '')}" placeholder="example@gmail.com" ${isEdit ? '' : ''}>
        <p class="form-hint">Email Google mà HLV sẽ dùng để đăng nhập</p>
      </div>
      <div class="form-group">
        <label class="form-label">Số điện thoại</label>
        <input type="tel" class="form-input" id="coachPhone" value="${escapeHtml(coach?.phone || '')}" placeholder="0901234567">
      </div>
      <div class="form-group">
        <label class="form-label">Vai trò</label>
        <select class="form-select" id="coachRole">
          <option value="coach" ${coach?.role === 'coach' || !coach ? 'selected' : ''}>Huấn luyện viên</option>
          <option value="admin" ${coach?.role === 'admin' ? 'selected' : ''}>Quản trị viên</option>
        </select>
      </div>
    `,
    onConfirm: async () => {
      const data = {
        name: document.getElementById('coachName').value.trim(),
        email: document.getElementById('coachEmail').value.trim(),
        phone: document.getElementById('coachPhone').value.trim(),
        role: document.getElementById('coachRole').value
      };

      if (!data.name || !data.email) {
        showToast({ message: 'Vui lòng nhập họ tên và email', type: 'warning' });
        return;
      }

      try {
        if (isEdit) {
          await updateCoach(coach.id, data);
          showToast({ message: 'Đã cập nhật thông tin HLV', type: 'success' });
        } else {
          await addCoach(data);
          showToast({ message: 'Đã thêm HLV mới', type: 'success' });
        }
        closeModal();
        await loadCoaches();
      } catch (err) {
        showToast({ message: 'Lỗi: ' + err.message, type: 'error' });
      }
    }
  });
}
