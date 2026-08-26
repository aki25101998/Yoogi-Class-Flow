'use client';

import { useDashboardContext } from '../DashboardProvider';
import { useMyAttendance } from '@/hooks/useMyAttendance';

export default function MyAttendanceClient() {
  const { context } = useDashboardContext();
  const organizationId = context?.organization?.id;
  const coachId = context?.coach?.id;

  const { sessions, isLoading } = useMyAttendance(organizationId, coachId);

  if (!coachId) {
    return (
      <div style={{ padding: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Lịch sử điểm danh</h1>
        <p style={{ color: 'var(--danger)' }}>Bạn chưa được liên kết với hồ sơ HLV nào trong hệ thống.</p>
      </div>
    );
  }

  // Lịch sử 30 buổi gần nhất
  const displaySessions = sessions.slice(0, 30);

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Lịch sử điểm danh (30 buổi gần nhất)</h1>
      
      {isLoading ? (
        <div style={{ padding: '24px', textAlign: 'center', backgroundColor: 'var(--surface-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}>
          Đang tải dữ liệu...
        </div>
      ) : displaySessions.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', backgroundColor: 'var(--surface-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}>
          Chưa có dữ liệu điểm danh.
        </div>
      ) : (
        <div style={{ backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: 'var(--surface-hover)' }}>
              <tr>
                <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid var(--border-light)' }}>Ngày</th>
                <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid var(--border-light)' }}>Lớp</th>
                <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid var(--border-light)' }}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {displaySessions.map((s: any) => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '12px 16px' }}>{s.date}</td>
                  <td style={{ padding: '12px 16px' }}>{s.venue_classes?.name || '---'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {s.status === 'checked_in' && <span style={{ color: 'var(--warning)' }}>Đã Check-in</span>}
                    {s.status === 'approved' && <span style={{ color: 'var(--info)' }}>Đã được duyệt</span>}
                    {s.status === 'paid' && <span style={{ color: 'var(--success)' }}>Đã thanh toán lương</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
