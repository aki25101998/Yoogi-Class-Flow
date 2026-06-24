// My Check-in page (Coach) — V2 implementation
import { getClassesForCoach, getClassSchedules, getTeacherSalarySessionsByDate, checkInV2, getClassStudents } from '../db.js';
import { getCurrentUserData } from '../auth.js';
import { getTodayStr, getTodayDisplay, getDayOfWeek, formatTime, escapeHtml } from '../utils.js';
import { showToast } from '../components/toast.js';

export async function renderMyCheckin(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Check-in (Chấm công)</h1>
        <p class="page-subtitle">${getTodayDisplay()}</p>
      </div>
    </div>
    <div id="checkinContent">
      <div style="padding:var(--sp-8);text-align:center;color:var(--text-muted);">Đang tải...</div>
    </div>
  `;

  await loadCheckinData(container);
}

async function loadCheckinData(container) {
  try {
    const userData = getCurrentUserData();
    const today = getTodayStr();
    const dow = getDayOfWeek(today);

    const [classes, todaySessions] = await Promise.all([
      getClassesForCoach(userData.id),
      getTeacherSalarySessionsByDate(today)
    ]);

    // Build today's schedule from classes
    const todaySchedules = [];
    for (const cls of classes) {
      const schedules = await getClassSchedules(cls.id);
      const todaySch = schedules.filter(s => s.dayOfWeek === dow);
      for (const sch of todaySch) {
        todaySchedules.push({
          class: cls,
          schedule: sch,
          classId: cls.id,
          startTime: sch.startTime,
          endTime: sch.endTime,
          scheduleKey: `${cls.id}_${sch.id}`
        });
      }
    }

    // Map attendance by classId
    const attMap = {};
    todaySessions
      .filter(a => a.coachId === userData.id)
      .forEach(a => {
        attMap[a.classId] = a;
      });

    const content = document.getElementById('checkinContent');

    if (todaySchedules.length === 0) {
      content.innerHTML = `
        <div class="empty-state">
          <span class="material-icons-round empty-state-icon" style="font-size:5rem;">weekend</span>
          <h3 class="empty-state-title">Hôm nay không có lịch dạy</h3>
          <p class="empty-state-text">Nghỉ ngơi thôi! 🎉</p>
        </div>
      `;
      return;
    }

    content.innerHTML = await Promise.all(todaySchedules.map(async s => {
      const att = attMap[s.classId];
      const isCheckedIn = !!att;

      const statusMap = {
        'checked_in': { text: 'Chờ duyệt', class: 'badge-pending' },
        'approved': { text: 'Đã duyệt ✓', class: 'badge-approved' },
        'rejected': { text: 'Từ chối', class: 'badge-rejected' }
      };
      
      let studentsHtml = '';
      if (!isCheckedIn) {
        // Point them to use the attendance modal inside classes
        studentsHtml = `
          <div style="text-align: left; margin: var(--sp-4) 0; padding: var(--sp-3); background: var(--bg-page); border-radius: var(--radius-sm);">
            <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom:0;">
              Lưu ý: Hãy đảm bảo bạn đã điểm danh học viên tại phần <strong>Lớp Học</strong> trước khi bấm Check-in để tính đúng tiền lương (nếu bạn nhận lương theo đầu học viên).
            </p>
          </div>
        `;
      }

      return \`
        <div class="card mb-4" style="text-align:center;">
          <div style="margin-bottom:var(--sp-4);">
            <div style="font-size:0.9rem;font-weight:600;margin-bottom:var(--sp-1);">\${escapeHtml(s.class.name)}</div>
            <div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:var(--sp-1);">Vai trò: \${s.class.role === 'main' ? 'Chính' : 'Trợ giảng'}</div>
            <div style="font-size:1.25rem;font-weight:700;color:var(--accent-primary);">\${s.startTime} - \${s.endTime}</div>
          </div>
          
          <div class="checkin-container" id="checkin-container-\${s.scheduleKey}">
            \${isCheckedIn ? \`
              <div class="checkin-btn checked" style="cursor:default;">
                <span class="material-icons-round">\${att.status === 'approved' ? 'verified' : 'schedule'}</span>
                <span>\${statusMap[att.status]?.text || att.status}</span>
              </div>
              <div class="checkin-time">
                Check-in lúc \${formatTime(att.checkInTime)}
              </div>
              \${att.status !== 'approved' ? \`
                <div style="margin-top:var(--sp-3);">
                  <span class="badge \${statusMap[att.status]?.class || 'badge-pending'}">\${statusMap[att.status]?.text || att.status}</span>
                </div>
              \` : ''}
              \${att.status === 'approved' ? \`
                <div style="margin-top:var(--sp-3); font-weight:600; color:var(--accent-success);">
                  Lương ca này: \${Number(att.calculatedSalary || 0).toLocaleString('vi-VN')} đ
                </div>
              \` : ''}
            \` : \`
              \${studentsHtml}
              <button class="checkin-btn" data-class-id="\${s.classId}" data-schedule-key="\${s.scheduleKey}" style="width: 100%; border-radius: 8px;">
                <span class="material-icons-round">fingerprint</span>
                <span style="font-size: 1rem;">Xác nhận Chấm công</span>
              </button>
            \`}
          </div>
        </div>
      \`;
    })).then(res => res.join(''));

    // Check-in handlers
    content.querySelectorAll('.checkin-btn:not(.checked)').forEach(btn => {
      btn.addEventListener('click', async () => {
        const container = document.getElementById(\`checkin-container-\${btn.dataset.scheduleKey}\`);
        btn.disabled = true;
        btn.innerHTML = \`
          <div class="loading-spinner" style="width:40px;height:40px;">
            <div class="spinner-ring"></div>
          </div>
          <span>Đang xử lý...</span>
        \`;

        try {
          await checkInV2({
            coachId: userData.id,
            classId: btn.dataset.classId,
            date: today,
            checkInBy: userData.id
          });
          showToast({ message: 'Check-in thành công!', type: 'success' });
          await loadCheckinData(container);
        } catch (err) {
          showToast({ message: 'Lỗi xử lý: ' + err.message, type: 'error' });
          btn.disabled = false;
          btn.innerHTML = \`
            <span class="material-icons-round">fingerprint</span>
            <span>Xác nhận Chấm công</span>
          \`;
        }
      });
    });

  } catch (err) {
    document.getElementById('checkinContent').innerHTML = \`
      <div class="empty-state">
        <span class="material-icons-round empty-state-icon">error</span>
        <h3 class="empty-state-title">Lỗi</h3>
        <p class="empty-state-text">\${err.message}</p>
      </div>
    \`;
  }
}
