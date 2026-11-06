'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDashboardContext } from '@/app/(dashboard)/DashboardProvider';
import { useFinanceCategories } from '@/hooks/useFinanceCategories';
import {
  addCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
  resetDefaultFinanceCategoriesAction,
} from '@/app/(dashboard)/finance/actions';
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
  { label: 'Học phí / Giáo dục', value: 'school' },
  { label: 'Nhân sự / Đội ngũ', value: 'badge' },
  { label: 'Đội ngũ / Nhóm', value: 'groups' },
  { label: 'Võ phục & Trang phục', value: 'sports_martial_arts' },
  { label: 'Võ phục / Đồng phục', value: 'checkroom' },
  { label: 'Huy chương / Thi đai', value: 'emoji_events' },
  { label: 'Huy chương / Cấp đai', value: 'military_tech' },
  { label: 'Tòa nhà / Mặt bằng', value: 'apartment' },
  { label: 'Cửa hàng / Văn phòng', value: 'storefront' },
  { label: 'Cửa hàng / Mặt bằng', value: 'store' },
  { label: 'Giỏ hàng / Mua sắm', value: 'shopping_bag' },
  { label: 'Tiếp thị / Marketing', value: 'campaign' },
  { label: 'Tiền mặt / Thanh toán', value: 'payments' },
  { label: 'Dụng cụ tập luyện', value: 'fitness_center' },
  { label: 'Kho bãi / Nhập hàng', value: 'inventory_2' },
  { label: 'Điện & Năng lượng', value: 'bolt' },
  { label: 'Nước & Tiện ích', value: 'water_drop' },
  { label: 'Internet & Mạng', value: 'wifi' },
  { label: 'Sửa chữa & Bảo trì', value: 'build' },
  { label: 'Quảng cáo & Digital', value: 'ads_click' },
  { label: 'In ấn & Thiết kế', value: 'print' },
  { label: 'Tiếp khách & Nước uống', value: 'local_cafe' },
  { label: 'Ngôi sao / Đặc biệt', value: 'stars' },
  { label: 'Thư mục chung', value: 'folder' },
  { label: 'Danh mục chung', value: 'category' },
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

  // Edit category modal state (supports both parent and subcategory)
  const [editModalItem, setEditModalItem] = useState<FinanceCategory | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('category');
  const [editParentId, setEditParentId] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Delete parent confirmation modal state
  const [deleteParentItem, setDeleteParentItem] = useState<FinanceCategory | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Reset default template confirmation modal state
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);

  // Notification state
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const activeParents = activeType === 'income' ? incomeCategories : expenseCategories;

  // Overview Counts
  const totalParents = categoriesTree.length;
  const totalExpenseSubs = expenseCategories.reduce((acc, p) => acc + (p.subcategories?.length || 0), 0);
  const totalIncomeSubs = incomeCategories.reduce((acc, p) => acc + (p.subcategories?.length || 0), 0);
  const totalAllSubs = totalExpenseSubs + totalIncomeSubs;

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setErrorMessage('');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setSuccessMessage('');
  };

  // Open edit modal for parent or subcategory
  const openEditModal = (cat: FinanceCategory) => {
    setEditModalItem(cat);
    setEditName(cat.name);
    setEditIcon(cat.icon || 'category');
    setEditParentId(cat.parent_id || null);
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
      setActiveType(parentType);
    } else {
      showError(res.error || 'Lỗi khi tạo nhóm danh mục cha.');
    }
  };

  // Handle edit category form submit
  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalItem) return;
    if (!editName.trim()) {
      showError('Tên danh mục không được để trống.');
      return;
    }

    setEditSubmitting(true);
    const isParent = editModalItem.parent_id === null;
    const res = await updateCategoryAction(editModalItem.id, {
      name: editName.trim(),
      icon: isParent ? editIcon : undefined,
      parent_id: !isParent ? editParentId : undefined,
    });
    setEditSubmitting(false);

    if (res.success) {
      setEditModalItem(null);
      queryClient.invalidateQueries({ queryKey: ['financeCategories', organizationId] });
      showSuccess(`Đã cập nhật danh mục "${editName.trim()}".`);
    } else {
      showError(res.error || 'Lỗi khi cập nhật danh mục.');
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

  // Confirm delete parent group (with child warning)
  const handleConfirmDeleteParent = async () => {
    if (!deleteParentItem) return;

    setDeleteSubmitting(true);
    const res = await deleteCategoryAction(deleteParentItem.id);
    setDeleteSubmitting(false);

    if (res.success) {
      setDeleteParentItem(null);
      queryClient.invalidateQueries({ queryKey: ['financeCategories', organizationId] });
      showSuccess(`Đã xóa nhóm danh mục "${deleteParentItem.name}".`);
    } else {
      showError(res.error || 'Lỗi khi xóa nhóm danh mục.');
    }
  };

  // Confirm reset default finance categories template
  const handleConfirmResetTemplate = async () => {
    setResetSubmitting(true);
    const res = await resetDefaultFinanceCategoriesAction();
    setResetSubmitting(false);

    if (res.success) {
      setIsResetConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ['financeCategories', organizationId] });
      showSuccess('Đã khôi phục toàn bộ danh mục Thu - Chi về mẫu mặc định thành công.');
    } else {
      showError(res.error || 'Lỗi khi khôi phục danh mục mẫu.');
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
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="secondary"
                onClick={() => setIsResetConfirmOpen(true)}
                leftIcon={<span className="material-icons-round">restart_alt</span>}
                style={{ borderRadius: 'var(--radius-full)' }}
              >
                Khôi Phục Mẫu Mặc Định
              </Button>
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
            </div>
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

          {/* 4. Tổng Mục Con */}
          <div className={`${styles.kpiItem} ${styles.kpiInfo}`}>
            <div className={styles.kpiLabel}>
              <div className={styles.kpiDot}></div>
              Tổng Hạng Mục Con
            </div>
            <div className={styles.kpiValue}>
              {totalAllSubs} <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>mục</span>
            </div>
            <div className={styles.kpiCaption}>
              Đầy đủ các khoản thu & chi chi tiết
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
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

                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: 'var(--text-main)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {parent.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        {subs.length} danh mục con
                      </div>
                    </div>
                  </div>

                  {hasSettingsPerm && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => openEditModal(parent)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          padding: '6px',
                          borderRadius: 'var(--radius-md)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'color 0.2s, background-color 0.2s',
                        }}
                        onMouseOver={e => {
                          e.currentTarget.style.color = 'var(--primary)';
                          e.currentTarget.style.backgroundColor = 'var(--primary-light)';
                        }}
                        onMouseOut={e => {
                          e.currentTarget.style.color = 'var(--text-secondary)';
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                        title="Chỉnh sửa nhóm danh mục này"
                      >
                        <span className="material-icons-round" style={{ fontSize: '18px' }}>edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteParentItem(parent)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          padding: '6px',
                          borderRadius: 'var(--radius-md)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'color 0.2s, background-color 0.2s',
                        }}
                        onMouseOver={e => {
                          e.currentTarget.style.color = 'var(--danger)';
                          e.currentTarget.style.backgroundColor = 'var(--danger-bg)';
                        }}
                        onMouseOut={e => {
                          e.currentTarget.style.color = 'var(--text-secondary)';
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                        title="Xóa nhóm danh mục này"
                      >
                        <span className="material-icons-round" style={{ fontSize: '18px' }}>delete_outline</span>
                      </button>
                    </div>
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

                          {hasSettingsPerm && (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <button
                                type="button"
                                onClick={() => openEditModal(sub)}
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
                                onMouseOver={e => e.currentTarget.style.color = 'var(--primary)'}
                                onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}
                                title="Chỉnh sửa mục con này"
                              >
                                <span className="material-icons-round" style={{ fontSize: '14px' }}>edit</span>
                              </button>
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
                                title="Xóa mục con này"
                              >
                                <span className="material-icons-round" style={{ fontSize: '15px' }}>close</span>
                              </button>
                            </div>
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

      {/* 8. Modal Chỉnh Sửa Danh Mục (Nhóm Cha hoặc Mục Con) */}
      <Modal isOpen={editModalItem !== null} onClose={() => setEditModalItem(null)}>
        <ModalHeader
          title={
            editModalItem?.parent_id === null
              ? `Chỉnh Sửa Nhóm Danh Mục Cha (${editModalItem?.type === 'expense' ? 'Chi Phí' : 'Khoản Thu'})`
              : `Chỉnh Sửa Mục Con`
          }
          onClose={() => setEditModalItem(null)}
        />
        <form onSubmit={handleUpdateCategory}>
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
                  Tên Danh Mục *
                </label>
                <Input
                  type="text"
                  required
                  placeholder="Nhập tên danh mục..."
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                />
              </div>

              {editModalItem?.parent_id === null ? (
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
                    value={editIcon}
                    onChange={e => setEditIcon(e.target.value)}
                    options={PARENT_ICON_OPTIONS}
                  />
                </div>
              ) : (
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'var(--text-secondary)',
                    marginBottom: '6px'
                  }}>
                    Thuộc Nhóm Cha *
                  </label>
                  <Select
                    value={editParentId || ''}
                    onChange={e => setEditParentId(e.target.value || null)}
                    options={
                      (editModalItem?.type === 'income' ? incomeCategories : expenseCategories).map(p => ({
                        label: p.name,
                        value: p.id,
                      }))
                    }
                  />
                </div>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditModalItem(null)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={editSubmitting}
            >
              Lưu Thay Đổi
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* 9. Modal Xác Nhận Xóa Nhóm Cha */}
      <Modal isOpen={deleteParentItem !== null} onClose={() => setDeleteParentItem(null)}>
        <ModalHeader
          title="Xác Nhận Xóa Nhóm Danh Mục"
          onClose={() => setDeleteParentItem(null)}
        />
        <ModalBody>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-main)' }}>
              Bạn có chắc chắn muốn xóa nhóm danh mục <strong>&ldquo;{deleteParentItem?.name}&rdquo;</strong>?
            </p>

            {(deleteParentItem?.subcategories?.length || 0) > 0 && (
              <div style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--danger-bg)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: 'var(--danger)',
                fontSize: '0.8125rem',
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start',
              }}>
                <span className="material-icons-round" style={{ fontSize: '18px', flexShrink: 0, marginTop: '2px' }}>
                  warning
                </span>
                <div>
                  <strong>Cảnh báo quan trọng:</strong> Nhóm này đang chứa{' '}
                  <strong>{deleteParentItem?.subcategories?.length} mục con</strong>. Khi xóa nhóm cha, toàn bộ các mục con bên trong cũng sẽ bị xóa vĩnh viễn.
                </div>
              </div>
            )}

            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Các giao dịch tài chính trong quá khứ vẫn giữ nguyên vẹn thông tin lịch sử của nhóm và mục con.
            </p>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setDeleteParentItem(null)}
          >
            Hủy Bỏ
          </Button>
          <Button
            type="button"
            variant="danger"
            isLoading={deleteSubmitting}
            onClick={handleConfirmDeleteParent}
          >
            Xác Nhận Xóa Nhóm
          </Button>
        </ModalFooter>
      </Modal>

      {/* 10. Modal Xác Nhận Khôi Phục Mẫu Mặc Định */}
      <Modal isOpen={isResetConfirmOpen} onClose={() => setIsResetConfirmOpen(false)}>
        <ModalHeader
          title="Khôi Phục Danh Mục Mẫu Mặc Định"
          onClose={() => setIsResetConfirmOpen(false)}
        />
        <ModalBody>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
              Thao tác này sẽ đặt lại toàn bộ danh mục Thu - Chi của trung tâm về bộ danh mục mẫu tiêu chuẩn ban đầu (Võ thuật & Thể thao). Mọi danh mục tự tạo sẽ bị thay thế.
            </p>

            <div style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--warning-bg, rgba(234, 179, 8, 0.12))',
              border: '1px solid rgba(234, 179, 8, 0.3)',
              color: 'var(--warning, #eab308)',
              fontSize: '0.8125rem',
              display: 'flex',
              gap: '8px',
              alignItems: 'flex-start',
            }}>
              <span className="material-icons-round" style={{ fontSize: '18px', flexShrink: 0, marginTop: '2px' }}>
                info
              </span>
              <div>
                <strong>Lưu ý về lịch sử:</strong> Các giao dịch tài chính đã ghi nhận trước đây vẫn giữ nguyên vẹn tên lịch sử và số liệu báo cáo, không bị gián đoạn hay mất dữ liệu.
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsResetConfirmOpen(false)}
          >
            Hủy Bỏ
          </Button>
          <Button
            type="button"
            variant="danger"
            isLoading={resetSubmitting}
            onClick={handleConfirmResetTemplate}
          >
            Xác Nhận Khôi Phục
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
