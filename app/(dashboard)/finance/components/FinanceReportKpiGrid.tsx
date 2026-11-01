'use client';

import React from 'react';
import type { FinancialReportData } from '@/types/financeReport';
import styles from '@/app/styles/FinanceReports.module.css';

interface FinanceReportKpiGridProps {
  data: FinancialReportData;
  periodLabel: string;
}

function DeltaBadge({
  rate,
  isExpense = false,
}: {
  rate: number | null;
  isExpense?: boolean;
}) {
  if (rate === null) {
    return <span className={styles.badgeNeutral}>-</span>;
  }

  if (rate === 0) {
    return <span className={styles.badgeNeutral}>0%</span>;
  }

  // For expenses, growth is negative impact (red), decline is positive impact (green)
  const isPositiveImpact = isExpense ? rate < 0 : rate > 0;
  const badgeClass = isPositiveImpact ? styles.badgePositive : styles.badgeNegative;
  const icon = rate > 0 ? 'arrow_upward' : 'arrow_downward';

  return (
    <span className={badgeClass}>
      <span className="material-icons-round" style={{ fontSize: '13px' }}>
        {icon}
      </span>
      <span>
        {rate > 0 ? `+${rate}%` : `${rate}%`}
      </span>
    </span>
  );
}

export function FinanceReportKpiGrid({ data, periodLabel }: FinanceReportKpiGridProps) {
  const isNetProfitPositive = data.netProfit >= 0;

  return (
    <div className={styles.kpiGrid}>
      {/* 1. Doanh Thu Thuần */}
      <div className={`${styles.kpiCard} ${styles.kpiPrimary}`}>
        <div>
          <div className={styles.kpiHeader}>
            <div className={styles.kpiLabel}>
              <div className={styles.kpiDot} />
              <span>Doanh Thu Thuần</span>
            </div>
            <DeltaBadge rate={data.revenueGrowthRate} />
          </div>

          <div className={styles.kpiValue} style={{ color: 'var(--primary)' }}>
            +{data.totalRevenue.toLocaleString('vi-VN')} đ
          </div>
        </div>

        <div className={styles.kpiCaption}>
          <span>So với kỳ trước: <strong>{periodLabel}</strong></span>
        </div>

        <span
          className={`material-icons-round ${styles.kpiWatermark}`}
          style={{ color: 'var(--primary)' }}
        >
          trending_up
        </span>
      </div>

      {/* 2. Tổng Chi Phí */}
      <div className={`${styles.kpiCard} ${styles.kpiDanger}`}>
        <div>
          <div className={styles.kpiHeader}>
            <div className={styles.kpiLabel}>
              <div className={styles.kpiDot} />
              <span>Tổng Chi Phí</span>
            </div>
            <DeltaBadge rate={data.expenseGrowthRate} isExpense />
          </div>

          <div className={styles.kpiValue} style={{ color: 'var(--danger)' }}>
            -{data.totalExpense.toLocaleString('vi-VN')} đ
          </div>
        </div>

        <div className={styles.kpiCaption}>
          <span>So với kỳ trước: <strong>{periodLabel}</strong></span>
        </div>

        <span
          className={`material-icons-round ${styles.kpiWatermark}`}
          style={{ color: 'var(--danger)' }}
        >
          account_balance_wallet
        </span>
      </div>

      {/* 3. Lợi Nhuận Ròng */}
      <div
        className={`${styles.kpiCard} ${
          isNetProfitPositive ? styles.kpiSuccess : styles.kpiDanger
        }`}
      >
        <div>
          <div className={styles.kpiHeader}>
            <div className={styles.kpiLabel}>
              <div className={styles.kpiDot} />
              <span>Lợi Nhuận Ròng</span>
            </div>
            <DeltaBadge rate={data.profitGrowthRate} />
          </div>

          <div
            className={styles.kpiValue}
            style={{
              color: isNetProfitPositive ? 'var(--success)' : 'var(--danger)',
            }}
          >
            {isNetProfitPositive ? '+' : ''}
            {data.netProfit.toLocaleString('vi-VN')} đ
          </div>
        </div>

        <div className={styles.kpiCaption}>
          <span>So với kỳ trước: <strong>{periodLabel}</strong></span>
        </div>

        <span
          className={`material-icons-round ${styles.kpiWatermark}`}
          style={{
            color: isNetProfitPositive ? 'var(--success)' : 'var(--danger)',
          }}
        >
          monetization_on
        </span>
      </div>

      {/* 4. Biên Lợi Nhuận Ròng */}
      <div className={`${styles.kpiCard} ${styles.kpiWarning}`}>
        <div>
          <div className={styles.kpiHeader}>
            <div className={styles.kpiLabel}>
              <div className={styles.kpiDot} />
              <span>Biên Lợi Nhuận</span>
            </div>
            <span className="material-icons-round" style={{ fontSize: '18px', color: 'var(--accent-energy)' }}>
              pie_chart
            </span>
          </div>

          <div className={styles.kpiValue} style={{ color: 'var(--accent-energy)' }}>
            {data.profitMargin}%
          </div>
        </div>

        <div>
          {data.topVenue ? (
            <div
              className={styles.topVenueCapsule}
              title={`Cơ sở dẫn đầu về lợi nhuận: ${data.topVenue.venueName} (${data.topVenue.profitMargin}%)`}
            >
              <span className="material-icons-round" style={{ fontSize: '14px' }}>
                emoji_events
              </span>
              <span>
                {data.topVenue.venueName}: <strong>{data.topVenue.profitMargin}%</strong>
              </span>
            </div>
          ) : (
            <div className={styles.kpiCaption}>
              <span>Tỷ suất sinh lời trên doanh thu</span>
            </div>
          )}
        </div>

        <span
          className={`material-icons-round ${styles.kpiWatermark}`}
          style={{ color: 'var(--accent-energy)' }}
        >
          emoji_events
        </span>
      </div>
    </div>
  );
}
