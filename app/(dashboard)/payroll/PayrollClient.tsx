'use client';

import { useState, useMemo } from 'react';
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
  
  // Accordion and filter states
  const [expandedCoachId, setExpandedCoachId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_approval' | 'to_pay' | 'paid'>('all');
  
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
  const rawPayrollData = useMemo(() => {
    return coaches.map((coach: any) => {
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
  }, [coaches, salarySessions, salaryConfigs]);

  const globalKPIs = useMemo(() => {
    return rawPayrollData.reduce((acc, curr) => ({
      totalCalculated: acc.totalCalculated + curr.totalCalculatedAmount,
      totalUnapproved: acc.totalUnapproved + curr.unapprovedAmount,
      totalApproved: acc.totalApproved + curr.approvedAmount,
      totalPaid: acc.totalPaid + curr.paidAmount,
    }), { totalCalculated: 0, totalUnapproved: 0, totalApproved: 0, totalPaid: 0 });
  }, [rawPayrollData]);

  const payrollData = useMemo(() => {
    return rawPayrollData.filter(data => {
      const matchName = data.coach.name.toLowerCase().includes(searchTerm.toLowerCase());
      let matchStatus = true;
      if (statusFilter === 'pending_approval') matchStatus = data.unapprovedAmount > 0;
      else if (statusFilter === 'to_pay') matchStatus = data.approvedAmount > 0;
      else if (statusFilter === 'paid') matchStatus = data.paidAmount > 0;
      return matchName && matchStatus;
    });
  }, [rawPayrollData, searchTerm, statusFilter]);

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
        <div className="flex flex-col gap-6">
          
          {/* TỔNG QUAN LƯƠNG THÁNG - GLOBAL */}
          <Card>
            <CardHeader className="pb-2 border-b border-light">
              <CardTitle className="text-sm font-semibold text-secondary uppercase tracking-wider">
                Tổng quan lương tháng (Tất cả HLV)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 pb-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-3 sm:p-4 rounded-md border border-light bg-surface-hover">
                  <div className="text-xs sm:text-sm text-secondary mb-1">Tổng lương tính</div>
                  <div className="text-lg sm:text-xl font-bold text-main">
                    {globalKPIs.totalCalculated.toLocaleString('vi-VN')} đ
                  </div>
                </div>
                <div className="p-3 sm:p-4 rounded-md border border-warning/30 bg-warning/5">
                  <div className="text-xs sm:text-sm text-warning font-medium mb-1">Chờ duyệt</div>
                  <div className="text-lg sm:text-xl font-bold text-warning">
                    {globalKPIs.totalUnapproved.toLocaleString('vi-VN')} đ
                  </div>
                </div>
                <div className="p-3 sm:p-4 rounded-md border border-primary/30 bg-primary/5">
                  <div className="text-xs sm:text-sm text-primary font-medium mb-1">Cần thanh toán</div>
                  <div className="text-lg sm:text-xl font-bold text-primary">
                    {globalKPIs.totalApproved.toLocaleString('vi-VN')} đ
                  </div>
                </div>
                <div className="p-3 sm:p-4 rounded-md border border-success/30 bg-success/5">
                  <div className="text-xs sm:text-sm text-success font-medium mb-1">Đã thanh toán</div>
                  <div className="text-lg sm:text-xl font-bold text-success">
                    {globalKPIs.totalPaid.toLocaleString('vi-VN')} đ
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SEARCH & FILTER */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="w-full sm:w-1/3 relative">
              <span className="material-icons-round text-secondary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">search</span>
              <Input 
                placeholder="Tìm HLV theo tên..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Button size="sm" variant={statusFilter === 'all' ? 'primary' : 'outline'} onClick={() => setStatusFilter('all')}>Tất cả</Button>
              <Button size="sm" variant={statusFilter === 'pending_approval' ? 'primary' : 'outline'} onClick={() => setStatusFilter('pending_approval')}>Chờ duyệt</Button>
              <Button size="sm" variant={statusFilter === 'to_pay' ? 'primary' : 'outline'} onClick={() => setStatusFilter('to_pay')}>Cần thanh toán</Button>
              <Button size="sm" variant={statusFilter === 'paid' ? 'primary' : 'outline'} onClick={() => setStatusFilter('paid')}>Đã thanh toán</Button>
            </div>
          </div>

          {/* COACH LIST - ACCORDION */}
          <div className="flex flex-col gap-3">
            {payrollData.length === 0 ? (
              <EmptyState 
                title="Không tìm thấy HLV" 
                description="Không có HLV nào khớp với bộ lọc hiện tại." 
                icon="search_off"
              />
            ) : (
              payrollData.map((data: any) => {
                const isExpanded = expandedCoachId === data.coach.id;
                
                return (
                  <Card key={data.coach.id} className="overflow-hidden transition-all duration-200" style={{ borderColor: isExpanded ? 'var(--primary)' : undefined }}>
                    {/* ACCORDION HEADER (Always visible) */}
                    <div 
                      className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 sm:p-4 cursor-pointer hover:bg-surface-hover/50 transition-colors ${isExpanded ? 'bg-surface-hover border-b border-light' : ''}`}
                      onClick={() => setExpandedCoachId(isExpanded ? null : data.coach.id)}
                    >
                      <div className="flex items-center gap-3 w-full sm:w-auto mb-3 sm:mb-0">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                          {data.coach.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-main">{data.coach.name}</div>
                          <div className="text-xs text-secondary mt-0.5">{Number(data.config.per_session).toLocaleString('vi-VN')}đ / buổi</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 sm:gap-6">
                        <div className="flex gap-4 sm:gap-6 text-sm">
                          <div className="hidden sm:flex flex-col items-end">
                            <span className="text-xs text-secondary">Tổng tháng</span>
                            <span className="font-semibold text-main">{data.totalCalculatedAmount.toLocaleString('vi-VN')}đ</span>
                          </div>
                          <div className="flex flex-col items-start sm:items-end">
                            <span className="text-xs text-secondary">Cần thanh toán</span>
                            <span className={`font-bold ${data.approvedAmount > 0 ? 'text-primary' : 'text-main'}`}>
                              {data.approvedAmount.toLocaleString('vi-VN')}đ
                            </span>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="shrink-0 p-1 sm:px-3"
                          onClick={(e) => { e.stopPropagation(); setExpandedCoachId(isExpanded ? null : data.coach.id); }}
                        >
                          <span className="hidden sm:inline mr-1">{isExpanded ? 'Đóng lại' : 'Xem chi tiết'}</span>
                          <span className={`material-icons-round transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                            expand_more
                          </span>
                        </Button>
                      </div>
                    </div>

                    {/* ACCORDION BODY (Expanded details) */}
                    {isExpanded && (
                      <div className="animate-in slide-in-from-top-2 fade-in duration-200">
                        {/* Cấu hình & Hành động row */}
                        <div className="flex flex-col lg:flex-row border-b border-light bg-surface/50">
                          <div className="p-4 lg:p-5 flex-1 border-b lg:border-b-0 lg:border-r border-light">
                            <div className="flex justify-between items-center mb-3">
                              <h4 className="text-sm font-semibold text-secondary uppercase tracking-wider m-0">Cấu hình lương</h4>
                              {isAdminOrOwner && (
                                <Button variant="ghost" size="sm" onClick={() => openConfigModal(data)} className="h-7 text-xs">
                                  Sửa
                                </Button>
                              )}
                            </div>
                            <div className="flex gap-4">
                              <div>
                                <span className="text-xs text-secondary block mb-0.5">Lương/buổi</span>
                                <span className="font-medium text-main">{Number(data.config.per_session).toLocaleString('vi-VN')} đ</span>
                              </div>
                              {Number(data.config.per_student) > 0 && (
                                <div>
                                  <span className="text-xs text-secondary block mb-0.5">Lương/học viên</span>
                                  <span className="font-medium text-success">+{Number(data.config.per_student).toLocaleString('vi-VN')} đ</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="p-4 lg:p-5 flex-1">
                            <h4 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-3">Thao tác nhanh</h4>
                            <div className="flex flex-wrap gap-2">
                              {isAdminOrOwner && (
                                <Button 
                                  onClick={() => handlePay(data.coach.id, data.approvedAmount, data.approvedSessions.map((s:any)=>s.id))}
                                  variant="primary"
                                  size="sm"
                                  disabled={loading || data.approvedSessions.length === 0}
                                  isLoading={loading}
                                >
                                  Thanh toán ({data.approvedSessions.length})
                                </Button>
                              )}
                              {isAdminOrOwner && (
                                <Button
                                  onClick={() => handleBulkApprove(data.unapprovedSessions.map((s: any) => s.id))}
                                  variant="secondary"
                                  size="sm"
                                  disabled={loading || data.unapprovedSessions.length === 0}
                                >
                                  Duyệt ({data.unapprovedSessions.length})
                                </Button>
                              )}
                              <Button 
                                onClick={() => handleViewMonthly(data.coach.id)}
                                variant="outline"
                                size="sm"
                                disabled={monthlyLoading && monthlyCoach === data.coach.id}
                                isLoading={monthlyLoading && monthlyCoach === data.coach.id}
                              >
                                Xem tổng hợp
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        {/* SESSIONS DETAILS (Compact) */}
                        <div className="p-4 lg:p-5">
                          <h4 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-3">
                            Chi tiết {data.sessions.length} buổi dạy
                          </h4>
                          {data.sessions.length === 0 ? (
                            <div className="bg-surface-hover rounded-md p-4 text-center text-secondary text-sm border border-light border-dashed">
                              Chưa có buổi dạy nào được ghi nhận trong tháng này.
                            </div>
                          ) : (
                            <div className="overflow-x-auto rounded-md border border-light">
                              <Table>
                                <Thead className="bg-surface-hover/50">
                                  <Tr>
                                    <Th className="py-2 text-xs">Ngày</Th>
                                    <Th className="py-2 text-xs">Lớp</Th>
                                    <Th className="py-2 text-xs">Trạng thái</Th>
                                    <Th className="py-2 text-xs text-right">Lương tính</Th>
                                    {isAdminOrOwner && <Th className="py-2 text-xs text-right">Thao tác</Th>}
                                  </Tr>
                                </Thead>
                                <Tbody>
                                  {data.sessions.map((s: any) => {
                                    const hasSnapshot = s.salary_config_snapshot && (s.status === 'approved' || s.status === 'paid');
                                    return (
                                      <Tr key={s.id} className="text-sm">
                                        <Td className="py-2">{new Date(s.date).toLocaleDateString('vi-VN')}</Td>
                                        <Td className="py-2 max-w-[150px] truncate" title={s.venue_classes?.name}>{s.venue_classes?.name || '---'}</Td>
                                        <Td className="py-2">{getStatusBadge(s.status)}</Td>
                                        <Td className="py-2 text-right font-medium">
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
                                          <Td className="py-2 text-right">
                                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                              {s.status === 'checked_in' && (
                                                <>
                                                  <Button 
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleApprove(s.id)}
                                                    disabled={loading}
                                                    className="h-7 px-2 text-xs"
                                                  >
                                                    Duyệt
                                                  </Button>
                                                  <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleReject(s.id)}
                                                    disabled={loading}
                                                    className="h-7 px-1"
                                                  >
                                                    <span className="material-icons-round" style={{ fontSize: '14px', color: 'var(--danger)' }}>close</span>
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
                    )}
                  </Card>
                );
              })
            )}
          </div>
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
