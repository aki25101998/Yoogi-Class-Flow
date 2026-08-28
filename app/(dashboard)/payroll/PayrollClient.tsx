'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { approveSalarySessionAction, payCoachSalaryAction, updateSalaryConfigAction } from './actions';
import { usePayroll } from '@/hooks/usePayroll';
import { useDashboardContext } from '../DashboardProvider';

// UI Components
import { PageHeader } from '@/app/components/ui/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { Badge } from '@/app/components/ui/Badge';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/app/components/ui/Table';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/app/components/ui/Modal';
import { Input } from '@/app/components/ui/Input';

function PayrollSkeleton() {
  return (
    <div className="grid gap-6 animate-pulse">
      {[1, 2].map((i) => (
        <Card key={i}>
          <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-light pb-4">
            <div>
              <div className="h-6 bg-surface-hover rounded w-32 mb-2"></div>
              <div className="h-4 bg-surface-hover rounded w-48"></div>
            </div>
            <div className="text-left sm:text-right">
              <div className="h-4 bg-surface-hover rounded w-24 mb-2"></div>
              <div className="h-8 bg-surface-hover rounded w-32 mb-2"></div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-4 bg-surface-hover rounded w-40 mb-4"></div>
            <div className="h-32 bg-surface-hover rounded w-full"></div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function PayrollClient() {
  const { context } = useDashboardContext();
  const organizationId = context?.organization?.id;
  const currentUserRole = context?.membership?.role;

  const { coaches, salaryConfigs, salarySessions, isLoading: isFetching } = usePayroll(organizationId);
  const queryClient = useQueryClient();

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [configModalCoach, setConfigModalCoach] = useState<any>(null);
  const [configForm, setConfigForm] = useState({ per_session: 0, per_student: 0 });

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

  const handleApprove = async (sessionId: string) => {
    setError('');
    setLoading(true);
    const res = await approveSalarySessionAction(sessionId);
    setLoading(false);
    if (res.success) {
      setSuccess('Đã duyệt buổi dạy');
      setTimeout(() => setSuccess(''), 2000);
      queryClient.invalidateQueries({ queryKey: ['salarySessions', organizationId] });
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
      if (res.success) queryClient.invalidateQueries({ queryKey: ['salarySessions', organizationId] });
      else setError(res.error || 'Lỗi khi thanh toán');
    }
  };

  const openConfigModal = (data: any) => {
    setConfigModalCoach(data.coach);
    setConfigForm({
      per_session: data.config.per_session || 0,
      per_student: data.config.per_student || 0
    });
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configModalCoach) return;
    
    setLoading(true);
    const res = await updateSalaryConfigAction(configModalCoach.id, configForm.per_session, configForm.per_student);
    setLoading(false);
    
    if (res.success) {
      setConfigModalCoach(null);
      queryClient.invalidateQueries({ queryKey: ['salaryConfigs', organizationId] });
    } else {
      alert(res.error || 'Lỗi lưu cấu hình');
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

      {isFetching ? (
        <PayrollSkeleton />
      ) : (
        <div className="grid gap-6">
          {payrollData.map((data: any) => (
            <Card key={data.coach.id}>
              <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-light pb-4">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    {data.coach.name}
                    {isAdminOrOwner && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => openConfigModal(data)}
                        leftIcon={<span className="material-icons-round text-sm">settings</span>}
                      >
                        Cấu hình
                      </Button>
                    )}
                  </CardTitle>
                  <div className="text-secondary text-sm mt-1">
                    Cơ bản: {Number(data.config.per_session).toLocaleString('vi-VN')} đ/buổi
                    {Number(data.config.per_student) > 0 && ` + ${Number(data.config.per_student).toLocaleString('vi-VN')} đ/học viên`}
                  </div>
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
                                {s.status === 'checked_in' ? '---' : `${Number(s.calculated_salary || 0).toLocaleString('vi-VN')} đ`}
                              </Td>
                              {isAdminOrOwner && (
                                <Td className="text-right">
                                  {s.status === 'checked_in' && (
                                    <Button 
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleApprove(s.id)}
                                      disabled={loading}
                                      isLoading={loading}
                                    >
                                      Duyệt
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
      )}

      {/* Salary Config Modal */}
      <Modal isOpen={!!configModalCoach} onClose={loading ? () => {} : () => setConfigModalCoach(null)}>
        <ModalHeader title={`Cấu hình lương: ${configModalCoach?.name}`} onClose={loading ? () => {} : () => setConfigModalCoach(null)} />
        <ModalBody>
          <form id="config-form" onSubmit={handleSaveConfig} className="flex-col gap-4">
            <Input 
              label="Lương cơ bản (đ/buổi)"
              type="number" 
              required 
              min="0"
              value={configForm.per_session.toString()} 
              onChange={e => setConfigForm({...configForm, per_session: Number(e.target.value)})} 
            />
            <Input 
              label="Thưởng theo học viên đi học (đ/học viên)"
              type="number" 
              required 
              min="0"
              value={configForm.per_student.toString()} 
              onChange={e => setConfigForm({...configForm, per_student: Number(e.target.value)})} 
            />
          </form>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={() => setConfigModalCoach(null)} disabled={loading}>Hủy</Button>
          <Button type="submit" form="config-form" isLoading={loading} variant="primary">Lưu cấu hình</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
