'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDashboardContext } from '@/app/(dashboard)/DashboardProvider';
import { useFinanceCategories } from '@/hooks/useFinanceCategories';
import { addCategoryAction, deleteCategoryAction } from '@/app/(dashboard)/finance/actions';
import type { FinanceCategory, FinanceTransactionType } from '@/types/finance';

// UI Primitives
import { PageHeader } from '@/app/components/ui/PageHeader';
import { SettingsNavTabs } from '../components/SettingsNavTabs';
import { Button } from '@/app/components/ui/Button';
import { Input, Select } from '@/app/components/ui/Input';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/app/components/ui/Modal';
import { EmptyState } from '@/app/components/ui/EmptyState';
import styles from '@/app/styles/page-standard.module.css';

const PARENT_ICON_OPTIONS = [
  { label: 'Tòa nhà / Mặt bằng', value: 'apartment' },
  { label: 'Cửa hàng / Văn phòng', value: 'storefront' },
  { label: 'Nhân sự / Đội ngũ', value: 'groups' },
  { label: 'Giỏ hàng / Mua sắm', value: 'shopping_bag' },
  { label: 'Tiếp thị / Marketing', value: 'campaign' },
  { label: 'Tiền mặt / Thanh toán', value: 'payments' },
  { label: 'Huy chương / Cấp đai', value: 'military_tech' },
  { label: 'Võ phục / Trang phục', value: 'checkroom' },
  { label: 'Từ thiện / Tài trợ', value: 'volunteer_activism' },
  { label: 'Danh mục chung', value: 'category' },
  { label: 'Thư mục', value: 'folder' },
  { label: 'Đặc biệt / Ngôi sao', value: 'star' },
];

