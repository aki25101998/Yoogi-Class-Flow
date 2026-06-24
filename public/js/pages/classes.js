// Class Management page (Admin)
import { getClassesV2, addClassV2, updateClassV2, getVenues, getClassTeachers, addClassTeacher, getCoaches, getClassStudents, getStudentsByVenue, addClassSchedule, getClassSchedules, addClassStudent, getStudentAttendanceV2, addStudentAttendanceV2, getAllStudents, getClassTests, addClassTest, getStudentTestGrades, addStudentTestGrade } from '../db.js';
import { escapeHtml, formatDayOfWeek, formatDayShort } from '../utils.js';
import { showModal, closeModal, confirmDialog } from '../components/modal.js';
import { showToast } from '../components/toast.js';

let venuesCache = [];
let coachesCache = [];
let allStudentsCache = [];
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
    allStudentsCache = await getAllStudents();
  } catch (e) {
    venuesCache = [];
    coachesCache = [];
    allStudentsCache = [];
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
    const studentMap = {};
    allStudentsCache.forEach(s => { studentMap[s.id] = s; });

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
            <button class="btn btn-sm btn-outline" data-attendance-class="${cls.id}" title="Điểm danh" style="padding: 4px 8px;">
              <span class="material-icons-round" style="font-size:1rem;">fact_check</span>
            </button>
            <button class="btn btn-sm btn-outline" data-tests-class="${cls.id}" title="Bài kiểm tra" style="padding: 4px 8px;">
              <span class="material-icons-round" style="font-size:1rem;">assignment</span>
            </button>
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
                  ${students.map(s => {
                    const studentObj = studentMap[s.studentId];
                    return \`
                    <div class="venue-coach-item" style="padding:var(--sp-2) var(--sp-3);">
                      <div class="flex items-center gap-3">
                        <span class="material-icons-round" style="color:var(--text-muted);font-size:1.2rem;">person</span>
                        <div style="font-weight:500;font-size:0.85rem;">\${escapeHtml(studentObj?.name || 'Học viên ID: ' + s.studentId)}</div>
                      </div>
                    </div>
                  \`}).join('')}
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
    container.querySelectorAll('[data-attendance-class]').forEach(btn => {
      btn.addEventListener('click', () => showAttendanceForm(btn.getAttribute('data-attendance-class')));
    });
    container.querySelectorAll('[data-tests-class]').forEach(btn => {
      btn.addEventListener('click', () => showTestsForm(btn.getAttribute('data-tests-class')));
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

// ==========================================
// PHASE 2 FUNCTIONS
// ==========================================

async function showAttendanceForm(classId) {
  // get students in class
  let students = [];
  try {
    students = await getClassStudents(classId);
  } catch(e) {
    return showToast({ message: 'Lỗi tải danh sách học viên', type: 'error' });
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const studentMap = {};
  allStudentsCache.forEach(s => { studentMap[s.id] = s; });

  const content = `
    <div style="margin-bottom:var(--sp-4);">
      <label class="form-label">Ngày điểm danh</label>
      <input type="date" id="attDate" class="form-input" value="${todayStr}">
    </div>
    <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
      <table class="table" style="width:100%; min-width: 400px;">
        <thead>
          <tr>
            <th style="width: 50%;">Học viên</th>
            <th>Trạng thái</th>
          </tr>
        </thead>
        <tbody id="attTableBody">
          ${students.length === 0 ? '<tr><td colspan="2" style="text-align:center;">Lớp chưa có học viên</td></tr>' : ''}
          ${students.map(s => {
            const stu = studentMap[s.studentId];
            return \`
              <tr>
                <td>\${escapeHtml(stu?.name || s.studentId)}</td>
                <td>
                  <select class="form-select att-select" data-student-id="\${s.studentId}">
                    <option value="present">Có mặt</option>
                    <option value="absent_excused">Vắng phép</option>
                    <option value="absent_unexcused">Vắng ko phép</option>
                  </select>
                </td>
              </tr>
            \`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  showModal({
    title: 'Điểm Danh Lớp Học',
    content,
    primaryAction: {
      label: 'Lưu điểm danh',
      handler: async () => {
        const date = document.getElementById('attDate').value;
        if (!date) return showToast({ message: 'Vui lòng chọn ngày', type: 'error' });
        
        const selects = document.querySelectorAll('.att-select');
        const attendanceData = [];
        selects.forEach(sel => {
          attendanceData.push({
            studentId: sel.getAttribute('data-student-id'),
            status: sel.value,
            notes: ''
          });
        });

        if (attendanceData.length === 0) return closeModal();

        try {
          await addStudentAttendanceV2({
            classId,
            date,
            records: attendanceData,
            recordedBy: 'admin' // In real app, from getCurrentUser()
          });
          closeModal();
          showToast({ message: 'Đã lưu điểm danh', type: 'success' });
        } catch(e) {
          showToast({ message: e.message, type: 'error' });
        }
      }
    }
  });
}

async function showTestsForm(classId) {
  let tests = [];
  try {
    tests = await getClassTests(classId);
  } catch(e) {}

  const content = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--sp-4);">
      <h3 style="font-size:1rem; font-weight:600;">Danh sách bài kiểm tra</h3>
      <button class="btn btn-sm btn-primary" id="btnCreateTest">Tạo bài KT</button>
    </div>
    
    <div id="testsListContainer" style="display:flex; flex-direction:column; gap:8px;">
      ${tests.length === 0 ? '<div style="color:var(--text-muted); font-size:0.9rem;">Chưa có bài kiểm tra nào.</div>' : ''}
      ${tests.map(t => \`
        <div class="card" style="padding:var(--sp-3); display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-weight:600;">\${escapeHtml(t.name)}</div>
            <div style="font-size:0.8rem; color:var(--text-secondary);">\${t.date || ''} - Hệ số \${t.weight || 1}</div>
          </div>
          <button class="btn btn-sm btn-outline" onclick="window.enterGrades('\${classId}', '\${t.id}')">Nhập điểm</button>
        </div>
      \`).join('')}
    </div>
  `;

  showModal({
    title: 'Bài Kiểm Tra',
    content,
    primaryAction: {
      label: 'Đóng',
      handler: () => closeModal()
    }
  });

  setTimeout(() => {
    document.getElementById('btnCreateTest')?.addEventListener('click', () => {
      closeModal();
      showCreateTestForm(classId);
    });
  }, 100);
}

function showCreateTestForm(classId) {
  const content = `
    <div class="form-group">
      <label class="form-label">Tên bài kiểm tra</label>
      <input type="text" id="testName" class="form-input" required placeholder="VD: Kiểm tra giữa khóa">
    </div>
    <div class="form-group">
      <label class="form-label">Ngày kiểm tra</label>
      <input type="date" id="testDate" class="form-input" value="${new Date().toISOString().split('T')[0]}">
    </div>
    <div class="form-group">
      <label class="form-label">Hệ số (Trọng số)</label>
      <input type="number" id="testWeight" class="form-input" value="1" min="1">
    </div>
  `;
  showModal({
    title: 'Tạo Bài Kiểm Tra',
    content,
    primaryAction: {
      label: 'Tạo',
      handler: async () => {
        try {
          await addClassTest({
            classId,
            name: document.getElementById('testName').value,
            date: document.getElementById('testDate').value,
            weight: Number(document.getElementById('testWeight').value)
          });
          closeModal();
          showToast({ message: 'Tạo bài kiểm tra thành công', type: 'success' });
          showTestsForm(classId); // Reopen list
        } catch(e) {
          showToast({ message: e.message, type: 'error' });
        }
      }
    }
  });
}

window.enterGrades = async (classId, testId) => {
  closeModal();
  let students = [];
  try {
    students = await getClassStudents(classId);
  } catch(e) {
    return showToast({ message: 'Lỗi tải danh sách học viên', type: 'error' });
  }

  const studentMap = {};
  allStudentsCache.forEach(s => { studentMap[s.id] = s; });

  const content = `
    <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
      <table class="table" style="width:100%; min-width: 400px;">
        <thead>
          <tr>
            <th style="width: 50%;">Học viên</th>
            <th>Điểm</th>
            <th>Nhận xét</th>
          </tr>
        </thead>
        <tbody id="gradesTableBody">
          ${students.length === 0 ? '<tr><td colspan="3" style="text-align:center;">Lớp chưa có học viên</td></tr>' : ''}
          ${students.map(s => {
            const stu = studentMap[s.studentId];
            return \`
              <tr class="grade-row" data-student-id="\${s.studentId}">
                <td>\${escapeHtml(stu?.name || s.studentId)}</td>
                <td><input type="number" class="form-input grade-score" min="0" max="10" step="0.5" style="width:80px;" placeholder="0-10"></td>
                <td><input type="text" class="form-input grade-note" placeholder="..."></td>
              </tr>
            \`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  showModal({
    title: 'Nhập Điểm',
    content,
    primaryAction: {
      label: 'Lưu điểm',
      handler: async () => {
        const rows = document.querySelectorAll('.grade-row');
        for (const row of rows) {
          const sId = row.getAttribute('data-student-id');
          const score = row.querySelector('.grade-score').value;
          const note = row.querySelector('.grade-note').value;
          if (score !== '') {
            try {
              await addStudentTestGrade({
                testId,
                studentId: sId,
                score: Number(score),
                notes: note
              });
            } catch(e) {
              console.error(e);
            }
          }
        }
        closeModal();
        showToast({ message: 'Đã lưu điểm', type: 'success' });
      }
    }
  });
};
