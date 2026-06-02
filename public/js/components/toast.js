// Toast notification system

const ICONS = {
  success: 'check_circle',
  error: 'error',
  warning: 'warning',
  info: 'info'
};

/**
 * Show a toast notification
 * @param {object} options
 * @param {string} options.message
 * @param {'success'|'error'|'warning'|'info'} options.type
 * @param {number} options.duration - ms, default 3000
 */
export function showToast({ message, type = 'info', duration = 3000 }) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="material-icons-round toast-icon">${ICONS[type]}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-dismiss" aria-label="Dismiss">
      <span class="material-icons-round">close</span>
    </button>
    <div class="toast-progress" style="animation-duration: ${duration}ms"></div>
  `;

  // Dismiss on click
  toast.querySelector('.toast-dismiss').addEventListener('click', () => removeToast(toast));

  container.appendChild(toast);

  // Auto-remove
  setTimeout(() => removeToast(toast), duration);
}

function removeToast(toast) {
  if (!toast || toast.classList.contains('removing')) return;
  toast.classList.add('removing');
  setTimeout(() => toast.remove(), 300);
}
