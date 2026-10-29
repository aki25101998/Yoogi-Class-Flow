"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Badge";
import { formatBusinessDateVN, formatBusinessTime } from "@/utils/date";

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
    'venues': 'Địa điểm đào tạo',
    'venue_classes': 'Lớp học',
    'class_coaches': 'Phân công HLV',
    'students': 'Học viên',
    'class_students': 'Ghi danh lớp học',
    'schedules': 'Lịch học định kỳ',
    'attendance': 'Điểm danh HLV',
    'student_session_attendance': 'Điểm danh học viên',
    'student_attendance': 'Điểm danh (Legacy)',
    'teacher_salaries': 'Cấu hình lương',
    'salary_rules': 'Quy tắc lương',
    'salary_profiles': 'Hồ sơ lương',
    'payroll_periods': 'Kỳ lương',
    'payroll_payments': 'Thanh toán lương',
    'tuition': 'Học phí',
    'finance_transactions': 'Giao dịch thu chi',
    'class_sessions': 'Buổi học thực tế',
    'coaches': 'Huấn luyện viên',
    'organization_belts': 'Cấp đai',
    'organizations': 'Thông tin tổ chức',
    'organization_members': 'Thành viên & phân quyền'
  };

  const stats: Record<string, { inserted: number, updated: number, deleted: number }> = {};
  
  if (changes) {
    changes.forEach((c: any) => {
      if (!stats[c.table_name]) {
        stats[c.table_name] = { inserted: 0, updated: 0, deleted: 0 };
      }
      if (c.operation === 'INSERT') stats[c.table_name].inserted++;
      if (c.operation === 'UPDATE') stats[c.table_name].updated++;
      if (c.operation === 'DELETE') stats[c.table_name].deleted++;
    });
  }

  const initial = (profile?.name || 'H').trim().slice(0, 1).toUpperCase();

  return (
    <div 
      className="modal-backdrop" 
      onClick={onClose} 
      style={{ 
        position: 'fixed', 
        inset: 0, 
        background: 'rgba(0, 0, 0, 0.6)', 
        backdropFilter: 'blur(4px)',
        zIndex: 1000, 
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
          maxWidth: '720px', 
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--border-light)',
          overflow: 'hidden'
        }}
      >
        {/* MODAL HEADER */}
        <div style={{ 
          padding: '20px 24px', 
          borderBottom: '1px solid var(--border-light)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          background: 'var(--surface)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span className="material-icons-round" style={{ fontSize: '22px' }}>history_edu</span>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                  Chi tiết phiên bản #{version.version_number}
                </h2>
                {isCurrent && (
                  <Badge variant="success">Đang áp dụng</Badge>
                )}
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                {formatBusinessTime(version.created_at)} • {formatBusinessDateVN(version.created_at)}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{ 
              background: 'var(--surface-hover)', 
              border: 'none', 
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer', 
              color: 'var(--text-secondary)', 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            aria-label="Đóng"
          >
            <span className="material-icons-round" style={{ fontSize: '18px' }}>close</span>
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Metadata Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            background: 'var(--surface-hover)',
            padding: '16px',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border-light)'
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em', marginBottom: '4px' }}>
                Người thực hiện
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
                ) : (
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>
                    {initial}
                  </div>
                )}
                <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  {profile?.name || 'Hệ thống'}
                </span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em', marginBottom: '4px' }}>
                Loại tác vụ
              </div>
              <div>
                <Badge variant={version.action_type === 'CREATE' ? 'success' : (version.action_type === 'UPDATE' ? 'info' : (version.action_type === 'DELETE' ? 'danger' : 'warning'))}>
                  {version.action_type}
                </Badge>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em', marginBottom: '4px' }}>
                Thời điểm ghi nhận
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>
                {formatBusinessDateVN(version.created_at)} ({formatBusinessTime(version.created_at)})
              </div>
            </div>
          </div>

          {/* Summary Box */}
          <div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-icons-round" style={{ fontSize: '16px', color: 'var(--primary)' }}>description</span>
              Nội dung tóm tắt
            </div>
            <div style={{ 
              padding: '14px 16px', 
              background: 'var(--surface-hover)', 
              borderRadius: 'var(--radius-lg)', 
              color: 'var(--text-main)',
              fontSize: '0.9375rem',
              lineHeight: 1.5,
              border: '1px solid var(--border-light)'
            }}>
              {version.summary || 'Không có mô tả chi tiết'}
            </div>
          </div>

          {/* Data Changes Breakdown */}
          <div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-icons-round" style={{ fontSize: '16px', color: 'var(--primary)' }}>data_object</span>
              Các bảng dữ liệu bị ảnh hưởng
            </div>

            {isLoading ? (
              <div style={{ padding: '24px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-lg)', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Đang tải chi tiết các thay đổi...
              </div>
            ) : !changes || changes.length === 0 ? (
              <div style={{ padding: '20px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-lg)', color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.875rem' }}>
                Không có bản ghi chi tiết riêng lẻ (Ghi nhận ở mức hệ thống).
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Object.entries(stats).map(([table, stat]) => (
                  <div 
                    key={table} 
                    style={{ 
                      padding: '12px 18px', 
                      background: 'var(--surface-hover)', 
                      borderRadius: 'var(--radius-lg)', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      border: '1px solid var(--border-light)'
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9375rem' }}>
                        {tableLabels[table] || table}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                        ({table})
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', fontSize: '0.8125rem', fontWeight: 600 }}>
                      {stat.inserted > 0 && (
                        <span style={{ color: 'var(--success)', background: 'var(--success-bg)', padding: '3px 8px', borderRadius: 'var(--radius-sm)' }}>
                          +{stat.inserted} thêm mới
                        </span>
                      )}
                      {stat.updated > 0 && (
                        <span style={{ color: 'var(--warning)', background: 'var(--warning-bg)', padding: '3px 8px', borderRadius: 'var(--radius-sm)' }}>
                          ~{stat.updated} cập nhật
                        </span>
                      )}
                      {stat.deleted > 0 && (
                        <span style={{ color: 'var(--danger)', background: 'var(--danger-bg)', padding: '3px 8px', borderRadius: 'var(--radius-sm)' }}>
                          -{stat.deleted} đã xóa
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div style={{ 
          padding: '16px 24px', 
          borderTop: '1px solid var(--border-light)', 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: '12px', 
          background: 'var(--surface)'
        }}>
          <Button 
            variant="outline" 
            onClick={onClose}
          >
            Đóng
          </Button>

          {isAdminOrOwner && !isCurrent && (
            <Button 
              variant="danger"
              onClick={() => onRestoreRequest(version)}
              leftIcon={<span className="material-icons-round">restore</span>}
            >
              Khôi phục về phiên bản này
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
