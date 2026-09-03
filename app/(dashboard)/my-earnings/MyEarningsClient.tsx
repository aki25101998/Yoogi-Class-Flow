'use client';

import { useState } from 'react';
import { useDashboardContext } from '../DashboardProvider';
import { useMyAttendance } from '@/hooks/useMyAttendance';
import SalaryBreakdownModal from '../payroll/components/SalaryBreakdownModal';
import type { SalarySnapshot } from '@/types/salary';

// UI Components
import { PageHeader } from '@/app/components/ui/PageHeader';
import { Card } from '@/app/components/ui/Card';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { Badge } from '@/app/components/ui/Badge';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/app/components/ui/Table';
import styles from '@/app/styles/page-standard.module.css';

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
      <div className="flex-col gap-6">
        <PageHeader title="Thu nhập của tôi" />
        <Card>
          <div className="p-6 text-danger font-medium">
            Bạn chưa được liên kết với hồ sơ HLV nào trong hệ thống.
          </div>
        </Card>
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
    <div className="flex-col gap-6">
      <PageHeader 
        title="Thu nhập của tôi" 
        description="Theo dõi thu nhập từ các buổi dạy"
      />
      
      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-surface-hover rounded w-full"></div>
          <div className="h-64 bg-surface-hover rounded w-full"></div>
        </div>
      ) : (
        <>
          <div className={styles.overviewCard}>
            <div className={styles.overviewHeader}>
              <span className={styles.overviewTitle}>Tổng quan thu nhập</span>
            </div>
            <div className={styles.overviewGrid}>
              <div className={`${styles.kpiItem} ${styles.kpiWarning}`}>
                <div className={styles.kpiLabel}>
                  <span className={styles.kpiDot} />
                  Chờ duyệt
                </div>
                <div className={styles.kpiValue}>{unapproved.length} buổi</div>
              </div>
              <div className={`${styles.kpiItem} ${styles.kpiPrimary}`}>
                <div className={styles.kpiLabel}>
                  <span className={styles.kpiDot} />
                  Chờ thanh toán (Đã duyệt)
                </div>
                <div className={styles.kpiValue}>{pendingAmount.toLocaleString('vi-VN')} đ</div>
                <div className="text-xs text-secondary mt-1">{approved.length} buổi</div>
              </div>
              <div className={`${styles.kpiItem} ${styles.kpiSuccess}`}>
                <div className={styles.kpiLabel}>
                  <span className={styles.kpiDot} />
                  Đã thanh toán
                </div>
                <div className={styles.kpiValue}>{paidAmount.toLocaleString('vi-VN')} đ</div>
                <div className="text-xs text-secondary mt-1">{paid.length} buổi</div>
              </div>
            </div>
          </div>

          <div className={styles.listContainer}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Chi tiết buổi dạy</h3>
              <span className={styles.sectionCount}>{sessions.length} buổi</span>
            </div>
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <Thead>
                    <Tr>
                      <Th>Ngày</Th>
                      <Th>Lớp</Th>
                      <Th>Trạng thái</Th>
                      <Th className="text-right">Thu nhập</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {sessions.length === 0 ? (
                      <Tr>
                        <Td colSpan={4} className="text-center text-secondary">
                          <EmptyState 
                            title="Chưa có dữ liệu" 
                            description="Hệ thống chưa ghi nhận thu nhập nào." 
                            icon="account_balance_wallet"
                            compact
                          />
                        </Td>
                      </Tr>
                    ) : (
                      sessions.map((s: any) => {
                        const hasSnapshot = s.salary_config_snapshot && (s.status === 'approved' || s.status === 'paid');
                        return (
                          <Tr key={s.id}>
                            <Td className="font-medium text-main">{s.date}</Td>
                            <Td>{s.venue_classes?.name || '---'}</Td>
                            <Td>
                              {s.status === 'checked_in' && <Badge variant="warning">Chờ duyệt</Badge>}
                              {s.status === 'approved' && <Badge variant="primary">Chờ thanh toán</Badge>}
                              {s.status === 'paid' && <Badge variant="success">Đã thanh toán</Badge>}
                              {s.status === 'rejected' && <Badge variant="danger">Đã từ chối</Badge>}
                            </Td>
                            <Td className="text-right font-medium">
                              {s.status === 'checked_in' ? (
                                <span className="text-secondary">---</span>
                              ) : (
                                <span
                                  className={hasSnapshot ? "cursor-pointer underline text-primary hover:text-primary-dark transition-colors" : ""}
                                  onClick={() => hasSnapshot && openBreakdown(s)}
                                  title={hasSnapshot ? 'Xem chi tiết tính lương' : ''}
                                >
                                  {Number(s.calculated_salary).toLocaleString('vi-VN')} đ
                                </span>
                              )}
                            </Td>
                          </Tr>
                        );
                      })
                    )}
                  </Tbody>
                </Table>
              </div>
            </Card>
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
