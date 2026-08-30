'use client';

import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { approveSalarySessionAction, payCoachSalaryAction, updateSalaryConfigAction, rejectSalarySessionAction, bulkApproveSessionsAction, getMonthlyPayrollAction } from './actions';
import { usePayroll } from '@/hooks/usePayroll';
import { getBusinessDate, getBusinessDateString, parseBusinessDate } from '@/utils/date';
import { useDashboardContext } from '../DashboardProvider';
import SalaryBreakdownModal from './components/SalaryBreakdownModal';
import type { SalarySnapshot, MonthlyPayrollResult } from '@/types/salary';
import styles from './PayrollClient.module.css';

// UI Components
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/app/components/ui/Modal';
import { Input } from '@/app/components/ui/Input';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function formatVND(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString('vi-VN');
}

function formatFullVND(n: number) {
  return n.toLocaleString('vi-VN');
}

function getCurrentMonthLabel() {
  const d = getBusinessDate();
  return `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
}

// ─────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────
function PayrollSkeleton() {
  return (
    <div className={styles.payrollPage}>
      {/* Overview skeleton */}
      <div className={styles.overviewCard}>
        <div className={styles.overviewHeader}>
          <div className={`${styles.skeletonBar} ${styles.skeletonPulse}`} style={{ width: 180, height: 14 }} />
          <div className={`${styles.skeletonBar} ${styles.skeletonPulse}`} style={{ width: 100, height: 14 }} />
        </div>
        <div className={styles.overviewHero} style={{ paddingBottom: 0 }}>
          <div className={`${styles.skeletonBar} ${styles.skeletonPulse}`} style={{ width: 100, height: 12, marginBottom: 8 }} />
          <div className={`${styles.skeletonBar} ${styles.skeletonPulse}`} style={{ width: 200, height: 36 }} />
        </div>
        <div className={styles.overviewGrid}>
          {[1, 2, 3].map(i => (
            <div key={i} className={`${styles.overviewKPI} ${styles.skeletonPulse}`} style={{ minHeight: 64 }} />
          ))}
        </div>
      </div>
      {/* Trainer skeletons */}
      {[1, 2, 3].map(i => (
        <div key={i} className={styles.trainerCard}>
          <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className={`${styles.skeletonBar} ${styles.skeletonPulse}`} style={{ width: 40, height: 40, borderRadius: '50%' }} />
            <div style={{ flex: 1 }}>
              <div className={`${styles.skeletonBar} ${styles.skeletonPulse}`} style={{ width: 140, height: 16, marginBottom: 6 }} />
              <div className={`${styles.skeletonBar} ${styles.skeletonPulse}`} style={{ width: 100, height: 12 }} />
            </div>
            <div className={`${styles.skeletonBar} ${styles.skeletonPulse}`} style={{ width: 80, height: 16 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
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
  const [monthlyMonth, setMonthlyMonth] = useState(getBusinessDateString().slice(0, 7));
  const [monthlyResult, setMonthlyResult] = useState<MonthlyPayrollResult | null>(null);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  const isAdminOrOwner = currentUserRole === 'admin' || currentUserRole === 'owner';

  // ── Data Processing ──
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

  // ── Action handlers (unchanged logic) ──
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

  const toggleCoach = (coachId: string) => {
    setExpandedCoachId(prev => prev === coachId ? null : coachId);
  };

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  if (isFetching) {
    return (
      <div className={styles.payrollPage}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderTop}>
            <div className={styles.pageHeaderInfo}>
              <h1>Bảng lương</h1>
              <p>Quản lý và theo dõi lương của các huấn luyện viên</p>
            </div>
          </div>
        </div>
        <PayrollSkeleton />
      </div>
    );
  }

  return (
    <div className={styles.payrollPage}>

      {/* ═══════════════════════════════════════════════════════
          HEADER
          ═══════════════════════════════════════════════════════ */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderTop}>
          <div className={styles.pageHeaderInfo}>
            <h1>Bảng lương</h1>
            <p>Quản lý và theo dõi lương của các huấn luyện viên</p>
          </div>
          <div className={styles.pageTabs}>
            <span className={`${styles.pageTab} ${styles.pageTabActive}`}>
              <span className={`material-icons-round ${styles.pageTabIcon}`}>payments</span>
              Bảng lương
            </span>
            <a href="/payroll/salary-rules" className={styles.pageTab}>
              <span className={`material-icons-round ${styles.pageTabIcon}`}>rule</span>
              Quy tắc lương
            </a>
            <a href="/payroll/salary-profiles" className={styles.pageTab}>
              <span className={`material-icons-round ${styles.pageTabIcon}`}>person</span>
              Hồ sơ lương
            </a>
          </div>
        </div>
      </div>

      {/* Alert bars */}
      {error && (
        <div className={`${styles.alertBar} ${styles.alertError}`}>
          <span className="material-icons-round" style={{ fontSize: 18 }}>error_outline</span>
          {error}
        </div>
      )}
      {success && (
        <div className={`${styles.alertBar} ${styles.alertSuccess}`}>
          <span className="material-icons-round" style={{ fontSize: 18 }}>check_circle_outline</span>
          {success}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          MONTHLY OVERVIEW
          ═══════════════════════════════════════════════════════ */}
      <div className={styles.overviewCard}>
        <div className={styles.overviewHeader}>
          <span className={styles.overviewTitle}>Tổng quan lương tháng</span>
          <span className={styles.overviewMonth}>{getCurrentMonthLabel()}</span>
        </div>
        <div className={styles.overviewHero}>
          <div className={styles.overviewHeroLabel}>Tổng lương</div>
          <div className={styles.overviewHeroAmount}>{formatFullVND(globalKPIs.totalCalculated)} đ</div>
        </div>
        <div className={styles.overviewGrid}>
          <div className={`${styles.overviewKPI} ${styles.kpiWarning}`}>
            <div className={styles.kpiLabel}>
              <span className={styles.kpiDot} />
              Chờ duyệt
            </div>
            <div className={styles.kpiValue}>{formatFullVND(globalKPIs.totalUnapproved)} đ</div>
          </div>
          <div className={`${styles.overviewKPI} ${styles.kpiPrimary}`}>
            <div className={styles.kpiLabel}>
              <span className={styles.kpiDot} />
              Cần thanh toán
            </div>
            <div className={styles.kpiValue}>{formatFullVND(globalKPIs.totalApproved)} đ</div>
          </div>
          <div className={`${styles.overviewKPI} ${styles.kpiSuccess}`}>
            <div className={styles.kpiLabel}>
              <span className={styles.kpiDot} />
              Đã thanh toán
            </div>
            <div className={styles.kpiValue}>{formatFullVND(globalKPIs.totalPaid)} đ</div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          SEARCH & FILTER
          ═══════════════════════════════════════════════════════ */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <span className={`material-icons-round ${styles.searchIcon}`}>search</span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Tìm HLV theo tên..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className={styles.filterGroup}>
          {([
            { key: 'all', label: 'Tất cả' },
            { key: 'pending_approval', label: 'Chờ duyệt' },
            { key: 'to_pay', label: 'Cần thanh toán' },
            { key: 'paid', label: 'Đã thanh toán' },
          ] as const).map(f => (
            <button
              key={f.key}
              className={`${styles.filterPill} ${statusFilter === f.key ? styles.filterPillActive : ''}`}
              onClick={() => setStatusFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          TRAINER LIST
          ═══════════════════════════════════════════════════════ */}
      <div className={styles.trainerList}>
        {payrollData.length === 0 ? (
          <div className={styles.globalEmpty}>
            <span className={`material-icons-round ${styles.globalEmptyIcon}`}>
              {rawPayrollData.length === 0 ? 'group' : 'search_off'}
            </span>
            <div className={styles.globalEmptyTitle}>
              {rawPayrollData.length === 0 ? 'Chưa có HLV' : 'Không tìm thấy HLV'}
            </div>
            <div className={styles.globalEmptyDesc}>
              {rawPayrollData.length === 0
                ? 'Chưa có huấn luyện viên nào trong hệ thống để tính lương.'
                : 'Không có HLV nào khớp với bộ lọc hiện tại.'}
            </div>
          </div>
        ) : (
          payrollData.map((data: any) => {
            const isExpanded = expandedCoachId === data.coach.id;
            
            return (
              <div
                key={data.coach.id}
                className={`${styles.trainerCard} ${isExpanded ? styles.trainerCardExpanded : ''}`}
              >
                {/* ── Collapsed header row ── */}
                <div
                  className={`${styles.trainerHeader} ${isExpanded ? styles.trainerHeaderExpanded : ''}`}
                  onClick={() => toggleCoach(data.coach.id)}
                >
                  <div className={styles.avatar}>
                    {data.coach.name.charAt(0).toUpperCase()}
                  </div>
                  
                  <div className={styles.trainerInfo}>
                    <div className={styles.trainerName}>{data.coach.name}</div>
                    <div className={styles.trainerSub}>
                      {formatFullVND(Number(data.config.per_session))} đ / buổi
                      {/* Mobile inline stats */}
                      <span className={styles.trainerStatMobile} style={{ display: 'none' }}>
                        <span className={styles.trainerStatLabel}> · </span>
                        <span className={styles.trainerStatValue}>{formatFullVND(data.totalCalculatedAmount)} đ</span>
                      </span>
                    </div>
                  </div>

                  <div className={`${styles.trainerStat} ${styles.trainerStatHidden}`}>
                    <div className={styles.trainerStatLabel}>Tổng tháng</div>
                    <div className={styles.trainerStatValue}>{formatFullVND(data.totalCalculatedAmount)} đ</div>
                  </div>

                  <div className={styles.trainerStat}>
                    <div className={styles.trainerStatLabel}>Cần thanh toán</div>
                    <div className={`${styles.trainerStatValue} ${data.approvedAmount > 0 ? styles.trainerStatPrimary : ''}`}>
                      {formatFullVND(data.approvedAmount)} đ
                    </div>
                  </div>

                  <button
                    className={styles.chevronBtn}
                    onClick={(e) => { e.stopPropagation(); toggleCoach(data.coach.id); }}
                    aria-label={isExpanded ? 'Thu gọn' : 'Mở rộng'}
                  >
                    <span className={`material-icons-round ${styles.chevronIcon} ${isExpanded ? styles.chevronIconOpen : ''}`}>
                      expand_more
                    </span>
                  </button>
                </div>

                {/* ── Expanded body ── */}
                {isExpanded && (
                  <div className={styles.expandedBody}>
                    <div className={styles.detailSections}>
                      {/* Config + Detail KPIs */}
                      <div className={styles.detailTopRow}>
                        <div className={styles.detailConfig}>
                          <div className={styles.detailConfigHeader}>
                            <span className={styles.sectionLabel}>Cấu hình lương</span>
                            {isAdminOrOwner && (
                              <Button variant="ghost" size="sm" onClick={() => openConfigModal(data)} style={{ height: 28, fontSize: '0.75rem' }}>
                                <span className="material-icons-round" style={{ fontSize: 14, marginRight: 4 }}>edit</span>
                                Sửa
                              </Button>
                            )}
                          </div>
                          <div className={styles.configItem}>
                            <span className={styles.configItemLabel}>Lương theo buổi</span>
                            <span className={styles.configItemValue}>{formatFullVND(Number(data.config.per_session))} đ</span>
                          </div>
                          {Number(data.config.per_student) > 0 && (
                            <div className={styles.configItem}>
                              <span className={styles.configItemLabel}>Lương theo học viên</span>
                              <span className={styles.configItemValueSmall}>+{formatFullVND(Number(data.config.per_student))} đ / học viên</span>
                            </div>
                          )}
                        </div>
                        <div className={styles.detailKPIGrid}>
                          <div className={styles.detailKPI}>
                            <div className={styles.detailKPILabel}>Đã tính</div>
                            <div className={styles.detailKPIValue}>{formatVND(data.totalCalculatedAmount)} đ</div>
                          </div>
                          <div className={styles.detailKPI}>
                            <div className={styles.detailKPILabel} style={{ color: 'var(--warning)' }}>Chờ duyệt</div>
                            <div className={styles.detailKPIValue} style={{ color: 'var(--warning)' }}>{formatVND(data.unapprovedAmount)} đ</div>
                          </div>
                          <div className={styles.detailKPI}>
                            <div className={styles.detailKPILabel} style={{ color: 'var(--primary)' }}>Cần thanh toán</div>
                            <div className={styles.detailKPIValue} style={{ color: 'var(--primary)' }}>{formatVND(data.approvedAmount)} đ</div>
                          </div>
                          <div className={styles.detailKPI}>
                            <div className={styles.detailKPILabel} style={{ color: 'var(--success)' }}>Đã thanh toán</div>
                            <div className={styles.detailKPIValue} style={{ color: 'var(--success)' }}>{formatVND(data.paidAmount)} đ</div>
                          </div>
                        </div>
                      </div>

                      {/* Actions row */}
                      <div className={styles.actionsRow}>
                        <span className={styles.sectionLabel}>Thao tác nhanh</span>
                        <div className={styles.actionsGroup}>
                          {isAdminOrOwner && (
                            <Button 
                              onClick={() => handlePay(data.coach.id, data.approvedAmount, data.approvedSessions.map((s:any)=>s.id))}
                              variant="primary"
                              size="sm"
                              disabled={loading || data.approvedSessions.length === 0}
                              isLoading={loading}
                              leftIcon={<span className="material-icons-round" style={{ fontSize: 16 }}>payments</span>}
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
                              leftIcon={<span className="material-icons-round" style={{ fontSize: 16 }}>done_all</span>}
                            >
                              Duyệt tất cả ({data.unapprovedSessions.length})
                            </Button>
                          )}
                          <Button 
                            onClick={() => handleViewMonthly(data.coach.id)}
                            variant="outline"
                            size="sm"
                            disabled={monthlyLoading && monthlyCoach === data.coach.id}
                            isLoading={monthlyLoading && monthlyCoach === data.coach.id}
                            leftIcon={<span className="material-icons-round" style={{ fontSize: 16 }}>summarize</span>}
                          >
                            Xem tổng hợp
                          </Button>
                        </div>
                      </div>

                      {/* Sessions */}
                      <div className={styles.sessionsSection}>
                        <div className={styles.sessionsHeader}>
                          <span className={styles.sessionsTitle}>Chi tiết buổi dạy</span>
                          <span className={styles.sessionsCount}>{data.sessions.length} buổi trong tháng</span>
                        </div>
                        
                        {data.sessions.length === 0 ? (
                          <div className={styles.emptyState}>
                            <span className={`material-icons-round ${styles.emptyIcon}`}>event_busy</span>
                            <div className={styles.emptyTitle}>Chưa có buổi dạy</div>
                            <div className={styles.emptyDesc}>Chưa có dữ liệu điểm danh trong tháng này.</div>
                          </div>
                        ) : (
                          <div style={{ overflowX: 'auto' }}>
                            <table className={styles.sessionsTable}>
                              <thead>
                                <tr>
                                  <th>Ngày</th>
                                  <th>Lớp</th>
                                  <th>Trạng thái</th>
                                  <th style={{ textAlign: 'right' }}>Lương</th>
                                  {isAdminOrOwner && <th style={{ textAlign: 'right' }}>Thao tác</th>}
                                </tr>
                              </thead>
                              <tbody>
                                {data.sessions.map((s: any) => {
                                  const hasSnapshot = s.salary_config_snapshot && (s.status === 'approved' || s.status === 'paid');
                                  return (
                                    <tr key={s.id}>
                                      <td>{parseBusinessDate(s.date).toLocaleDateString('vi-VN')}</td>
                                      <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.venue_classes?.name}>
                                        {s.venue_classes?.name || '—'}
                                      </td>
                                      <td>{getStatusBadge(s.status)}</td>
                                      <td className={styles.tdRight} style={{ fontWeight: 600 }}>
                                        {s.status === 'checked_in' ? (
                                          <span style={{ color: 'var(--text-muted)' }}>
                                            {formatFullVND(Number(s.calculated_salary || 0))} đ
                                          </span>
                                        ) : hasSnapshot ? (
                                          <span
                                            className={styles.salaryLink}
                                            onClick={() => openBreakdown(s, data.coach.name)}
                                            title="Xem chi tiết tính lương"
                                          >
                                            {formatFullVND(Number(s.calculated_salary || 0))} đ
                                          </span>
                                        ) : (
                                          <span>{formatFullVND(Number(s.calculated_salary || 0))} đ</span>
                                        )}
                                      </td>
                                      {isAdminOrOwner && (
                                        <td className={styles.tdActions}>
                                          {s.status === 'checked_in' && (
                                            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                              <Button 
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleApprove(s.id)}
                                                disabled={loading}
                                                style={{ height: 28, fontSize: '0.75rem', padding: '0 10px' }}
                                              >
                                                Duyệt
                                              </Button>
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleReject(s.id)}
                                                disabled={loading}
                                                style={{ height: 28, padding: '0 4px' }}
                                              >
                                                <span className="material-icons-round" style={{ fontSize: 14, color: 'var(--danger)' }}>close</span>
                                              </Button>
                                            </div>
                                          )}
                                        </td>
                                      )}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════
          MODALS (unchanged)
          ═══════════════════════════════════════════════════════ */}

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
