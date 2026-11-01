'use client';

import React, { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { addTuitionAction, deleteTuitionAction, recordPaymentAction } from './actions';
import { useTuition } from '@/hooks/useTuition';
import { useDashboardContext } from '../DashboardProvider';
import {
  TuitionItem,
  TuitionFilters,
  TuitionPaymentMethod,
  ReceiptData,
} from '@/types/tuition';

// UI Components
import { PageHeader } from '@/app/components/ui/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { Input, Select } from '@/app/components/ui/Input';
import { Card, CardContent } from '@/app/components/ui/Card';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { Badge } from '@/app/components/ui/Badge';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/app/components/ui/Table';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/app/components/ui/Modal';

// Tuition Enhancements Components
import { TuitionKpiGrid } from './components/TuitionKpiGrid';
import { TuitionFiltersBar } from './components/TuitionFiltersBar';
import { BatchTuitionModal } from './components/BatchTuitionModal';
import { VietQRModal } from './components/VietQRModal';
import { TuitionReceiptModal } from './components/TuitionReceiptModal';
import styles from './Tuition.module.css';

function TuitionSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent>
        <div style={{ height: '40px', background: 'var(--surface-hover)', borderRadius: '8px', marginBottom: '16px' }} />
        <div style={{ height: '40px', background: 'var(--surface-hover)', borderRadius: '8px', marginBottom: '16px' }} />
        <div style={{ height: '40px', background: 'var(--surface-hover)', borderRadius: '8px' }} />
      </CardContent>
    </Card>
  );
}

