"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";

const formatDateTime = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} — ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

export default function VersionDetailModal({ version, isCurrent, isAdminOrOwner, onClose, onRestoreRequest }: any) {
  const supabase = createClient();
  const profile = Array.isArray(version.profiles) ? version.profiles[0] : version.profiles;

  const { data: changes, isLoading } = useQuery({
    queryKey: ['version_changes', version.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('version_changes')
        .select('table_name, operation')
        .eq('version_id', version.id);
      if (error) throw error;
      return data;
    }
  });

  // Calculate stats
  const tableLabels: Record<string, string> = {
    'venues': 'Địa điểm',
    'venue_classes': 'Lớp học',
    'class_coaches': 'Phân công HLV',
    'students': 'Học viên',
    'class_students': 'Ghi danh',
    'schedules': 'Lịch học',
    'attendance': 'Điểm danh',
    'student_session_attendance': 'Điểm danh học viên',
    'teacher_salaries': 'Lương HLV',
    'tuition': 'Học phí',
    'finance_transactions': 'Giao dịch tài chính',
    'class_sessions': 'Buổi học'
  };

  const stats: Record<string, { inserted: number, updated: number, deleted: number }> = {};
  
  if (changes) {
    changes.forEach(c => {
      if (!stats[c.table_name]) {
        stats[c.table_name] = { inserted: 0, updated: 0, deleted: 0 };
      }
      if (c.operation === 'INSERT') stats[c.table_name].inserted++;
      if (c.operation === 'UPDATE') stats[c.table_name].updated++;
      if (c.operation === 'DELETE') stats[c.table_name].deleted++;
    });
  }

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div 
          className="modal-content" 
          onClick={e => e.stopPropagation()}
          style={{ 
            background: 'var(--surface)', 
            borderRadius: '12px', 
            width: '90%', 
            maxWidth: '500px', 
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 10 }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
              Chi tiết phiên bản #{version.version_number}
            </h2>
            <button 
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}
            >
              <span className="material-icons-round">close</span>
            </button>
          </div>

          <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Thời gian:</div>
              <div style={{ fontSize: '15px', color: 'var(--text-main)', fontWeight: 500 }}>
                {formatDateTime(version.created_at)}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Thực hiện bởi:</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
                ) : (
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600 }}>
                    {profile?.name ? profile.name.charAt(0).toUpperCase() : '?'}
                  </div>
                )}
                <span style={{ fontSize: '15px', color: 'var(--text-main)', fontWeight: 500 }}>
                  {profile?.name || 'Hệ thống'}
                </span>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Tóm tắt:</div>
              <div style={{ fontSize: '15px', color: 'var(--text-main)' }}>
                {version.summary}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>Dữ liệu thay đổi:</div>
              
              {isLoading ? (
                <div style={{ padding: '16px', background: 'var(--surface-hover)', borderRadius: '8px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Đang tải chi tiết...
                </div>
              ) : !changes || changes.length === 0 ? (
                <div style={{ padding: '16px', background: 'var(--surface-hover)', borderRadius: '8px', color: 'var(--text-secondary)' }}>
                  Không có thay đổi dữ liệu nào được ghi nhận.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {Object.entries(stats).map(([table, stat]) => (
                    <div key={table} style={{ padding: '12px 16px', background: 'var(--surface-hover)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>{tableLabels[table] || table}</span>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '13px' }}>
                        {stat.inserted > 0 && <span style={{ color: 'var(--success)' }}>+{stat.inserted} thêm mới</span>}
                        {stat.updated > 0 && <span style={{ color: 'var(--warning)' }}>~{stat.updated} cập nhật</span>}
                        {stat.deleted > 0 && <span style={{ color: 'var(--danger)' }}>-{stat.deleted} đã xóa</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'var(--surface-hover)', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
            <button 
              onClick={onClose}
              className="btn btn-outline"
            >
              Đóng
            </button>
            
            {isAdminOrOwner && !isCurrent && (
              <button 
                onClick={() => onRestoreRequest(version)}
                className="btn btn-primary"
                style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }}
              >
                Khôi phục phiên bản này
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
