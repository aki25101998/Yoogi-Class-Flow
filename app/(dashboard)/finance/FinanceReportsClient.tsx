'use client';

import React, { useState } from 'react';
import { useDashboardContext } from '../DashboardProvider';
import { useVenues } from '@/hooks/useVenues';
import { useFinancialReport } from '@/hooks/useFinancialReport';
import { exportPnLToExcel } from '@/utils/exportPnLExcel';
import type { FinancialReportFilters } from '@/types/financeReport';
import type { TimeRangePreset } from '@/types/finance';

import { FinanceReportFiltersBar } from './components/FinanceReportFiltersBar';
import { FinanceReportKpiGrid } from './components/FinanceReportKpiGrid';
import { FinanceReportCharts } from './components/FinanceReportCharts';
import { FinanceReportTable } from './components/FinanceReportTable';
import styles from '@/app/styles/FinanceReports.module.css';

interface FinanceReportsClientProps {
  organizationId?: string;
}

const PRESET_LABELS: Record<TimeRangePreset, string> = {
  today: 'Hôm nay',
  this_week: 'Tuần này',
  this_month: 'Tháng này',
  last_month: 'Tháng trước',
  this_quarter: 'Quý này',
  this_year: 'Năm nay',
  custom: 'Tùy chọn',
};

function formatYMDToDMY(ymd: string): string {
  if (!ymd) return '';
  const parts = ymd.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return ymd;
}

function ReportsSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="animate-pulse">
      {/* KPI Grid Skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <div style={{ height: '120px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-xl, 20px)' }} />
        <div style={{ height: '120px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-xl, 20px)' }} />
        <div style={{ height: '120px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-xl, 20px)' }} />
        <div style={{ height: '120px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-xl, 20px)' }} />
      </div>
      {/* Charts Skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        <div style={{ height: '320px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-2xl, 24px)' }} />
        <div style={{ height: '320px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-2xl, 24px)' }} />
      </div>
      {/* Table Skeleton */}
      <div style={{ height: '400px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-2xl, 24px)' }} />
    </div>
  );
}

export default function FinanceReportsClient({ organizationId: propOrgId }: FinanceReportsClientProps) {
  const { context } = useDashboardContext();
  const organizationId = propOrgId || context?.organization?.id;

  const { venues = [] } = useVenues(organizationId);

  const [filters, setFilters] = useState<FinancialReportFilters>({
    preset: 'this_month',
    venueId: 'ALL',
  });

  const { data, isLoading, error } = useFinancialReport(organizationId, filters);

  const handlePresetChange = (preset: TimeRangePreset) => {
    setFilters((prev) => ({
      ...prev,
      preset,
    }));
  };

  const handleVenueChange = (venueId: string) => {
    setFilters((prev) => ({
      ...prev,
      venueId,
    }));
  };

  const handleCustomDateChange = (startDate: string, endDate: string) => {
    setFilters((prev) => ({
      ...prev,
      preset: 'custom',
      customStartDate: startDate,
      customEndDate: endDate,
    }));
  };

  const handleExportExcel = () => {
    if (!data) return;
    const orgName = context?.organization?.name || 'Yoogi Class Flow';
    exportPnLToExcel(data, orgName);
  };

  const handlePrint = () => {
    window.print();
  };

  const periodLabel = data
    ? `${PRESET_LABELS[filters.preset] || 'Kỳ này'} (${formatYMDToDMY(data.currentPeriod.startDate)} - ${formatYMDToDMY(data.currentPeriod.endDate)})`
    : '';

  return (
    <div className={styles.reportsContainer}>
      {/* 1. Filters Bar */}
      <FinanceReportFiltersBar
        filters={filters}
        venues={venues}
        onPresetChange={handlePresetChange}
        onVenueChange={handleVenueChange}
        onCustomDateChange={handleCustomDateChange}
        onExportExcel={handleExportExcel}
        onPrint={handlePrint}
      />

      {/* 2. Loading / Error / Data States */}
      {error ? (
        <div
          style={{
            padding: '2.5rem 1.5rem',
            textAlign: 'center',
            background: 'var(--surface)',
            borderRadius: 'var(--radius-xl, 20px)',
            border: '1px solid var(--border-light)',
            color: 'var(--danger)',
          }}
        >
          <span className="material-icons-round" style={{ fontSize: '48px', marginBottom: '12px' }}>
            error_outline
          </span>
          <p style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '6px' }}>
            Không thể tải dữ liệu báo cáo tài chính
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            {(error as Error)?.message || 'Vui lòng kiểm tra kết nối mạng hoặc thử lại sau.'}
          </p>
        </div>
      ) : isLoading || !data ? (
        <ReportsSkeleton />
      ) : (
        <>
          {/* 3. KPI Grid */}
          <FinanceReportKpiGrid data={data} periodLabel={periodLabel} />

          {/* 4. Charts */}
          <FinanceReportCharts data={data} />

          {/* 5. Matrix Table */}
          <FinanceReportTable data={data} filters={filters} />
        </>
      )}
    </div>
  );
}
