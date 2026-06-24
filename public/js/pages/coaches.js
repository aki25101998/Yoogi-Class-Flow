// Coach Management page (Admin)
import { getCoaches, getAllCoaches, addCoach, updateCoach, deleteCoach, getSettings, getTeacherSalary, addTeacherSalary, updateTeacherSalary } from '../db.js';
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
      <div style="display: flex; gap: 8px;">
        <input type="text" id="coachSearchInput" class="form-input" placeholder="Tìm kiếm HLV..." style="min-width: 200px;">
        <button class="btn btn-primary" id="btnAddCoach">
          <span class="material-icons-round">person_add</span>
          Thêm
        </button>
      </div>
    </div>
    <div class="coaches-grid" id="coachesGrid">
      ${Array(3).fill('<div class="skeleton skeleton-card" style="height:200px;"></div>').join('')}
    </div>
  `;

  document.getElementById('btnAddCoach').addEventListener('click', () => showCoachForm());
  
  const searchInput = document.getElementById('coachSearchInput');
  searchInput.addEventListener('input', (e) => filterCoaches(e.target.value.toLowerCase()));
  
  await loadCoaches();
}

let allCoachesData = [];
let beltRanks = [];

function filterCoaches(query) {
  const cards = document.querySelectorAll('.coach-card');
  cards.forEach(card => {
    const text = card.textContent.toLowerCase();
    if (text.includes(query)) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
}

async function loadCoaches() {
  try {
    const [coaches, settings] = await Promise.all([
      getAllCoaches(),
      getSettings()
    ]);
    allCoachesData = coaches;
    beltRanks = settings?.beltRanks || ["Đai trắng", "Đai vàng", "Đai xanh", "Đai đỏ", "Đai đen", "Đai đen 1 đẳng", "Đai đen 2 đẳng", "Đai đen 3 đẳng"];
    const grid = document.getElementById('coachesGrid');
    if (!grid) return;
    
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
          <div class="coach-card-detail">
            <span class="label">Trình độ</span>
            <span class="value">${escapeHtml(coach.level || '—')}</span>
          </div>
        </div>
        <div class="coach-card-actions">
          <button class="btn btn-sm btn-secondary" data-edit="${coach.id}" style="flex:1;" title="Sửa">
            <span class="material-icons-round">edit</span>
          </button>
          <button class="btn btn-sm btn-outline" data-salary="${coach.id}" style="flex:1;" title="Cấu hình lương">
            <span class="material-icons-round">payments</span>
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

    grid.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        const coach = coaches.find(c => c.id === btn.dataset.edit);
        if (coach) showCoachForm(coach);
      });
    });

    // Salary config handlers
    grid.querySelectorAll('[data-salary]').forEach(btn => {
      btn.addEventListener('click', () => {
        const coach = coaches.find(c => c.id === btn.dataset.salary);
        if (coach) showSalaryForm(coach);
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

    // Re-apply filter if exists
    const searchInput = document.getElementById('coachSearchInput');
    if (searchInput && searchInput.value) {
      filterCoaches(searchInput.value.toLowerCase());
    }
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
        <label class="form-label">CCCD</label>
        <input type="text" class="form-input" id="coachCccd" value="${escapeHtml(coach?.cccd || '')}" placeholder="Số CCCD">
      </div>
      <div class="form-group">
        <label class="form-label">Trình độ</label>
        <select class="form-select" id="coachLevel">
          <option value="">Chọn trình độ</option>
          ${beltRanks.map(belt => `<option value="${escapeHtml(belt)}" ${coach?.level === belt ? 'selected' : ''}>${escapeHtml(belt)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Mã số hội viên</label>
        <input type="text" class="form-input" id="coachMembershipNumber" value="${escapeHtml(coach?.membershipNumber || '')}" placeholder="Mã số hội viên">
      </div>
      <div class="form-group">
        <label class="form-label">Vai trò</label>
        <select class="form-select" id="coachRole" onchange="document.getElementById('permissionsBlock').style.display = this.value === 'admin' ? 'none' : 'block'">
          <option value="coach" ${coach?.role === 'coach' || !coach ? 'selected' : ''}>Huấn luyện viên</option>
          <option value="admin" ${coach?.role === 'admin' ? 'selected' : ''}>Quản trị viên</option>
        </select>
      </div>
      <div class="form-group" id="permissionsBlock" style="display: ${coach?.role === 'admin' ? 'none' : 'block'}; background: var(--bg-page); padding: 12px; border-radius: 8px;">
        <label class="form-label" style="margin-bottom: 8px;">Phân quyền nâng cao</label>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <label style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" id="perm_manage_students" ${coach?.permissions?.manage_students ? 'checked' : ''}> Quản lý học viên
          </label>
          <label style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" id="perm_manage_venues" ${coach?.permissions?.manage_venues ? 'checked' : ''}> Quản lý địa điểm
          </label>
          <label style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" id="perm_manage_schedule" ${coach?.permissions?.manage_schedule ? 'checked' : ''}> Quản lý lịch dạy
          </label>
          <label style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" id="perm_manage_attendance" ${coach?.permissions?.manage_attendance ? 'checked' : ''}> Quản lý điểm danh
          </label>
          <label style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" id="perm_view_payroll" ${coach?.permissions?.view_payroll ? 'checked' : ''}> Xem bảng lương tổng
          </label>
        </div>
      </div>
    `,
    onConfirm: async () => {
      const data = {
        name: document.getElementById('coachName').value.trim(),
        email: document.getElementById('coachEmail').value.trim(),
        phone: document.getElementById('coachPhone').value.trim(),
        cccd: document.getElementById('coachCccd').value.trim(),
        level: document.getElementById('coachLevel').value,
        membershipNumber: document.getElementById('coachMembershipNumber').value.trim(),
        role: document.getElementById('coachRole').value,
        permissions: {
          manage_students: document.getElementById('perm_manage_students').checked,
          manage_venues: document.getElementById('perm_manage_venues').checked,
          manage_schedule: document.getElementById('perm_manage_schedule').checked,
          manage_attendance: document.getElementById('perm_manage_attendance').checked,
          view_payroll: document.getElementById('perm_view_payroll').checked
        }
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

// Salary Form
async function showSalaryForm(coach) {
  let salaryData = null;
  try {
    salaryData = await getTeacherSalary(coach.id);
  } catch(e) {
    console.error(e);
  }

  const baseSalary = salaryData?.baseSalary || 0;
  const perSession = salaryData?.perSession || 0;
  const perStudent = salaryData?.perStudent || 0;

  const content = `
    <div style="margin-bottom:var(--sp-4);">
      <p style="font-size:0.9rem; color:var(--text-secondary);">Thiết lập các mức lương cho HLV <strong>${escapeHtml(coach.name)}</strong>. Hệ thống sẽ tự động tính toán mỗi khi điểm danh.</p>
    </div>
    <div class="form-group">
      <label class="form-label">Lương cứng (VND/Tháng)</label>
      <input type="number" id="salBase" class="form-input" value="${baseSalary}" min="0" placeholder="VD: 5000000">
      <p class="form-hint">Khoản tiền cố định nhận hàng tháng bất kể số ca dạy.</p>
    </div>
    <div class="form-group">
      <label class="form-label">Lương theo ca (VND/Ca)</label>
      <input type="number" id="salSession" class="form-input" value="${perSession}" min="0" placeholder="VD: 200000">
      <p class="form-hint">Khoản tiền nhận được cho mỗi ca dạy.</p>
    </div>
    <div class="form-group">
      <label class="form-label">Lương theo học viên (VND/Học viên/Ca)</label>
      <input type="number" id="salStudent" class="form-input" value="${perStudent}" min="0" placeholder="VD: 10000">
      <p class="form-hint">Khoản tiền cộng thêm dựa trên sĩ số học viên thực tế đi học của ca đó.</p>
    </div>
  `;

  showModal({
    title: 'Cấu Hình Lương HLV',
    content,
    primaryAction: {
      label: 'Lưu cấu hình',
      handler: async () => {
        const data = {
          coachId: coach.id,
          baseSalary: Number(document.getElementById('salBase').value),
          perSession: Number(document.getElementById('salSession').value),
          perStudent: Number(document.getElementById('salStudent').value)
        };

        try {
          if (salaryData?.id) {
            await updateTeacherSalary(salaryData.id, data);
          } else {
            await addTeacherSalary(data);
          }
          closeModal();
          showToast({ message: 'Lưu cấu hình lương thành công', type: 'success' });
        } catch(e) {
          showToast({ message: e.message, type: 'error' });
        }
      }
    }
  });
}
