// Utility functions for the Coach Attendance Tracker

/**
 * Format number as Vietnamese currency (VNĐ)
 * @param {number} amount 
 * @returns {string} e.g. "250.000 ₫"
 */
export function formatCurrency(amount) {
  if (amount == null || isNaN(amount)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
}

/**
 * Format date string to Vietnamese format
 * @param {string} dateStr - "YYYY-MM-DD"
 * @returns {string} e.g. "01/06/2026"
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Format Firestore Timestamp or Date to "HH:mm"
 * @param {object|Date|string} ts 
 * @returns {string}
 */
export function formatTime(ts) {
  if (!ts) return '';
  if (typeof ts === 'string') return ts;
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/**
 * Get day of week name in Vietnamese
 * @param {number} num - 1=Monday, 7=Sunday
 * @returns {string}
 */
export function formatDayOfWeek(num) {
  const days = {
    1: 'Thứ 2', 2: 'Thứ 3', 3: 'Thứ 4',
    4: 'Thứ 5', 5: 'Thứ 6', 6: 'Thứ 7', 7: 'Chủ nhật'
  };
  return days[num] || '';
}

/**
 * Get short day name
 * @param {number} num 
 * @returns {string}
 */
export function formatDayShort(num) {
  const days = { 1: 'T2', 2: 'T3', 3: 'T4', 4: 'T5', 5: 'T6', 6: 'T7', 7: 'CN' };
  return days[num] || '';
}

/**
 * Get current year-month string
 * @returns {string} e.g. "2026-06"
 */
export function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get array of all date strings in a given month
 * @param {string} yearMonth - "YYYY-MM"
 * @returns {string[]} array of "YYYY-MM-DD"
 */
export function getMonthDates(yearMonth) {
  const [year, month] = yearMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const dates = [];
  for (let d = 1; d <= daysInMonth; d++) {
    dates.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return dates;
}

/**
 * Get today's date as "YYYY-MM-DD"
 * @returns {string}
 */
export function getTodayStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Get day of week (1=Monday, 7=Sunday) for a date string
 * @param {string} dateStr - "YYYY-MM-DD"
 * @returns {number}
 */
export function getDayOfWeek(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const day = date.getDay(); // 0=Sun, 1=Mon, ...
  return day === 0 ? 7 : day;
}

/**
 * Get the month name in Vietnamese
 * @param {string} yearMonth - "YYYY-MM"
 * @returns {string} e.g. "Tháng 6, 2026"
 */
export function formatMonth(yearMonth) {
  const [year, month] = yearMonth.split('-').map(Number);
  return `Tháng ${month}, ${year}`;
}

/**
 * Get a formatted "today" string for display
 * @returns {string} e.g. "Chủ nhật, 01/06/2026"
 */
export function getTodayDisplay() {
  const today = getTodayStr();
  const dow = getDayOfWeek(today);
  return `${formatDayOfWeek(dow)}, ${formatDate(today)}`;
}

/**
 * Escape HTML to prevent XSS
 * @param {string} str 
 * @returns {string}
 */
export function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Debounce function
 * @param {Function} fn 
 * @param {number} ms 
 * @returns {Function}
 */
export function debounce(fn, ms = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/**
 * Calculate hours between two time strings
 * @param {string} start - "HH:MM"
 * @param {string} end - "HH:MM"
 * @returns {number} hours
 */
export function calculateHours(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return (eh * 60 + em - sh * 60 - sm) / 60;
}

/**
 * Get previous month string
 * @param {string} yearMonth - "YYYY-MM"
 * @returns {string}
 */
export function getPrevMonth(yearMonth) {
  const [year, month] = yearMonth.split('-').map(Number);
  if (month === 1) return `${year - 1}-12`;
  return `${year}-${String(month - 1).padStart(2, '0')}`;
}

/**
 * Get next month string
 * @param {string} yearMonth - "YYYY-MM"
 * @returns {string}
 */
export function getNextMonth(yearMonth) {
  const [year, month] = yearMonth.split('-').map(Number);
  if (month === 12) return `${year + 1}-01`;
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

/**
 * Format month name for calendar navigation
 * @param {string} yearMonth
 * @returns {string}
 */
export function formatMonthYear(yearMonth) {
  const [year, month] = yearMonth.split('-').map(Number);
  const months = ['', 'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
  return `${months[month]} ${year}`;
}
