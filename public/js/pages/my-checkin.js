// My Check-in page (Coach) — uses venueCoaches
import { getVenuesForCoach, getAttendanceByDate, checkIn } from '../db.js';
import { getCurrentUserData } from '../auth.js';
import { getTodayStr, getTodayDisplay, getDayOfWeek, formatTime, escapeHtml } from '../utils.js';
import { showToast } from '../components/toast.js';

export async function renderMyCheckin(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Check-in</h1>
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

    const [venueAssignments, todayAttendance] = await Promise.all([
      getVenuesForCoach(userData.id),
      getAttendanceByDate(today)
    ]);

    // Build today's schedule from venueCoaches
    const todaySchedules = [];
    for (const { venue, venueCoach } of venueAssignments) {
      const days = venueCoach.scheduleDays || [];
      if (days.includes(dow)) {
        todaySchedules.push({
          venue,
          venueCoach,
          venueId: venue.id,
          venueCoachId: venueCoach.id,
          startTime: venueCoach.startTime,
          endTime: venueCoach.endTime,
          // Create a composite key for attendance matching
          scheduleKey: `${venueCoach.id}_${dow}`
        });
      }
    }

    // Map attendance by venueCoachId or scheduleId
    const attMap = {};
    todayAttendance
      .filter(a => a.coachId === userData.id)
      .forEach(a => {
        // Match by venueCoachId or legacy scheduleId
        if (a.venueCoachId) attMap[a.venueCoachId] = a;
        if (a.scheduleId) attMap[a.scheduleId] = a;
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

    content.innerHTML = todaySchedules.map(s => {
      const att = attMap[s.venueCoachId] || attMap[s.scheduleKey];
      const isCheckedIn = !!att;

      const statusMap = {
        'checked_in': { text: 'Chờ duyệt', class: 'badge-pending' },
        'approved': { text: 'Đã duyệt ✓', class: 'badge-approved' },
        'rejected': { text: 'Từ chối', class: 'badge-rejected' }
      };

      return `
        <div class="card mb-4" style="text-align:center;">
          <div style="margin-bottom:var(--sp-4);">
            <div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:var(--sp-1);">${escapeHtml(s.venue?.name || '?')}</div>
            <div style="font-size:1.25rem;font-weight:700;color:var(--accent-primary);">${s.startTime} - ${s.endTime}</div>
          </div>
          
          <div class="checkin-container">
            ${isCheckedIn ? `
              <div class="checkin-btn checked" style="cursor:default;">
                <span class="material-icons-round">${att.status === 'approved' ? 'verified' : 'schedule'}</span>
                <span>${statusMap[att.status]?.text || att.status}</span>
              </div>
              <div class="checkin-time">
                Check-in lúc ${formatTime(att.checkInTime)}
              </div>
              ${att.status !== 'approved' ? `
                <div style="margin-top:var(--sp-3);">
                  <span class="badge ${statusMap[att.status]?.class || 'badge-pending'}">${statusMap[att.status]?.text || att.status}</span>
                </div>
              ` : ''}
            ` : `
              <button class="checkin-btn" data-venue-coach="${s.venueCoachId}" data-venue="${s.venueId}" data-schedule-key="${s.scheduleKey}">
                <span class="material-icons-round">fingerprint</span>
                <span>CHECK-IN</span>
              </button>
              <div class="checkin-time">Bấm để điểm danh</div>
            `}
          </div>
        </div>
      `;
    }).join('');

    // Check-in handlers
    content.querySelectorAll('.checkin-btn:not(.checked)').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.innerHTML = `
          <div class="loading-spinner" style="width:40px;height:40px;">
            <div class="spinner-ring"></div>
          </div>
          <span>Đang xử lý...</span>
        `;

        try {
          await checkIn({
            coachId: userData.id,
            venueCoachId: btn.dataset.venueCoach,
            scheduleId: btn.dataset.scheduleKey,
            venueId: btn.dataset.venue,
            date: today,
            checkInBy: userData.id
          });
          showToast({ message: 'Check-in thành công! Chờ admin duyệt.', type: 'success' });
          await loadCheckinData(container);
        } catch (err) {
          showToast({ message: 'Lỗi check-in: ' + err.message, type: 'error' });
          btn.disabled = false;
          btn.innerHTML = `
            <span class="material-icons-round">fingerprint</span>
            <span>CHECK-IN</span>
          `;
        }
      });
    });

  } catch (err) {
    document.getElementById('checkinContent').innerHTML = `
      <div class="empty-state">
        <span class="material-icons-round empty-state-icon">error</span>
        <h3 class="empty-state-title">Lỗi</h3>
        <p class="empty-state-text">${err.message}</p>
      </div>
    `;
  }
}
