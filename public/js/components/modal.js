// Modal dialog component

let currentResolve = null;

/**
 * Show a modal dialog
 * @param {object} options
 * @param {string} options.title
 * @param {string|HTMLElement} options.content - HTML string or DOM element
 * @param {string} options.confirmText - e.g. "Lưu"
 * @param {string} options.cancelText - e.g. "Hủy"
 * @param {string} options.confirmClass - CSS class for confirm button
 * @param {boolean} options.showFooter - default true
 * @param {Function} options.onConfirm - called when confirm clicked, receives modal body element
 * @param {Function} options.onCancel
 */
export function showModal({
  title = '',
  content = '',
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  confirmClass = 'btn-primary',
  showFooter = true,
  onConfirm = null,
  onCancel = null,
  wide = false
} = {}) {
  const overlay = document.getElementById('modalOverlay');
  const titleEl = document.getElementById('modalTitle');
  const bodyEl = document.getElementById('modalBody');
  const footerEl = document.getElementById('modalFooter');
  const closeBtn = document.getElementById('modalClose');
  const modalEl = document.getElementById('modalContent');

  if (!overlay) return;

  // Set title
  titleEl.textContent = title;

  // Set content
  if (typeof content === 'string') {
    bodyEl.innerHTML = content;
  } else if (content instanceof HTMLElement) {
    bodyEl.innerHTML = '';
    bodyEl.appendChild(content);
  }

  // Set width
  modalEl.style.maxWidth = wide ? '720px' : '520px';

  // Set footer
  if (showFooter) {
    footerEl.innerHTML = `
      <button class="btn btn-secondary" id="modalCancelBtn">${cancelText}</button>
      <button class="btn ${confirmClass}" id="modalConfirmBtn">${confirmText}</button>
    `;
    footerEl.style.display = '';

    document.getElementById('modalCancelBtn').addEventListener('click', () => {
      closeModal();
      if (onCancel) onCancel();
    });

    document.getElementById('modalConfirmBtn').addEventListener('click', () => {
      if (onConfirm) onConfirm(bodyEl);
    });
  } else {
    footerEl.style.display = 'none';
  }

  // Close button
  const closeHandler = () => {
    closeModal();
    if (onCancel) onCancel();
  };
  closeBtn.onclick = closeHandler;

  // Backdrop click
  overlay.onclick = (e) => {
    if (e.target === overlay) closeHandler();
  };

  // Escape key
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeHandler();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);

  // Show
  overlay.classList.remove('hidden');
}

/**
 * Close the current modal
 */
export function closeModal() {
  const overlay = document.getElementById('modalOverlay');
  if (overlay) {
    overlay.classList.add('hidden');
  }
}

/**
 * Show a confirmation dialog
 * @param {string} title
 * @param {string} message
 * @returns {Promise<boolean>}
 */
export function confirmDialog(title, message) {
  return new Promise((resolve) => {
    showModal({
      title,
      content: `<p style="color: var(--text-secondary); line-height: 1.6;">${message}</p>`,
      confirmText: 'Xác nhận',
      cancelText: 'Hủy',
      confirmClass: 'btn-danger',
      onConfirm: () => { closeModal(); resolve(true); },
      onCancel: () => resolve(false)
    });
  });
}
