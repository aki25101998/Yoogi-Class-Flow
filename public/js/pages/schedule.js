// Schedule Management page (Admin) - Read-only view of venueCoaches schedules
import { getSchedulesFromVenueCoaches, getCoaches, getVenues } from '../db.js';
import { formatDayShort, escapeHtml } from '../utils.js';
import { showToast } from '../components/toast.js';

let coachesCache = [];
let venuesCache = [];
const COACH_COLORS = ['#7c6aff', '#00e676', '#ff5252', '#40c4ff', '#ffab40', '#e040fb', '#76ff03', '#ff6e40'];

export async function renderSchedule(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Lịch Dạy Cố Định</h1>
        <p class="page-subtitle">Xem tổng quan lịch dạy hàng tuần của các HLV</p>
      </div>
      <a href="#/venues" class="btn btn-primary" id="btnGoToVenues">
        <span class="material-icons-round">edit_calendar</span>
        Quản lý lịch tại mục Địa điểm
      </a>
    </div>
    <div id="scheduleContent">
      <div style="padding: var(--sp-8); text-align: center;">
        <div class="loading-spinner" style="margin: 0 auto;">
          <div class="spinner-ring"></div>
        </div>
      </div>
    </div>
  `;

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

    // Group schedules by day
    const byDay = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };
    schedules.forEach(s => {
      if (byDay[s.dayOfWeek]) byDay[s.dayOfWeek].push(s);
    });

    // Sort each day by start time
    Object.values(byDay).forEach(arr => arr.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '')));

    const content = document.getElementById('scheduleContent');

    // Coach legend
    const legendHtml = coaches.map((c, i) => `
      <span style="display:inline-flex;align-items:center;gap:4px;margin-right:12px;font-size:0.75rem;">
        <span style="width:10px;height:10px;border-radius:50%;background:${COACH_COLORS[i % COACH_COLORS.length]};display:inline-block;"></span>
        ${escapeHtml(c.name)}
      </span>
    `).join('');

    content.innerHTML = `
      <div style="margin-bottom: var(--sp-4); padding: var(--sp-3); background: var(--bg-card); border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
        ${legendHtml || '<span style="color: var(--text-muted); font-size: 0.8rem;">Chưa có HLV nào</span>'}
      </div>
      <div class="schedule-grid">
        ${[1,2,3,4,5,6,7].map(day => `
          <div class="schedule-day">${formatDayShort(day)}</div>
        `).join('')}
        ${[1,2,3,4,5,6,7].map(day => `
          <div class="schedule-cell" data-day="${day}">
            ${byDay[day].map(s => {
              const coach = coachMap[s.coachId];
              const venue = venueMap[s.venueId];
              return `
                <div class="schedule-item" style="border-left-color: ${coach?.color || '#7c6aff'}; background: ${coach?.color || '#7c6aff'}20; cursor: default;">
                  <div class="coach-name">${escapeHtml(coach?.name || '?')}</div>
                  <div class="venue-name">${escapeHtml(venue?.name || '?')}</div>
                  <div class="time-range">${s.startTime} - ${s.endTime}</div>
                </div>
              `;
            }).join('') || '<div style="color:var(--text-muted);font-size:0.65rem;text-align:center;padding:var(--sp-2);">—</div>'}
          </div>
        `).join('')}
      </div>
    `;

  } catch (err) {
    showToast({ message: 'Lỗi tải lịch: ' + err.message, type: 'error' });
  }
}