export default function TuitionClient() {
  const { context } = useDashboardContext();
  const organizationId = context?.organization?.id;
  const organization = context?.organization;
  const currentUserRole = context?.membership?.role;
  const permissions = context?.membership?.permissions || [];

  const canManage =
    currentUserRole === 'admin' ||
    currentUserRole === 'owner' ||
    permissions.includes('manage_tuition');

  const {
    tuitionList,
    students,
    classes,
    calculateSummary,
    isLoading: isFetching,
    refetch,
  } = useTuition(organizationId);

  const queryClient = useQueryClient();

  // Current month default: YYYY-MM
  const currentMonthStr = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }, []);

  // Multi-dimensional filters
  const [filters, setFilters] = useState<TuitionFilters>({
    month: currentMonthStr,
    classId: 'all',
    status: 'all',
    search: '',
  });

  // Modal visibility states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [qrModalItem, setQrModalItem] = useState<TuitionItem | null>(null);
  const [receiptItem, setReceiptItem] = useState<ReceiptData | null>(null);

  // Single Add Tuition Form State
  const [singleFormData, setSingleFormData] = useState({
    student_id: '',
    class_id: '',
    amount: 0,
    due_date: currentMonthStr,
    notes: '',
  });

  // Payment Recording State
  const [paymentTuition, setPaymentTuition] = useState<TuitionItem | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<TuitionPaymentMethod>('cash');

  // Status feedback
  const [actionError, setActionError] = useState<string>('');
  const [actionSuccess, setActionSuccess] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtered tuition list
  const filteredTuition = useMemo(() => {
    return tuitionList.filter((item) => {
      // Filter by Month
      if (filters.month && item.due_date !== filters.month) {
        return false;
      }
      // Filter by Class
      if (filters.classId !== 'all') {
        if (item.class_id !== filters.classId) return false;
      }
      // Filter by Status
      if (filters.status !== 'all') {
        if (item.status !== filters.status) return false;
      }
      // Filter by Search (student name)
      if (filters.search.trim()) {
        const studentName = item.students?.name?.toLowerCase() || '';
        const searchKeyword = filters.search.trim().toLowerCase();
        if (!studentName.includes(searchKeyword)) return false;
      }
      return true;
    });
  }, [tuitionList, filters]);

  // Dynamic Bento summary calculation based on current filters
  const summary = useMemo(() => {
    return calculateSummary(filteredTuition);
  }, [calculateSummary, filteredTuition]);

  const handleRefresh = async () => {
    await refetch();
    queryClient.invalidateQueries({ queryKey: ['tuition', organizationId] });
  };

  // Add single tuition submit
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;

    setActionError('');
    if (!singleFormData.student_id) {
      setActionError('Vui lòng chọn học viên.');
      return;
    }
    if (!singleFormData.amount || singleFormData.amount <= 0) {
      setActionError('Số tiền học phí phải lớn hơn 0.');
      return;
    }
    if (!singleFormData.due_date) {
      setActionError('Vui lòng chọn kỳ thu học phí.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await addTuitionAction({
        student_id: singleFormData.student_id,
        class_id: singleFormData.class_id || null,
        amount: Number(singleFormData.amount),
        due_date: singleFormData.due_date,
        notes: singleFormData.notes || undefined,
      });

      if (res.success) {
        setIsAddModalOpen(false);
        setSingleFormData({
          student_id: '',
          class_id: '',
          amount: 0,
          due_date: currentMonthStr,
          notes: '',
        });
        setActionSuccess('Đã thêm khoản thu học phí thành công!');
        setTimeout(() => setActionSuccess(''), 4000);
        await handleRefresh();
      } else {
        setActionError(res.error || 'Lỗi khi thêm khoản thu.');
      }
    } catch (err: any) {
      setActionError(err.message || 'Lỗi không xác định khi thêm học phí.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete tuition invoice (only allowed if paid_amount === 0)
  const handleDelete = async (id: string) => {
    if (!canManage) return;
    if (!window.confirm('Bạn có chắc muốn xóa khoản học phí này?')) return;

    setIsSubmitting(true);
    try {
      const res = await deleteTuitionAction(id);
      if (res.success) {
        setActionSuccess('Đã xóa khoản học phí thành công.');
        setTimeout(() => setActionSuccess(''), 3000);
        await handleRefresh();
      } else {
        alert(res.error || 'Lỗi khi xóa khoản học phí.');
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xóa khoản học phí.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Record payment submit
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage || !paymentTuition) return;

    const remaining = (Number(paymentTuition.amount) || 0) - (Number(paymentTuition.paid_amount) || 0);
    if (!paymentAmount || paymentAmount <= 0) {
      setActionError('Số tiền thanh toán phải lớn hơn 0.');
      return;
    }
    if (paymentAmount > remaining) {
      setActionError(`Số tiền thanh toán không được vượt quá số nợ còn lại (${formatCurrency(remaining)}).`);
      return;
    }

    setActionError('');
    setIsSubmitting(true);
    try {
      const res = await recordPaymentAction(paymentTuition.id, paymentAmount, paymentMethod);
      if (res.success) {
        setPaymentTuition(null);
        setPaymentAmount(0);
        setActionSuccess('Đã ghi nhận thanh toán & đồng bộ Sổ Quỹ thành công!');
        setTimeout(() => setActionSuccess(''), 4000);
        await handleRefresh();
      } else {
        setActionError(res.error || 'Lỗi khi ghi nhận thanh toán.');
      }
    } catch (err: any) {
      setActionError(err.message || 'Lỗi khi xử lý thanh toán.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open e-receipt printable modal
  const handleOpenReceipt = (item: TuitionItem) => {
    const amount = Number(item.amount) || 0;
    const paid = Number(item.paid_amount) || 0;
    const remaining = Math.max(0, amount - paid);

    const receipt: ReceiptData = {
      receipt_number: item.receipt_number || `PT-${item.due_date.replace(/-/g, '')}-${item.id.slice(0, 4).toUpperCase()}`,
      student_name: item.students?.name || 'Học viên',
      class_name: item.venue_classes?.name || 'Lớp tập luyện',
      due_date: item.due_date,
      amount,
      paid_amount: paid,
      remaining,
      payment_method: item.payment_method || 'cash',
      paid_at: item.paid_at || item.updated_at || new Date().toISOString(),
      notes: item.notes,
      org_name: organization?.name || 'Võ Đường Yoogi Flow',
      bank_name: organization?.bank_name,
      bank_account_number: organization?.bank_account_number,
      bank_account_name: organization?.bank_account_name,
    };

    setReceiptItem(receipt);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN').format(val) + ' đ';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      {/* 1. Header */}
      <PageHeader
        title="Quản lý Học phí"
        description="Theo dõi các khoản thu học phí, tạo học phí hàng loạt cho lớp, mã VietQR động và xuất biên lai điện tử"
      />

      {/* 2. Success Alert Banner */}
      {actionSuccess && (
        <div
          style={{
            padding: '12px 18px',
            backgroundColor: 'var(--success-bg)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: 'var(--radius-lg)',
            color: 'var(--success)',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span className="material-icons-round" style={{ fontSize: '20px' }}>
            check_circle
          </span>
          <strong>{actionSuccess}</strong>
        </div>
      )}

      {/* 3. 4-KPI Bento Grid */}
      <TuitionKpiGrid summary={summary} />

      {/* 4. Filters & Action Bar */}
      <TuitionFiltersBar
        filters={filters}
        onFilterChange={setFilters}
        classes={classes}
        canManage={canManage}
        onOpenBatchModal={() => setIsBatchModalOpen(true)}
        onOpenAddModal={() => setIsAddModalOpen(true)}
      />

      {/* 5. Main Tuition Table */}
      {isFetching ? (
        <TuitionSkeleton />
      ) : filteredTuition.length === 0 ? (
        <EmptyState
          title="Không tìm thấy khoản thu nào"
          description={
            tuitionList.length === 0
              ? 'Chưa có khoản thu học phí nào trong hệ thống. Bấm "+ Thêm Khoản Thu" hoặc "Tạo Học Phí Cả Lớp" để khởi tạo.'
              : 'Không có khoản thu nào phù hợp với bộ lọc hiện tại. Thử đổi tháng hoặc điều kiện tìm kiếm.'
          }
          icon="receipt_long"
        />
      ) : (
        <Card>
          <div style={{ overflowX: 'auto' }}>
            <Table>
              <Thead>
                <Tr>
                  <Th>Học Viên</Th>
                  <Th>Lớp Đào Tạo & Kỳ Học</Th>
                  <Th style={{ textAlign: 'right' }}>Mức Học Phí</Th>
                  <Th style={{ textAlign: 'right' }}>Đã Nộp / Còn Nợ</Th>
                  <Th style={{ textAlign: 'center' }}>Trạng Thái</Th>
                  <Th style={{ textAlign: 'right' }}>Thao Tác</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredTuition.map((t) => {
                  const amount = Number(t.amount) || 0;
                  const paid = Number(t.paid_amount) || 0;
                  const remaining = Math.max(0, amount - paid);

                  return (
                    <Tr key={t.id}>
                      {/* Học viên */}
                      <Td>
                        <div className={styles.studentCell}>
                          <div className={styles.studentAvatar}>
                            {t.students?.avatar_url ? (
                              <img
                                src={t.students.avatar_url}
                                alt={t.students.name}
                                className={styles.studentAvatarImg}
                              />
                            ) : (
                              (t.students?.name || 'H').charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className={styles.studentName}>{t.students?.name || 'Chưa đặt tên'}</div>
                            {t.students?.phone && (
                              <div className={styles.studentSub}>{t.students.phone}</div>
                            )}
                          </div>
                        </div>
                      </Td>

                      {/* Lớp & Kỳ học */}
                      <Td>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                          {t.venue_classes?.name || 'Tất cả lớp'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Kỳ: {t.due_date} {t.receipt_number ? `• ${t.receipt_number}` : ''}
                        </div>
                      </Td>

                      {/* Mức học phí */}
                      <Td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-main)' }}>
                        {formatCurrency(amount)}
                      </Td>

                      {/* Đã nộp / Còn nợ */}
                      <Td style={{ textAlign: 'right' }}>
                        <div style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.875rem' }}>
                          Đã thu: {formatCurrency(paid)}
                        </div>
                        {remaining > 0 ? (
                          <div style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '0.8125rem' }}>
                            Còn nợ: {formatCurrency(remaining)}
                          </div>
                        ) : (
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            Đã tất toán
                          </div>
                        )}
                      </Td>

                      {/* Trạng thái Badge */}
                      <Td style={{ textAlign: 'center' }}>
                        <Badge
                          variant={
                            t.status === 'paid' ? 'success' : t.status === 'partial' ? 'warning' : 'danger'
                          }
                        >
                          {t.status === 'paid'
                            ? 'Đã đóng đủ'
                            : t.status === 'partial'
                            ? 'Đóng một phần'
                            : 'Chưa đóng'}
                        </Badge>
                      </Td>

                      {/* Action Buttons */}
                      <Td style={{ textAlign: 'right' }}>
                        <div className={styles.actionButtonGroup} style={{ justifyContent: 'flex-end' }}>
                          {/* VietQR Button (if still has remaining debt) */}
                          {remaining > 0 && (
                            <button
                              type="button"
                              className={`${styles.btnAction} ${styles.btnVietQR}`}
                              onClick={() => setQrModalItem(t)}
                              title="Tạo mã VietQR Napas 247"
                            >
                              <span className="material-icons-round" style={{ fontSize: '15px' }}>
                                qr_code_2
                              </span>
                              VietQR
                            </button>
                          )}

                          {/* Thu tiền Button (if privileged & not fully paid) */}
                          {canManage && t.status !== 'paid' && (
                            <button
                              type="button"
                              className={`${styles.btnAction} ${styles.btnPay}`}
                              onClick={() => {
                                setPaymentTuition(t);
                                setPaymentAmount(remaining);
                                setPaymentMethod('cash');
                                setActionError('');
                              }}
                              title="Ghi nhận thanh toán"
                            >
                              <span className="material-icons-round" style={{ fontSize: '15px' }}>
                                payments
                              </span>
                              Thu tiền
                            </button>
                          )}

                          {/* Biên lai Button (if paid amount > 0) */}
                          {paid > 0 && (
                            <button
                              type="button"
                              className={`${styles.btnAction} ${styles.btnReceipt}`}
                              onClick={() => handleOpenReceipt(t)}
                              title="Xem và in phiếu thu điện tử"
                            >
                              <span className="material-icons-round" style={{ fontSize: '15px' }}>
                                receipt
                              </span>
                              Biên lai
                            </button>
                          )}

                          {/* Xóa Button (only if paid_amount === 0) */}
                          {canManage && paid === 0 && (
                            <button
                              type="button"
                              className={`${styles.btnAction} ${styles.btnDelete}`}
                              onClick={() => handleDelete(t.id)}
                              title="Xóa khoản thu chưa thanh toán"
                            >
                              <span className="material-icons-round" style={{ fontSize: '15px' }}>
                                delete
                              </span>
                              Xóa
                            </button>
                          )}
                        </div>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </div>
        </Card>
      )}

      {/* 6. Single Add Tuition Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} maxWidth="540px">
        <ModalHeader title="Thêm Khoản Thu Học Phí Đơn" onClose={() => setIsAddModalOpen(false)} />
        <ModalBody>
          {actionError && (
            <div style={{ color: 'var(--danger)', marginBottom: '16px', fontSize: '0.875rem' }}>
              {actionError}
            </div>
          )}
          <form id="single-tuition-form" onSubmit={handleSingleSubmit} style={{ display: 'grid', gap: '16px' }}>
            <Select
              label="Học Viên *"
              required
              value={singleFormData.student_id}
              onChange={(e) => setSingleFormData({ ...singleFormData, student_id: e.target.value })}
              options={[
                { value: '', label: '-- Chọn học viên --' },
                ...students.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />

            <Select
              label="Lớp Học (Tùy chọn)"
              value={singleFormData.class_id}
              onChange={(e) => {
                const clsId = e.target.value;
                const cls = classes.find((c) => c.id === clsId);
                setSingleFormData({
                  ...singleFormData,
                  class_id: clsId,
                  amount: cls?.default_tuition_fee ? Number(cls.default_tuition_fee) : singleFormData.amount,
                });
              }}
              options={[
                { value: '', label: '-- Chọn lớp --' },
                ...classes.map((c) => ({
                  value: c.id,
                  label: `${c.name} ${c.default_tuition_fee ? `(${formatCurrency(c.default_tuition_fee)})` : ''}`,
                })),
              ]}
            />

            <Input
              label="Số Tiền Phải Thu (VNĐ) *"
              type="number"
              min={1000}
              step={10000}
              required
              value={singleFormData.amount || ''}
              onChange={(e) => setSingleFormData({ ...singleFormData, amount: Number(e.target.value) || 0 })}
            />

            <Input
              label="Kỳ Thu Học Phí (Tháng) *"
              type="month"
              required
              value={singleFormData.due_date}
              onChange={(e) => setSingleFormData({ ...singleFormData, due_date: e.target.value })}
            />

            <Input
              label="Ghi Chú"
              placeholder="Miễn giảm, lý do đặc biệt..."
              value={singleFormData.notes}
              onChange={(e) => setSingleFormData({ ...singleFormData, notes: e.target.value })}
            />
          </form>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)} disabled={isSubmitting}>
            Hủy Bỏ
          </Button>
          <Button type="submit" form="single-tuition-form" variant="primary" isLoading={isSubmitting}>
            Lưu Khoản Thu
          </Button>
        </ModalFooter>
      </Modal>

      {/* 7. Record Payment Modal */}
      <Modal isOpen={!!paymentTuition} onClose={() => setPaymentTuition(null)} maxWidth="500px">
        <ModalHeader title="Ghi Nhận Thu Học Phí" onClose={() => setPaymentTuition(null)} />
        <ModalBody>
          {actionError && (
            <div style={{ color: 'var(--danger)', marginBottom: '16px', fontSize: '0.875rem' }}>
              {actionError}
            </div>
          )}

          {paymentTuition && (
            <div>
              <div
                style={{
                  padding: '14px',
                  background: 'var(--surface-hover)',
                  borderRadius: 'var(--radius-lg)',
                  marginBottom: '16px',
                  fontSize: '0.875rem',
                }}
              >
                <div>Học viên: <strong>{paymentTuition.students?.name}</strong></div>
                <div>Lớp: <strong>{paymentTuition.venue_classes?.name || 'Tất cả lớp'}</strong> (Kỳ {paymentTuition.due_date})</div>
                <div style={{ marginTop: '6px', color: 'var(--danger)' }}>
                  Còn nợ: <strong>{formatCurrency(Number(paymentTuition.amount) - Number(paymentTuition.paid_amount))}</strong>
                </div>
              </div>

              <form id="record-payment-form" onSubmit={handlePaymentSubmit} style={{ display: 'grid', gap: '16px' }}>
                <Input
                  label="Số Tiền Thu Lần Này (VNĐ) *"
                  type="number"
                  min={1000}
                  step={10000}
                  required
                  value={paymentAmount || ''}
                  onChange={(e) => setPaymentAmount(Number(e.target.value) || 0)}
                />

                <Select
                  label="Phương Thức Thanh Toán *"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as TuitionPaymentMethod)}
                  options={[
                    { value: 'cash', label: '💵 Tiền mặt' },
                    { value: 'bank_transfer', label: '🏦 Chuyển khoản ngân hàng' },
                    { value: 'other', label: 'Khác' },
                  ]}
                  helperText="Khoản thu này sẽ tự động ghi sổ nhật ký Thu Chi trong Sổ Quỹ"
                />
              </form>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="ghost" onClick={() => setPaymentTuition(null)} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button type="submit" form="record-payment-form" variant="primary" isLoading={isSubmitting}>
            Xác Nhận Thu Tiền
          </Button>
        </ModalFooter>
      </Modal>

      {/* 8. Batch Tuition Modal */}
      {isBatchModalOpen && organizationId && (
        <BatchTuitionModal
          isOpen={isBatchModalOpen}
          onClose={() => setIsBatchModalOpen(false)}
          organizationId={organizationId}
          classes={classes}
          currentMonth={filters.month || currentMonthStr}
          onSuccess={(count) => {
            setActionSuccess(`Đã tạo học phí thành công cho ${count} học viên!`);
            setTimeout(() => setActionSuccess(''), 5000);
            handleRefresh();
          }}
        />
      )}

      {/* 9. VietQR Dynamic Modal */}
      {qrModalItem && (
        <VietQRModal
          isOpen={!!qrModalItem}
          onClose={() => setQrModalItem(null)}
          studentName={qrModalItem.students?.name || 'Hoc Vien'}
          dueDate={qrModalItem.due_date}
          remainingAmount={Math.max(0, Number(qrModalItem.amount) - Number(qrModalItem.paid_amount))}
          organization={organization}
        />
      )}

      {/* 10. Printable Electronic Receipt Modal */}
      {receiptItem && (
        <TuitionReceiptModal
          isOpen={!!receiptItem}
          onClose={() => setReceiptItem(null)}
          receiptData={receiptItem}
        />
      )}
    </div>
  );
}
