'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { deleteTransactionAction } from './actions';
import { useFinance } from '@/hooks/useFinance';
import { useFinanceCategories } from '@/hooks/useFinanceCategories';
import { useVenues } from '@/hooks/useVenues';
import { useDashboardContext } from '../DashboardProvider';
import dynamic from 'next/dynamic';
import type { FinancePaymentMethod, FinanceTransactionType, TimeRangePreset } from '@/types/finance';

const ExportButton = dynamic(() => import('@/app/components/excel/ExportButton').then(mod => mod.ExportButton), { ssr: false });
import { FinanceExportDef } from '@/services/excel/definitions/finance.def';

// UI Components
import { PageHeader } from '@/app/components/ui/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/app/components/ui/Table';

// Finance Sub-Components
import { FinanceTimeRangeStrip, computeRangeFromPreset } from './components/FinanceTimeRangeStrip';
import { FinanceFiltersBar } from './components/FinanceFiltersBar';
import { FinanceKpiGrid } from './components/FinanceKpiGrid';
import { FinanceCharts } from './components/FinanceCharts';
import { AddTransactionModal } from './components/AddTransactionModal';
import { ManageCategoriesModal } from './components/ManageCategoriesModal';

import pageStyles from '@/app/styles/page-standard.module.css';
import clientStyles from './FinanceClient.module.css';

function FinanceSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="h-20 bg-surface-hover rounded-2xl w-full" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="h-28 bg-surface-hover rounded-2xl w-full" />
        <div className="h-28 bg-surface-hover rounded-2xl w-full" />
        <div className="h-28 bg-surface-hover rounded-2xl w-full" />
        <div className="h-28 bg-surface-hover rounded-2xl w-full" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-64 bg-surface-hover rounded-2xl w-full" />
        <div className="h-64 bg-surface-hover rounded-2xl w-full" />
      </div>
      <div className="h-64 bg-surface-hover rounded-2xl w-full" />
    </div>
  );
}

