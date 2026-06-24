// Student Management page (Admin) - V2
import { getAllStudents, getVenues, addStudent, updateStudent, deleteStudent, getSettings, getClassesV2, addClassStudent } from '../db.js';
import { escapeHtml } from '../utils.js';
import { showModal, closeModal, confirmDialog } from '../components/modal.js';
import { showToast } from '../components/toast.js';

let allStudents = [];
let allVenues = [];
let beltRanks = [];
let allClasses = [];

export async function renderStudents(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Quản Lý Học Viên</h1>
        <p class="page-subtitle">Thêm, sửa, quản lý hồ sơ học viên</p>
      </div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end;">
        <input type="text" id="studentSearchInput" class="form-input" placeholder="Tìm kiếm học viên..." style="min-width: 150px; flex: 1;">
        <button class="btn btn-primary" id="btnAddStudent" style="flex-shrink: 0; white-space: nowrap;">
          <span class="material-icons-round">person_add</span>
          Thêm học viên
        </button>
      </div>
    </div>
    <div class="coaches-grid" id="studentsGrid">
      ${Array(3).fill('<div class="skeleton skeleton-card" style="height:200px;"></div>').join('')}
    </div>
  `;

  document.getElementById('btnAddStudent').addEventListener('click', () => showStudentForm());
  
  const searchInput = document.getElementById('studentSearchInput');
  searchInput.addEventListener('input', applyFilters);
  
  await loadData();
}

async function loadData() {
  try {
    const [students, venues, settings, classes] = await Promise.all([
      getAllStudents(),
      getVenues(),
      getSettings(),
      getClassesV2()
    ]);
    allStudents = students;
    allVenues = venues;
    allClasses = classes;
    beltRanks = settings?.beltRanks || ["Đai trắng", "Đai vàng", "Đai xanh", "Đai đỏ", "Đai đen"];
    
    renderStudentsGrid();
  } catch (err) {
    showToast({ message: 'Lỗi tải dữ liệu: ' + err.message, type: 'error' });
  }
}

function applyFilters() {
  const query = (document.getElementById('studentSearchInput')?.value || '').toLowerCase();
  
  const cards = document.querySelectorAll('.student-card');
  cards.forEach(card => {
    const text = card.textContent.toLowerCase();
    if (text.includes(query)) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
}

function renderStudentsGrid() {
  const grid = document.getElementById('studentsGrid');
  if (!grid) return;
  
  if (allStudents.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1;">
        <span class="material-icons-round empty-state-icon">group_add</span>
        <h3 class="empty-state-title">Chưa có học viên nào</h3>
        <p class="empty-state-text">Bấm "Thêm học viên" để bắt đầu</p>
      </div>
    `;
    return;
  }

  const venueMap = {};
  allVenues.forEach(v => venueMap[v.id] = v.name);

  grid.innerHTML = allStudents.map(student => `
    <div class="coach-card student-card ${student.status === 'inactive' ? 'opacity-50' : ''}">
      <div class="coach-card-header">
        <div class="user-avatar-placeholder" style="background: var(--primary-color)">${(student.name || 'U').charAt(0).toUpperCase()}</div>
        <div class="coach-card-info">
          <div class="coach-card-name">${escapeHtml(student.name)}</div>
          <div class="coach-card-email">${escapeHtml(student.beltRank || 'Chưa xếp đai')}</div>
        </div>
        <span class="badge ${student.status === 'active' ? 'badge-active' : 'badge-inactive'}">
          ${student.status === 'active' ? 'Hoạt động' : 'Ngưng'}
        </span>
      </div>
      <div class="coach-card-details">
        <div class="coach-card-detail">
          <span class="label">Ngày sinh</span>
          <span class="value">${escapeHtml(student.dob || '—')}</span>
        </div>
        <div class="coach-card-detail">
          <span class="label">Chiều cao/Cân nặng</span>
          <span class="value">${student.height ? student.height + 'cm' : '—'} / ${student.weight ? student.weight + 'kg' : '—'}</span>
        </div>
        <div class="coach-card-detail" style="grid-column: 1/-1; padding-top: 8px; border-top: 1px dashed var(--border-color); margin-top: 4px;">
          <span class="label"><span class="material-icons-round" style="font-size:12px;vertical-align:middle;">phone</span> SĐT Phụ huynh</span>
          <span class="value" style="color:var(--primary-color);font-weight:600;">${escapeHtml(student.parentPhone || '—')}</span>
        </div>
      </div>
      <div class="coach-card-actions">
        <button class="btn btn-sm btn-secondary" data-edit="${student.id}" style="flex:1;">
          <span class="material-icons-round">edit</span> Sửa
        </button>
        ${student.status === 'active' ? `
          <button class="btn btn-sm btn-ghost" data-delete="${student.id}" style="flex:1;">
            <span class="material-icons-round">person_off</span> Nghỉ học
          </button>
        ` : `
          <button class="btn btn-sm btn-success" data-activate="${student.id}" style="flex:1;">
            <span class="material-icons-round">person</span> Đi học lại
          </button>
        `}
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => {
      const student = allStudents.find(s => s.id === btn.dataset.edit);
      if (student) showStudentForm(student);
    });
  });

  grid.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const student = allStudents.find(s => s.id === btn.dataset.delete);
      const confirmed = await confirmDialog(
        'Cho học viên nghỉ',
        `Bạn có chắc muốn cho học viên <strong>${escapeHtml(student?.name)}</strong> chuyển sang trạng thái nghỉ học?`
      );
      if (confirmed) {
        await deleteStudent(btn.dataset.delete);
        showToast({ message: 'Đã cập nhật trạng thái học viên', type: 'success' });
        await loadData();
      }
    });
  });

  grid.querySelectorAll('[data-activate]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await updateStudent(btn.dataset.activate, { status: 'active' });
      showToast({ message: 'Đã kích hoạt lại học viên', type: 'success' });
      await loadData();
    });
  });
}

export async function showStudentForm(student = null, onSuccess = null) {
  const isEdit = !!student;
  
  showModal({
    title: isEdit ? 'Sửa thông tin học viên' : 'Thêm hồ sơ học viên',
    confirmText: isEdit ? 'Cập nhật' : 'Thêm',
    content: `
      <div class="form-group">
        <label class="form-label">Họ và tên *</label>
        <input type="text" class="form-input" id="studentName" value="${escapeHtml(student?.name || '')}" placeholder="Nguyễn Văn A" required>
      </div>
      <div class="form-group">
        <label class="form-label">SĐT Phụ huynh</label>
        <input type="tel" class="form-input" id="studentParentPhone" value="${escapeHtml(student?.parentPhone || '')}" placeholder="09xxxx...">
      </div>
      <div class="form-group">
        <label class="form-label">Ngày sinh</label>
        <input type="date" class="form-input" id="studentDob" value="${escapeHtml(student?.dob || '')}">
      </div>
      <div class="form-group">
        <label class="form-label">Cấp đai</label>
        <select class="form-select" id="studentBelt">
          <option value="">Chọn cấp đai</option>
          ${beltRanks.map(belt => `<option value="${escapeHtml(belt)}" ${student?.beltRank === belt ? 'selected' : ''}>${escapeHtml(belt)}</option>`).join('')}
        </select>
      </div>
      <div style="display: flex; gap: 16px;">
        <div class="form-group" style="flex: 1;">
          <label class="form-label">Chiều cao (cm)</label>
          <input type="number" class="form-input" id="studentHeight" value="${student?.height || ''}" placeholder="150">
        </div>
        <div class="form-group" style="flex: 1;">
          <label class="form-label">Cân nặng (kg)</label>
          <input type="number" class="form-input" id="studentWeight" value="${student?.weight || ''}" placeholder="45">
        </div>
      </div>
      ${!isEdit ? `
        <hr style="margin:var(--sp-4) 0;">
        <div class="form-group">
          <label class="form-label">Ghi danh vào lớp (Tùy chọn)</label>
          <select class="form-select" id="studentClass">
            <option value="">-- Không chọn --</option>
            ${allClasses.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
          </select>
        </div>
      ` : ''}
    `,
    onConfirm: async () => {
      const data = {
        name: document.getElementById('studentName').value.trim(),
        dob: document.getElementById('studentDob').value,
        beltRank: document.getElementById('studentBelt').value,
        height: document.getElementById('studentHeight').value,
        weight: document.getElementById('studentWeight').value,
        parentPhone: document.getElementById('studentParentPhone').value.trim()
      };

      if (!data.name) {
        showToast({ message: 'Vui lòng nhập họ tên học viên', type: 'warning' });
        return;
      }

      try {
        if (isEdit) {
          await updateStudent(student.id, data);
          showToast({ message: 'Đã cập nhật thông tin học viên', type: 'success' });
        } else {
          const studentId = await addStudent(data);
          // If class selected
          const selectedClass = document.getElementById('studentClass').value;
          if (selectedClass) {
            await addClassStudent({ classId: selectedClass, studentId });
            showToast({ message: 'Đã thêm học viên và ghi danh vào lớp', type: 'success' });
          } else {
            showToast({ message: 'Đã thêm học viên mới', type: 'success' });
          }
        }
        closeModal();
        if (onSuccess) {
          await onSuccess();
        } else {
          await loadData();
        }
      } catch (err) {
        showToast({ message: 'Lỗi: ' + err.message, type: 'error' });
      }
    }
  });
}


