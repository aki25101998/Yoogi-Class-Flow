'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { approveSalarySessionAction, payCoachSalaryAction, updateSalaryConfigAction, rejectSalarySessionAction, bulkApproveSessionsAction, getMonthlyPayrollAction } from './actions';
import { usePayroll } from '@/hooks/usePayroll';
import { useDashboardContext } from '../DashboardProvider';
import SalaryBreakdownModal from './components/SalaryBreakdownModal';
import type { SalarySnapshot, MonthlyPayrollResult } from '@/types/salary';

// UI Components
import { PageHeader } from '@/app/components/ui/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { Badge } from '@/app/components/ui/Badge';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/app/components/ui/Table';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/app/components/ui/Modal';
import { Input } from '@/app/components/ui/Input';

type TabKey = 'payroll' | 'rules' | 'profiles' | 'history';

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

  // Breakdown modal state
  const [breakdownModal, setBreakdownModal] = useState<{
    isOpen: boolean;
    snapshot: SalarySnapshot | null;
    sessionDate?: string;
    className?: string;
    coachName?: string;
    status?: string;
  }>({ isOpen: false, snapshot: null });

  // Monthly summary state
  const [monthlyCoach, setMonthlyCoach] = useState<string | null>(null);
  const [monthlyMonth, setMonthlyMonth] = useState(new Date().toISOString().slice(0, 7));
  const [monthlyResult, setMonthlyResult] = useState<MonthlyPayrollResult | null>(null);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  const isAdminOrOwner = currentUserRole === 'admin' || currentUserRole === 'owner';

  // Nhóm các session theo coach
  const payrollData = coaches.map((coach: any) => {
    const sessions = salarySessions.filter((s: any) => s.coach_id === coach.id);
    const config = salaryConfigs.find((c: any) => c.coach_id === coach.id) || { per_session: 0, per_student: 0 };
    
    const unapprovedSessions = sessions.filter((s: any) => s.status === 'checked_in');
    const approvedSessions = sessions.filter((s: any) => s.status === 'approved');
    const paidSessions = sessions.filter((s: any) => s.status === 'paid');
    
    const unapprovedAmount = unapprovedSessions.reduce((acc: number, s: any) => acc + Number(s.calculated_salary || 0), 0);
    const approvedAmount = approvedSessions.reduce((acc: number, s: any) => acc + Number(s.calculated_salary || 0), 0);
    const paidAmount = paidSessions.reduce((acc: number, s: any) => acc + Number(s.calculated_salary || 0), 0);
    const totalCalculatedAmount = unapprovedAmount + approvedAmount + paidAmount;
    
    return {
      coach,
      config,
      sessions,
      unapprovedSessions,
      approvedSessions,
      paidSessions,
      unapprovedAmount,
      approvedAmount,
      paidAmount,
      totalCalculatedAmount
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

  const handleReject = async (sessionId: string) => {
    if (!confirm('Bạn có chắc muốn từ chối buổi dạy này?')) return;
    setError('');
    setLoading(true);
    const res = await rejectSalarySessionAction(sessionId);
    setLoading(false);
    if (res.success) {
      setSuccess('Đã từ chối buổi dạy');
      setTimeout(() => setSuccess(''), 2000);
      queryClient.invalidateQueries({ queryKey: ['salarySessions', organizationId] });
    } else {
      setError(res.error || 'Lỗi khi từ chối');
    }
  };

  const handleBulkApprove = async (sessionIds: string[]) => {
    if (sessionIds.length === 0) return;
    if (!confirm(`Duyệt tất cả ${sessionIds.length} buổi chờ duyệt?`)) return;
    setLoading(true);
    const res = await bulkApproveSessionsAction(sessionIds);
    setLoading(false);
    if (res.success) {
      setSuccess(res.message || 'Đã duyệt tất cả');
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(res.message || 'Có lỗi xảy ra');
    }
    queryClient.invalidateQueries({ queryKey: ['salarySessions', organizationId] });
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

  const openBreakdown = (session: any, coachName: string) => {
    const snapshot = session.salary_config_snapshot as SalarySnapshot | null;
    if (snapshot) {
      setBreakdownModal({
        isOpen: true,
        snapshot,
        sessionDate: session.date,
        className: session.venue_classes?.name,
        coachName,
        status: session.status,
      });
    }
  };

  const handleViewMonthly = async (coachId: string) => {
    setMonthlyCoach(coachId);
    setMonthlyLoading(true);
    const res = await getMonthlyPayrollAction(coachId, monthlyMonth);
    setMonthlyLoading(false);
    if (res.success && res.result) {
      setMonthlyResult(res.result);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'checked_in': return <Badge variant="warning">Chờ duyệt</Badge>;
      case 'approved': return <Badge variant="primary">Đã duyệt</Badge>;
      case 'paid': return <Badge variant="success">Đã thanh toán</Badge>;
      case 'rejected': return <Badge variant="danger">Đã từ chối</Badge>;
      case 'cancelled': return <Badge variant="default">Đã hủy</Badge>;
      default: return <Badge variant="default">{status}</Badge>;
    }
  };

  return (
    <div className="flex-col gap-6">
      <PageHeader 
        title="Quản lý Lương (Payroll)" 
        description="Quản lý tính lương và thanh toán cho các huấn luyện viên"
      />

      {/* Navigation links to sub-pages */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <Button variant="primary" size="sm" leftIcon={<span className="material-icons-round" style={{ fontSize: '16px' }}>payments</span>}>
          Bảng lương
        </Button>
        <a href="/payroll/salary-rules" style={{ textDecoration: 'none' }}>
          <Button variant="outline" size="sm" leftIcon={<span className="material-icons-round" style={{ fontSize: '16px' }}>rule</span>}>
            Quy tắc lương
          </Button>
        </a>
        <a href="/payroll/salary-profiles" style={{ textDecoration: 'none' }}>
          <Button variant="outline" size="sm" leftIcon={<span className="material-icons-round" style={{ fontSize: '16px' }}>person</span>}>
            Hồ sơ lương
          </Button>
        </a>
      </div>

      {error && <div className="text-danger mb-4 text-sm font-medium">{error}</div>}
      {success && <div className="text-success mb-4 text-sm font-medium">{success}</div>}

      {isFetching ? (
        <PayrollSkeleton />
      ) : (
        <div className="grid gap-6">
          {payrollData.map((data: any) => (
            <Card key={data.coach.id} className="overflow-hidden">
              {/* HEADER ROW */}
              <div className="flex flex-row justify-between items-center p-5 border-b border-light bg-surface-hover/30">
                <h3 className="text-lg font-bold text-main m-0">
                  HLV: {data.coach.name}
                </h3>
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
              </div>

              <div className="flex flex-col">
                {/* CẤU HÌNH LƯƠNG */}
                <div className="p-5 border-b border-light">
                  <h4 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-3">
                    Cấu hình lương
                  </h4>
                  <div className="flex flex-col sm:flex-row gap-6">
                    <div className="flex flex-col">
                      <span className="text-sm text-secondary mb-1">Lương theo buổi</span>
                      <span className="font-medium text-main text-lg">{Number(data.config.per_session).toLocaleString('vi-VN')} đ <span className="text-sm text-secondary font-normal">/ buổi</span></span>
                    </div>
                    {Number(data.config.per_student) > 0 && (
                      <div className="flex flex-col">
                        <span className="text-sm text-secondary mb-1">Lương theo học viên</span>
                        <span className="font-medium text-success text-lg">+{Number(data.config.per_student).toLocaleString('vi-VN')} đ <span className="text-sm text-secondary font-normal">/ học viên</span></span>
                      </div>
                    )}
                  </div>
                </div>

                {/* TỔNG QUAN LƯƠNG THÁNG */}
                <div className="p-5 border-b border-light">
                  <h4 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-4">
                    Tổng quan lương tháng
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-md border border-light bg-surface-hover">
                      <div className="text-sm text-secondary mb-1">Đã tính lương</div>
                      <div className="text-xl font-bold text-main">
                        {data.totalCalculatedAmount.toLocaleString('vi-VN')} đ
                      </div>
                    </div>
                    <div className="p-4 rounded-md border border-light bg-surface-hover">
                      <div className="text-sm text-secondary mb-1">Chờ duyệt</div>
                      <div className="text-xl font-bold text-warning">
                        {data.unapprovedAmount.toLocaleString('vi-VN')} đ
                      </div>
                    </div>
                    <div className="p-4 rounded-md border border-primary/30 bg-primary/5">
                      <div className="text-sm text-primary font-medium mb-1">Cần thanh toán</div>
                      <div className="text-xl font-bold text-primary">
                        {data.approvedAmount.toLocaleString('vi-VN')} đ
                      </div>
                    </div>
                    <div className="p-4 rounded-md border border-light bg-surface-hover">
                      <div className="text-sm text-secondary mb-1">Đã thanh toán</div>
                      <div className="text-xl font-bold text-success">
                        {data.paidAmount.toLocaleString('vi-VN')} đ
                      </div>
                    </div>
                  </div>
                </div>

                {/* ACTION ROW */}
                <div className="p-5 border-b border-light bg-surface-hover/30">
                  <h4 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-3">
                    Hành động
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    {isAdminOrOwner && (
                      <Button 
                        onClick={() => handlePay(data.coach.id, data.approvedAmount, data.approvedSessions.map((s:any)=>s.id))}
                        variant="primary"
                        disabled={loading || data.approvedSessions.length === 0}
                        isLoading={loading}
                        leftIcon={<span className="material-icons-round" style={{ fontSize: '18px' }}>payments</span>}
                      >
                        Thanh toán
                      </Button>
                    )}
                    {isAdminOrOwner && (
                      <Button
                        onClick={() => handleBulkApprove(data.unapprovedSessions.map((s: any) => s.id))}
                        variant="secondary"
                        disabled={loading || data.unapprovedSessions.length === 0}
                        leftIcon={<span className="material-icons-round" style={{ fontSize: '18px' }}>done_all</span>}
                      >
                        Duyệt tất cả {data.unapprovedSessions.length > 0 ? `(${data.unapprovedSessions.length})` : ''}
                      </Button>
                    )}
                    <Button 
                      onClick={() => handleViewMonthly(data.coach.id)}
                      variant="outline"
                      disabled={monthlyLoading && monthlyCoach === data.coach.id}
                      isLoading={monthlyLoading && monthlyCoach === data.coach.id}
                      leftIcon={<span className="material-icons-round" style={{ fontSize: '18px' }}>summarize</span>}
                    >
                      Xem tổng hợp
                    </Button>
                  </div>
                </div>
                
                {/* SESSIONS DETAILS */}
                <div className="p-5">
                  <h4 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-4">
                    Chi tiết buổi dạy
                  </h4>
                  {data.sessions.length === 0 ? (
                    <EmptyState 
                      title="Chưa có dữ liệu điểm danh" 
                      description="Chưa có buổi dạy nào được ghi nhận trong tháng này." 
                      icon="event_busy"
                    />
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
                            const hasSnapshot = s.salary_config_snapshot && (s.status === 'approved' || s.status === 'paid');
                            return (
                              <Tr key={s.id}>
                                <Td>{s.date}</Td>
                                <Td>{s.venue_classes?.name || '---'}</Td>
                                <Td>{getStatusBadge(s.status)}</Td>
                                <Td className="text-right font-medium">
                                  {s.status === 'checked_in' ? (
                                    <span className="text-muted">
                                      {Number(s.calculated_salary || 0).toLocaleString('vi-VN')} đ
                                    </span>
                                  ) : (
                                    <span
                                      style={{
                                        cursor: hasSnapshot ? 'pointer' : 'default',
                                        textDecoration: hasSnapshot ? 'underline' : 'none',
                                        color: hasSnapshot ? 'var(--primary)' : 'inherit',
                                      }}
                                      onClick={() => hasSnapshot && openBreakdown(s, data.coach.name)}
                                      title={hasSnapshot ? 'Xem chi tiết tính lương' : ''}
                                    >
                                      {Number(s.calculated_salary || 0).toLocaleString('vi-VN')} đ
                                    </span>
                                  )}
                                </Td>
                                {isAdminOrOwner && (
                                  <Td className="text-right">
                                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                      {s.status === 'checked_in' && (
                                        <>
                                          <Button 
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleApprove(s.id)}
                                            disabled={loading}
                                          >
                                            Duyệt
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleReject(s.id)}
                                            disabled={loading}
                                          >
                                            <span className="material-icons-round" style={{ fontSize: '16px', color: 'var(--danger)' }}>close</span>
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </Td>
                                )}
                              </Tr>
                            );
                          })}
                        </Tbody>
                      </Table>
                    </div>
                  )}
                </div>
              </div>
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

      {/* Salary Config Modal (legacy) */}
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
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '8px', backgroundColor: 'var(--surface-hover)', borderRadius: 'var(--radius-sm)' }}>
              💡 Để cấu hình chi tiết hơn (lương theo chi nhánh, lớp, bậc học viên...), sử dụng{' '}
              <a href="/payroll/salary-rules" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>Quy tắc lương</a>.
            </div>
          </form>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={() => setConfigModalCoach(null)} disabled={loading}>Hủy</Button>
          <Button type="submit" form="config-form" isLoading={loading} variant="primary">Lưu cấu hình</Button>
        </ModalFooter>
      </Modal>

      {/* Salary Breakdown Modal */}
      <SalaryBreakdownModal
        isOpen={breakdownModal.isOpen}
        onClose={() => setBreakdownModal({ isOpen: false, snapshot: null })}
        snapshot={breakdownModal.snapshot}
        sessionDate={breakdownModal.sessionDate}
        className={breakdownModal.className}
        coachName={breakdownModal.coachName}
        status={breakdownModal.status}
      />

      {/* Monthly Summary Modal */}
      <Modal isOpen={!!monthlyCoach} onClose={() => { setMonthlyCoach(null); setMonthlyResult(null); }}>
        <ModalHeader
          title="Tổng hợp lương tháng"
          onClose={() => { setMonthlyCoach(null); setMonthlyResult(null); }}
        />
        <ModalBody>
          <div style={{ marginBottom: '12px' }}>
            <Input
              label="Tháng"
              type="month"
              value={monthlyMonth}
              onChange={e => setMonthlyMonth(e.target.value)}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => monthlyCoach && handleViewMonthly(monthlyCoach)}
              isLoading={monthlyLoading}
              style={{ marginTop: '8px' }}
            >
              Xem
            </Button>
          </div>

          {monthlyResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
              <div style={{ fontWeight: '600', fontSize: '16px' }}>{monthlyResult.coachName}</div>

              {monthlyResult.fixedMonthlySalary > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--surface-hover)', borderRadius: 'var(--radius-sm)' }}>
                  <span>Lương cứng tháng</span>
                  <span style={{ fontWeight: '500' }}>{monthlyResult.fixedMonthlySalary.toLocaleString('vi-VN')} đ</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--surface-hover)', borderRadius: 'var(--radius-sm)' }}>
                <span>Lương theo buổi ({monthlyResult.sessionSalaries.length} buổi)</span>
                <span style={{ fontWeight: '500' }}>{monthlyResult.totalSessionSalary.toLocaleString('vi-VN')} đ</span>
              </div>

              {monthlyResult.bonuses > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', color: 'var(--success)' }}>
                  <span>+ Thưởng</span>
                  <span style={{ fontWeight: '500' }}>{monthlyResult.bonuses.toLocaleString('vi-VN')} đ</span>
                </div>
              )}

              {monthlyResult.allowances > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', color: 'var(--info)' }}>
                  <span>+ Phụ cấp</span>
                  <span style={{ fontWeight: '500' }}>{monthlyResult.allowances.toLocaleString('vi-VN')} đ</span>
                </div>
              )}

              {monthlyResult.deductions > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', color: 'var(--danger)' }}>
                  <span>- Khấu trừ</span>
                  <span style={{ fontWeight: '500' }}>-{monthlyResult.deductions.toLocaleString('vi-VN')} đ</span>
                </div>
              )}

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '12px',
                borderTop: '2px solid var(--border)',
                fontWeight: 'bold',
                fontSize: '18px',
              }}>
                <span>Tổng lương tháng</span>
                <span style={{ color: 'var(--primary)' }}>{monthlyResult.grossPayroll.toLocaleString('vi-VN')} đ</span>
              </div>
            </div>
          )}
        </ModalBody>
      </Modal>
    </div>
  );
}
