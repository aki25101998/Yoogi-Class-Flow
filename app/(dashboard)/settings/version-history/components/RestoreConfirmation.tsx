"use client";

import { Button } from "@/app/components/ui/Button";
import { formatBusinessDateVN, formatBusinessTime } from "@/utils/date";

export default function RestoreConfirmation({ version, isRestoring, onConfirm, onCancel }: any) {
  return (
    <div 
      className="modal-backdrop" 
      onClick={onCancel}
      style={{ 
        position: 'fixed', 
        inset: 0, 
        background: 'rgba(0, 0, 0, 0.65)', 
        backdropFilter: 'blur(4px)',
        zIndex: 1100, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()}
        style={{ 
          background: 'var(--surface)', 
          borderRadius: 'var(--radius-2xl)', 
          width: '100%', 
          maxWidth: '520px', 
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
          border: '1px solid var(--border-light)'
        }}
      >
        <div style={{ padding: '28px 24px 20px 24px', textAlign: 'center' }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            borderRadius: '50%', 
            background: 'var(--danger-bg)', 
            color: 'var(--danger)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 16px auto',
            boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)'
          }}>
            <span className="material-icons-round" style={{ fontSize: '36px' }}>history</span>
          </div>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 8px 0' }}>
            Khôi phục toàn bộ dữ liệu
          </h2>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '18px', lineHeight: 1.5 }}>
            Bạn đang yêu cầu đưa dữ liệu của tổ chức quay trở về mốc phiên bản đã lưu:
          </p>
          
          <div style={{ 
            background: 'var(--surface-hover)', 
            padding: '16px', 
            borderRadius: 'var(--radius-xl)', 
            marginBottom: '20px', 
            textAlign: 'left',
            border: '1px solid var(--border-light)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1rem' }}>
                Phiên bản #{version.version_number}
              </span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                {formatBusinessTime(version.created_at)} • {formatBusinessDateVN(version.created_at)}
              </span>
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {version.summary || 'Không có mô tả chi tiết'}
            </div>
          </div>

          <div style={{ 
            textAlign: 'left', 
            fontSize: '0.8125rem', 
            color: 'var(--text-main)', 
            background: 'rgba(255, 107, 53, 0.08)', 
            padding: '14px 16px', 
            borderRadius: 'var(--radius-lg)', 
            borderLeft: '4px solid var(--accent-energy)', 
            marginBottom: '8px' 
          }}>
            <strong style={{ color: 'var(--accent-energy)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-icons-round" style={{ fontSize: '16px' }}>warning</span>
              Lưu ý quan trọng:
            </strong>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: '18px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <li style={{ marginBottom: '4px' }}>Dữ liệu hiện tại sẽ được cập nhật để khớp với trạng thái tại phiên bản này.</li>
              <li>Lịch sử trước đó sẽ KHÔNG bị mất. Hệ thống sẽ tự động tạo một phiên bản &quot;Khôi phục&quot; mới để ghi nhận.</li>
            </ul>
          </div>
        </div>

        <div style={{ 
          padding: '16px 24px', 
          borderTop: '1px solid var(--border-light)', 
          display: 'flex', 
          gap: '12px', 
          background: 'var(--surface)' 
        }}>
          <Button 
            onClick={onCancel}
            disabled={isRestoring}
            variant="outline"
            style={{ flex: 1 }}
          >
            Hủy bỏ
          </Button>
          
          <Button 
            onClick={onConfirm}
            disabled={isRestoring}
            isLoading={isRestoring}
            variant="danger"
            style={{ flex: 1 }}
            leftIcon={<span className="material-icons-round">restore</span>}
          >
            {isRestoring ? 'Đang khôi phục...' : 'Xác nhận khôi phục'}
          </Button>
        </div>
      </div>
    </div>
  );
}
