// Class Management page (Admin)
import { getClassesV2, addClassV2, updateClassV2, getVenues, getClassTeachers, addClassTeacher, getCoaches, getClassStudents, getStudentsByVenue, addClassSchedule, getClassSchedules, addClassStudent } from '../db.js';
import { escapeHtml, formatDayOfWeek, formatDayShort } from '../utils.js';
import { showModal, closeModal, confirmDialog } from '../components/modal.js';
import { showToast } from '../components/toast.js';

let venuesCache = [];
let coachesCache = [];
const expandedClasses = new Set();

export async function renderClasses(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Quản Lý Lớp Học</h1>
        <p class="page-subtitle">Danh sách lớp học, phân công HLV và học viên</p>
      </div>
      <button class="btn btn-primary" id="btnAddClass">
        <span class="material-icons-round">add_circle</span>
        Thêm lớp học
      </button>
    </div>
    <div id="classesContainer">
      ${Array(3).fill('<div class="skeleton skeleton-card" style="height:140px;"></div>').join('')}
    </div>
  `;

  document.getElementById('btnAddClass').addEventListener('click', () => showClassForm());
  
  try {
    venuesCache = await getVenues();
    coachesCache = await getCoaches();
  } catch (e) {
    venuesCache = [];
    coachesCache = [];
  }
  
  await loadClasses();
}

async function loadClasses() {
  try {
    const classes = await getClassesV2();
    const container = document.getElementById('classesContainer');
    if (!container) return;

    if (classes.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1;">
          <span class="material-icons-round empty-state-icon">class</span>
          <h3 class="empty-state-title">Chưa có lớp học nào</h3>
          <p class="empty-state-text">Bấm "Thêm lớp học" để tạo mới</p>
        </div>
      `;
      return;
    }

    const classDataPromises = classes.map(async cls => {
      const teachers = await getClassTeachers(cls.id);
      const students = await getClassStudents(cls.id);
      const schedules = await getClassSchedules(cls.id);
      return { cls, teachers, students, schedules };
    });
    const classDataList = await Promise.all(classDataPromises);

    const venueMap = {};
    venuesCache.forEach(v => { venueMap[v.id] = v; });
    const coachMap = {};
    coachesCache.forEach(c => { coachMap[c.id] = c; });

    container.innerHTML = classDataList.map(({ cls, teachers, students, schedules }) => {
      const venue = venueMap[cls.venueId];
      
      return `
      <div class="venue-detail-card card mb-6" data-class-id="${cls.id}">
        <div class="venue-card-header" data-toggle="${cls.id}">
          <div class="flex items-center gap-3" style="flex:1;">
            <div class="stat-icon info" style="width:44px;height:44px;">
              <span class="material-icons-round">class</span>
            </div>
            <div>
              <div style="font-weight:700;font-size:1.05rem;">${escapeHtml(cls.name)}</div>
              <div style="font-size:0.8rem;color:var(--text-secondary);">
                <span class="material-icons-round" style="font-size:12px;vertical-align:middle;">location_on</span>
                ${escapeHtml(venue?.name || 'Không xác định')}
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="badge badge-active" style="font-size:0.7rem;">${teachers.length} HLV</span>
            <span class="badge badge-pending" style="font-size:0.7rem;">${students.length} Học viên</span>
            <button class="btn btn-sm btn-secondary" data-edit-class="${cls.id}" title="Sửa lớp">
              <span class="material-icons-round" style="font-size:1rem;">edit</span>
            </button>
            <span class="material-icons-round venue-toggle-icon" data-toggle-icon="${cls.id}" style="transition:transform 0.3s;cursor:pointer;${expandedClasses.has(cls.id) ? 'transform:rotate(180deg);' : ''}">expand_more</span>
          </div>
        </div>

        <div class="venue-detail-body" id="classBody_${cls.id}" style="display:${expandedClasses.has(cls.id) ? 'block' : 'none'};padding-top:var(--sp-4);border-top:1px solid var(--border-color);margin-top:var(--sp-4);">
          
          <div class="grid grid-cols-1 md-grid-cols-2" style="gap:var(--sp-6);">
            
            <!-- TEACHERS & SCHEDULES -->
            <div>
              <div class="flex items-center justify-between mb-4">
                <h4 style="font-size:0.9rem;color:var(--text-secondary);font-weight:600;">
                  <span class="material-icons-round" style="font-size:1rem;vertical-align:middle;">people</span>
                  Giáo viên & Lịch dạy
                </h4>
                <button class="btn btn-sm btn-primary" data-add-teacher="${cls.id}">
                  <span class="material-icons-round" style="font-size:0.9rem;">person_add</span> Thêm HLV
                </button>
              </div>
              
              ${teachers.length === 0 ? `
                <div style="text-align:center;padding:var(--sp-4);color:var(--text-muted);font-size:0.85rem;background:var(--bg-secondary);border-radius:var(--radius-md);">
                  Chưa phân công giáo viên
                </div>
              ` : `
                <div class="venue-coaches-list">
                  ${teachers.map(t => {
                    const coach = coachMap[t.coachId];
                    return \`
                      <div class="venue-coach-item">
                        <div class="flex items-center gap-3">
                          <div class="user-avatar-placeholder" style="width:32px;height:32px;font-size:0.8rem;">
                            \${(coach?.name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style="font-weight:600;font-size:0.9rem;">\${escapeHtml(coach?.name || 'Không rõ')}</div>
                            <div style="font-size:0.75rem;color:var(--text-secondary);">Vai trò: \${t.role === 'main' ? 'Chính' : 'Trợ giảng'}</div>
                          </div>
                        </div>
                      </div>
                    \`;
                  }).join('')}
                </div>
              `}
              
              <div class="flex items-center justify-between mb-4 mt-6">
                <h4 style="font-size:0.9rem;color:var(--text-secondary);font-weight:600;">
                  <span class="material-icons-round" style="font-size:1rem;vertical-align:middle;">calendar_today</span>
                  Lịch học
                </h4>
                <button class="btn btn-sm btn-outline" data-add-schedule="${cls.id}">
                  Thêm buổi
                </button>
              </div>
              
              ${schedules.length === 0 ? `
                <div style="text-align:center;padding:var(--sp-4);color:var(--text-muted);font-size:0.85rem;background:var(--bg-secondary);border-radius:var(--radius-md);">
                  Chưa có lịch học
                </div>
              ` : `
                <div class="flex" style="gap:8px;flex-wrap:wrap;">
                  ${schedules.map(s => \`
                    <span class="badge badge-info">\${formatDayShort(s.dayOfWeek)}: \${s.startTime} - \${s.endTime}</span>
                  \`).join('')}
                </div>
              `}
            </div>

            <!-- STUDENTS -->
            <div>
              <div class="flex items-center justify-between mb-4">
                <h4 style="font-size:0.9rem;color:var(--text-secondary);font-weight:600;">
                  <span class="material-icons-round" style="font-size:1rem;vertical-align:middle;">school</span>
                  Học viên (${students.length})
                </h4>
                <button class="btn btn-sm btn-primary" data-add-student="${cls.id}">
                  <span class="material-icons-round" style="font-size:0.9rem;">add</span> Ghi danh
                </button>
              </div>
              
              ${students.length === 0 ? `
                <div style="text-align:center;padding:var(--sp-4);color:var(--text-muted);font-size:0.85rem;background:var(--bg-secondary);border-radius:var(--radius-md);">
                  Chưa có học viên
                </div>
              ` : `
                <div class="venue-coaches-list" style="max-height: 250px; overflow-y:auto;">
                  ${students.map(s => \`
                    <div class="venue-coach-item" style="padding:var(--sp-2) var(--sp-3);">
                      <div class="flex items-center gap-3">
                        <span class="material-icons-round" style="color:var(--text-muted);font-size:1.2rem;">person</span>
                        <div style="font-weight:500;font-size:0.85rem;">Học viên ID: \${s.studentId}</div>
                      </div>
                    </div>
                  \`).join('')}
                </div>
              `}
            </div>

          </div>
        </div>
      </div>
      `;
    }).join('');

    // Events
    container.querySelectorAll('.venue-card-header').forEach(header => {
      header.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        const id = header.getAttribute('data-toggle');
        const body = document.getElementById(`classBody_${id}`);
        const icon = header.querySelector('.venue-toggle-icon');
        if (body.style.display === 'none') {
          body.style.display = 'block';
          icon.style.transform = 'rotate(180deg)';
          expandedClasses.add(id);
        } else {
          body.style.display = 'none';
          icon.style.transform = '';
          expandedClasses.delete(id);
        }
      });
    });

    container.querySelectorAll('[data-add-teacher]').forEach(btn => {
      btn.addEventListener('click', () => showTeacherForm(btn.getAttribute('data-add-teacher')));
    });
    container.querySelectorAll('[data-add-schedule]').forEach(btn => {
      btn.addEventListener('click', () => showScheduleForm(btn.getAttribute('data-add-schedule')));
    });

  } catch (err) {
    console.error(err);
    document.getElementById('classesContainer').innerHTML = `<div class="error-text">Lỗi: ${err.message}</div>`;
  }
}

function showClassForm() {
  const content = `
    <form id="classForm">
      <div class="form-group">
        <label class="form-label">Tên lớp học</label>
        <input type="text" id="className" class="form-input" required placeholder="VD: Lớp Võ Nâng Cao 1">
      </div>
      <div class="form-group">
        <label class="form-label">Cơ sở tổ chức</label>
        <select id="classVenue" class="form-input" required>
          ${venuesCache.map(v => `<option value="${v.id}">${escapeHtml(v.name)}</option>`).join('')}
        </select>
      </div>
    </form>
  `;
  showModal({
    title: 'Thêm Lớp Học',
    content,
    primaryAction: {
      label: 'Lưu',
      handler: async () => {
        const data = {
          name: document.getElementById('className').value.trim(),
          venueId: document.getElementById('classVenue').value
        };
        if (!data.name) return showToast({ message: 'Vui lòng nhập tên lớp', type: 'error' });
        try {
          await addClassV2(data);
          closeModal();
          showToast({ message: 'Đã thêm lớp học', type: 'success' });
          loadClasses();
        } catch (e) {
          showToast({ message: e.message, type: 'error' });
        }
      }
    }
  });
}

function showTeacherForm(classId) {
  const content = `
    <form id="teacherForm">
      <div class="form-group">
        <label class="form-label">Chọn HLV</label>
        <select id="teacherId" class="form-input" required>
          ${coachesCache.filter(c => c.status === 'active').map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Vai trò</label>
        <select id="teacherRole" class="form-input">
          <option value="main">Giáo viên chính</option>
          <option value="assistant">Trợ giảng</option>
        </select>
      </div>
    </form>
  `;
  showModal({
    title: 'Phân công HLV',
    content,
    primaryAction: {
      label: 'Phân công',
      handler: async () => {
        try {
          await addClassTeacher({
            classId,
            coachId: document.getElementById('teacherId').value,
            role: document.getElementById('teacherRole').value
          });
          closeModal();
          showToast({ message: 'Đã phân công', type: 'success' });
          loadClasses();
        } catch (e) {
          showToast({ message: e.message, type: 'error' });
        }
      }
    }
  });
}

function showScheduleForm(classId) {
  const content = `
    <form id="scheduleForm">
      <div class="form-group">
        <label class="form-label">Thứ</label>
        <select id="schDay" class="form-input">
          ${[2,3,4,5,6,7,1].map(d => `<option value="${d}">${formatDayOfWeek(d)}</option>`).join('')}
        </select>
      </div>
      <div class="grid grid-cols-2" style="gap:var(--sp-4);">
        <div class="form-group">
          <label class="form-label">Giờ bắt đầu</label>
          <input type="time" id="schStart" class="form-input" value="18:00" required>
        </div>
        <div class="form-group">
          <label class="form-label">Giờ kết thúc</label>
          <input type="time" id="schEnd" class="form-input" value="20:00" required>
        </div>
      </div>
    </form>
  `;
  showModal({
    title: 'Thêm Lịch Học',
    content,
    primaryAction: {
      label: 'Lưu',
      handler: async () => {
        try {
          await addClassSchedule({
            classId,
            dayOfWeek: Number(document.getElementById('schDay').value),
            startTime: document.getElementById('schStart').value,
            endTime: document.getElementById('schEnd').value
          });
          closeModal();
          showToast({ message: 'Đã thêm lịch học', type: 'success' });
          loadClasses();
        } catch(e) {
          showToast({ message: e.message, type: 'error' });
        }
      }
    }
  });
}
