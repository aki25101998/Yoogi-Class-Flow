'use client';

import React, { useState, useMemo } from 'react';
import type { FinancialReportData, FinancialReportFilters } from '@/types/financeReport';
import styles from '@/app/styles/FinanceReports.module.css';

export interface FinanceReportTableProps {
  data: FinancialReportData;
  filters: FinancialReportFilters;
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
  const isPositiveImpact = isExpense ? rate < 0 : rate > 0;
  const badgeClass = isPositiveImpact ? styles.badgePositive : styles.badgeNegative;
  const icon = rate > 0 ? 'arrow_upward' : 'arrow_downward';

  return (
    <span className={badgeClass}>
      <span className="material-icons-round" style={{ fontSize: '12px' }}>
        {icon}
      </span>
      <span>{rate > 0 ? `+${rate}%` : `${rate}%`}</span>
    </span>
  );
}

function formatMoney(amount: number | undefined): string {
  if (amount === undefined || amount === null || amount === 0) return '-';
  return `${amount.toLocaleString('vi-VN')} đ`;
}

function formatTotal(amount: number | undefined): string {
  if (amount === undefined || amount === null) return '0 đ';
  return `${amount.toLocaleString('vi-VN')} đ`;
}

function formatProfit(amount: number | undefined): string {
  if (amount === undefined || amount === null || amount === 0) return '0 đ';
  const prefix = amount > 0 ? '+' : '';
  return `${prefix}${amount.toLocaleString('vi-VN')} đ`;
}

