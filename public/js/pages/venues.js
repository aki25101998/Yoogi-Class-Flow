// Venue Management page (Admin) - Simplified for V2
import { getVenues, addVenue, updateVenue, deleteVenue } from '../db.js';
import { escapeHtml } from '../utils.js';
import { showModal, closeModal, confirmDialog } from '../components/modal.js';
import { showToast } from '../components/toast.js';

export async function renderVenues(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Quản Lý Cơ Sở</h1>
        <p class="page-subtitle">Quản lý danh sách các địa điểm/phòng tập</p>
      </div>
      <button class="btn btn-primary" id="btnAddVenue">
        <span class="material-icons-round">add_location</span>
        Thêm cơ sở
      </button>
    </div>
    <div id="venuesContainer" class="grid grid-cols-1 md-grid-cols-2" style="gap:var(--sp-4);">
      ${Array(4).fill('<div class="skeleton skeleton-card" style="height:100px;"></div>').join('')}
    </div>
  `;

  document.getElementById('btnAddVenue').addEventListener('click', () => showVenueForm());
  await loadVenues();
}

async function loadVenues() {
  try {
    const venues = await getVenues();
    const container = document.getElementById('venuesContainer');
    if (!container) return;

    if (venues.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1;">
          <span class="material-icons-round empty-state-icon">add_location</span>
          <h3 class="empty-state-title">Chưa có cơ sở nào</h3>
          <p class="empty-state-text">Bấm "Thêm cơ sở" để tạo mới</p>
        </div>
      `;
      return;
    }

    container.innerHTML = venues.map(venue => `
      <div class="card" style="padding:var(--sp-4);display:flex;align-items:center;gap:var(--sp-4);">
        <div class="stat-icon purple" style="width:48px;height:48px;flex-shrink:0;">
          <span class="material-icons-round">business</span>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;font-size:1.1rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${escapeHtml(venue.name)}
          </div>
          <div style="font-size:0.85rem;color:var(--text-secondary);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            <span class="material-icons-round" style="font-size:14px;vertical-align:middle;margin-right:2px;">location_on</span>
            ${escapeHtml(venue.address || 'Chưa có địa chỉ')}
          </div>
        </div>
        <div style="display:flex;gap:4px;">
          <button class="btn btn-sm btn-secondary" data-edit-venue="${venue.id}">
            <span class="material-icons-round" style="font-size:1.1rem;">edit</span>
          </button>
          <button class="btn btn-sm btn-ghost" data-delete-venue="${venue.id}" data-name="${escapeHtml(venue.name)}">
            <span class="material-icons-round" style="font-size:1.1rem;color:var(--accent-danger);">delete</span>
          </button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('[data-edit-venue]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-edit-venue');
        const venue = venues.find(v => v.id === id);
        if (venue) showVenueForm(venue);
      });
    });

    container.querySelectorAll('[data-delete-venue]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-delete-venue');
        const name = btn.getAttribute('data-name');
        confirmDialog(
          'Xóa cơ sở',
          `Bạn có chắc chắn muốn xóa cơ sở <strong>${name}</strong>? Các lớp học thuộc cơ sở này sẽ không thể hoạt động.`,
          async () => {
            try {
              await deleteVenue(id);
              showToast({ message: 'Đã xóa cơ sở', type: 'success' });
              loadVenues();
            } catch (err) {
              showToast({ message: err.message, type: 'error' });
            }
          }
        );
      });
    });

  } catch (err) {
    console.error(err);
    document.getElementById('venuesContainer').innerHTML = `<div class="error-text">Lỗi: ${err.message}</div>`;
  }
}

function showVenueForm(venue = null) {
  const isEdit = !!venue;
  const content = `
    <form id="venueForm">
      <div class="form-group">
        <label class="form-label">Tên cơ sở <span class="required">*</span></label>
        <input type="text" id="vName" class="form-input" required value="${isEdit ? escapeHtml(venue.name) : ''}" placeholder="VD: Cơ sở 1 - Quận 7">
      </div>
      <div class="form-group">
        <label class="form-label">Địa chỉ</label>
        <input type="text" id="vAddress" class="form-input" value="${isEdit ? escapeHtml(venue.address || '') : ''}" placeholder="Số nhà, đường, quận...">
      </div>
    </form>
  `;

  showModal({
    title: isEdit ? 'Sửa Cơ Sở' : 'Thêm Cơ Sở Mới',
    content,
    primaryAction: {
      label: isEdit ? 'Cập nhật' : 'Thêm mới',
      handler: async () => {
        const name = document.getElementById('vName').value.trim();
        const address = document.getElementById('vAddress').value.trim();
        if (!name) return showToast({ message: 'Tên cơ sở không được để trống', type: 'error' });

        try {
          if (isEdit) {
            await updateVenue(venue.id, { name, address });
            showToast({ message: 'Cập nhật thành công', type: 'success' });
          } else {
            await addVenue({ name, address });
            showToast({ message: 'Thêm cơ sở thành công', type: 'success' });
          }
          closeModal();
          loadVenues();
        } catch (err) {
          showToast({ message: err.message, type: 'error' });
        }
      }
    }
  });
}
