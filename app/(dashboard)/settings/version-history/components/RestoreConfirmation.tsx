"use client";

const formatDateTime = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} - ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

export default function RestoreConfirmation({ version, isRestoring, onConfirm, onCancel }: any) {
  return (
    <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div 
        className="modal-content" 
        style={{ 
          background: 'var(--surface)', 
          borderRadius: '12px', 
          width: '90%', 
          maxWidth: '480px', 
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden'
        }}
      >
        <div style={{ padding: '24px 24px 0 24px', textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--danger-light)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
            <span className="material-icons-round" style={{ fontSize: '32px' }}>warning</span>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 12px 0' }}>
            Khôi phục dữ liệu
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
            Bạn đang yêu cầu khôi phục toàn bộ dữ liệu của tổ chức về phiên bản:
          </p>
          
          <div style={{ background: 'var(--surface-hover)', padding: '16px', borderRadius: '8px', marginBottom: '24px', textAlign: 'left' }}>
            <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
              Phiên bản #{version.version_number}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Lúc {formatDateTime(version.created_at)}
            </div>
          </div>

          <div style={{ textAlign: 'left', fontSize: '14px', color: 'var(--text-main)', background: 'rgba(255, 152, 0, 0.1)', padding: '12px 16px', borderRadius: '8px', borderLeft: '4px solid #ff9800', marginBottom: '24px' }}>
            <strong>Lưu ý quan trọng:</strong>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', color: 'var(--text-secondary)' }}>
              <li style={{ marginBottom: '4px' }}>Dữ liệu hiện tại sẽ bị thay đổi để khớp với phiên bản này.</li>
              <li>Lịch sử phiên bản hiện tại sẽ không bị xoá. Hệ thống sẽ tự động tạo một phiên bản &quot;Khôi phục&quot; mới.</li>
            </ul>
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-light)', display: 'flex', gap: '12px', background: 'var(--surface-hover)' }}>
          <button 
            onClick={onCancel}
            disabled={isRestoring}
            className="btn btn-outline"
            style={{ flex: 1 }}
          >
            Hủy
          </button>
          
          <button 
            onClick={onConfirm}
            disabled={isRestoring}
            className="btn btn-primary"
            style={{ flex: 1, background: 'var(--danger)', borderColor: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {isRestoring ? (
              <>
                <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span>
                Đang khôi phục...
              </>
            ) : (
              'Xác nhận khôi phục'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
