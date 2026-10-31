'use client';

import type { FinancePaymentMethod, FinanceTransactionType } from '@/types/finance';
import styles from '../FinanceClient.module.css';

interface VenueOption {
  id: string;
  name: string;
}

interface Props {
  venues: VenueOption[];
  selectedVenue: string;
  onVenueChange: (venueId: string) => void;
  selectedType: string;
  onTypeChange: (type: 'all' | FinanceTransactionType) => void;
  selectedPaymentMethod: string;
  onPaymentMethodChange: (method: 'all' | FinancePaymentMethod) => void;
}

export function FinanceFiltersBar({
  venues,
  selectedVenue,
  onVenueChange,
  selectedType,
  onTypeChange,
  selectedPaymentMethod,
  onPaymentMethodChange,
}: Props) {
  return (
    <div className={styles.filtersBar}>
      {/* 1. Venue Filter */}
      <div className={styles.filterGroup}>
        <span className={styles.filterLabel}>Cơ sở:</span>
        <select
          className={styles.selectInput}
          value={selectedVenue}
          onChange={e => onVenueChange(e.target.value)}
        >
          <option value="all">Tất cả cơ sở</option>
          {venues.map(v => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
          <option value="unassigned">🏢 Chung toàn trung tâm</option>
        </select>
      </div>

      {/* 2. Type Filter (Thu / Chi) */}
      <div className={styles.filterGroup}>
        <span className={styles.filterLabel}>Loại:</span>
        <div className={styles.segmentedGroup}>
          <button
            type="button"
            className={`${styles.segmentedItem} ${selectedType === 'all' ? styles.segmentedItemActive : ''}`}
            onClick={() => onTypeChange('all')}
          >
            Tất cả
          </button>
          <button
            type="button"
            className={`${styles.segmentedItem} ${selectedType === 'income' ? styles.segmentedItemActive : ''}`}
            onClick={() => onTypeChange('income')}
            style={selectedType === 'income' ? { color: 'var(--success)' } : {}}
          >
            <span className="material-icons-round text-sm" style={{ fontSize: '15px' }}>add_circle</span>
            Thu
          </button>
          <button
            type="button"
            className={`${styles.segmentedItem} ${selectedType === 'expense' ? styles.segmentedItemActive : ''}`}
            onClick={() => onTypeChange('expense')}
            style={selectedType === 'expense' ? { color: 'var(--danger)' } : {}}
          >
            <span className="material-icons-round text-sm" style={{ fontSize: '15px' }}>remove_circle</span>
            Chi
          </button>
        </div>
      </div>

      {/* 3. Payment Method Filter */}
      <div className={styles.filterGroup}>
        <span className={styles.filterLabel}>Phương thức:</span>
        <div className={styles.segmentedGroup}>
          <button
            type="button"
            className={`${styles.segmentedItem} ${selectedPaymentMethod === 'all' ? styles.segmentedItemActive : ''}`}
            onClick={() => onPaymentMethodChange('all')}
          >
            Tất cả
          </button>
          <button
            type="button"
            className={`${styles.segmentedItem} ${selectedPaymentMethod === 'cash' ? styles.segmentedItemActive : ''}`}
            onClick={() => onPaymentMethodChange('cash')}
          >
            💵 Tiền mặt
          </button>
          <button
            type="button"
            className={`${styles.segmentedItem} ${selectedPaymentMethod === 'bank_transfer' ? styles.segmentedItemActive : ''}`}
            onClick={() => onPaymentMethodChange('bank_transfer')}
          >
            🏦 Ngân hàng
          </button>
        </div>
      </div>
    </div>
  );
}

