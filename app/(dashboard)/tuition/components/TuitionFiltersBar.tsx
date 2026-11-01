'use client';

import React from 'react';
import { TuitionFilters, TuitionStatus } from '@/types/tuition';
import { Button } from '@/app/components/ui/Button';
import { Input, Select } from '@/app/components/ui/Input';
import styles from '../Tuition.module.css';

interface TuitionFiltersBarProps {
  filters: TuitionFilters;
  onFilterChange: (filters: TuitionFilters) => void;
  classes: { id: string; name: string }[];
  onOpenBatchModal?: () => void;
  onOpenAddModal?: () => void;
  canManage?: boolean;
}

export function TuitionFiltersBar({
  filters,
  onFilterChange,
  classes,
}: TuitionFiltersBarProps) {
  const statusOptions: { label: string; value: 'all' | TuitionStatus }[] = [
    { label: 'Tất cả', value: 'all' },
    { label: 'Chưa đóng', value: 'unpaid' },
    { label: 'Đóng 1 phần', value: 'partial' },
    { label: 'Đã đóng đủ', value: 'paid' },
  ];

  const classList = classes || [];

  return (
    <div className={styles.filterStrip}>
      <div className={styles.filterControls}>
        {/* Month Selector */}
        <div style={{ width: '150px' }}>
          <Input
            type="month"
            value={filters.month}
            onChange={(e) => onFilterChange({ ...filters, month: e.target.value })}
            placeholder="Kỳ học"
          />
        </div>

        {/* Class Selector */}
        <div style={{ minWidth: '180px' }}>
          <Select
            value={filters.classId}
            onChange={(e) => onFilterChange({ ...filters, classId: e.target.value })}
            options={[
              { value: 'all', label: 'Tất cả lớp học' },
              ...classList.map((cls) => ({ value: cls.id, label: cls.name })),
            ]}
          />
        </div>

        {/* Status Pills */}
        <div className={styles.filterPills}>
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`${styles.filterPill} ${filters.status === opt.value ? styles.filterPillActive : ''}`}
              onClick={() => onFilterChange({ ...filters, status: opt.value })}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div style={{ minWidth: '220px', flex: 1, maxWidth: '360px' }}>
          <Input
            type="text"
            placeholder="Tìm theo tên học viên..."
            value={filters.search}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
