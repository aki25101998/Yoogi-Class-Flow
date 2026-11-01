'use client';

import React from 'react';
import { TuitionSummary } from '@/types/tuition';
import styles from '../Tuition.module.css';

interface TuitionKpiGridProps {
  summary: TuitionSummary;
}

export function TuitionKpiGrid({ summary }: TuitionKpiGridProps) {
  const formatCurrency = (amount?: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount || 0) + ' đ';
  };

  const totalExpected = summary?.totalExpected || 0;
  const totalCollected = summary?.totalCollected || 0;
  const totalRemaining = summary?.totalRemaining || 0;
  const collectionRate = summary?.collectionRate || 0;
  const totalStudents = summary?.totalStudents || 0;
  const debtStudentsCount = summary?.debtStudentsCount || 0;

  return (
    <div className={styles.kpiGrid}>
      {/* KPI Card 1: Tổng Phải Thu Trong Kỳ */}
      <div className={`${styles.kpiCard} ${styles.cardPrimary}`}>
        <div>
          <div className={styles.kpiLabel}>
            <span className="material-icons-round" style={{ fontSize: '18px', color: 'var(--primary)' }}>
              receipt_long
            </span>
            Tổng Phải Thu Trong Kỳ
          </div>
          <div className={styles.kpiValue} style={{ color: 'var(--primary)' }}>
            {formatCurrency(totalExpected)}
          </div>
        </div>
        <div className={styles.kpiCaption}>
          Tổng {totalStudents} học viên trong kỳ
        </div>
        <span className={`material-icons-round ${styles.kpiWatermark}`}>
          receipt_long
        </span>
      </div>

      {/* KPI Card 2: Đã Thu Thực Tế */}
      <div className={`${styles.kpiCard} ${styles.cardSuccess}`}>
        <div>
          <div className={styles.kpiLabel}>
            <span className="material-icons-round" style={{ fontSize: '18px', color: 'var(--success)' }}>
              paid
            </span>
            Đã Thu Thực Tế
          </div>
          <div className={styles.kpiValue} style={{ color: 'var(--success)' }}>
            {formatCurrency(totalCollected)}
          </div>
        </div>
        <div className={styles.kpiCaption}>
          Hoàn thành: <strong>{collectionRate}%</strong> chỉ tiêu
        </div>
        <span className={`material-icons-round ${styles.kpiWatermark}`}>
          paid
        </span>
      </div>

      {/* KPI Card 3: Còn Nợ (Chưa Thu) */}
      <div className={`${styles.kpiCard} ${styles.cardDanger}`}>
        <div>
          <div className={styles.kpiLabel}>
            <span className="material-icons-round" style={{ fontSize: '18px', color: 'var(--danger)' }}>
              pending_actions
            </span>
            Còn Nợ (Chưa Thu)
          </div>
          <div className={styles.kpiValue} style={{ color: 'var(--danger)' }}>
            {formatCurrency(totalRemaining)}
          </div>
        </div>
        <div className={styles.kpiCaption}>
          Cần thu hồi bổ sung
        </div>
        <span className={`material-icons-round ${styles.kpiWatermark}`}>
          pending_actions
        </span>
      </div>

      {/* KPI Card 4: Học Viên Còn Nợ */}
      <div className={`${styles.kpiCard} ${styles.cardInfo}`}>
        <div>
          <div className={styles.kpiLabel}>
            <span className="material-icons-round" style={{ fontSize: '18px', color: 'var(--info, #3B82F6)' }}>
              people_outline
            </span>
            Học Viên Còn Nợ
          </div>
          <div className={styles.kpiValue} style={{ color: 'var(--info, #3B82F6)' }}>
            {debtStudentsCount} <span style={{ fontSize: '1rem', fontWeight: 600 }}>võ sinh</span>
          </div>
        </div>
        <div className={styles.kpiCaption}>
          Chưa nộp hoặc nộp thiếu
        </div>
        <span className={`material-icons-round ${styles.kpiWatermark}`}>
          people_outline
        </span>
      </div>
    </div>
  );
}
