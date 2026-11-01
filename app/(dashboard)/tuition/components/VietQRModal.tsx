'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { generateVietQRUrl, getBankByBin, removeVietnameseAccents } from '@/constants/banks';
import styles from '../Tuition.module.css';

interface VietQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  dueDate: string;
  remainingAmount: number;
  organization: {
    name: string;
    bank_bin?: string | null;
    bank_account_number?: string | null;
    bank_account_name?: string | null;
    bank_name?: string | null;
  } | null;
}

export function VietQRModal({
  isOpen,
  onClose,
  studentName,
  dueDate,
  remainingAmount,
  organization,
}: VietQRModalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const bankBin = organization?.bank_bin;
  const accountNumber = organization?.bank_account_number;
  const accountName = organization?.bank_account_name;
  const bankName = organization?.bank_name;

  const isBankConfigured = !!(bankBin && accountNumber && accountName);
  const bankDef = getBankByBin(bankBin);

  // Memo format: HP <StudentName> <DueDate>
  const memo = `HP ${removeVietnameseAccents(studentName)} ${dueDate}`;
  const qrUrl = isBankConfigured
    ? generateVietQRUrl({
        bankBin: bankBin!,
        accountNumber: accountNumber!,
        accountName: accountName!,
        amount: remainingAmount,
        addInfo: memo,
      })
    : '';

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadQR = async () => {
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `VietQR_${removeVietnameseAccents(studentName).replace(/\s+/g, '_')}_${dueDate}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      window.open(qrUrl, '_blank');
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN').format(val) + ' đ';

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="540px">
      <ModalHeader title="Mã Thanh Toán VietQR (Napas 247)" onClose={onClose} />

      <ModalBody>
        {!isBankConfigured ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '48px', color: 'var(--warning)', marginBottom: '12px' }}
            >
              account_balance
            </span>
            <h4 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '8px' }}>
              Chưa Cấu Hình Tài Khoản Ngân Hàng
            </h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Trung tâm cần cấu hình số tài khoản ngân hàng và tên chủ tài khoản để tự động sinh mã VietQR Napas 247 cho phụ huynh quét thanh toán.
            </p>
            <Link href="/settings" onClick={onClose}>
              <Button variant="primary" style={{ borderRadius: 'var(--radius-full)' }}>
                Đến Trang Cài Đặt Ngân Hàng
              </Button>
            </Link>
          </div>
        ) : (
          <div>
            <div className={styles.qrCardWrapper}>
              <div className={styles.qrBankHeader}>
                <div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Tài khoản nhận học phí
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                    {bankDef?.shortName || bankName || 'Ngân hàng'}
                  </div>
                </div>
                {bankDef?.logo && (
                  <img src={bankDef.logo} alt="Bank Logo" className={styles.qrBankLogo} />
                )}
              </div>

              {/* QR Code Container */}
              <div className={styles.qrImageContainer}>
                <img
                  src={qrUrl}
                  alt={`VietQR ${studentName}`}
                  className={styles.qrImage}
                />
              </div>

              {/* Detail fields with copy buttons */}
              <div className={styles.qrDetailsList}>
                <div className={styles.qrDetailRow}>
                  <span style={{ opacity: 0.8 }}>Chủ tài khoản:</span>
                  <strong style={{ letterSpacing: '0.04em' }}>{accountName}</strong>
                </div>

                <div className={styles.qrDetailRow}>
                  <span style={{ opacity: 0.8 }}>Số tài khoản:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong>{accountNumber}</strong>
                    <button
                      type="button"
                      className={styles.qrCopyBtn}
                      onClick={() => copyToClipboard(accountNumber!, 'account')}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                        {copiedKey === 'account' ? 'check' : 'content_copy'}
                      </span>
                      {copiedKey === 'account' ? 'Đã chép' : 'Sao chép'}
                    </button>
                  </div>
                </div>

                <div className={styles.qrDetailRow}>
                  <span style={{ opacity: 0.8 }}>Số tiền:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ color: '#fef08a', fontSize: '1.0625rem' }}>
                      {formatCurrency(remainingAmount)}
                    </strong>
                    <button
                      type="button"
                      className={styles.qrCopyBtn}
                      onClick={() => copyToClipboard(remainingAmount.toString(), 'amount')}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                        {copiedKey === 'amount' ? 'check' : 'content_copy'}
                      </span>
                      {copiedKey === 'amount' ? 'Đã chép' : 'Sao chép'}
                    </button>
                  </div>
                </div>

                <div className={styles.qrDetailRow}>
                  <span style={{ opacity: 0.8 }}>Nội dung chuyển khoản:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontFamily: 'monospace', color: '#6ee7b7' }}>
                      {memo}
                    </strong>
                    <button
                      type="button"
                      className={styles.qrCopyBtn}
                      onClick={() => copyToClipboard(memo, 'memo')}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                        {copiedKey === 'memo' ? 'check' : 'content_copy'}
                      </span>
                      {copiedKey === 'memo' ? 'Đã chép' : 'Sao chép'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              💡 Phụ huynh chỉ cần mở bất kỳ ứng dụng ngân hàng nào (Napas 247) và quét mã QR trên để thanh toán tức thì.
            </p>
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <Button type="button" variant="ghost" onClick={onClose}>
          Đóng
        </Button>
        {isBankConfigured && (
          <Button
            type="button"
            variant="primary"
            onClick={handleDownloadQR}
            style={{ borderRadius: 'var(--radius-full)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '6px' }}>
              download
            </span>
            Tải Ảnh QR
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
}

