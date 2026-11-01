'use client';

import React, { useState } from 'react';
import type { FinancialReportData, VenuePnlSummary } from '@/types/financeReport';
import styles from '@/app/styles/FinanceReports.module.css';

interface FinanceReportChartsProps {
  data: FinancialReportData;
}

const COST_PALETTE = [
  '#ff6b35', // Coral Orange (Vibrant Athletic)
  '#14b8a6', // Electric Teal
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#3b82f6', // Dodger Blue
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#6366f1', // Indigo
  '#06b6d4', // Cyan
  '#64748b', // Slate
];

export function FinanceReportCharts({ data }: FinanceReportChartsProps) {
  const [hoveredVenue, setHoveredVenue] = useState<{
    summary: VenuePnlSummary;
    x: number;
    y: number;
  } | null>(null);

  // Venues: All individual venues + Shared overhead
  const venues = [...data.venueSummaries, data.sharedSummary];

  // Calculate min & max for multi-venue chart scaling
  const allValues = venues.flatMap((v) => [v.revenue, v.expense, v.netProfit]);
  const maxVal = Math.max(...allValues, 1);
  const minVal = Math.min(...allValues, 0); // 0 or negative
  const range = Math.max(maxVal - minVal, 1);

  // SVG Chart Geometry
  const chartHeight = 220;
  const paddingTop = 24;
  const paddingBottom = 42;
  const usableHeight = chartHeight - paddingTop - paddingBottom;

  // Baseline Y: position where 0 VND sits
  const zeroRatio = -minVal / range; // fraction of range below 0
  const baselineY = chartHeight - paddingBottom - zeroRatio * usableHeight;

  const barWidth = 16;
  const barGap = 4;
  const groupBarSpan = barWidth * 3 + barGap * 2;
  const minGroupWidth = 92;
  const totalChartWidth = Math.max(venues.length * minGroupWidth + 60, 360);
  const step = (totalChartWidth - 60) / Math.max(venues.length, 1);

  const hasCostData = data.expenseStructure.length > 0 && data.totalExpense > 0;
  const hasVenueData = venues.some((v) => v.revenue > 0 || v.expense > 0);

  return (
    <div className={styles.chartsGrid}>
      {/* 1. Multi-Venue Comparison Chart */}
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <div>
            <h4 className={styles.chartTitle}>
              <span className="material-icons-round" style={{ color: 'var(--primary)', fontSize: '20px' }}>
                compare_arrows
              </span>
              So Sánh Doanh Thu & Lợi Nhuận Cơ Sở
            </h4>
            <div className={styles.chartSubtitle}>
              Doanh thu, chi phí và lợi nhuận ròng từng chi nhánh
            </div>
          </div>

          <div className={styles.chartLegend}>
            <div className={styles.legendItem}>
              <div className={styles.legendDot} style={{ background: 'var(--primary)' }} />
              <span>Doanh thu</span>
            </div>
            <div className={styles.legendItem}>
              <div className={styles.legendDot} style={{ background: 'var(--accent-energy)' }} />
              <span>Chi phí</span>
            </div>
            <div className={styles.legendItem}>
              <div className={styles.legendDot} style={{ background: 'var(--success)' }} />
              <span>Lợi nhuận</span>
            </div>
          </div>
        </div>

        <div className={styles.chartBody}>
          {!hasVenueData ? (
            <div className={styles.emptyChart}>
              <span className="material-icons-round" style={{ fontSize: '36px', opacity: 0.4 }}>
                bar_chart
              </span>
              <span>Chưa có dữ liệu thu chi theo cơ sở trong kỳ này</span>
            </div>
          ) : (
            <div className={styles.venueChartWrapper}>
              <svg
                className={styles.venueChartSvg}
                viewBox={`0 0 ${totalChartWidth} ${chartHeight}`}
                preserveAspectRatio="xMidYMid meet"
              >
                {/* Horizontal Zero Baseline */}
                <line
                  x1="16"
                  y1={baselineY}
                  x2={totalChartWidth - 16}
                  y2={baselineY}
                  stroke="var(--border)"
                  strokeDasharray={minVal < 0 ? '4 4' : 'none'}
                  strokeWidth="1.2"
                />

                {minVal < 0 && (
                  <text
                    x="20"
                    y={baselineY - 4}
                    fontSize="9"
                    fill="var(--text-muted)"
                    fontWeight="500"
                  >
                    0 đ
                  </text>
                )}

                {/* Bars for Each Venue */}
                {venues.map((venue, idx) => {
                  const groupX = 30 + idx * step + (step - groupBarSpan) / 2;

                  // 1. Revenue Bar (always >= 0)
                  const revHeight = Math.max(
                    (venue.revenue / range) * usableHeight,
                    venue.revenue > 0 ? 3 : 0
                  );
                  const revY = baselineY - revHeight;

                  // 2. Expense Bar (always >= 0)
                  const expHeight = Math.max(
                    (venue.expense / range) * usableHeight,
                    venue.expense > 0 ? 3 : 0
                  );
                  const expY = baselineY - expHeight;

                  // 3. Net Profit Bar (can be >= 0 or < 0)
                  const isProfitPositive = venue.netProfit >= 0;
                  const profitHeight = Math.max(
                    (Math.abs(venue.netProfit) / range) * usableHeight,
                    Math.abs(venue.netProfit) > 0 ? 3 : 0
                  );
                  const profitY = isProfitPositive ? baselineY - profitHeight : baselineY;
                  const profitFill = isProfitPositive ? 'var(--success)' : 'var(--danger)';

                  const shortName =
                    venue.venueName.length > 13
                      ? venue.venueName.slice(0, 11) + '...'
                      : venue.venueName;

                  return (
                    <g
                      key={venue.venueId}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoveredVenue({
                          summary: venue,
                          x: Math.min(groupX + 30, totalChartWidth - 190),
                          y: Math.max(Math.min(revY, expY, profitY) - 10, 10),
                        });
                      }}
                      onMouseLeave={() => setHoveredVenue(null)}
                    >
                      {/* Invisible hover zone for the whole group */}
                      <rect
                        x={groupX - 6}
                        y={paddingTop}
                        width={groupBarSpan + 12}
                        height={usableHeight + 10}
                        fill="transparent"
                      />

                      {/* Bar 1: Doanh Thu */}
                      <rect
                        x={groupX}
                        y={revY}
                        width={barWidth}
                        height={revHeight}
                        rx={3}
                        fill="var(--primary)"
                        opacity={0.9}
                      />

                      {/* Bar 2: Chi Phí */}
                      <rect
                        x={groupX + barWidth + barGap}
                        y={expY}
                        width={barWidth}
                        height={expHeight}
                        rx={3}
                        fill="var(--accent-energy)"
                        opacity={0.9}
                      />

                      {/* Bar 3: Lợi Nhuận Ròng */}
                      <rect
                        x={groupX + (barWidth + barGap) * 2}
                        y={profitY}
                        width={barWidth}
                        height={profitHeight}
                        rx={3}
                        fill={profitFill}
                        opacity={0.92}
                      />

                      {/* Venue Name Label */}
                      <text
                        x={groupX + groupBarSpan / 2}
                        y={chartHeight - 12}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="600"
                        fill="var(--text-main)"
                      >
                        {shortName}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Hover Tooltip */}
              {hoveredVenue && (
                <div
                  className={styles.chartTooltip}
                  style={{
                    left: `${(hoveredVenue.x / totalChartWidth) * 100}%`,
                    top: `${Math.max(hoveredVenue.y, 10)}px`,
                  }}
                >
                  <div className={styles.tooltipTitle}>{hoveredVenue.summary.venueName}</div>
                  <div className={styles.tooltipRow}>
                    <span style={{ color: 'var(--text-secondary)' }}>Doanh thu:</span>
                    <strong style={{ color: 'var(--primary)' }}>
                      +{hoveredVenue.summary.revenue.toLocaleString('vi-VN')} đ
                    </strong>
                  </div>
                  <div className={styles.tooltipRow}>
                    <span style={{ color: 'var(--text-secondary)' }}>Chi phí:</span>
                    <strong style={{ color: 'var(--accent-energy)' }}>
                      -{hoveredVenue.summary.expense.toLocaleString('vi-VN')} đ
                    </strong>
                  </div>
                  <div className={styles.tooltipRow}>
                    <span style={{ color: 'var(--text-secondary)' }}>Lợi nhuận:</span>
                    <strong
                      style={{
                        color:
                          hoveredVenue.summary.netProfit >= 0 ? 'var(--success)' : 'var(--danger)',
                      }}
                    >
                      {hoveredVenue.summary.netProfit >= 0 ? '+' : ''}
                      {hoveredVenue.summary.netProfit.toLocaleString('vi-VN')} đ
                    </strong>
                  </div>
                  <div className={styles.tooltipRow}>
                    <span style={{ color: 'var(--text-secondary)' }}>Tỷ suất:</span>
                    <strong style={{ color: 'var(--text-main)' }}>
                      {hoveredVenue.summary.profitMargin}%
                    </strong>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. Cost Structure Breakdown Chart */}
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <div>
            <h4 className={styles.chartTitle}>
              <span className="material-icons-round" style={{ color: 'var(--accent-energy)', fontSize: '20px' }}>
                donut_large
              </span>
              Cơ Cấu Chi Phí Vận Hành
            </h4>
            <div className={styles.chartSubtitle}>
              Tỷ trọng phân bổ theo nhóm danh mục chi phí cha
            </div>
          </div>
        </div>

        <div className={styles.chartBody}>
          {!hasCostData ? (
            <div className={styles.emptyChart}>
              <span className="material-icons-round" style={{ fontSize: '36px', opacity: 0.4 }}>
                shopping_bag
              </span>
              <span>Chưa có khoản chi nào phát sinh trong kỳ này</span>
            </div>
          ) : (
            <div>
              {/* Stacked Horizontal Bar */}
              <div className={styles.stackedBarContainer}>
                {data.expenseStructure.map((item, idx) => {
                  const color = COST_PALETTE[idx % COST_PALETTE.length];
                  return (
                    <div
                      key={item.category}
                      className={styles.stackedSegment}
                      style={{
                        width: `${Math.max(item.percentage, 0.5)}%`,
                        background: color,
                      }}
                      title={`${item.category}: ${item.amount.toLocaleString('vi-VN')} đ (${item.percentage}%)`}
                    />
                  );
                })}
              </div>

              {/* Legend Grid with Amounts & % */}
              <div className={styles.costLegendGrid}>
                {data.expenseStructure.map((item, idx) => {
                  const color = COST_PALETTE[idx % COST_PALETTE.length];
                  return (
                    <div key={item.category} className={styles.costLegendCard}>
                      <div className={styles.costLegendInfo}>
                        <div className={styles.legendDot} style={{ background: color, flexShrink: 0 }} />
                        <span className={styles.costLegendName} title={item.category}>
                          {item.category}
                        </span>
                      </div>
                      <div className={styles.costLegendValues}>
                        <span className={styles.costLegendAmount}>
                          -{item.amount.toLocaleString('vi-VN')} đ
                        </span>
                        <span className={styles.costLegendPct}>{item.percentage}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
