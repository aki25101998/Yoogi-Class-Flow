'use client';

import { useState, useEffect } from 'react';
import type { TimeRangePreset } from '@/types/finance';
import styles from '../FinanceClient.module.css';

interface Props {
  onRangeChange: (range: { startDate: string; endDate: string; preset: TimeRangePreset }) => void;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function computeRangeFromPreset(preset: TimeRangePreset): { startDate: string; endDate: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  switch (preset) {
    case 'today': {
      const todayStr = formatDate(now);
      return { startDate: todayStr, endDate: todayStr };
    }
    case 'this_week': {
      // Monday as first day of week
      const day = now.getDay();
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      const monday = new Date(year, month, now.getDate() + diffToMonday);
      const sunday = new Date(year, month, now.getDate() + diffToMonday + 6);
      return { startDate: formatDate(monday), endDate: formatDate(sunday) };
    }
    case 'this_month': {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      return { startDate: formatDate(firstDay), endDate: formatDate(lastDay) };
    }
    case 'last_month': {
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0);
      return { startDate: formatDate(firstDay), endDate: formatDate(lastDay) };
    }
    case 'this_quarter': {
      const q = Math.floor(month / 3);
      const firstDay = new Date(year, q * 3, 1);
      const lastDay = new Date(year, (q + 1) * 3, 0);
      return { startDate: formatDate(firstDay), endDate: formatDate(lastDay) };
    }
    case 'this_year': {
      const firstDay = new Date(year, 0, 1);
      const lastDay = new Date(year, 11, 31);
      return { startDate: formatDate(firstDay), endDate: formatDate(lastDay) };
    }
    default: {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      return { startDate: formatDate(firstDay), endDate: formatDate(lastDay) };
    }
  }
}

export function FinanceTimeRangeStrip({ onRangeChange }: Props) {
  const [activePreset, setActivePreset] = useState<TimeRangePreset>('this_month');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  useEffect(() => {
    const range = computeRangeFromPreset('this_month');
    setCustomStart(range.startDate);
    setCustomEnd(range.endDate);
    onRangeChange({ ...range, preset: 'this_month' });
  }, []);

  const handleSelectPreset = (preset: TimeRangePreset) => {
    setActivePreset(preset);
    if (preset !== 'custom') {
      const range = computeRangeFromPreset(preset);
      setCustomStart(range.startDate);
      setCustomEnd(range.endDate);
      onRangeChange({ ...range, preset });
    }
  };

  const handleApplyCustom = () => {
    if (customStart && customEnd) {
      if (customStart > customEnd) {
        alert('Ngày bắt đầu không được lớn hơn ngày kết thúc');
        return;
      }
      onRangeChange({ startDate: customStart, endDate: customEnd, preset: 'custom' });
    }
  };

  const presets: { id: TimeRangePreset; label: string }[] = [
    { id: 'today', label: 'Hôm nay' },
    { id: 'this_week', label: 'Tuần này' },
    { id: 'this_month', label: 'Tháng này' },
    { id: 'last_month', label: 'Tháng trước' },
    { id: 'this_quarter', label: 'Quý này' },
    { id: 'this_year', label: 'Năm nay' },
    { id: 'custom', label: 'Tùy chọn...' },
  ];

  return (
    <div className={styles.timeStripCard}>
      <div className={styles.timePresetsRow}>
        <span className={styles.filterLabel}>Kỳ báo cáo:</span>
        {presets.map(p => (
          <button
            key={p.id}
            type="button"
            className={`${styles.presetBtn} ${activePreset === p.id ? styles.presetBtnActive : ''}`}
            onClick={() => handleSelectPreset(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {activePreset === 'custom' && (
        <div className={styles.customDateRow}>
          <div className={styles.dateFieldGroup}>
            <span>Từ:</span>
            <input
              type="date"
              className={styles.dateInput}
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
            />
          </div>
          <div className={styles.dateFieldGroup}>
            <span>Đến:</span>
            <input
              type="date"
              className={styles.dateInput}
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
            />
          </div>
          <button
            type="button"
            className={`${styles.presetBtn} ${styles.presetBtnActive}`}
            onClick={handleApplyCustom}
          >
            Áp dụng
          </button>
        </div>
      )}
    </div>
  );
}
