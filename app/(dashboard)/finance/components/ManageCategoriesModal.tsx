'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { addCategoryAction, deleteCategoryAction } from '../actions';
import type { FinanceCategory, FinanceTransactionType } from '@/types/finance';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string | undefined;
  incomeCategories: FinanceCategory[];
  expenseCategories: FinanceCategory[];
}

export function ManageCategoriesModal({
  isOpen,
  onClose,
  organizationId,
  incomeCategories,
  expenseCategories,
}: Props) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<FinanceTransactionType>('expense');
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const activeCategories = activeTab === 'income' ? incomeCategories : expenseCategories;

  const handleAddSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const targetParentId = selectedParentId || (activeCategories.length > 0 ? activeCategories[0].id : '');
    if (!targetParentId) {
      setError('Vui lòng chọn nhóm danh mục cha.');
      return;
    }

    if (!newCategoryName.trim()) {
      setError('Vui lòng nhập tên danh mục con.');
      return;
    }

    setLoading(true);
    const res = await addCategoryAction({
      parent_id: targetParentId,
      name: newCategoryName.trim(),
      type: activeTab,
    });
    setLoading(false);

    if (res.success) {
      setNewCategoryName('');
      queryClient.invalidateQueries({ queryKey: ['financeCategories', organizationId] });
    } else {
      setError(res.error || 'Lỗi khi thêm danh mục.');
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc muốn xóa danh mục "${name}"?`)) return;

    setLoading(true);
    const res = await deleteCategoryAction(id);
    setLoading(false);

    if (res.success) {
      queryClient.invalidateQueries({ queryKey: ['financeCategories', organizationId] });
    } else {
      alert(res.error || 'Lỗi khi xóa danh mục.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalHeader title="Quản Lý Cây Danh Mục Thu - Chi" onClose={onClose} />
      <ModalBody>
        {error && (
          <div style={{ color: 'var(--danger)', marginBottom: '12px', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            className={`flex-1 py-2 px-4 rounded-full font-semibold text-sm transition-all border ${
              activeTab === 'expense'
                ? 'bg-danger text-white border-danger shadow-md'
                : 'bg-surface-hover text-secondary border-border-light hover:text-main'
            }`}
            onClick={() => {
              setActiveTab('expense');
              setSelectedParentId('');
            }}
          >
            Chi Phí (Expense)
          </button>
          <button
            type="button"
            className={`flex-1 py-2 px-4 rounded-full font-semibold text-sm transition-all border ${
              activeTab === 'income'
                ? 'bg-success text-white border-success shadow-md'
                : 'bg-surface-hover text-secondary border-border-light hover:text-main'
            }`}
            onClick={() => {
              setActiveTab('income');
              setSelectedParentId('');
            }}
          >
            Khoản Thu (Income)
          </button>
        </div>

        {/* Categories Tree View */}
        <div className="flex flex-col gap-4 max-h-[340px] overflow-y-auto pr-1">
          {activeCategories.map(parent => (
            <div 
              key={parent.id} 
              className="p-3.5 rounded-2xl bg-surface-hover border border-border-light flex flex-col gap-2.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-main text-sm">
                  <span className="material-icons-round text-base text-primary">
                    {parent.icon || 'folder'}
                  </span>
                  <span>{parent.name}</span>
                </div>
                <span className="text-[11px] text-secondary font-medium uppercase tracking-wider">
                  {parent.subcategories?.length || 0} mục
                </span>
              </div>

              {/* Subcategories chips */}
              <div className="flex flex-wrap gap-2">
                {parent.subcategories && parent.subcategories.length > 0 ? (
                  parent.subcategories.map(sub => (
                    <div
                      key={sub.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-surface border border-border-light text-main"
                    >
                      <span>{sub.name}</span>
                      {!sub.is_system && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(sub.id, sub.name)}
                          className="text-secondary hover:text-danger transition-colors p-0.5 rounded-full"
                          title="Xóa danh mục tùy chỉnh này"
                        >
                          <span className="material-icons-round text-[13px]">close</span>
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-secondary italic">Chưa có mục con</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add Subcategory Form */}
        <form onSubmit={handleAddSubcategory} className="mt-4 pt-4 border-t border-dashed border-border-light flex flex-col gap-3">
          <div className="text-xs font-bold text-main uppercase tracking-wider">
            + Thêm danh mục con mới
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select
              className="bg-background border border-border-light rounded-xl px-3 py-2 text-xs text-main outline-none focus:border-primary"
              value={selectedParentId}
              onChange={e => setSelectedParentId(e.target.value)}
            >
              <option value="">-- Chọn nhóm cha --</option>
              {activeCategories.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              required
              placeholder="VD: Tiền mua nước giải khát..."
              className="bg-background border border-border-light rounded-xl px-3 py-2 text-xs text-main outline-none focus:border-primary"
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="sm" variant="primary" isLoading={loading}>
              Thêm Danh Mục
            </Button>
          </div>
        </form>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Đóng
        </Button>
      </ModalFooter>
    </Modal>
  );
}

