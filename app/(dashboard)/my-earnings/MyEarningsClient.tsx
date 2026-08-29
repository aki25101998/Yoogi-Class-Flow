'use client';

import { useState } from 'react';
import { useDashboardContext } from '../DashboardProvider';
import { useMyAttendance } from '@/hooks/useMyAttendance';
import SalaryBreakdownModal from '../payroll/components/SalaryBreakdownModal';
import type { SalarySnapshot } from '@/types/salary';

export default function MyEarningsClient() {
  const { context } = useDashboardContext();
  const organizationId = context?.organization?.id;
  const coachId = context?.coach?.id;

  const { sessions, isLoading } = useMyAttendance(organizationId, coachId);

  const [breakdownModal, setBreakdownModal] = useState<{
    isOpen: boolean;
    snapshot: SalarySnapshot | null;
    sessionDate?: string;
    className?: string;
    status?: string;
  }>({ isOpen: false, snapshot: null });

  if (!coachId) {
    return (
      <div style={{ padding: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Thu nhập của tôi</h1>
        <p style={{ color: 'var(--danger)' }}>Bạn chưa được liên kết với hồ sơ HLV nào trong hệ thống.</p>
      </div>
    );
  }

  const unapproved = sessions.filter((s: any) => s.status === 'checked_in');
  const approved = sessions.filter((s: any) => s.status === 'approved');
  const paid = sessions.filter((s: any) => s.status === 'paid');

  const pendingAmount = approved.reduce((acc: number, s: any) => acc + Number(s.calculated_salary), 0);
  const paidAmount = paid.reduce((acc: number, s: any) => acc + Number(s.calculated_salary), 0);

  const openBreakdown = (session: any) => {
    const snapshot = session.salary_config_snapshot as SalarySnapshot | null;
    if (snapshot) {
      setBreakdownModal({
        isOpen: true,
        snapshot,
        sessionDate: session.date,
        className: session.venue_classes?.name,
        status: session.status,
      });
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Thu nhập của tôi</h1>
      
      {isLoading ? (
        <div style={{ padding: '24px', textAlign: 'center', backgroundColor: 'var(--surface-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}>
          Đang tải dữ liệu...
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px', maxWidth: '800px' }}>
            <div style={{ padding: '16px', backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>Chờ duyệt</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-muted)' }}>{unapproved.length} buổi</div>
            </div>
            <div style={{ padding: '16px', backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>Chờ thanh toán (Đã duyệt)</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--warning)' }}>{pendingAmount.toLocaleString('vi-VN')} đ</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{approved.length} buổi</div>
            </div>
            <div style={{ padding: '16px', backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>Đã thanh toán</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--success)' }}>{paidAmount.toLocaleString('vi-VN')} đ</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{paid.length} buổi</div>
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', overflow: 'hidden' }}>
            <div style={{ padding: '16px', backgroundColor: 'var(--surface-hover)', borderBottom: '1px solid var(--border-light)', fontWeight: 'bold' }}>
              Chi tiết buổi dạy
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: 'var(--surface-hover)' }}>
                <tr>
                  <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid var(--border-light)' }}>Ngày</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid var(--border-light)' }}>Lớp</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid var(--border-light)' }}>Trạng thái</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid var(--border-light)', textAlign: 'right' }}>Thu nhập</th>
                </tr>
              </thead>
              <tbody>
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Chưa có dữ liệu.</td>
                  </tr>
                ) : (
                  sessions.map((s: any) => {
                    const hasSnapshot = s.salary_config_snapshot && (s.status === 'approved' || s.status === 'paid');
                    return (
                      <tr key={s.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '12px 16px' }}>{s.date}</td>
                        <td style={{ padding: '12px 16px' }}>{s.venue_classes?.name || '---'}</td>
                        <td style={{ padding: '12px 16px' }}>
                          {s.status === 'checked_in' && <span style={{ color: 'var(--warning)' }}>Chờ duyệt</span>}
                          {s.status === 'approved' && <span style={{ color: 'var(--info)' }}>Chờ thanh toán</span>}
                          {s.status === 'paid' && <span style={{ color: 'var(--success)' }}>Đã thanh toán</span>}
                          {s.status === 'rejected' && <span style={{ color: 'var(--danger)' }}>Đã từ chối</span>}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '500' }}>
                          {s.status === 'checked_in' ? '---' : (
                            <span
                              style={{
                                cursor: hasSnapshot ? 'pointer' : 'default',
                                textDecoration: hasSnapshot ? 'underline' : 'none',
                                color: hasSnapshot ? 'var(--primary)' : 'inherit',
                              }}
                              onClick={() => hasSnapshot && openBreakdown(s)}
                              title={hasSnapshot ? 'Xem chi tiết tính lương' : ''}
                            >
                              {Number(s.calculated_salary).toLocaleString('vi-VN')} đ
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Salary Breakdown Modal */}
      <SalaryBreakdownModal
        isOpen={breakdownModal.isOpen}
        onClose={() => setBreakdownModal({ isOpen: false, snapshot: null })}
        snapshot={breakdownModal.snapshot}
        sessionDate={breakdownModal.sessionDate}
        className={breakdownModal.className}
        coachName={context?.profile?.name}
        status={breakdownModal.status}
      />
    </div>
  );
}
