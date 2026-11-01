'use client';

import React from 'react';
import { TuitionSummary } from '@/types/tuition';
import styles from '@/app/styles/page-standard.module.css';

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
    <div className={styles.overviewCard}>
      {/* Header bar matches Students overview card */}
      <div className={styles.overviewHeader}>
        <div className={styles.overviewTitle}>
          <span className="material-icons-round" style={{ fontSize: '18px', color: 'var(--primary)' }}>
            analytics
          </span>
          TỔNG QUAN HỌC PHÍ
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
          Số liệu cập nhật thời gian thực
        </div>
      </div>

      <div className={styles.overviewGrid}>
        {/* KPI 1: Tổng Phải Thu Trong Kỳ */}
        <div className={`${styles.kpiItem} ${styles.kpiPrimary}`}>
          <div className={styles.kpiLabel}>
            <div className={styles.kpiDot}></div>
            Tổng Phải Thu
          </div>
          <div className={styles.kpiValue}>
            {formatCurrency(totalExpected)}
          </div>
          <div className={styles.kpiCaption}>
            Tổng {totalStudents} học viên trong kỳ
          </div>
          <span className={`material-icons-round ${styles.kpiWatermark}`} style={{ color: 'var(--primary)' }}>
            receipt_long
          </span>
        </div>

        {/* KPI 2: Đã Thu Thực Tế */}
        <div className={`${styles.kpiItem} ${styles.kpiSuccess}`}>
          <div className={styles.kpiLabel}>
            <div className={styles.kpiDot}></div>
            Đã Thu Thực Tế
          </div>
          <div className={styles.kpiValue}>
            {formatCurrency(totalCollected)}
          </div>
          <div className={styles.kpiCaption}>
            Hoàn thành: <strong>{collectionRate}%</strong> chỉ tiêu
          </div>
          <span className={`material-icons-round ${styles.kpiWatermark}`} style={{ color: 'var(--success)' }}>
            paid
          </span>
        </div>

        {/* KPI 3: Còn Nợ (Chưa Thu) */}
        <div className={`${styles.kpiItem} ${styles.kpiWarning}`}>
          <div className={styles.kpiLabel}>
            <div className={styles.kpiDot}></div>
            Còn Nợ (Chưa Thu)
          </div>
          <div className={styles.kpiValue}>
            {formatCurrency(totalRemaining)}
          </div>
          <div className={styles.kpiCaption}>
            Cần thu hồi bổ sung
          </div>
          <span className={`material-icons-round ${styles.kpiWatermark}`} style={{ color: 'var(--warning)' }}>
            pending_actions
          </span>
        </div>

        {/* KPI 4: Học Viên Còn Nợ */}
        <div className={`${styles.kpiItem} ${styles.kpiInfo}`}>
          <div className={styles.kpiLabel}>
            <div className={styles.kpiDot}></div>
            Học Viên Còn Nợ
          </div>
          <div className={styles.kpiValue}>
            {debtStudentsCount} <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>võ sinh</span>
          </div>
          <div className={styles.kpiCaption}>
            Chưa nộp hoặc nộp thiếu
          </div>
          <span className={`material-icons-round ${styles.kpiWatermark}`} style={{ color: 'var(--info)' }}>
            groups
          </span>
        </div>
      </div>
    </div>
  );
}
