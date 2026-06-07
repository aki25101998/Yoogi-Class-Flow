import { getSettings, updateSettings } from '../db.js';
import { showToast } from '../components/toast.js';

export async function renderSettings(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Cài Đặt Hệ Thống</h1>
        <p class="page-subtitle">Quản lý cấu hình chung cho ứng dụng</p>
      </div>
    </div>
    
    <div class="card" style="max-width: 600px; margin-top: 1rem;">
      <div style="padding-bottom: 1rem; border-bottom: 1px solid var(--border-color); margin-bottom: 1rem;">
        <h3 style="font-size: 1.1rem; font-weight: 600;">Danh Sách Cấp Đai</h3>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.25rem;">
          Nhập mỗi cấp đai trên một dòng. Danh sách này sẽ xuất hiện trong dropdown chọn cấp đai của Học viên và HLV.
        </p>
      </div>
      <div>
        <div class="form-group">
          <textarea id="beltRanksInput" class="form-input" rows="10" style="resize: vertical; line-height: 1.5; font-size: 0.95rem;"></textarea>
        </div>
        <div style="text-align: right;">
          <button class="btn btn-primary" id="btnSaveSettings">
            <span class="material-icons-round">save</span>
            Lưu cài đặt
          </button>
        </div>
      </div>
    </div>
  `;

  const btnSave = document.getElementById('btnSaveSettings');
  const txtBelts = document.getElementById('beltRanksInput');
  
  // Load settings
  try {
    const settings = await getSettings();
    if (settings && settings.beltRanks) {
      txtBelts.value = settings.beltRanks.join('\n');
    }
  } catch (e) {
    showToast({ message: 'Lỗi tải cài đặt: ' + e.message, type: 'error' });
  }

  // Save settings
  btnSave.addEventListener('click', async () => {
    btnSave.disabled = true;
    const originalText = btnSave.innerHTML;
    btnSave.innerHTML = '<span class="material-icons-round">hourglass_empty</span> Đang lưu...';
    
    try {
      const rawText = txtBelts.value;
      const beltRanks = rawText.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
        
      await updateSettings({ beltRanks });
      showToast({ message: 'Đã lưu cài đặt', type: 'success' });
    } catch (e) {
      showToast({ message: 'Lỗi lưu cài đặt: ' + e.message, type: 'error' });
    } finally {
      btnSave.disabled = false;
      btnSave.innerHTML = originalText;
    }
  });
}
