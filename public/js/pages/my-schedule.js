// My Schedule page (Coach) — reads from venueCoaches
import { getVenuesForCoach } from '../db.js';
import { getCurrentUserData } from '../auth.js';
import { formatDayShort, escapeHtml } from '../utils.js';

let currentMonth = new Date();

export async function renderMySchedule(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Lịch Của Tôi</h1>
        <p class="page-subtitle">Lịch dạy cố định hàng tháng</p>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn btn-secondary" id="btnPrevMonth">
          <span class="material-icons-round">chevron_left</span>
        </button>
        <div style="display: flex; align-items: center; font-weight: bold; padding: 0 8px;" id="currentMonthDisplay">
          Tháng ...
        </div>
        <button class="btn btn-secondary" id="btnNextMonth">
          <span class="material-icons-round">chevron_right</span>
        </button>
      </div>
    </div>
    <div id="myScheduleContent">
      <div style="padding:var(--sp-8);text-align:center;color:var(--text-muted);">Đang tải...</div>
    </div>
  `;

  document.getElementById('btnPrevMonth').addEventListener('click', () => {
    currentMonth.setMonth(currentMonth.getMonth() - 1);
    loadMyScheduleData();
  });
  
  document.getElementById('btnNextMonth').addEventListener('click', () => {
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    loadMyScheduleData();
  });

  await loadMyScheduleData();
}

async function loadMyScheduleData() {
  try {
    const userData = getCurrentUserData();
    const venueAssignments = await getVenuesForCoach(userData.id);

    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    
    document.getElementById('currentMonthDisplay').textContent = `Tháng ${m + 1} / ${y}`;
    
    const firstDayOfMonth = new Date(y, m, 1);
    const lastDayOfMonth = new Date(y, m + 1, 0);
    const startingDayOfWeek = firstDayOfMonth.getDay() || 7; // 1=Mon, 7=Sun
    const totalDays = lastDayOfMonth.getDate();
    
    const calendarDays = [];
    // Previous month padding
    for (let i = 1; i < startingDayOfWeek; i++) {
      calendarDays.push({ date: null });
    }
    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(y, m, d);
      const dayOfWeek = date.getDay() || 7;
      
      const daySchedules = [];
      if (byDay[dayOfWeek]) {
        byDay[dayOfWeek].forEach(s => {
          daySchedules.push(s);
        });
      }
      daySchedules.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
      calendarDays.push({ date: d, dayOfWeek, schedules: daySchedules });
    }
    // Next month padding to fill rows
    while (calendarDays.length % 7 !== 0) {
      calendarDays.push({ date: null });
    }

    content.innerHTML = `
      <div class="schedule-grid" style="grid-template-rows: auto; grid-auto-rows: minmax(100px, auto);">
        ${[1,2,3,4,5,6,7].map(day => `
          <div class="schedule-day">${formatDayShort(day)}</div>
        `).join('')}
        ${calendarDays.map(cell => {
          if (!cell.date) {
            return `<div class="schedule-cell" style="background: var(--bg-page); border: 1px solid var(--border-color); opacity: 0.5;"></div>`;
          }
          return `
            <div class="schedule-cell" style="border: 1px solid var(--border-color); padding: 4px; min-height: 100px; display: flex; flex-direction: column; gap: 4px;">
              <div style="font-weight: bold; text-align: right; color: var(--text-muted); font-size: 0.8rem;">${cell.date}</div>
              ${cell.schedules.map(s => {
                return `
                  <div class="schedule-item" style="border-left-color: var(--accent-primary); background: rgba(124,106,255,0.1); padding: 4px; margin-bottom: 2px;">
                    <div class="venue-name" style="font-size: 0.7rem; font-weight: bold; color: var(--text-primary);">${escapeHtml(s.venue?.name || '?')}</div>
                    <div class="time-range" style="font-size: 0.65rem; color: var(--text-secondary);">${s.startTime}</div>
                  </div>
                `;
              }).join('')}
            </div>
          `;
        }).join('')}
      </div>
    `;

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
