'use client';

import { useState } from 'react';
import type { CashflowDataPoint, ExpenseDistributionItem } from '@/types/finance';
import styles from '../FinanceClient.module.css';

interface Props {
  trends: CashflowDataPoint[];
  expenseDistribution: ExpenseDistributionItem[];
}

export function FinanceCharts({ trends, expenseDistribution }: Props) {
  const [hoveredPoint, setHoveredPoint] = useState<CashflowDataPoint | null>(null);

  // Calculate max amount for SVG scaling
  const maxAmount = Math.max(
    ...trends.map(t => Math.max(t.income, t.expense)),
    1000000 // default minimum baseline 1M VND
  );

  const chartHeight = 160;
  const paddingBottom = 24;
  const usableHeight = chartHeight - paddingBottom;

  return (
    <div className={styles.chartsGrid}>
      {/* 1. CASHFLOW TREND CHART (SVG Dual Bar) */}
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <div>
            <h4 className={styles.chartTitle}>
              <span className="material-icons-round text-primary" style={{ fontSize: '20px' }}>insights</span>
              Xu Hướng Dòng Tiền
            </h4>
            <div className={styles.chartSubtitle}>Thu vs Chi qua các mốc thời gian</div>
          </div>
          <div className={styles.chartLegend}>
            <div className={styles.legendItem}>
              <div className={styles.legendDot} style={{ background: 'var(--success)' }} />
              <span>Thu</span>
            </div>
            <div className={styles.legendItem}>
              <div className={styles.legendDot} style={{ background: 'var(--danger)' }} />
              <span>Chi</span>
            </div>
          </div>
        </div>

        {trends.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[200px] text-secondary text-sm">
            <span className="material-icons-round text-3xl mb-1 opacity-50">bar_chart</span>
            Chưa có dữ liệu dòng tiền trong kỳ này
          </div>
        ) : (
          <div className={styles.svgChartContainer}>
            <svg 
              className={styles.svgChart} 
              viewBox={`0 0 ${Math.max(trends.length * 48, 300)} ${chartHeight}`} 
              preserveAspectRatio="none"
            >
              {trends.map((item, index) => {
                const totalWidth = Math.max(trends.length * 48, 300);
                const step = totalWidth / trends.length;
                const groupX = index * step + step * 0.15;
                const barWidth = Math.max(step * 0.3, 6);

                const incomeHeight = Math.max((item.income / maxAmount) * usableHeight, item.income > 0 ? 4 : 0);
                const expenseHeight = Math.max((item.expense / maxAmount) * usableHeight, item.expense > 0 ? 4 : 0);

                const incomeY = usableHeight - incomeHeight;
                const expenseY = usableHeight - expenseHeight;

                return (
                  <g 
                    key={item.date} 
                    onMouseEnter={() => setHoveredPoint(item)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Income Bar */}
                    <rect
                      x={groupX}
                      y={incomeY}
                      width={barWidth}
                      height={incomeHeight}
                      rx={3}
                      fill="var(--success)"
                      opacity={0.88}
                    />

                    {/* Expense Bar */}
                    <rect
                      x={groupX + barWidth + 3}
                      y={expenseY}
                      width={barWidth}
                      height={expenseHeight}
                      rx={3}
                      fill="var(--danger)"
                      opacity={0.88}
                    />

                    {/* X-axis date label */}
                    <text
                      x={groupX + barWidth}
                      y={chartHeight - 6}
                      textAnchor="middle"
                      fontSize="10"
                      fill="var(--text-secondary)"
                    >
                      {item.label}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip */}
            {hoveredPoint && (
              <div 
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '16px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '8px 12px',
                  boxShadow: 'var(--shadow-md)',
                  fontSize: '0.75rem',
                  zIndex: 10,
                  pointerEvents: 'none',
                }}
              >
                <div className="font-bold text-main mb-1">Mốc: {hoveredPoint.label}</div>
                <div style={{ color: 'var(--success)' }}>
                  Thu: +{hoveredPoint.income.toLocaleString('vi-VN')} đ
                </div>
                <div style={{ color: 'var(--danger)' }}>
                  Chi: -{hoveredPoint.expense.toLocaleString('vi-VN')} đ
                </div>
                <div style={{ fontWeight: 600, marginTop: '2px', color: hoveredPoint.net >= 0 ? 'var(--primary)' : 'var(--danger)' }}>
                  Dư: {hoveredPoint.net >= 0 ? '+' : ''}{hoveredPoint.net.toLocaleString('vi-VN')} đ
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. EXPENSE DISTRIBUTION BARS */}
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <div>
            <h4 className={styles.chartTitle}>
              <span className="material-icons-round text-accent-energy" style={{ fontSize: '20px' }}>pie_chart</span>
              Cơ Cấu Chi Phí
            </h4>
            <div className={styles.chartSubtitle}>Phân bổ theo Nhóm danh mục cha</div>
          </div>
        </div>

        {expenseDistribution.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[200px] text-secondary text-sm">
            <span className="material-icons-round text-3xl mb-1 opacity-50">shopping_bag</span>
            Chưa có khoản chi nào trong kỳ này
          </div>
        ) : (
          <div className={styles.distributionList}>
            {expenseDistribution.map(item => (
              <div key={item.parentCategory} className={styles.distributionItem}>
                <div className={styles.distributionHeader}>
                  <div className={styles.distributionLabel}>
                    <span className="material-icons-round text-sm" style={{ color: 'var(--accent-energy)', fontSize: '18px' }}>
                      {item.icon || 'label'}
                    </span>
                    <span>{item.parentCategory}</span>
                  </div>
                  <div className={styles.distributionAmount}>
                    -{item.amount.toLocaleString('vi-VN')} đ ({item.percentage}%)
                  </div>
                </div>
                <div className={styles.distributionBarBg}>
                  <div 
                    className={styles.distributionBarFill} 
                    style={{ width: `${Math.max(item.percentage, 2)}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
