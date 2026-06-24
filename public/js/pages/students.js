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


export async function renderStudents(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Quản Lý Học Viên</h1>
        <p class="page-subtitle">Thêm, sửa, quản lý học viên</p>
      </div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end;">
        <input type="text" id="studentSearchInput" class="form-input" placeholder="Tìm kiếm học viên..." style="min-width: 150px; flex: 1;">
        <select id="studentVenueFilter" class="form-select" style="min-width: 150px; flex: 1;">
          <option value="">Tất cả cơ sở</option>
        </select>
        <button class="btn btn-secondary" id="btnToggleFilters" style="flex-shrink: 0; white-space: nowrap;">
          <span class="material-icons-round">filter_list</span>
          Lọc
        </button>
        <button class="btn btn-primary" id="btnAddStudent" style="flex-shrink: 0; white-space: nowrap;">
          <span class="material-icons-round">person_add</span>
          Thêm
        </button>
      </div>
    </div>

    <div id="advancedFiltersPanel" style="display: none; background: var(--bg-secondary); padding: 16px; border-radius: 8px; margin-bottom: 16px; gap: 16px; flex-wrap: wrap;">
      <div style="flex: 1; min-width: 150px;">
        <label class="form-label" style="font-size: 0.8rem; margin-bottom: 4px;">Lịch học (Ca học)</label>
        <select id="filterClass" class="form-select" style="padding: 4px 8px; min-height: 32px;">
          <option value="">Tất cả ca học</option>
        </select>
      </div>
      <div style="flex: 1; min-width: 150px;">
        <label class="form-label" style="font-size: 0.8rem; margin-bottom: 4px;">Cấp đai</label>
        <select id="filterBelt" class="form-select" style="padding: 4px 8px; min-height: 32px;">
          <option value="">Tất cả cấp đai</option>
        </select>
      </div>
      <div style="flex: 2; min-width: 250px;">
        <label class="form-label" style="font-size: 0.8rem; margin-bottom: 4px;">Chiều cao (cm)</label>
        <div style="display: flex; gap: 8px;">
          <input type="number" id="filterHeightMin" class="form-input" placeholder="Từ..." style="padding: 4px 8px; min-height: 32px;">
          <input type="number" id="filterHeightMax" class="form-input" placeholder="Đến..." style="padding: 4px 8px; min-height: 32px;">
        </div>
      </div>
      <div style="flex: 2; min-width: 250px;">
        <label class="form-label" style="font-size: 0.8rem; margin-bottom: 4px;">Cân nặng (kg)</label>
        <div style="display: flex; gap: 8px;">
          <input type="number" id="filterWeightMin" class="form-input" placeholder="Từ..." style="padding: 4px 8px; min-height: 32px;">
          <input type="number" id="filterWeightMax" class="form-input" placeholder="Đến..." style="padding: 4px 8px; min-height: 32px;">
        </div>
      </div>
    </div>

    <div class="coaches-grid" id="studentsGrid">
      ${Array(3).fill('<div class="skeleton skeleton-card" style="height:200px;"></div>').join('')}
    </div>
  `;

  document.getElementById('btnAddStudent').addEventListener('click', () => showStudentForm());
  
  document.getElementById('btnToggleFilters').addEventListener('click', () => {
    const panel = document.getElementById('advancedFiltersPanel');
    panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
  });
  
  const filterInputs = [
    'studentSearchInput', 'studentVenueFilter', 'filterClass', 'filterBelt',
    'filterHeightMin', 'filterHeightMax', 'filterWeightMin', 'filterWeightMax'
  ];
  filterInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', applyFilters);
    }
  });
  
  await loadData();
}

async function loadData() {
  try {
    const [students, venues, settings, classes] = await Promise.all([
      getAllStudents(),
      getVenues(),
      getSettings(),
      getAllVenueClasses()
    ]);
    allStudents = students;
    allVenues = venues;
    allClasses = classes;
    beltRanks = settings?.beltRanks || ["Đai trắng", "Đai vàng", "Đai xanh", "Đai đỏ", "Đai đen"];
    
    const venueFilter = document.getElementById('studentVenueFilter');
    if (venueFilter.options.length === 1) {
      venues.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.id;
        opt.textContent = v.name;
        venueFilter.appendChild(opt);
      });
    }

    const classFilter = document.getElementById('filterClass');
    if (classFilter && classFilter.options.length === 1) {
      classes.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.name} (${c.startTime}-${c.endTime})`;
        classFilter.appendChild(opt);
      });
    }

    const beltFilter = document.getElementById('filterBelt');
    if (beltFilter && beltFilter.options.length === 1) {
      beltRanks.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b;
        opt.textContent = b;
        beltFilter.appendChild(opt);
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
  const classId = document.getElementById('filterClass')?.value || '';
  const belt = document.getElementById('filterBelt')?.value || '';
  const hMin = parseFloat(document.getElementById('filterHeightMin')?.value) || 0;
  const hMax = parseFloat(document.getElementById('filterHeightMax')?.value) || Infinity;
  const wMin = parseFloat(document.getElementById('filterWeightMin')?.value) || 0;
  const wMax = parseFloat(document.getElementById('filterWeightMax')?.value) || Infinity;
  
  const cards = document.querySelectorAll('.student-card');
  cards.forEach(card => {
    const text = card.textContent.toLowerCase();
    const matchesQuery = text.includes(query);
    const matchesVenue = venueId === '' || card.dataset.venueId === venueId;
    const matchesClass = classId === '' || card.dataset.classId === classId;
    const matchesBelt = belt === '' || card.dataset.beltRank === belt;
    
    const height = parseFloat(card.dataset.height) || 0;
    const matchesHeight = height === 0 || (height >= hMin && height <= hMax);
    
    const weight = parseFloat(card.dataset.weight) || 0;
    const matchesWeight = weight === 0 || (weight >= wMin && weight <= wMax);
    
    if (matchesQuery && matchesVenue && matchesClass && matchesBelt && matchesHeight && matchesWeight) {
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
        <p class="empty-state-text">Bấm "Thêm" để thêm học viên đầu tiên</p>
      </div>
    `;
    return;
  }

  const venueMap = {};
  allVenues.forEach(v => venueMap[v.id] = v.name);

  grid.innerHTML = allStudents.map(student => `
    <div class="coach-card student-card ${student.status === 'inactive' ? 'opacity-50' : ''}" 
         data-venue-id="${student.venueId || ''}"
         data-class-id="${student.classId || ''}"
         data-belt-rank="${student.beltRank || ''}"
         data-height="${student.height || 0}"
         data-weight="${student.weight || 0}">
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
          <span class="label">Lịch học</span>
          <span class="value">${student.classId && allClasses.find(c => c.id === student.classId) ? escapeHtml(allClasses.find(c => c.id === student.classId).name) : 'Chưa xếp ca'}</span>
        </div>
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

export async function showStudentForm(student = null, defaultVenueId = null, onSuccess = null) {
  const isEdit = !!student;
  
  let currentVenues = allVenues;
  let currentBeltRanks = beltRanks;

  if (!currentVenues || currentVenues.length === 0) {
    currentVenues = await getVenues();
  }
  if (!currentBeltRanks || currentBeltRanks.length === 0) {
    const settings = await getSettings();
    currentBeltRanks = settings?.beltRanks || ["Đai trắng", "Đai vàng", "Đai xanh", "Đai đỏ", "Đai đen"];
  }

  const venueOptions = currentVenues.map(v => 
    `<option value="${v.id}" ${(student?.venueId || defaultVenueId) === v.id ? 'selected' : ''}>${escapeHtml(v.name)}</option>`
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
        <label class="form-label">Lịch học (Ca học)</label>
        <select class="form-select" id="studentClass">
          <option value="">-- Chọn lịch học --</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Ngày sinh</label>
        <input type="date" class="form-input" id="studentDob" value="${escapeHtml(student?.dob || '')}">
      </div>
      <div class="form-group">
        <label class="form-label">SĐT Phụ huynh</label>
        <input type="tel" class="form-input" id="studentParentPhone" value="${escapeHtml(student?.parentPhone || '')}" placeholder="09xxxx...">
      </div>
      <div class="form-group">
        <label class="form-label">Cấp đai</label>
        <select class="form-select" id="studentBelt">
          <option value="">Chọn cấp đai</option>
          ${currentBeltRanks.map(belt => `<option value="${escapeHtml(belt)}" ${student?.beltRank === belt ? 'selected' : ''}>${escapeHtml(belt)}</option>`).join('')}
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
        classId: document.getElementById('studentClass').value,
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

      const confirmBtn = document.getElementById('modalConfirmBtn');
      const originalText = confirmBtn ? confirmBtn.innerHTML : '';
      if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<span class="material-icons-round" style="animation: spin 1s linear infinite;">refresh</span> Đang lưu...';
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
        if (onSuccess) {
          await onSuccess();
        } else {
          await loadData();
        }
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

  setTimeout(() => {
    const venueSelect = document.getElementById('studentVenue');
    const classSelect = document.getElementById('studentClass');
    
    const loadClasses = async (vId) => {
      if (!vId) {
        classSelect.innerHTML = '<option value="">-- Chọn lịch học --</option>';
        return;
      }
      classSelect.innerHTML = '<option value="">-- Đang tải... --</option>';
      try {
        const classes = await getVenueClasses(vId);
        classSelect.innerHTML = '<option value="">-- Chọn lịch học --</option>' + 
          classes.map(c => `<option value="${c.id}" ${c.id === student?.classId ? 'selected' : ''}>${escapeHtml(c.name)} (${c.startTime} - ${c.endTime})</option>`).join('');
      } catch (e) {
        classSelect.innerHTML = '<option value="">-- Lỗi tải lịch học --</option>';
      }
    };

    if (venueSelect.value) {
      loadClasses(venueSelect.value);
    }

    venueSelect.addEventListener('change', (e) => {
      loadClasses(e.target.value);
    });
  }, 50);
}