export default function FinanceClient() {
  const { context } = useDashboardContext();
  const organizationId = context?.organization?.id;
  const currentUserRole = context?.membership?.role;
  const queryClient = useQueryClient();

  const isAdminOrOwner = currentUserRole === 'admin' || currentUserRole === 'owner';
  const hasFinancePermission = isAdminOrOwner || (context?.permissions && context.permissions.includes('manage_finance'));

  // 1. Venues & Categories
  const { venues } = useVenues(organizationId);
  const { incomeCategories, expenseCategories } = useFinanceCategories(organizationId);

  // 2. Filter States
  const defaultRange = computeRangeFromPreset('this_month');
  const [dateRange, setDateRange] = useState<{ startDate: string; endDate: string; preset: TimeRangePreset }>({
    startDate: defaultRange.startDate,
    endDate: defaultRange.endDate,
    preset: 'this_month',
  });
  const [selectedVenue, setSelectedVenue] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<'all' | FinanceTransactionType>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'all' | FinancePaymentMethod>('all');

  // 3. Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // 4. Data Fetching
  const { 
    rawTransactions,
    transactions, 
    summary, 
    cashflowTrends, 
    expenseDistribution, 
    isLoading 
  } = useFinance(organizationId, {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    venueId: selectedVenue,
    type: selectedType,
    paymentMethod: selectedPaymentMethod,
  });

  const handleTransactionSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['financeTransactions', organizationId] });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa giao dịch này? Hành động này không thể hoàn tác.')) {
      return;
    }
    setActionLoading(true);
    const res = await deleteTransactionAction(id);
    setActionLoading(false);
    if (res.success) {
      handleTransactionSuccess();
    } else {
      alert(res.error || 'Lỗi khi xóa giao dịch');
    }
  };

  return (
    <div className={clientStyles.financeContainer}>
      {/* 1. Header */}
      <PageHeader 
        title="Quản Lý Tài Chính & Sổ Quỹ" 
        description="Theo dõi dòng tiền thu chi, phân bổ chi phí và lợi nhuận trung tâm"
        primaryAction={hasFinancePermission ? (
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              onClick={() => setIsManageCategoriesOpen(true)}
              leftIcon={<span className="material-icons-round">folder_special</span>}
            >
              Danh Mục
            </Button>
            <ExportButton data={transactions} definition={FinanceExportDef} />
            <Button 
              onClick={() => setIsAddModalOpen(true)}
              leftIcon={<span className="material-icons-round">add_circle</span>}
              variant="primary"
            >
              Thêm Giao Dịch
            </Button>
          </div>
        ) : (
          <ExportButton data={transactions} definition={FinanceExportDef} />
        )}
      />

      {/* 2. Time Range Strip */}
      <FinanceTimeRangeStrip onRangeChange={setDateRange} />

      {/* 3. Secondary Filters Bar */}
      <FinanceFiltersBar
        venues={venues}
        selectedVenue={selectedVenue}
        onVenueChange={setSelectedVenue}
        selectedType={selectedType}
        onTypeChange={setSelectedType}
        selectedPaymentMethod={selectedPaymentMethod}
        onPaymentMethodChange={setSelectedPaymentMethod}
      />

      {isLoading ? (
        <FinanceSkeleton />
      ) : (
        <>
          {/* 4. Bento KPI Grid */}
          <FinanceKpiGrid summary={summary} />

          {/* 5. Charts Grid */}
          <FinanceCharts 
            trends={cashflowTrends} 
            expenseDistribution={expenseDistribution} 
          />

          {/* 6. Transactions Table List */}
          <div className={pageStyles.listContainer}>
            <div className={pageStyles.sectionHeader}>
              <h3 className={pageStyles.sectionTitle}>
                <span className="material-icons-round text-primary" style={{ fontSize: '20px' }}>receipt_long</span>
                Danh Sách Giao Dịch
              </h3>
              <span className={pageStyles.sectionCount}>
                Hiển thị {transactions.length} / {rawTransactions.length} giao dịch
              </span>
            </div>

            {transactions.length === 0 ? (
              <EmptyState 
                title={rawTransactions.length === 0 ? "Chưa có giao dịch trong kỳ" : "Không tìm thấy giao dịch phù hợp"} 
                description={rawTransactions.length === 0 
                  ? "Hệ thống chưa ghi nhận dòng tiền nào trong khoảng thời gian đã chọn."
                  : "Vui lòng điều chỉnh lại bộ lọc Loại hoặc Phương thức thanh toán."}
                icon="receipt_long"
                compact
              />
            ) : (
              <Card>
                <div className="overflow-x-auto">
                  <Table>
                    <Thead>
                      <Tr>
                        <Th style={{ minWidth: '105px' }}>Ngày</Th>
                        <Th style={{ minWidth: '180px' }}>Danh mục</Th>
                        <Th style={{ minWidth: '150px' }}>Cơ sở</Th>
                        <Th style={{ minWidth: '130px' }}>Phương thức</Th>
                        <Th style={{ minWidth: '220px' }}>Mô tả</Th>
                        <Th className="text-right" style={{ minWidth: '140px' }}>Số tiền</Th>
                        {hasFinancePermission && <Th className="text-right" style={{ minWidth: '80px' }}>Thao tác</Th>}
                      </Tr>
                    </Thead>
                    <Tbody>
                      {transactions.map(t => {
                        const isIncome = t.type === 'income';
                        const parentName = t.parent_category || (isIncome ? 'Khoản thu' : 'Chi phí');
                        const subName = t.sub_category || t.category || 'Chung';
                        const venueName = t.venues?.name || '🏢 Chung toàn trung tâm';
                        const isSystem = t.source_type && t.source_type !== 'MANUAL';

                        return (
                          <Tr key={t.id}>
                            {/* 1. Date */}
                            <Td className="whitespace-nowrap text-secondary font-medium">
                              {t.date}
                            </Td>

                            {/* 2. Category */}
                            <Td>
                              <div className={clientStyles.categoryCell}>
                                <span className={`${clientStyles.parentBadge} ${!isIncome ? clientStyles.parentBadgeExpense : ''}`}>
                                  {parentName}
                                </span>
                                <span className={clientStyles.subCategoryText}>
                                  {subName}
                                </span>
                              </div>
                            </Td>

                            {/* 3. Venue */}
                            <Td className="whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-surface-hover text-secondary border border-border-light">
                                <span className="material-icons-round text-xs" style={{ fontSize: '13px' }}>
                                  {t.venue_id ? 'location_on' : 'domain'}
                                </span>
                                {venueName}
                              </span>
                            </Td>

                            {/* 4. Payment Method */}
                            <Td className="whitespace-nowrap">
                              <span className="text-xs font-medium text-main inline-flex items-center gap-1">
                                {t.payment_method === 'bank_transfer' ? '🏦 Ngân hàng' : '💵 Tiền mặt'}
                              </span>
                            </Td>

                            {/* 5. Description */}
                            <Td className="max-w-[260px] truncate" title={t.description || ''}>
                              <span className="text-secondary text-sm">
                                {t.description || <span className="italic text-xs opacity-60">Không có ghi chú</span>}
                              </span>
                            </Td>

                            {/* 6. Amount */}
                            <Td className={`text-right font-bold text-sm whitespace-nowrap ${isIncome ? 'text-success' : 'text-danger'}`}>
                              {isIncome ? '+' : '-'}{Number(t.amount).toLocaleString('vi-VN')} đ
                            </Td>

                            {/* 7. Action */}
                            {hasFinancePermission && (
                              <Td className="text-right whitespace-nowrap">
                                {!isSystem ? (
                                  <Button 
                                    variant="ghost"
                                    size="sm"
                                    className="text-danger hover:bg-danger-bg"
                                    onClick={() => handleDelete(t.id)}
                                    disabled={actionLoading}
                                  >
                                    Xóa
                                  </Button>
                                ) : (
                                  <span 
                                    className="text-[11px] text-secondary italic px-2 py-0.5 rounded bg-surface-hover"
                                    title="Giao dịch sinh tự động từ hệ thống (Học phí / Lương), không thể xóa trực tiếp"
                                  >
                                    Hệ thống
                                  </span>
                                )}
                              </Td>
                            )}
                          </Tr>
                        );
                      })}
                    </Tbody>
                  </Table>
                </div>
              </Card>
            )}
          </div>
        </>
      )}

      {/* Modals */}
      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleTransactionSuccess}
        venues={venues}
        incomeCategories={incomeCategories}
        expenseCategories={expenseCategories}
        onOpenManageCategories={() => {
          setIsAddModalOpen(false);
          setIsManageCategoriesOpen(true);
        }}
      />

      <ManageCategoriesModal
        isOpen={isManageCategoriesOpen}
        onClose={() => setIsManageCategoriesOpen(false)}
        organizationId={organizationId}
        incomeCategories={incomeCategories}
        expenseCategories={expenseCategories}
      />
    </div>
  );
}