export default function FinanceCategoriesClient() {
  const { context } = useDashboardContext();
  const organizationId = context?.organization?.id;
  const currentUserRole = context?.membership?.role;
  const isAdminOrOwner = currentUserRole === 'admin' || currentUserRole === 'owner';
  const hasSettingsPerm = isAdminOrOwner || (context?.permissions && (
    context.permissions.includes('manage_settings') || 
    context.permissions.includes('manage_finance')
  ));

  const queryClient = useQueryClient();
  const { categoriesTree, incomeCategories, expenseCategories, isLoading } = useFinanceCategories(organizationId);

  // Active Type Switcher: expense | income
  const [activeType, setActiveType] = useState<FinanceTransactionType>('expense');

  // Inline subcategory input state per parent category: { [parentId]: string }
  const [inlineInputs, setInlineInputs] = useState<Record<string, string>>({});
  const [inlineLoadingParentId, setInlineLoadingParentId] = useState<string | null>(null);

  // New Parent Category Modal state
  const [isAddParentModalOpen, setIsAddParentModalOpen] = useState(false);
  const [parentName, setParentName] = useState('');
  const [parentType, setParentType] = useState<FinanceTransactionType>('expense');
  const [parentIcon, setParentIcon] = useState('category');
  const [parentSubmitting, setParentSubmitting] = useState(false);

  // Notification state
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const activeParents = activeType === 'income' ? incomeCategories : expenseCategories;

  // Overview Counts
  const totalParents = categoriesTree.length;
  const totalExpenseSubs = expenseCategories.reduce((acc, p) => acc + (p.subcategories?.length || 0), 0);
  const totalIncomeSubs = incomeCategories.reduce((acc, p) => acc + (p.subcategories?.length || 0), 0);
  const totalCustomSubs = categoriesTree.reduce(
    (acc, p) => acc + (p.subcategories?.filter(s => !s.is_system).length || 0),
    0
  );

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setErrorMessage('');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setSuccessMessage('');
  };

  // Add subcategory to specific parent directly
  const handleAddSubcategory = async (parentId: string, parentNameStr: string) => {
    const subName = (inlineInputs[parentId] || '').trim();
    if (!subName) {
      showError(`Vui lòng nhập tên mục con cho nhóm "${parentNameStr}".`);
      return;
    }

    setInlineLoadingParentId(parentId);
    const res = await addCategoryAction({
      parent_id: parentId,
      name: subName,
      type: activeType,
    });
    setInlineLoadingParentId(null);

    if (res.success) {
      setInlineInputs(prev => ({ ...prev, [parentId]: '' }));
      queryClient.invalidateQueries({ queryKey: ['financeCategories', organizationId] });
      showSuccess(`Đã thêm mục "${subName}" vào nhóm "${parentNameStr}".`);
    } else {
      showError(res.error || 'Lỗi khi thêm danh mục con.');
    }
  };

  // Add new top-level parent category
  const handleAddParentGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentName.trim()) {
      showError('Vui lòng nhập tên nhóm danh mục cha.');
      return;
    }

    setParentSubmitting(true);
    const res = await addCategoryAction({
      parent_id: null,
      name: parentName.trim(),
      type: parentType,
      icon: parentIcon,
    });
    setParentSubmitting(false);

    if (res.success) {
      setParentName('');
      setIsAddParentModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['financeCategories', organizationId] });
      showSuccess(`Đã tạo nhóm danh mục cha "${parentName.trim()}".`);
      // Auto switch to that type
      setActiveType(parentType);
    } else {
      showError(res.error || 'Lỗi khi tạo nhóm danh mục cha.');
    }
  };

  // Delete category (subcategory or parent)
  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa danh mục "${name}"?`)) return;

    const res = await deleteCategoryAction(id);
    if (res.success) {
      queryClient.invalidateQueries({ queryKey: ['financeCategories', organizationId] });
      showSuccess(`Đã xóa danh mục "${name}".`);
    } else {
      showError(res.error || 'Lỗi khi xóa danh mục.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* 1. Header */}
      <PageHeader
        title="Quản Lý Danh Mục Thu - Chi"
        description="Cấu hình cây danh mục 2 cấp cho sổ quỹ tài chính và phân tích doanh thu - chi phí"
        primaryAction={
          hasSettingsPerm ? (
            <Button
              variant="primary"
              onClick={() => {
                setParentType(activeType);
                setIsAddParentModalOpen(true);
              }}
              leftIcon={<span className="material-icons-round">create_new_folder</span>}
              style={{ borderRadius: 'var(--radius-full)' }}
            >
              Thêm Nhóm Cha
            </Button>
          ) : undefined
        }
      />

      {/* 2. Sub-Nav Tabs */}
      <SettingsNavTabs />

      {/* 3. Alerts */}
      {successMessage && (
        <div style={{
          padding: '12px 18px',
          backgroundColor: 'var(--success-bg)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: 'var(--radius-lg)',
          color: 'var(--success)',
          fontSize: '0.875rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span className="material-icons-round" style={{ fontSize: '20px' }}>check_circle</span>
          <strong>{successMessage}</strong>
        </div>
      )}

      {errorMessage && (
        <div style={{
          padding: '12px 18px',
          backgroundColor: 'var(--danger-bg)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--radius-lg)',
          color: 'var(--danger)',
          fontSize: '0.875rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span className="material-icons-round" style={{ fontSize: '20px' }}>error_outline</span>
          <strong>{errorMessage}</strong>
        </div>
      )}

      {/* 4. Compact Bento Overview KPI Grid */}
      <div className={styles.overviewCard}>
        <div className={styles.overviewHeader}>
          <div className={styles.overviewTitle}>
            <span className="material-icons-round" style={{ fontSize: '18px', color: 'var(--primary)' }}>
              analytics
            </span>
            TỔNG QUAN DANH MỤC TÀI CHÍNH
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Cây danh mục 2 cấp đa tổ chức
          </div>
        </div>

        <div className={styles.overviewGrid}>
          {/* 1. Tổng nhóm cha */}
          <div className={`${styles.kpiItem} ${styles.kpiPrimary}`}>
            <div className={styles.kpiLabel}>
              <div className={styles.kpiDot}></div>
              Tổng Nhóm Danh Mục
            </div>
            <div className={styles.kpiValue}>
              {totalParents} <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>nhóm</span>
            </div>
            <div className={styles.kpiCaption}>
              Bao gồm cả Khoản thu & Chi phí
            </div>
            <span className={`material-icons-round ${styles.kpiWatermark}`} style={{ color: 'var(--primary)' }}>
              folder
            </span>
          </div>

          {/* 2. Khoản Chi */}
          <div className={`${styles.kpiItem} ${styles.kpiDanger}`}>
            <div className={styles.kpiLabel}>
              <div className={styles.kpiDot}></div>
              Danh Mục Chi Phí
            </div>
            <div className={styles.kpiValue}>
              {expenseCategories.length} <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>nhóm ({totalExpenseSubs} mục con)</span>
            </div>
            <div className={styles.kpiCaption}>
              Mặt bằng, nhân sự, mua sắm & vận hành
            </div>
            <span className={`material-icons-round ${styles.kpiWatermark}`} style={{ color: 'var(--danger)' }}>
              trending_down
            </span>
          </div>

          {/* 3. Khoản Thu */}
          <div className={`${styles.kpiItem} ${styles.kpiSuccess}`}>
            <div className={styles.kpiLabel}>
              <div className={styles.kpiDot}></div>
              Danh Mục Khoản Thu
            </div>
            <div className={styles.kpiValue}>
              {incomeCategories.length} <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>nhóm ({totalIncomeSubs} mục con)</span>
            </div>
            <div className={styles.kpiCaption}>
              Học phí, thi đai, bán đồ tập & tài trợ
            </div>
            <span className={`material-icons-round ${styles.kpiWatermark}`} style={{ color: 'var(--success)' }}>
              trending_up
            </span>
          </div>

          {/* 4. Mục Tùy Chỉnh */}
          <div className={`${styles.kpiItem} ${styles.kpiInfo}`}>
            <div className={styles.kpiLabel}>
              <div className={styles.kpiDot}></div>
              Mục Con Tùy Chỉnh
            </div>
            <div className={styles.kpiValue}>
              {totalCustomSubs} <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>mục</span>
            </div>
            <div className={styles.kpiCaption}>
              Tự định nghĩa theo thực tế trung tâm
            </div>
            <span className={`material-icons-round ${styles.kpiWatermark}`} style={{ color: 'var(--info)' }}>
              tune
            </span>
          </div>
        </div>
      </div>

      {/* 5. Segmented Type Switcher */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        background: 'var(--surface)',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-xl)',
        padding: '6px',
        width: 'fit-content',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <button
          type="button"
          onClick={() => setActiveType('expense')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 22px',
            borderRadius: 'var(--radius-lg)',
            border: 'none',
            fontSize: '0.875rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            background: activeType === 'expense' ? 'var(--danger)' : 'transparent',
            color: activeType === 'expense' ? '#ffffff' : 'var(--text-secondary)',
            boxShadow: activeType === 'expense' ? '0 4px 12px rgba(239, 68, 68, 0.25)' : 'none',
          }}
        >
          <span className="material-icons-round" style={{ fontSize: '18px' }}>trending_down</span>
          Chi Phí (Expense)
          <span style={{
            fontSize: '0.75rem',
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            background: activeType === 'expense' ? 'rgba(255, 255, 255, 0.2)' : 'var(--surface-hover)',
            color: activeType === 'expense' ? '#ffffff' : 'var(--text-secondary)',
            fontWeight: 600,
          }}>
            {expenseCategories.length} nhóm
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveType('income')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 22px',
            borderRadius: 'var(--radius-lg)',
            border: 'none',
            fontSize: '0.875rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            background: activeType === 'income' ? 'var(--success)' : 'transparent',
            color: activeType === 'income' ? '#ffffff' : 'var(--text-secondary)',
            boxShadow: activeType === 'income' ? '0 4px 12px rgba(34, 197, 94, 0.25)' : 'none',
          }}
        >
          <span className="material-icons-round" style={{ fontSize: '18px' }}>trending_up</span>
          Khoản Thu (Income)
          <span style={{
            fontSize: '0.75rem',
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            background: activeType === 'income' ? 'rgba(255, 255, 255, 0.2)' : 'var(--surface-hover)',
            color: activeType === 'income' ? '#ffffff' : 'var(--text-secondary)',
            fontWeight: 600,
          }}>
            {incomeCategories.length} nhóm
          </span>
        </button>
      </div>

      {/* 6. Main Categories Cards Grid */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          {[1, 2, 3, 4].map(n => (
            <div key={n} style={{
              height: '180px',
              borderRadius: 'var(--radius-2xl)',
              background: 'var(--surface-hover)',
              animation: 'pulse 1.5s infinite ease-in-out'
            }} />
          ))}
        </div>
      ) : activeParents.length === 0 ? (
        <EmptyState
          title="Chưa có nhóm danh mục nào"
          description={`Chưa có nhóm danh mục ${activeType === 'expense' ? 'chi phí' : 'khoản thu'} nào trong trung tâm.`}
          action={
            <Button
              variant="primary"
              onClick={() => {
                setParentType(activeType);
                setIsAddParentModalOpen(true);
              }}
            >
              Thêm Nhóm Cha Đầu Tiên
            </Button>
          }
        />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))',
          gap: '20px',
          alignItems: 'start'
        }}>
          {activeParents.map(parent => {
            const subs = parent.subcategories || [];
            const isParentSystem = parent.is_system;

            return (
              <div
                key={parent.id}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-2xl)',
                  boxShadow: 'var(--shadow-sm)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'box-shadow 0.2s ease, transform 0.2s ease',
                }}
              >
                {/* Parent Card Header */}
                <div style={{
                  padding: '16px 20px',
                  background: 'var(--surface-hover)',
                  borderBottom: '1px solid var(--border-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: 'var(--radius-xl)',
                      background: activeType === 'income' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                      color: activeType === 'income' ? 'var(--success)' : 'var(--danger)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <span className="material-icons-round" style={{ fontSize: '22px' }}>
                        {parent.icon || (activeType === 'income' ? 'payments' : 'receipt_long')}
                      </span>
                    </div>

                    <div>
                      <div style={{
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: 'var(--text-main)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        {parent.name}
                        {isParentSystem && (
                          <span
                            className="material-icons-round"
                            style={{ fontSize: '15px', color: 'var(--text-muted)' }}
                            title="Nhóm mặc định hệ thống"
                          >
                            verified
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        {subs.length} danh mục con • {isParentSystem ? 'Mặc định hệ thống' : 'Tùy chỉnh trung tâm'}
                      </div>
                    </div>
                  </div>

                  {!isParentSystem && hasSettingsPerm && (
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(parent.id, parent.name)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '6px',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'color 0.2s',
                      }}
                      onMouseOver={e => e.currentTarget.style.color = 'var(--danger)'}
                      onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}
                      title="Xóa nhóm danh mục tùy chỉnh này"
                    >
                      <span className="material-icons-round" style={{ fontSize: '18px' }}>delete_outline</span>
                    </button>
                  )}
                </div>

                {/* Subcategories Chips Body */}
                <div style={{ padding: '18px 20px', minHeight: '90px' }}>
                  {subs.length === 0 ? (
                    <div style={{
                      padding: '16px',
                      borderRadius: 'var(--radius-lg)',
                      background: 'var(--surface-hover)',
                      textAlign: 'center',
                      fontSize: '0.8125rem',
                      color: 'var(--text-secondary)',
                      fontStyle: 'italic'
                    }}>
                      Chưa có mục con nào. Hãy thêm mục đầu tiên bên dưới.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {subs.map(sub => (
                        <div
                          key={sub.id}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 14px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            background: 'var(--surface-hover)',
                            border: '1px solid var(--border-light)',
                            color: 'var(--text-main)',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span>{sub.name}</span>

                          {sub.is_system ? (
                            <span
                              className="material-icons-round"
                              style={{ fontSize: '13px', color: 'var(--text-muted)', opacity: 0.6 }}
                              title="Mục chuẩn hệ thống"
                            >
                              lock
                            </span>
                          ) : (
                            hasSettingsPerm && (
                              <button
                                type="button"
                                onClick={() => handleDeleteCategory(sub.id, sub.name)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  padding: 0,
                                  cursor: 'pointer',
                                  color: 'var(--text-muted)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  transition: 'color 0.2s'
                                }}
                                onMouseOver={e => e.currentTarget.style.color = 'var(--danger)'}
                                onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}
                                title="Xóa mục tùy chỉnh này"
                              >
                                <span className="material-icons-round" style={{ fontSize: '14px' }}>close</span>
                              </button>
                            )
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Inline Quick Subcategory Adder */}
                {hasSettingsPerm && (
                  <div style={{
                    padding: '14px 20px',
                    borderTop: '1px solid var(--border-light)',
                    background: 'var(--surface)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <input
                      type="text"
                      placeholder={`+ Thêm mục con cho "${parent.name}"...`}
                      value={inlineInputs[parent.id] || ''}
                      onChange={e => setInlineInputs(prev => ({ ...prev, [parent.id]: e.target.value }))}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSubcategory(parent.id, parent.name);
                        }
                      }}
                      style={{
                        flex: 1,
                        height: '38px',
                        padding: '0 14px',
                        fontSize: '0.8125rem',
                        borderRadius: 'var(--radius-full)',
                        border: '1px solid var(--border-light)',
                        background: 'var(--background)',
                        color: 'var(--text-main)',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                      }}
                      onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                      onBlur={e => e.currentTarget.style.borderColor = 'var(--border-light)'}
                    />

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      isLoading={inlineLoadingParentId === parent.id}
                      onClick={() => handleAddSubcategory(parent.id, parent.name)}
                      style={{ borderRadius: 'var(--radius-full)', flexShrink: 0 }}
                    >
                      Thêm
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 7. Modal Thêm Nhóm Danh Mục Cha Mới */}
      <Modal isOpen={isAddParentModalOpen} onClose={() => setIsAddParentModalOpen(false)}>
        <ModalHeader
          title={`Thêm Nhóm Danh Mục Cha (${parentType === 'expense' ? 'Chi Phí' : 'Khoản Thu'})`}
          onClose={() => setIsAddParentModalOpen(false)}
        />
        <form onSubmit={handleAddParentGroup}>
          <ModalBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'var(--text-secondary)',
                  marginBottom: '6px'
                }}>
                  Phân Loại *
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setParentType('expense')}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: parentType === 'expense' ? 'var(--danger-bg)' : 'var(--surface-hover)',
                      borderColor: parentType === 'expense' ? 'var(--danger)' : 'var(--border-light)',
                      color: parentType === 'expense' ? 'var(--danger)' : 'var(--text-secondary)',
                    }}
                  >
                    Chi Phí (Expense)
                  </button>
                  <button
                    type="button"
                    onClick={() => setParentType('income')}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: parentType === 'income' ? 'var(--success-bg)' : 'var(--surface-hover)',
                      borderColor: parentType === 'income' ? 'var(--success)' : 'var(--border-light)',
                      color: parentType === 'income' ? 'var(--success)' : 'var(--text-secondary)',
                    }}
                  >
                    Khoản Thu (Income)
                  </button>
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'var(--text-secondary)',
                  marginBottom: '6px'
                }}>
                  Tên Nhóm Cha *
                </label>
                <Input
                  type="text"
                  required
                  placeholder="VD: Chi phí pháp lý & Kế toán..."
                  value={parentName}
                  onChange={e => setParentName(e.target.value)}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'var(--text-secondary)',
                  marginBottom: '6px'
                }}>
                  Biểu Tượng (Icon)
                </label>
                <Select
                  value={parentIcon}
                  onChange={e => setParentIcon(e.target.value)}
                  options={PARENT_ICON_OPTIONS}
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsAddParentModalOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={parentSubmitting}
            >
              Tạo Nhóm Cha
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}

