'use client';

import { useState } from 'react';
import { approveSalarySessionAction, payCoachSalaryAction } from './actions';

export default function PayrollClient({ coaches, salaryConfigs, salarySessions, currentUserRole }: any) {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const isAdminOrOwner = currentUserRole === 'admin' || currentUserRole === 'owner';

  // Nhóm các session theo coach
  const payrollData = coaches.map((coach: any) => {
    const sessions = salarySessions.filter((s: any) => s.coach_id === coach.id);
    const config = salaryConfigs.find((c: any) => c.coach_id === coach.id) || { per_session: 0, per_student: 0 };
    
    const unapprovedSessions = sessions.filter((s: any) => s.status === 'checked_in');
    const approvedSessions = sessions.filter((s: any) => s.status === 'approved');
    const paidSessions = sessions.filter((s: any) => s.status === 'paid');
    
    const approvedAmount = approvedSessions.reduce((acc: number, s: any) => acc + Number(s.calculated_salary), 0);
    const paidAmount = paidSessions.reduce((acc: number, s: any) => acc + Number(s.calculated_salary), 0);
    
    return {
      coach,
      config,
      sessions,
      unapprovedSessions,
      approvedSessions,
      paidSessions,
      approvedAmount,
      paidAmount
    };
  });

  const handleApprove = async (sessionId: string, amount: number) => {
    setError('');
    const res = await approveSalarySessionAction(sessionId, amount);
    if (res.success) {
      setSuccess('Đã duyệt buổi dạy');
      setTimeout(() => setSuccess(''), 2000);
      window.location.reload();
    } else {
      setError(res.error || 'Lỗi khi duyệt');
    }
  };

  const handlePay = async (coachId: string, amount: number, sessionIds: string[]) => {
    if (sessionIds.length === 0) return;
    if (confirm(`Xác nhận thanh toán ${amount.toLocaleString('vi-VN')} đ cho HLV này?`)) {
      setError('');
      const res = await payCoachSalaryAction(coachId, amount, sessionIds);
      if (res.success) window.location.reload();
      else setError(res.error || 'Lỗi khi thanh toán');
    }
  };

  return (
    <div>
      {error && <div style={{ color: 'red', marginBottom: '16px' }}>{error}</div>}
      {success && <div style={{ color: 'green', marginBottom: '16px' }}>{success}</div>}

      <div style={{ display: 'grid', gap: '24px' }}>
        {payrollData.map((data: any) => (
          <div key={data.coach.id} style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', borderBottom: '1px solid #e5e7eb', paddingBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold' }}>{data.coach.name}</h3>
                <p style={{ color: '#6b7280', fontSize: '14px' }}>Lương mặc định: {Number(data.config.per_session).toLocaleString('vi-VN')} đ/buổi</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>Cần thanh toán</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444', marginBottom: '8px' }}>
                  {data.approvedAmount.toLocaleString('vi-VN')} đ
                </div>
                {isAdminOrOwner && data.approvedSessions.length > 0 && (
                  <button 
                    onClick={() => handlePay(data.coach.id, data.approvedAmount, data.approvedSessions.map((s:any)=>s.id))}
                    style={{ padding: '6px 16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Thanh toán
                  </button>
                )}
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>Chi tiết buổi dạy</h4>
              {data.sessions.length === 0 ? (
                <p style={{ color: '#6b7280', fontSize: '14px' }}>Chưa có dữ liệu điểm danh.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead style={{ backgroundColor: '#f9fafb' }}>
                    <tr>
                      <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Ngày</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Lớp</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Trạng thái</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>Lương tính</th>
                      {isAdminOrOwner && <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>Thao tác</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {data.sessions.map((s: any) => {
                      const amountToApprove = s.calculated_salary > 0 ? s.calculated_salary : data.config.per_session;
                      return (
                        <tr key={s.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '8px 12px' }}>{s.date}</td>
                          <td style={{ padding: '8px 12px' }}>{s.venue_classes?.name || '---'}</td>
                          <td style={{ padding: '8px 12px' }}>
                            {s.status === 'checked_in' && <span style={{ color: '#d97706' }}>Chờ duyệt</span>}
                            {s.status === 'approved' && <span style={{ color: '#2563eb' }}>Đã duyệt</span>}
                            {s.status === 'paid' && <span style={{ color: '#16a34a' }}>Đã thanh toán</span>}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                            {Number(s.calculated_salary || 0).toLocaleString('vi-VN')} đ
                          </td>
                          {isAdminOrOwner && (
                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                              {s.status === 'checked_in' && (
                                <button 
                                  onClick={() => handleApprove(s.id, amountToApprove)}
                                  style={{ padding: '4px 8px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                                >
                                  Duyệt {Number(amountToApprove).toLocaleString('vi-VN')} đ
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ))}
        {payrollData.length === 0 && (
          <div style={{ padding: '24px', textAlign: 'center', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <p style={{ color: '#6b7280' }}>Chưa có huấn luyện viên nào.</p>
          </div>
        )}
      </div>
    </div>
  );
}
