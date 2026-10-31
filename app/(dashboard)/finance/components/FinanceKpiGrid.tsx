'use client';

import type { FinanceSummary } from '@/types/finance';
import pageStyles from '@/app/styles/page-standard.module.css';
import clientStyles from '../FinanceClient.module.css';

interface Props {
  summary: FinanceSummary;
}

export function FinanceKpiGrid({ summary }: Props) {
  const {
    totalIncome,
    totalExpense,
    netProfit,
    cashAmount,
    bankAmount,
    cashRatio,
    bankRatio,
    profitMargin,
  } = summary;

  return (
    <div className={pageStyles.overviewCard}>
      <div className={pageStyles.overviewGrid}>
        {/* KPI 1: Tổng Thu */}
        <div className={`${pageStyles.kpiItem} ${pageStyles.kpiSuccess}`}>
          <div className={pageStyles.kpiLabel}>
            <div className={pageStyles.kpiDot} />
            Tổng Thu Trong Kỳ
          </div>
          <div className={pageStyles.kpiValue} style={{ color: 'var(--success)' }}>
            +{totalIncome.toLocaleString('vi-VN')} đ
          </div>
          <div className={pageStyles.kpiCaption}>
            Doanh thu học phí & các khoản thu khác
          </div>
          <span className={`material-icons-round ${pageStyles.kpiWatermark}`} style={{ color: 'var(--success)' }}>
            trending_up
          </span>
        </div>

        {/* KPI 2: Tổng Chi */}
        <div className={`${pageStyles.kpiItem} ${pageStyles.kpiDanger}`}>
          <div className={pageStyles.kpiLabel}>
            <div className={pageStyles.kpiDot} />
            Tổng Chi Trong Kỳ
          </div>
          <div className={pageStyles.kpiValue} style={{ color: 'var(--danger)' }}>
            -{totalExpense.toLocaleString('vi-VN')} đ
          </div>
          <div className={pageStyles.kpiCaption}>
            Chi phí mặt bằng, lương HLV & vận hành
          </div>
          <span className={`material-icons-round ${pageStyles.kpiWatermark}`} style={{ color: 'var(--danger)' }}>
            trending_down
          </span>
        </div>

        {/* KPI 3: Lợi Nhuận Ròng */}
        <div className={`${pageStyles.kpiItem} ${netProfit >= 0 ? pageStyles.kpiPrimary : pageStyles.kpiDanger}`}>
          <div className={pageStyles.kpiLabel}>
            <div className={pageStyles.kpiDot} />
            Lợi Nhuận Ròng (Thu - Chi)
          </div>
          <div 
            className={pageStyles.kpiValue} 
            style={{ color: netProfit >= 0 ? 'var(--primary)' : 'var(--danger)' }}
          >
            {netProfit >= 0 ? '+' : ''}{netProfit.toLocaleString('vi-VN')} đ
          </div>
          <div className={pageStyles.kpiCaption}>
            Tỷ suất lợi nhuận ròng: <strong>{profitMargin}%</strong>
          </div>
          <span 
            className={`material-icons-round ${pageStyles.kpiWatermark}`} 
            style={{ color: netProfit >= 0 ? 'var(--primary)' : 'var(--danger)' }}
          >
            account_balance_wallet
          </span>
        </div>

        {/* KPI 4: Cơ Cấu Dòng Tiền */}
        <div className={`${pageStyles.kpiItem} ${pageStyles.kpiInfo}`}>
          <div className={pageStyles.kpiLabel}>
            <div className={pageStyles.kpiDot} />
            Cơ Cấu Dòng Tiền
          </div>
          <div className={pageStyles.kpiValue} style={{ fontSize: '1.25rem' }}>
            {cashRatio}% Tiền mặt / {bankRatio}% Bank
          </div>
          <div className={clientStyles.ratioBarContainer}>
            <div className={clientStyles.ratioCashFill} style={{ width: `${cashRatio}%` }} />
            <div className={clientStyles.ratioBankFill} style={{ width: `${bankRatio}%` }} />
          </div>
          <div className={clientStyles.ratioLabels}>
            <span>💵 Tiền mặt: {cashAmount.toLocaleString('vi-VN')} đ</span>
            <span>🏦 Chuyển khoản: {bankAmount.toLocaleString('vi-VN')} đ</span>
          </div>
          <span className={`material-icons-round ${pageStyles.kpiWatermark}`} style={{ color: '#3B82F6' }}>
            payments
          </span>
        </div>
      </div>
    </div>
  );
}