export function FinanceReportTable({ data, filters }: FinanceReportTableProps) {
  // Combine all venues with shared overhead summary
  const allVenues = useMemo(() => {
    return [...data.venueSummaries, data.sharedSummary];
  }, [data.venueSummaries, data.sharedSummary]);

  // Track expanded parent categories
  const allParentCategories = useMemo(() => {
    return [
      ...data.revenueGroups.map((g) => g.parentCategory),
      ...data.expenseGroups.map((g) => g.parentCategory),
    ];
  }, [data.revenueGroups, data.expenseGroups]);

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(allParentCategories)
  );

  const toggleGroup = (parentCategory: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(parentCategory)) {
        next.delete(parentCategory);
      } else {
        next.add(parentCategory);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedGroups(new Set(allParentCategories));
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  // Determine highlighted venue column
  const selectedVenueId =
    filters.venueId && filters.venueId.toUpperCase() !== 'ALL'
      ? filters.venueId
      : null;

  const isVenueHighlighted = (venueId: string) => selectedVenueId === venueId;

  // Number of total columns: Category name + Venues + Total + Ratio % + MoM Growth
  const colCount = allVenues.length + 4;

  return (
    <div className={styles.tableCard}>
      {/* Table Card Header with Title and Accordion Action Controls */}
      <div className={styles.tableCardHeader}>
        <div className={styles.tableCardTitle}>
          <span className="material-icons-round" style={{ color: 'var(--primary)' }}>
            table_chart
          </span>
          <span>Bảng Ma Trận Lãi - Lỗ Đa Cơ Sở (Multi-Venue P&L Matrix)</span>
        </div>

        <div className={styles.tableControlsGroup}>
          <button
            type="button"
            className={styles.toggleBtn}
            onClick={expandAll}
            title="Mở rộng tất cả các nhóm hạng mục"
          >
            <span className="material-icons-round" style={{ fontSize: '16px' }}>
              unfold_more
            </span>
            <span>Mở rộng tất cả</span>
          </button>

          <button
            type="button"
            className={styles.toggleBtn}
            onClick={collapseAll}
            title="Thu gọn tất cả các nhóm hạng mục"
          >
            <span className="material-icons-round" style={{ fontSize: '16px' }}>
              unfold_less
            </span>
            <span>Thu gọn tất cả</span>
          </button>
        </div>
      </div>

      {/* Responsive Horizontal Scroll Matrix Table */}
      <div className={styles.tableScrollContainer}>
        <table className={styles.pnlTable}>
          <thead>
            <tr>
              <th className={styles.th} style={{ minWidth: '260px' }}>
                Hạng Mục Thu / Chi
              </th>
              {allVenues.map((v) => {
                const isHighlight = isVenueHighlighted(v.venueId);
                return (
                  <th
                    key={v.venueId}
                    className={`${styles.th} ${styles.textRight} ${
                      isHighlight ? styles.highlightColTh : ''
                    }`}
                    style={{ minWidth: '150px' }}
                  >
                    {v.venueName}
                  </th>
                );
              })}
              <th
                className={`${styles.th} ${styles.textRight}`}
                style={{ minWidth: '160px', fontWeight: 700 }}
              >
                Tổng Cộng (VND)
              </th>
              <th
                className={`${styles.th} ${styles.textRight}`}
                style={{ minWidth: '110px' }}
              >
                Tỷ Trọng (%)
              </th>
              <th
                className={`${styles.th} ${styles.textCenter}`}
                style={{ minWidth: '130px' }}
              >
                So Với Kỳ Trước
              </th>
            </tr>
          </thead>
          <tbody>
            {/* =============================================================
                SECTION I: DOANH THU THUẦN
                ============================================================= */}
            <tr>
              <td
                colSpan={colCount}
                className={`${styles.td} ${styles.sectionHeaderRow}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-icons-round" style={{ fontSize: '18px' }}>
                    trending_up
                  </span>
                  <span>I. DOANH THU THUẦN</span>
                </div>
              </td>
            </tr>

            {data.revenueGroups.length === 0 ? (
              <tr>
                <td colSpan={colCount} className={styles.emptyRow}>
                  (Chưa có phát sinh doanh thu trong kỳ)
                </td>
              </tr>
            ) : (
              data.revenueGroups.map((grp) => {
                const isExpanded = expandedGroups.has(grp.parentCategory);
                return (
                  <React.Fragment key={grp.parentCategory}>
                    {/* Parent Group Row */}
                    <tr
                      className={styles.categoryGroupRow}
                      onClick={() => toggleGroup(grp.parentCategory)}
                      title="Nhấn để mở rộng/thu gọn các hạng mục con"
                    >
                      <td className={styles.td}>
                        <div className={styles.groupTitle}>
                          <span className={`material-icons-round ${styles.chevronIcon}`}>
                            {isExpanded ? 'expand_more' : 'chevron_right'}
                          </span>
                          <span>{grp.parentCategory.toUpperCase()}</span>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--text-secondary)',
                              fontWeight: 400,
                            }}
                          >
                            ({grp.items.length})
                          </span>
                        </div>
                      </td>
                      {allVenues.map((v) => (
                        <td
                          key={v.venueId}
                          className={`${styles.td} ${styles.textRight} ${
                            isVenueHighlighted(v.venueId) ? styles.highlightCol : ''
                          }`}
                        >
                          {formatMoney(grp.byVenue[v.venueId])}
                        </td>
                      ))}
                      <td
                        className={`${styles.td} ${styles.textRight}`}
                        style={{ fontWeight: 600 }}
                      >
                        {formatTotal(grp.total)}
                      </td>
                      <td className={`${styles.td} ${styles.textRight}`}>
                        {data.totalRevenue > 0
                          ? `${((grp.total / data.totalRevenue) * 100).toFixed(1)}%`
                          : '0%'}
                      </td>
                      <td className={`${styles.td} ${styles.textCenter}`}>
                        <DeltaBadge rate={grp.growthRate} isExpense={false} />
                      </td>
                    </tr>

                    {/* Subcategories (when expanded) */}
                    {isExpanded &&
                      grp.items.map((item) => (
                        <tr
                          key={`${grp.parentCategory}-${item.name}`}
                          className={styles.subCategoryRow}
                        >
                          <td className={styles.td}>
                            <div className={styles.subCategoryIndent}>
                              <div className={styles.itemBullet} />
                              <span>{item.name}</span>
                            </div>
                          </td>
                          {allVenues.map((v) => (
                            <td
                              key={v.venueId}
                              className={`${styles.td} ${styles.textRight} ${
                                isVenueHighlighted(v.venueId) ? styles.highlightCol : ''
                              }`}
                            >
                              {formatMoney(item.byVenue[v.venueId])}
                            </td>
                          ))}
                          <td className={`${styles.td} ${styles.textRight}`}>
                            {formatTotal(item.total)}
                          </td>
                          <td className={`${styles.td} ${styles.textRight}`}>
                            {data.totalRevenue > 0
                              ? `${((item.total / data.totalRevenue) * 100).toFixed(1)}%`
                              : '0%'}
                          </td>
                          <td className={`${styles.td} ${styles.textCenter}`}>
                            <DeltaBadge rate={item.growthRate} isExpense={false} />
                          </td>
                        </tr>
                      ))}
                  </React.Fragment>
                );
              })
            )}

            {/* Total Revenue Row */}
            <tr className={styles.revenueTotalRow}>
              <td className={styles.td} style={{ color: 'var(--primary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-icons-round" style={{ fontSize: '18px' }}>
                    trending_up
                  </span>
                  <span>TỔNG DOANH THU (I)</span>
                </div>
              </td>
              {allVenues.map((v) => (
                <td
                  key={v.venueId}
                  className={`${styles.td} ${styles.textRight} ${
                    isVenueHighlighted(v.venueId) ? styles.highlightCol : ''
                  }`}
                  style={{ color: 'var(--primary)' }}
                >
                  {formatTotal(v.revenue)}
                </td>
              ))}
              <td
                className={`${styles.td} ${styles.textRight}`}
                style={{ color: 'var(--primary)' }}
              >
                {formatTotal(data.totalRevenue)}
              </td>
              <td
                className={`${styles.td} ${styles.textRight}`}
                style={{ color: 'var(--primary)' }}
              >
                100.0%
              </td>
              <td className={`${styles.td} ${styles.textCenter}`}>
                <DeltaBadge rate={data.revenueGrowthRate} />
              </td>
            </tr>

            {/* =============================================================
                SECTION II: CHI PHÍ VẬN HÀNH
                ============================================================= */}
            <tr>
              <td
                colSpan={colCount}
                className={`${styles.td} ${styles.sectionHeaderExpense}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-icons-round" style={{ fontSize: '18px' }}>
                    account_balance_wallet
                  </span>
                  <span>II. CHI PHÍ VẬN HÀNH</span>
                </div>
              </td>
            </tr>

            {data.expenseGroups.length === 0 ? (
              <tr>
                <td colSpan={colCount} className={styles.emptyRow}>
                  (Chưa có phát sinh chi phí trong kỳ)
                </td>
              </tr>
            ) : (
              data.expenseGroups.map((grp) => {
                const isExpanded = expandedGroups.has(grp.parentCategory);
                return (
                  <React.Fragment key={grp.parentCategory}>
                    {/* Parent Group Row */}
                    <tr
                      className={styles.categoryGroupRow}
                      onClick={() => toggleGroup(grp.parentCategory)}
                      title="Nhấn để mở rộng/thu gọn các hạng mục con"
                    >
                      <td className={styles.td}>
                        <div className={styles.groupTitle}>
                          <span className={`material-icons-round ${styles.chevronIcon}`}>
                            {isExpanded ? 'expand_more' : 'chevron_right'}
                          </span>
                          <span>{grp.parentCategory.toUpperCase()}</span>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--text-secondary)',
                              fontWeight: 400,
                            }}
                          >
                            ({grp.items.length})
                          </span>
                        </div>
                      </td>
                      {allVenues.map((v) => (
                        <td
                          key={v.venueId}
                          className={`${styles.td} ${styles.textRight} ${
                            isVenueHighlighted(v.venueId) ? styles.highlightCol : ''
                          }`}
                        >
                          {formatMoney(grp.byVenue[v.venueId])}
                        </td>
                      ))}
                      <td
                        className={`${styles.td} ${styles.textRight}`}
                        style={{ fontWeight: 600 }}
                      >
                        {formatTotal(grp.total)}
                      </td>
                      <td className={`${styles.td} ${styles.textRight}`}>
                        {data.totalRevenue > 0
                          ? `${((grp.total / data.totalRevenue) * 100).toFixed(1)}%`
                          : '-'}
                      </td>
                      <td className={`${styles.td} ${styles.textCenter}`}>
                        <DeltaBadge rate={grp.growthRate} isExpense />
                      </td>
                    </tr>

                    {/* Subcategories (when expanded) */}
                    {isExpanded &&
                      grp.items.map((item) => (
                        <tr
                          key={`${grp.parentCategory}-${item.name}`}
                          className={styles.subCategoryRow}
                        >
                          <td className={styles.td}>
                            <div className={styles.subCategoryIndent}>
                              <div className={styles.itemBullet} />
                              <span>{item.name}</span>
                            </div>
                          </td>
                          {allVenues.map((v) => (
                            <td
                              key={v.venueId}
                              className={`${styles.td} ${styles.textRight} ${
                                isVenueHighlighted(v.venueId) ? styles.highlightCol : ''
                              }`}
                            >
                              {formatMoney(item.byVenue[v.venueId])}
                            </td>
                          ))}
                          <td className={`${styles.td} ${styles.textRight}`}>
                            {formatTotal(item.total)}
                          </td>
                          <td className={`${styles.td} ${styles.textRight}`}>
                            {data.totalRevenue > 0
                              ? `${((item.total / data.totalRevenue) * 100).toFixed(1)}%`
                              : '-'}
                          </td>
                          <td className={`${styles.td} ${styles.textCenter}`}>
                            <DeltaBadge rate={item.growthRate} isExpense />
                          </td>
                        </tr>
                      ))}
                  </React.Fragment>
                );
              })
            )}

            {/* Total Expense Row */}
            <tr className={styles.expenseTotalRow}>
              <td className={styles.td} style={{ color: 'var(--danger)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-icons-round" style={{ fontSize: '18px' }}>
                    account_balance_wallet
                  </span>
                  <span>TỔNG CHI PHÍ VẬN HÀNH (II)</span>
                </div>
              </td>
              {allVenues.map((v) => (
                <td
                  key={v.venueId}
                  className={`${styles.td} ${styles.textRight} ${
                    isVenueHighlighted(v.venueId) ? styles.highlightCol : ''
                  }`}
                  style={{ color: 'var(--danger)' }}
                >
                  {formatTotal(v.expense)}
                </td>
              ))}
              <td
                className={`${styles.td} ${styles.textRight}`}
                style={{ color: 'var(--danger)' }}
              >
                {formatTotal(data.totalExpense)}
              </td>
              <td
                className={`${styles.td} ${styles.textRight}`}
                style={{ color: 'var(--danger)' }}
              >
                {data.totalRevenue > 0
                  ? `${((data.totalExpense / data.totalRevenue) * 100).toFixed(1)}%`
                  : '-'}
              </td>
              <td className={`${styles.td} ${styles.textCenter}`}>
                <DeltaBadge rate={data.expenseGrowthRate} isExpense />
              </td>
            </tr>

            {/* =============================================================
                SECTION III: LỢI NHUẬN RÒNG (I - II)
                ============================================================= */}
            <tr className={styles.netProfitRow}>
              <td className={styles.td}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    className="material-icons-round"
                    style={{ fontSize: '18px', color: 'var(--text-main)' }}
                  >
                    monetization_on
                  </span>
                  <span>III. LỢI NHUẬN RÒNG (I - II)</span>
                </div>
              </td>
              {allVenues.map((v) => {
                const isPositive = v.netProfit >= 0;
                const color = isPositive ? 'var(--primary)' : 'var(--danger)';
                return (
                  <td
                    key={v.venueId}
                    className={`${styles.td} ${styles.textRight} ${
                      isVenueHighlighted(v.venueId) ? styles.highlightCol : ''
                    }`}
                    style={{ color, fontWeight: 700 }}
                  >
                    {formatProfit(v.netProfit)}
                  </td>
                );
              })}
              <td
                className={`${styles.td} ${styles.textRight}`}
                style={{
                  color: data.netProfit >= 0 ? 'var(--primary)' : 'var(--danger)',
                  fontWeight: 800,
                }}
              >
                {formatProfit(data.netProfit)}
              </td>
              <td className={`${styles.td} ${styles.textRight}`}>-</td>
              <td className={`${styles.td} ${styles.textCenter}`}>
                <DeltaBadge rate={data.profitGrowthRate} />
              </td>
            </tr>

            {/* =============================================================
                SECTION IV: TỶ SUẤT LỢI NHUẬN (%)
                ============================================================= */}
            <tr className={styles.marginRow}>
              <td className={styles.td}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    className="material-icons-round"
                    style={{ fontSize: '18px', color: 'var(--text-main)' }}
                  >
                    pie_chart
                  </span>
                  <span>IV. TỶ SUẤT LỢI NHUẬN (%)</span>
                </div>
              </td>
              {allVenues.map((v) => {
                const isPositive = v.profitMargin >= 0;
                const color = isPositive ? 'var(--primary)' : 'var(--danger)';
                return (
                  <td
                    key={v.venueId}
                    className={`${styles.td} ${styles.textRight} ${
                      isVenueHighlighted(v.venueId) ? styles.highlightCol : ''
                    }`}
                    style={{ color, fontWeight: 600 }}
                  >
                    {v.revenue > 0 ? `${v.profitMargin}%` : '-'}
                  </td>
                );
              })}
              <td
                className={`${styles.td} ${styles.textRight}`}
                style={{
                  color: data.profitMargin >= 0 ? 'var(--primary)' : 'var(--danger)',
                  fontWeight: 700,
                }}
              >
                {data.totalRevenue > 0 ? `${data.profitMargin}%` : '-'}
              </td>
              <td className={`${styles.td} ${styles.textRight}`}>-</td>
              <td className={`${styles.td} ${styles.textCenter}`}>-</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
