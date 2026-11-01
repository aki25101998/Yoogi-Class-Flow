import * as XLSX from 'xlsx';
import type { FinancialReportData } from '@/types/financeReport';

export function exportPnLToExcel(
  reportData: FinancialReportData,
  organizationName: string = 'Yoogi Class Flow'
) {
  const { currentPeriod, revenueGroups, expenseGroups, venueSummaries, sharedSummary, totalRevenue } = reportData;

  const venues = [...venueSummaries, sharedSummary].filter(Boolean);
  const rows: (string | number)[][] = [];

  // 1. Header Metadata
  rows.push([organizationName.toUpperCase()]);
  rows.push(['BÁO CÁO KẾT QUẢ KINH DOANH (P&L)']);
  rows.push([`Kỳ báo cáo: ${currentPeriod.startDate} đến ${currentPeriod.endDate}`]);
  rows.push([]); // Empty spacer

  // 2. Table Column Headers
  const header = [
    'HẠNG MỤC THU / CHI',
    ...venues.map((v) => v.venueName),
    'TỔNG CỘNG (VND)',
    'TỶ TRỌNG (%)',
    'SO VỚI KỲ TRƯỚC (%)',
  ];
  rows.push(header);

  // Helpers
  const fmt = (val: number | undefined) => val ?? 0;
  const formatGrowth = (rate?: number | null) =>
    typeof rate === 'number' ? `${rate > 0 ? '+' : ''}${rate}%` : '-';
  const formatRatio = (amount: number) =>
    totalRevenue > 0 ? `${((amount / totalRevenue) * 100).toFixed(1)}%` : '0%';

  // 3. Section I: DOANH THU
  rows.push(['I. DOANH THU THUẦN']);
  for (const grp of revenueGroups) {
    const grpRow = [
      `  ${grp.parentCategory.toUpperCase()}`,
      ...venues.map((v) => fmt(grp.byVenue[v.venueId])),
      grp.total,
      formatRatio(grp.total),
      formatGrowth(grp.growthRate),
    ];
    rows.push(grpRow);

    for (const item of grp.items) {
      const itmRow = [
        `    • ${item.name}`,
        ...venues.map((v) => fmt(item.byVenue[v.venueId])),
        item.total,
        formatRatio(item.total),
        formatGrowth(item.growthRate),
      ];
      rows.push(itmRow);
    }
  }

  // Total Revenue Row
  rows.push([
    'TỔNG DOANH THU (I)',
    ...venues.map((v) => fmt(v.revenue)),
    totalRevenue,
    '100.0%',
    formatGrowth(reportData.revenueGrowthRate),
  ]);
  rows.push([]); // Spacer

  // 4. Section II: CHI PHÍ
  rows.push(['II. CHI PHÍ VẬN HÀNH']);
  for (const grp of expenseGroups) {
    const grpRow = [
      `  ${grp.parentCategory.toUpperCase()}`,
      ...venues.map((v) => fmt(grp.byVenue[v.venueId])),
      grp.total,
      formatRatio(grp.total),
      formatGrowth(grp.growthRate),
    ];
    rows.push(grpRow);

    for (const item of grp.items) {
      const itmRow = [
        `    • ${item.name}`,
        ...venues.map((v) => fmt(item.byVenue[v.venueId])),
        item.total,
        formatRatio(item.total),
        formatGrowth(item.growthRate),
      ];
      rows.push(itmRow);
    }
  }

  // Total Expense Row
  rows.push([
    'TỔNG CHI PHÍ VẬN HÀNH (II)',
    ...venues.map((v) => fmt(v.expense)),
    reportData.totalExpense,
    formatRatio(reportData.totalExpense),
    formatGrowth(reportData.expenseGrowthRate),
  ]);
  rows.push([]); // Spacer

  // 5. Section III & IV: LỢI NHUẬN RÒNG & BIÊN LỢI NHUẬN
  rows.push([
    'III. LỢI NHUẬN RÒNG (I - II)',
    ...venues.map((v) => fmt(v.netProfit)),
    reportData.netProfit,
    '-',
    formatGrowth(reportData.profitGrowthRate),
  ]);

  rows.push([
    'IV. TỶ SUẤT LỢI NHUẬN (%)',
    ...venues.map((v) => `${v.profitMargin}%`),
    `${reportData.profitMargin}%`,
    '-',
    '-',
  ]);

  // Create worksheet & workbook
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths
  ws['!cols'] = [
    { wch: 38 }, // Category name
    ...venues.map(() => ({ wch: 18 })), // Each venue
    { wch: 20 }, // Total
    { wch: 15 }, // Ratio
    { wch: 22 }, // MoM Growth
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Báo Cáo P&L');

  // Trigger file download
  const fileName = `Bao_Cao_Lai_Lo_${currentPeriod.startDate}_den_${currentPeriod.endDate}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
