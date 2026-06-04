// Schedule Management page (Admin) - Read-only view of venueCoaches schedules
import { getSchedulesFromVenueCoaches, getCoaches, getVenues } from '../db.js';
import { formatDayShort, escapeHtml } from '../utils.js';
import { showToast } from '../components/toast.js';

let coachesCache = [];
let venuesCache = [];
const COACH_COLORS = ['#7c6aff', '#00e676', '#ff5252', '#40c4ff', '#ffab40', '#e040fb', '#76ff03', '#ff6e40'];
let currentMonth = new Date();

export async function renderSchedule(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Lịch Dạy</h1>
        <p class="page-subtitle">Xem tổng quan lịch dạy hàng tháng của các HLV</p>
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
    <div id="scheduleContent">
      <div style="padding: var(--sp-8); text-align: center;">
        <div class="loading-spinner" style="margin: 0 auto;">
          <div class="spinner-ring"></div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btnPrevMonth').addEventListener('click', () => {
    currentMonth.setMonth(currentMonth.getMonth() - 1);
    loadScheduleData();
  });
  
  document.getElementById('btnNextMonth').addEventListener('click', () => {
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    loadScheduleData();
  });

  await loadScheduleData();
}

async function loadScheduleData() {
  try {
    const [schedules, coaches, venues] = await Promise.all([
      getSchedulesFromVenueCoaches(),
      getCoaches(),
      getVenues()
    ]);
    coachesCache = coaches;
    venuesCache = venues;

    const coachMap = {};
    coaches.forEach((c, i) => { coachMap[c.id] = { ...c, color: COACH_COLORS[i % COACH_COLORS.length] }; });
    const venueMap = {};
    venues.forEach(v => { venueMap[v.id] = v; });

    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    
    document.getElementById('currentMonthDisplay').textContent = \`Tháng \${m + 1} / \${y}\`;
    
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
      const dayOfWeek = date.getDay() || 7; // 1=Mon ... 7=Sun
      // Find schedules for this dayOfWeek
      const daySchedules = schedules.filter(s => s.dayOfWeek === dayOfWeek).map(s => ({
        ...s,
        dateObj: date
      }));
      // Sort by start time
      daySchedules.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
      calendarDays.push({ date: d, dayOfWeek, schedules: daySchedules });
    }
    // Next month padding to fill rows
    while (calendarDays.length % 7 !== 0) {
      calendarDays.push({ date: null });
    }

    const content = document.getElementById('scheduleContent');

    // Coach legend
    const legendHtml = coaches.map((c, i) => \`
      <span style="display:inline-flex;align-items:center;gap:4px;margin-right:12px;font-size:0.75rem;">
        <span style="width:10px;height:10px;border-radius:50%;background:\${COACH_COLORS[i % COACH_COLORS.length]};display:inline-block;"></span>
        \${escapeHtml(c.name)}
      </span>
    \`).join('');

    content.innerHTML = \`
      <div style="margin-bottom: var(--sp-4); padding: var(--sp-3); background: var(--bg-card); border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
        \${legendHtml || '<span style="color: var(--text-muted); font-size: 0.8rem;">Chưa có HLV nào</span>'}
      </div>
      <div class="schedule-grid" style="grid-template-rows: auto; grid-auto-rows: minmax(100px, auto);">
        \${[1,2,3,4,5,6,7].map(day => \`
          <div class="schedule-day">\${formatDayShort(day)}</div>
        \`).join('')}
        \${calendarDays.map(cell => {
          if (!cell.date) {
            return \`<div class="schedule-cell" style="background: var(--bg-page); border: 1px solid var(--border-color); opacity: 0.5;"></div>\`;
          }
          return \`
            <div class="schedule-cell" style="border: 1px solid var(--border-color); padding: 4px; min-height: 100px; display: flex; flex-direction: column; gap: 4px;">
              <div style="font-weight: bold; text-align: right; color: var(--text-muted); font-size: 0.8rem;">\${cell.date}</div>
              \${cell.schedules.map(s => {
                const coach = coachMap[s.coachId];
                const venue = venueMap[s.venueId];
                return \`
                  <div class="schedule-item" style="border-left-color: \${coach?.color || '#7c6aff'}; background: \${coach?.color || '#7c6aff'}20; cursor: default; padding: 4px; margin-bottom: 2px;">
                    <div class="coach-name" style="font-size: 0.7rem;">\${escapeHtml(coach?.name || '?')}</div>
                    <div class="venue-name" style="font-size: 0.7rem;">\${escapeHtml(venue?.name || '?')}</div>
                    <div class="time-range" style="font-size: 0.65rem;">\${s.startTime}</div>
                  </div>
                \`;
              }).join('')}
            </div>
          \`;
        }).join('')}
      </div>
    \`;

  } catch (err) {
    showToast({ message: 'Lỗi tải lịch: ' + err.message, type: 'error' });
  }
}
