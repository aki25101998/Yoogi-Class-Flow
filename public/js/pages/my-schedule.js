// My Schedule page (Coach) — reads from venueCoaches
import { getVenuesForCoach } from '../db.js';
import { getCurrentUserData } from '../auth.js';
import { formatDayOfWeek, formatDayShort, escapeHtml, getDayOfWeek, getTodayStr } from '../utils.js';

export async function renderMySchedule(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Lịch Của Tôi</h1>
        <p class="page-subtitle">Lịch dạy cố định hàng tuần</p>
      </div>
    </div>
    <div id="myScheduleContent">
      <div style="padding:var(--sp-8);text-align:center;color:var(--text-muted);">Đang tải...</div>
    </div>
  `;

  try {
    const userData = getCurrentUserData();
    const venueAssignments = await getVenuesForCoach(userData.id);

    const today = getTodayStr();
    const todayDow = getDayOfWeek(today);

    // Build schedule entries from venueCoaches
    const byDay = {};
    for (const { venue, venueCoach } of venueAssignments) {
      const days = venueCoach.scheduleDays || [];
      for (const day of days) {
        if (!byDay[day]) byDay[day] = [];
        byDay[day].push({
          venue,
          venueCoach,
          startTime: venueCoach.startTime,
          endTime: venueCoach.endTime
        });
      }
    }

    const content = document.getElementById('myScheduleContent');

    if (venueAssignments.length === 0) {
      content.innerHTML = `
        <div class="empty-state">
          <span class="material-icons-round empty-state-icon">event_busy</span>
          <h3 class="empty-state-title">Chưa có lịch dạy</h3>
          <p class="empty-state-text">Quản trị viên chưa xếp lịch cho bạn</p>
        </div>
      `;
      return;
    }

    content.innerHTML = [1,2,3,4,5,6,7].map(day => {
      if (!byDay[day] || byDay[day].length === 0) return '';
      const isToday = day === todayDow;
      
      return `
        <div class="card mb-4" style="${isToday ? 'border-color: var(--accent-primary); box-shadow: var(--shadow-glow);' : ''}">
          <div class="flex items-center gap-3" style="margin-bottom:var(--sp-4);">
            <h3 style="flex:1;">${isToday ? '📌 ' : ''}${formatDayOfWeek(day)}</h3>
            ${isToday ? '<span class="badge badge-active">Hôm nay</span>' : ''}
          </div>
          ${byDay[day].sort((a, b) => a.startTime.localeCompare(b.startTime)).map(entry => {
            return `
              <div class="flex items-center gap-4" style="padding:var(--sp-3) 0; border-top: 1px solid var(--border-color);">
                <div class="stat-icon blue" style="width:36px;height:36px;">
                  <span class="material-icons-round" style="font-size:1rem;">location_on</span>
                </div>
                <div style="flex:1;">
                  <div style="font-weight:600;">${escapeHtml(entry.venue?.name || '?')}</div>
                  <div style="font-size:0.8rem;color:var(--text-secondary);">${escapeHtml(entry.venue?.address || '')}</div>
                </div>
                <div style="text-align:right;">
                  <div style="font-weight:600;color:var(--accent-primary);">${entry.startTime} - ${entry.endTime}</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }).filter(Boolean).join('');

    if (!content.innerHTML.trim()) {
      content.innerHTML = `
        <div class="empty-state">
          <span class="material-icons-round empty-state-icon">event_busy</span>
          <h3 class="empty-state-title">Chưa có lịch dạy</h3>
          <p class="empty-state-text">Quản trị viên chưa xếp lịch cho bạn</p>
        </div>
      `;
    }

  } catch (err) {
    document.getElementById('myScheduleContent').innerHTML = `
      <div class="empty-state">
        <span class="material-icons-round empty-state-icon">error</span>
        <h3 class="empty-state-title">Lỗi tải dữ liệu</h3>
        <p class="empty-state-text">${err.message}</p>
      </div>
    `;
  }
}
