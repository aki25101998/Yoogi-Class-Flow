'use client';

import React from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { ReceiptData } from '@/types/tuition';
import styles from '../Tuition.module.css';

interface TuitionReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptData: ReceiptData | null;
}

export function TuitionReceiptModal({
  isOpen,
  onClose,
  receiptData,
}: TuitionReceiptModalProps) {
  if (!isOpen || !receiptData) return null;

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN').format(val) + ' VNĐ';

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'bank_transfer':
        return 'Chuyển khoản ngân hàng';
      case 'cash':
        return 'Tiền mặt';
      default:
        return 'Khác';
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="650px">
      <ModalHeader title="Phiếu Thu Điện Tử" onClose={onClose} />

      <ModalBody>
        {/* Printable E-Receipt with CSS Print Isolation */}
        <div className={styles.receiptContainer}>
          <div className={styles.receiptHeader}>
            <div>
              <div className={styles.receiptOrgName}>{receiptData.org_name}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                Hệ thống Quản lý Võ đường & Thể thao Yoogi Flow
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a' }}>
                MÃ PHIẾU THU
              </div>
              <div style={{ fontSize: '0.875rem', fontFamily: 'monospace', color: '#3b82f6', fontWeight: 600 }}>
                {receiptData.receipt_number}
              </div>
            </div>
          </div>

          <div className={styles.receiptTitle}>PHIẾU THU HỌC PHÍ</div>
          <div className={styles.receiptNumber}>
            Ngày lập: {formatDateTime(receiptData.paid_at)}
          </div>

          <table className={styles.receiptTable}>
            <tbody>
              <tr>
                <td style={{ color: '#64748b', width: '40%' }}>Họ tên học viên:</td>
                <td style={{ color: '#0f172a', fontSize: '0.9375rem' }}>{receiptData.student_name}</td>
              </tr>
              <tr>
                <td style={{ color: '#64748b' }}>Lớp đào tạo:</td>
                <td>{receiptData.class_name}</td>
              </tr>
              <tr>
                <td style={{ color: '#64748b' }}>Kỳ thu phí:</td>
                <td>{receiptData.due_date}</td>
              </tr>
              <tr>
                <td style={{ color: '#64748b' }}>Phương thức nộp:</td>
                <td>{getPaymentMethodLabel(receiptData.payment_method)}</td>
              </tr>
              {receiptData.notes && (
                <tr>
                  <td style={{ color: '#64748b' }}>Ghi chú:</td>
                  <td>{receiptData.notes}</td>
                </tr>
              )}
              <tr>
                <td style={{ color: '#64748b' }}>Mức học phí kỳ này:</td>
                <td>{formatCurrency(receiptData.amount)}</td>
              </tr>
              <tr className={styles.receiptTotalRow}>
                <td>SỐ TIỀN ĐÃ THU:</td>
                <td style={{ color: '#10b981' }}>{formatCurrency(receiptData.paid_amount)}</td>
              </tr>
              {receiptData.remaining > 0 && (
                <tr>
                  <td style={{ color: '#ef4444', fontWeight: 600 }}>Còn nợ lại:</td>
                  <td style={{ color: '#ef4444' }}>{formatCurrency(receiptData.remaining)}</td>
                </tr>
              )}
            </tbody>
          </table>

          <div className={styles.receiptSignatures}>
            <div>
              <div className={styles.signatureTitle}>Người nộp tiền</div>
              <div className={styles.signatureSub}>(Ký & ghi rõ họ tên)</div>
            </div>
            <div>
              <div className={styles.signatureTitle}>Người thu tiền</div>
              <div className={styles.signatureSub}>(Ký & đóng dấu)</div>
            </div>
          </div>

          <div
            style={{
              marginTop: '40px',
              paddingTop: '16px',
              borderTop: '1px dashed #e2e8f0',
              textAlign: 'center',
              fontSize: '0.75rem',
              color: '#94a3b8',
            }}
          >
            Phiếu thu điện tử hợp lệ được xuất từ phần mềm Yoogi Class Flow. Vui lòng lưu giữ để đối chiếu khi cần.
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <Button type="button" variant="ghost" onClick={onClose} className={styles.noPrint}>
          Đóng
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={handlePrint}
          className={styles.noPrint}
          style={{ borderRadius: 'var(--radius-full)' }}
        >
          <span className="material-icons-round" style={{ fontSize: '18px', marginRight: '6px' }}>
            print
          </span>
          In Phiếu Thu
        </Button>
      </ModalFooter>
    </Modal>
  );
}
