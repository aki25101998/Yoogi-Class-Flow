'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { approveSalarySessionAction, payCoachSalaryAction } from './actions';

// UI Components
import { PageHeader } from '@/app/components/ui/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { Badge } from '@/app/components/ui/Badge';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/app/components/ui/Table';

export default function PayrollClient({ coaches, salaryConfigs, salarySessions, currentUserRole }: any) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
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
    setLoading(true);
    const res = await approveSalarySessionAction(sessionId, amount);
    setLoading(false);
    if (res.success) {
      setSuccess('Đã duyệt buổi dạy');
      setTimeout(() => setSuccess(''), 2000);
      router.refresh();
    } else {
      setError(res.error || 'Lỗi khi duyệt');
    }
  };

  const handlePay = async (coachId: string, amount: number, sessionIds: string[]) => {
    if (sessionIds.length === 0) return;
    if (confirm(`Xác nhận thanh toán ${amount.toLocaleString('vi-VN')} đ cho HLV này?`)) {
      setError('');
      setLoading(true);
      const res = await payCoachSalaryAction(coachId, amount, sessionIds);
      setLoading(false);
      if (res.success) router.refresh();
      else setError(res.error || 'Lỗi khi thanh toán');
    }
  };

  return (
    <div className="flex-col gap-6">
      <PageHeader 
        title="Quản lý Lương (Payroll)" 
        description="Quản lý tính lương và thanh toán cho các huấn luyện viên"
      />

      {error && <div className="text-danger mb-4 text-sm font-medium">{error}</div>}
      {success && <div className="text-success mb-4 text-sm font-medium">{success}</div>}

      <div className="grid gap-6">
        {payrollData.map((data: any) => (
          <Card key={data.coach.id}>
            <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-light pb-4">
              <div>
                <CardTitle className="text-xl">{data.coach.name}</CardTitle>
                <div className="text-secondary text-sm mt-1">Lương mặc định: {Number(data.config.per_session).toLocaleString('vi-VN')} đ/buổi</div>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-sm text-secondary">Cần thanh toán</div>
                <div className="text-2xl font-bold text-danger mb-2">
                  {data.approvedAmount.toLocaleString('vi-VN')} đ
                </div>
                {isAdminOrOwner && data.approvedSessions.length > 0 && (
                    <Button 
                      onClick={() => handlePay(data.coach.id, data.approvedAmount, data.approvedSessions.map((s:any)=>s.id))}
                      variant="success"
                      disabled={loading}
                    isLoading={loading}
                    leftIcon={<span className="material-icons-round">payments</span>}
                  >
                    Thanh toán
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <h4 className="font-semibold text-main mb-3 text-base">Chi tiết buổi dạy</h4>
              {data.sessions.length === 0 ? (
                <p className="text-muted text-sm italic">Chưa có dữ liệu điểm danh.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <Thead>
                      <Tr>
                        <Th>Ngày</Th>
                        <Th>Lớp</Th>
                        <Th>Trạng thái</Th>
                        <Th className="text-right">Lương tính</Th>
                        {isAdminOrOwner && <Th className="text-right">Thao tác</Th>}
                      </Tr>
                    </Thead>
                    <Tbody>
                      {data.sessions.map((s: any) => {
                        const amountToApprove = s.calculated_salary > 0 ? s.calculated_salary : data.config.per_session;
                        return (
                          <Tr key={s.id}>
                            <Td>{s.date}</Td>
                            <Td>{s.venue_classes?.name || '---'}</Td>
                            <Td>
                              {s.status === 'checked_in' && <Badge variant="warning">Chờ duyệt</Badge>}
                              {s.status === 'approved' && <Badge variant="primary">Đã duyệt</Badge>}
                              {s.status === 'paid' && <Badge variant="success">Đã thanh toán</Badge>}
                            </Td>
                            <Td className="text-right font-medium">
                              {Number(s.calculated_salary || 0).toLocaleString('vi-VN')} đ
                            </Td>
                            {isAdminOrOwner && (
                              <Td className="text-right">
                                {s.status === 'checked_in' && (
                                  <Button 
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleApprove(s.id, amountToApprove)}
                                    disabled={loading}
                                    isLoading={loading}
                                  >
                                    Duyệt {Number(amountToApprove).toLocaleString('vi-VN')} đ
                                  </Button>
                                )}
                              </Td>
                            )}
                          </Tr>
                        );
                      })}
                    </Tbody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {payrollData.length === 0 && (
          <EmptyState 
            title="Chưa có HLV" 
            description="Chưa có huấn luyện viên nào trong hệ thống để tính lương." 
            icon="group"
          />
        )}
      </div>
    </div>
  );
}
