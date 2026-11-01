'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { Input, Select } from '@/app/components/ui/Input';
import { useClassStudents } from '@/hooks/useClassStudents';
import { BatchStudentItem } from '@/types/tuition';
import { createBatchTuitionAction } from '../actions';
import styles from '../Tuition.module.css';

interface BatchTuitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  classes: { id: string; name: string; default_tuition_fee?: number | null }[];
  currentMonth: string;
  onSuccess: (count: number) => void;
}

export function BatchTuitionModal({
  isOpen,
  onClose,
  organizationId,
  classes = [],
  currentMonth,
  onSuccess,
}: BatchTuitionModalProps) {
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const [dueDate, setDueDate] = useState<string>(currentMonth);
  const [studentItems, setStudentItems] = useState<BatchStudentItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  // Sync selectedClassId when modal opens and classes is loaded
  useEffect(() => {
    if (isOpen && (!selectedClassId || !classes.some((c) => c.id === selectedClassId))) {
      if (classes.length > 0) {
        setSelectedClassId(classes[0].id);
      }
    }
  }, [isOpen, classes, selectedClassId]);

  // Fetch enrolled students in the selected class
  const { data: enrolledStudents = [], isLoading: isLoadingStudents } = useClassStudents(
    selectedClassId,
    organizationId
  );

  // Find default fee for selected class
  const selectedClass = useMemo(
    () => (classes || []).find((c) => c.id === selectedClassId),
    [classes, selectedClassId]
  );
  const defaultFee = Number(selectedClass?.default_tuition_fee) || 0;

  // Sync enrolled students into local editable state
  useEffect(() => {
    if (!selectedClassId) {
      setStudentItems([]);
      return;
    }

    const items: BatchStudentItem[] = enrolledStudents.map((st) => ({
      student_id: st.student_id,
      name: st.name,
      avatar_url: st.avatar_url,
      phone: st.phone,
      amount: defaultFee,
      notes: '',
      isSelected: true,
    }));

    setStudentItems(items);
  }, [enrolledStudents, defaultFee, selectedClassId]);

  if (!isOpen) return null;

  const handleToggleSelectAll = (checked: boolean) => {
    setStudentItems((prev) => prev.map((item) => ({ ...item, isSelected: checked })));
  };

  const handleToggleStudent = (studentId: string, checked: boolean) => {
    setStudentItems((prev) =>
      prev.map((item) => (item.student_id === studentId ? { ...item, isSelected: checked } : item))
    );
  };

  const handleAmountChange = (studentId: string, val: number) => {
    setStudentItems((prev) =>
      prev.map((item) => (item.student_id === studentId ? { ...item, amount: val } : item))
    );
  };

  const handleNotesChange = (studentId: string, val: string) => {
    setStudentItems((prev) =>
      prev.map((item) => (item.student_id === studentId ? { ...item, notes: val } : item))
    );
  };

  const selectedStudents = studentItems.filter((item) => item.isSelected);
  const totalAmount = selectedStudents.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const allSelected = studentItems.length > 0 && selectedStudents.length === studentItems.length;

  const handleSubmit = async () => {
    setError('');
    if (!selectedClassId) {
      setError('Vui lòng chọn lớp học.');
      return;
    }
    if (!dueDate) {
      setError('Vui lòng chọn kỳ thu học phí.');
      return;
    }
    if (selectedStudents.length === 0) {
      setError('Vui lòng chọn ít nhất một học viên.');
      return;
    }

    setIsSubmitting(true);
    const payload = {
      class_id: selectedClassId,
      due_date: dueDate,
      students: selectedStudents.map((item) => ({
        student_id: item.student_id,
        amount: Math.max(0, Number(item.amount) || 0),
        notes: item.notes || undefined,
      })),
    };

    const res = await createBatchTuitionAction(payload);
    setIsSubmitting(false);

    if (res.success) {
      onSuccess(res.inserted_count || selectedStudents.length);
      onClose();
    } else {
      setError(res.error || 'Lỗi khi tạo học phí hàng loạt.');
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN').format(val) + ' đ';

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="800px">
      <ModalHeader title="Tạo Học Phí Hàng Loạt Cho Lớp" onClose={onClose} />

      <ModalBody>
        {error && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--danger)',
              fontSize: '0.875rem',
              marginBottom: '16px',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
              Chọn Lớp Học
            </label>
            <Select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              options={(classes || []).map((cls) => ({
                value: cls.id,
                label: `${cls.name} ${cls.default_tuition_fee ? `(${formatCurrency(cls.default_tuition_fee)}/tháng)` : ''}`,
              }))}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
              Kỳ Thu Phí (Tháng)
            </label>
            <Input
              type="month"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        {/* Student list preview table */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase' }}>
              Danh Sách Học Viên Trong Lớp ({studentItems.length})
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Mức học phí mặc định: <strong>{formatCurrency(defaultFee)}</strong>
            </span>
          </div>

          {isLoadingStudents ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Đang tải danh sách học viên trong lớp...
            </div>
          ) : studentItems.length === 0 ? (
            <div
              style={{
                padding: '32px',
                textAlign: 'center',
                background: 'var(--surface-hover)',
                borderRadius: 'var(--radius-lg)',
                color: 'var(--text-muted)',
              }}
            >
              Lớp này hiện chưa có học viên nào đang theo học (hoặc chưa được phân lớp).
            </div>
          ) : (
            <div className={styles.batchTableContainer}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--border-light)' }}>
                    <th style={{ padding: '10px 12px', width: '40px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={(e) => handleToggleSelectAll(e.target.checked)}
                        style={{ cursor: 'pointer' }}
                      />
                    </th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Học Viên</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', width: '160px', fontWeight: 600 }}>
                      Số Tiền (VNĐ)
                    </th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', width: '180px', fontWeight: 600 }}>
                      Ghi Chú
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {studentItems.map((item) => (
                    <tr
                      key={item.student_id}
                      style={{
                        borderBottom: '1px solid var(--border-light)',
                        background: item.isSelected ? 'transparent' : 'rgba(0, 0, 0, 0.02)',
                        opacity: item.isSelected ? 1 : 0.6,
                      }}
                    >
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={item.isSelected}
                          onChange={(e) => handleToggleStudent(item.student_id, e.target.checked)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div className={styles.studentCell}>
                          <div className={styles.studentAvatar}>
                            {item.avatar_url ? (
                              <img src={item.avatar_url} alt={item.name} className={styles.studentAvatarImg} />
                            ) : (
                              item.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className={styles.studentName}>{item.name}</div>
                            {item.phone && <div className={styles.studentSub}>{item.phone}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <Input
                          type="number"
                          min={0}
                          step={10000}
                          value={item.amount}
                          disabled={!item.isSelected}
                          onChange={(e) => handleAmountChange(item.student_id, Number(e.target.value) || 0)}
                          style={{ textAlign: 'right', fontWeight: 600 }}
                        />
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <Input
                          type="text"
                          placeholder="Miễn giảm, phụ thu..."
                          value={item.notes}
                          disabled={!item.isSelected}
                          onChange={(e) => handleNotesChange(item.student_id, e.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {studentItems.length > 0 && (
            <div className={styles.batchSummaryFooter}>
              <span>
                Đã chọn: <strong>{selectedStudents.length}</strong> / {studentItems.length} học viên
              </span>
              <span style={{ color: 'var(--primary)', fontSize: '1rem' }}>
                Tổng học phí dự kiến: <strong>{formatCurrency(totalAmount)}</strong>
              </span>
            </div>
          )}
        </div>
      </ModalBody>

      <ModalFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
          Hủy Bỏ
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={handleSubmit}
          disabled={isSubmitting || selectedStudents.length === 0}
          style={{ borderRadius: 'var(--radius-full)' }}
        >
          {isSubmitting
            ? 'Đang khởi tạo...'
            : `Xác Nhận Tạo Cho ${selectedStudents.length} Học Viên`}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
