'use client';

import { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { getBusinessDateString } from '@/utils/date';
import { addTransactionAction } from '../actions';
import type { FinanceCategory, FinancePaymentMethod, FinanceTransactionType } from '@/types/finance';
import styles from '../FinanceClient.module.css';

interface VenueOption {
  id: string;
  name: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  venues: VenueOption[];
  incomeCategories: FinanceCategory[];
  expenseCategories: FinanceCategory[];
  onOpenManageCategories?: () => void;
}

export function AddTransactionModal({
  isOpen,
  onClose,
  onSuccess,
  venues,
  incomeCategories,
  expenseCategories,
  onOpenManageCategories,
}: Props) {
  const [type, setType] = useState<FinanceTransactionType>('income');
  const [venueId, setVenueId] = useState<string>('unassigned');
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<FinancePaymentMethod>('cash');
  const [date, setDate] = useState<string>(getBusinessDateString());
  const [description, setDescription] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const activeParentCategories = type === 'income' ? incomeCategories : expenseCategories;

  // Whenever type changes, reset parent and subcategory selections
  useEffect(() => {
    if (activeParentCategories.length > 0) {
      const firstParent = activeParentCategories[0];
      setSelectedParentId(firstParent.id);
      if (firstParent.subcategories && firstParent.subcategories.length > 0) {
        setSelectedCategoryId(firstParent.subcategories[0].id);
      } else {
        setSelectedCategoryId(firstParent.id);
      }
    } else {
      setSelectedParentId('');
      setSelectedCategoryId('');
    }
  }, [type, activeParentCategories]);

  // When parent category selection changes, update subcategories
  const currentParent = activeParentCategories.find(c => c.id === selectedParentId);
  const currentSubcategories = currentParent?.subcategories || [];

  const handleParentChange = (parentId: string) => {
    setSelectedParentId(parentId);
    const parent = activeParentCategories.find(c => c.id === parentId);
    if (parent?.subcategories && parent.subcategories.length > 0) {
      setSelectedCategoryId(parent.subcategories[0].id);
    } else {
      setSelectedCategoryId(parentId);
    }
  };

  const resetForm = () => {
    setType('income');
    setVenueId('unassigned');
    setAmount(0);
    setPaymentMethod('cash');
    setDate(getBusinessDateString());
    setDescription('');
    setError('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (amount <= 0) {
      setError('Số tiền giao dịch phải lớn hơn 0.');
      return;
    }

    if (!selectedCategoryId) {
      setError('Vui lòng chọn danh mục giao dịch.');
      return;
    }

    setLoading(true);
    const res = await addTransactionAction({
      type,
      category_id: selectedCategoryId,
      amount,
      date,
      description,
      venue_id: venueId,
      payment_method: paymentMethod,
    });
    setLoading(false);

    if (res.success) {
      resetForm();
      onSuccess();
    } else {
      setError(res.error || 'Lỗi khi lưu giao dịch.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={loading ? () => {} : resetForm}>
      <ModalHeader title="Thêm Giao Dịch Mới" onClose={loading ? () => {} : resetForm} />
      <ModalBody>
        {error && (
          <div style={{ color: 'var(--danger)', marginBottom: '14px', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form id="add-transaction-form" onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
          {/* 1. Toggle Type */}
          <div>
            <label className="block text-xs font-semibold text-secondary uppercase mb-2">
              Loại giao dịch *
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                className={`flex-1 py-2 px-4 rounded-full font-semibold text-sm transition-all flex items-center justify-center gap-1.5 border ${
                  type === 'income'
                    ? 'bg-success text-white border-success shadow-md'
                    : 'bg-surface-hover text-secondary border-border-light hover:text-main'
                }`}
                onClick={() => setType('income')}
              >
                <span className="material-icons-round text-base">add_circle</span>
                Khoản Thu (+)
              </button>
              <button
                type="button"
                className={`flex-1 py-2 px-4 rounded-full font-semibold text-sm transition-all flex items-center justify-center gap-1.5 border ${
                  type === 'expense'
                    ? 'bg-danger text-white border-danger shadow-md'
                    : 'bg-surface-hover text-secondary border-border-light hover:text-main'
                }`}
                onClick={() => setType('expense')}
              >
                <span className="material-icons-round text-base">remove_circle</span>
                Khoản Chi (-)
              </button>
            </div>
          </div>

          {/* 2. Venue Attribution */}
          <div>
            <label className="block text-xs font-semibold text-secondary uppercase mb-1">
              Cơ sở phát sinh *
            </label>
            <select
              className="w-full bg-background border border-border-light rounded-xl px-3 py-2 text-sm text-main outline-none focus:border-primary"
              value={venueId}
              onChange={e => setVenueId(e.target.value)}
            >
              <option value="unassigned">🏢 Chung toàn trung tâm (Không gán cơ sở riêng)</option>
              {venues.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Cascading Categories */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Parent Category */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-secondary uppercase">
                  Nhóm danh mục *
                </label>
                {onOpenManageCategories && (
                  <button
                    type="button"
                    onClick={onOpenManageCategories}
                    className="text-[11px] text-primary hover:underline flex items-center gap-0.5"
                  >
                    <span className="material-icons-round text-[12px]">settings</span>
                    Quản lý
                  </button>
                )}
              </div>
              <select
                className="w-full bg-background border border-border-light rounded-xl px-3 py-2 text-sm text-main outline-none focus:border-primary"
                value={selectedParentId}
                onChange={e => handleParentChange(e.target.value)}
              >
                {activeParentCategories.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sub Category */}
            <div>
              <label className="block text-xs font-semibold text-secondary uppercase mb-1">
                Hạng mục chi tiết *
              </label>
              <select
                className="w-full bg-background border border-border-light rounded-xl px-3 py-2 text-sm text-main outline-none focus:border-primary"
                value={selectedCategoryId}
                onChange={e => setSelectedCategoryId(e.target.value)}
              >
                {currentSubcategories.length > 0 ? (
                  currentSubcategories.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))
                ) : (
                  <option value={selectedParentId}>
                    {currentParent?.name || 'Mặc định'}
                  </option>
                )}
              </select>
            </div>
          </div>

          {/* 4. Amount with Preview */}
          <div>
            <label className="block text-xs font-semibold text-secondary uppercase mb-1">
              Số tiền (VNĐ) *
            </label>
            <Input
              type="number"
              required
              min="1000"
              step="1000"
              value={amount || ''}
              onChange={e => setAmount(Number(e.target.value))}
              placeholder="Nhập số tiền..."
            />
            {amount > 0 && (
              <div className="text-xs font-semibold text-primary mt-1">
                👉 Định dạng: {amount.toLocaleString('vi-VN')} VNĐ
              </div>
            )}
          </div>

          {/* 5. Payment Method */}
          <div>
            <label className="block text-xs font-semibold text-secondary uppercase mb-2">
              Phương thức thanh toán *
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                className={`flex-1 py-2 px-3 rounded-full text-xs font-semibold transition-all border ${
                  paymentMethod === 'cash'
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-surface-hover text-secondary border-border-light hover:text-main'
                }`}
                onClick={() => setPaymentMethod('cash')}
              >
                💵 Tiền mặt
              </button>
              <button
                type="button"
                className={`flex-1 py-2 px-3 rounded-full text-xs font-semibold transition-all border ${
                  paymentMethod === 'bank_transfer'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-surface-hover text-secondary border-border-light hover:text-main'
                }`}
                onClick={() => setPaymentMethod('bank_transfer')}
              >
                🏦 Chuyển khoản
              </button>
            </div>
          </div>

          {/* 6. Date & Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-secondary uppercase mb-1">
                Ngày ghi nhận *
              </label>
              <input
                type="date"
                required
                className="w-full bg-background border border-border-light rounded-xl px-3 py-2 text-sm text-main outline-none focus:border-primary"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-secondary uppercase mb-1">
                Ghi chú thêm
              </label>
              <input
                type="text"
                className="w-full bg-background border border-border-light rounded-xl px-3 py-2 text-sm text-main outline-none focus:border-primary"
                placeholder="VD: Phụ huynh em Tuấn chuyển..."
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
          </div>
        </form>
      </ModalBody>
      <ModalFooter>
        <Button type="button" variant="secondary" onClick={resetForm} disabled={loading}>
          Hủy
        </Button>
        <Button type="submit" form="add-transaction-form" isLoading={loading} variant="primary">
          Lưu Giao Dịch
        </Button>
      </ModalFooter>
    </Modal>
  );
}

