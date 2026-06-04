// Student Management page (Admin)
import { getAllStudents, getVenues, addStudent, updateStudent, deleteStudent } from '../db.js';
import { escapeHtml } from '../utils.js';
import { showModal, closeModal, confirmDialog } from '../components/modal.js';
import { showToast } from '../components/toast.js';

let allStudents = [];
let allVenues = [];

export async function renderStudents(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Quản Lý Học Viên</h1>
        <p class="page-subtitle">Thêm, sửa, quản lý học viên</p>
      </div>
      <div style="display: flex; gap: 8px;">
        <input type="text" id="studentSearchInput" class="form-input" placeholder="Tìm kiếm học viên..." style="min-width: 200px;">
        <select id="studentVenueFilter" class="form-select" style="min-width: 150px;">
          <option value="">Tất cả cơ sở</option>
        </select>
        <button class="btn btn-primary" id="btnAddStudent">
          <span class="material-icons-round">person_add</span>
          Thêm
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
  
  const venueFilter = document.getElementById('studentVenueFilter');
  venueFilter.addEventListener('change', applyFilters);
  
  await loadData();
}

async function loadData() {
  try {
    const [students, venues] = await Promise.all([
      getAllStudents(),
      getVenues()
    ]);
    allStudents = students;
    allVenues = venues;
    
    const venueFilter = document.getElementById('studentVenueFilter');
    if (venueFilter.options.length === 1) {
      venues.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.id;
        opt.textContent = v.name;
        venueFilter.appendChild(opt);
      });
    }
    
    renderStudentsGrid();
  } catch (err) {
    showToast({ message: 'Lỗi tải dữ liệu: ' + err.message, type: 'error' });
  }
}

function applyFilters() {
  const query = (document.getElementById('studentSearchInput')?.value || '').toLowerCase();
  const venueId = document.getElementById('studentVenueFilter')?.value || '';
  
  const cards = document.querySelectorAll('.student-card');
  cards.forEach(card => {
    const text = card.textContent.toLowerCase();
    const matchesQuery = text.includes(query);
    const matchesVenue = venueId === '' || card.dataset.venueId === venueId;
    
    if (matchesQuery && matchesVenue) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
}

function renderStudentsGrid() {
  const grid = document.getElementById('studentsGrid');
  
  if (allStudents.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1;">
        <span class="material-icons-round empty-state-icon">group_add</span>
        <h3 class="empty-state-title">Chưa có học viên nào</h3>
        <p class="empty-state-text">Bấm "Thêm" để thêm học viên đầu tiên</p>
      </div>
    `;
    return;
  }

  const venueMap = {};
  allVenues.forEach(v => venueMap[v.id] = v.name);

  grid.innerHTML = allStudents.map(student => `
    <div class="coach-card student-card ${student.status === 'inactive' ? 'opacity-50' : ''}" data-venue-id="${student.venueId || ''}">
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
          <span class="label">Cơ sở</span>
          <span class="value">${escapeHtml(venueMap[student.venueId] || 'Chưa xếp')}</span>
        </div>
        <div class="coach-card-detail">
          <span class="label">Ngày sinh</span>
          <span class="value">${escapeHtml(student.dob || '—')}</span>
        </div>
        <div class="coach-card-detail">
          <span class="label">Chiều cao/Cân nặng</span>
          <span class="value">${student.height ? student.height + 'cm' : '—'} / ${student.weight ? student.weight + 'kg' : '—'}</span>
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
            <span class="material-icons-round">person</span> Hoạt động lại
          </button>
        `}
      </div>
    </div>
  `).join('');

  // Edit handlers
  grid.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => {
      const student = allStudents.find(s => s.id === btn.dataset.edit);
      if (student) showStudentForm(student);
    });
  });

  // Delete handlers
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

  // Activate handlers
  grid.querySelectorAll('[data-activate]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await updateStudent(btn.dataset.activate, { status: 'active' });
      showToast({ message: 'Đã kích hoạt lại học viên', type: 'success' });
      await loadData();
    });
  });
  
  applyFilters();
}

function showStudentForm(student = null) {
  const isEdit = !!student;
  
  const venueOptions = allVenues.map(v => 
    `<option value="${v.id}" ${student?.venueId === v.id ? 'selected' : ''}>${escapeHtml(v.name)}</option>`
  ).join('');

  showModal({
    title: isEdit ? 'Sửa thông tin học viên' : 'Thêm học viên mới',
    confirmText: isEdit ? 'Cập nhật' : 'Thêm',
    content: `
      <div class="form-group">
        <label class="form-label">Họ và tên *</label>
        <input type="text" class="form-input" id="studentName" value="${escapeHtml(student?.name || '')}" placeholder="Nguyễn Văn A" required>
      </div>
      <div class="form-group">
        <label class="form-label">Cơ sở đăng ký</label>
        <select class="form-select" id="studentVenue">
          <option value="">-- Chọn cơ sở --</option>
          ${venueOptions}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Ngày sinh</label>
        <input type="date" class="form-input" id="studentDob" value="${escapeHtml(student?.dob || '')}">
      </div>
      <div class="form-group">
        <label class="form-label">Cấp đai</label>
        <select class="form-select" id="studentBelt">
          <option value="">Chọn cấp đai</option>
          <option value="Đai trắng" ${student?.beltRank === 'Đai trắng' ? 'selected' : ''}>Đai trắng</option>
          <option value="Đai vàng" ${student?.beltRank === 'Đai vàng' ? 'selected' : ''}>Đai vàng</option>
          <option value="Đai xanh" ${student?.beltRank === 'Đai xanh' ? 'selected' : ''}>Đai xanh</option>
          <option value="Đai đỏ" ${student?.beltRank === 'Đai đỏ' ? 'selected' : ''}>Đai đỏ</option>
          <option value="Đai đen" ${student?.beltRank === 'Đai đen' ? 'selected' : ''}>Đai đen</option>
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
    `,
    onConfirm: async () => {
      const data = {
        name: document.getElementById('studentName').value.trim(),
        venueId: document.getElementById('studentVenue').value,
        dob: document.getElementById('studentDob').value,
        beltRank: document.getElementById('studentBelt').value,
        height: document.getElementById('studentHeight').value,
        weight: document.getElementById('studentWeight').value
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
          await addStudent(data);
          showToast({ message: 'Đã thêm học viên mới', type: 'success' });
        }
        closeModal();
        await loadData();
      } catch (err) {
        showToast({ message: 'Lỗi: ' + err.message, type: 'error' });
      }
    }
  });
}
