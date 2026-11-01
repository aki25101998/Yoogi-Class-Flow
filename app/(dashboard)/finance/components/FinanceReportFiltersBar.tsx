'use client';

import React from 'react';
import type { FinancialReportFilters } from '@/types/financeReport';
import type { TimeRangePreset } from '@/types/finance';
import styles from '@/app/styles/FinanceReports.module.css';

interface FinanceReportFiltersBarProps {
  filters: FinancialReportFilters;
  venues: { id: string; name: string }[];
  onPresetChange: (preset: TimeRangePreset) => void;
  onVenueChange: (venueId: string) => void;
  onCustomDateChange: (start: string, end: string) => void;
  onExportExcel: () => void;
  onPrint: () => void;
}

const PRESETS: { key: TimeRangePreset; label: string }[] = [
  { key: 'today', label: 'Hôm nay' },
  { key: 'this_week', label: 'Tuần này' },
  { key: 'this_month', label: 'Tháng này' },
  { key: 'last_month', label: 'Tháng trước' },
  { key: 'this_quarter', label: 'Quý này' },
  { key: 'this_year', label: 'Năm nay' },
  { key: 'custom', label: 'Tùy chọn' },
];

export function FinanceReportFiltersBar({
  filters,
  venues,
  onPresetChange,
  onVenueChange,
  onCustomDateChange,
  onExportExcel,
  onPrint,
}: FinanceReportFiltersBarProps) {
  return (
    <div className={styles.filtersBar}>
      <div className={styles.filtersTopRow}>
        {/* Preset Strip */}
        <div className={styles.presetsRow}>
          {PRESETS.map((item) => {
            const isActive = filters.preset === item.key;
            return (
              <button
                key={item.key}
                type="button"
                className={`${styles.presetBtn} ${isActive ? styles.presetBtnActive : ''}`}
                onClick={() => onPresetChange(item.key)}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Right Controls: Venue Select & Actions */}
        <div className={styles.filtersRightGroup}>
          <div className={styles.venueSelectGroup}>
            <span className={styles.venueSelectLabel}>Cơ sở:</span>
            <select
              className={styles.selectInput}
              value={filters.venueId || 'ALL'}
              onChange={(e) => onVenueChange(e.target.value)}
              title="Lọc theo cơ sở"
            >
              <option value="ALL">Tất cả cơ sở</option>
              <option value="SHARED">🏢 Chung toàn trung tâm</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.actionsGroup}>
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.printBtn}`}
              onClick={onPrint}
              title="In báo cáo kết quả kinh doanh"
            >
              <span className="material-icons-round" style={{ fontSize: '18px' }}>
                print
              </span>
              <span>In báo cáo</span>
            </button>

            <button
              type="button"
              className={`${styles.actionBtn} ${styles.exportBtn}`}
              onClick={onExportExcel}
              title="Xuất file Excel báo cáo lãi lỗ P&L"
            >
              <span className="material-icons-round" style={{ fontSize: '18px' }}>
                file_download
              </span>
              <span>Xuất Excel P&L</span>
            </button>
          </div>
        </div>
      </div>

      {/* Custom Date Range Row */}
      {filters.preset === 'custom' && (
        <div className={styles.customDateRow}>
          <div className={styles.dateFieldGroup}>
            <span>Từ ngày:</span>
            <input
              type="date"
              className={styles.dateInput}
              value={filters.customStartDate || ''}
              onChange={(e) =>
                onCustomDateChange(e.target.value, filters.customEndDate || '')
              }
            />
          </div>
          <div className={styles.dateFieldGroup}>
            <span>Đến ngày:</span>
            <input
              type="date"
              className={styles.dateInput}
              value={filters.customEndDate || ''}
              onChange={(e) =>
                onCustomDateChange(filters.customStartDate || '', e.target.value)
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
