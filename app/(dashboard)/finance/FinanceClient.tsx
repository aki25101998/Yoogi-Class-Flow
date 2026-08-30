'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getBusinessDateString } from '@/utils/date';
import { addTransactionAction, deleteTransactionAction } from './actions';
import { useFinance } from '@/hooks/useFinance';
import { useDashboardContext } from '../DashboardProvider';

// UI Components
import { PageHeader } from '@/app/components/ui/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { Input, Select } from '@/app/components/ui/Input';
import { Card, CardContent } from '@/app/components/ui/Card';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { Badge } from '@/app/components/ui/Badge';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/app/components/ui/Table';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/app/components/ui/Modal';

function FinanceSkeleton() {
  return (
    <div className="flex-col gap-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card><CardContent className="h-24 bg-surface-hover"></CardContent></Card>
        <Card><CardContent className="h-24 bg-surface-hover"></CardContent></Card>
        <Card><CardContent className="h-24 bg-surface-hover"></CardContent></Card>
      </div>
      <Card><CardContent className="h-64 bg-surface-hover mt-6"></CardContent></Card>
    </div>
  );
}

export default function FinanceClient() {
  const { context } = useDashboardContext();
  const organizationId = context?.organization?.id;
  const currentUserRole = context?.membership?.role;

  const { transactions, isLoading: isFetching } = useFinance(organizationId);
  const queryClient = useQueryClient();

  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ type: 'income', category: '', amount: 0, date: getBusinessDateString(), description: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isAdminOrOwner = currentUserRole === 'admin' || currentUserRole === 'owner';

  const totalIncome = transactions.filter((t: any) => t.type === 'income').reduce((acc: number, t: any) => acc + Number(t.amount), 0);
  const totalExpense = transactions.filter((t: any) => t.type === 'expense').reduce((acc: number, t: any) => acc + Number(t.amount), 0);
  const balance = totalIncome - totalExpense;

  const resetForm = () => {
    setFormData({ type: 'income', category: '', amount: 0, date: getBusinessDateString(), description: '' });
    setIsAdding(false);
    setError('');
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['financeTransactions', organizationId] });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await addTransactionAction(formData);
    setLoading(false);
    if (res.success) {
      resetForm();
      handleSuccess();
    } else setError(res.error || 'Lỗi khi thêm giao dịch');
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bạn có chắc muốn xóa giao dịch này? Hành động này không thể hoàn tác.')) {
      setLoading(true);
      const res = await deleteTransactionAction(id);
      setLoading(false);
      if (res.success) handleSuccess();
      else alert(res.error || 'Lỗi khi xóa');
    }
  };

  return (
    <div className="flex-col gap-6">
      <PageHeader 
        title="Quản lý Tài chính" 
        description="Theo dõi dòng tiền thu chi của trung tâm"
        primaryAction={isAdminOrOwner ? (
          <Button 
            onClick={() => setIsAdding(true)}
            leftIcon={<span className="material-icons-round">add_circle_outline</span>}
          >
            Thêm Giao Dịch
          </Button>
        ) : undefined}
      />

      {isFetching ? (
        <FinanceSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent>
                <div className="text-secondary text-sm font-medium mb-2 uppercase tracking-wider">Tổng thu</div>
                <div className="text-2xl font-bold text-success">{totalIncome.toLocaleString('vi-VN')} đ</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="text-secondary text-sm font-medium mb-2 uppercase tracking-wider">Tổng chi</div>
                <div className="text-2xl font-bold text-danger">{totalExpense.toLocaleString('vi-VN')} đ</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="text-secondary text-sm font-medium mb-2 uppercase tracking-wider">Số dư (Lợi nhuận)</div>
                <div className={`text-2xl font-bold ${balance >= 0 ? 'text-primary' : 'text-danger'}`}>
                  {balance.toLocaleString('vi-VN')} đ
                </div>
              </CardContent>
            </Card>
          </div>

          <Modal isOpen={isAdding} onClose={loading ? () => {} : resetForm}>
            <ModalHeader title="Thêm giao dịch mới" onClose={loading ? () => {} : resetForm} />
            <ModalBody>
              {error && <div style={{ color: 'var(--danger)', marginBottom: '16px', fontSize: '0.875rem' }}>{error}</div>}
              <form id="finance-form" onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
                <Select 
                  label="Loại giao dịch *"
                  required 
                  value={formData.type} 
                  onChange={e => setFormData({...formData, type: e.target.value})}
                  options={[
                    { value: 'income', label: 'Thu' },
                    { value: 'expense', label: 'Chi' }
                  ]}
                />
                <Input 
                  label="Danh mục *"
                  required 
                  placeholder="VD: Học phí, Tiền thuê mặt bằng, Tiền điện..." 
                  value={formData.category} 
                  onChange={e => setFormData({...formData, category: e.target.value})} 
                />
                <Input 
                  label="Số tiền (VNĐ) *"
                  type="number" 
                  required 
                  min="1" 
                  value={formData.amount} 
                  onChange={e => setFormData({...formData, amount: Number(e.target.value)})} 
                />
                <Input 
                  label="Ngày *"
                  type="date" 
                  required 
                  value={formData.date} 
                  onChange={e => setFormData({...formData, date: e.target.value})} 
                />
                <div>
                  <Input 
                    label="Mô tả thêm"
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})} 
                  />
                </div>
              </form>
            </ModalBody>
            <ModalFooter>
              <Button type="button" variant="secondary" onClick={resetForm} disabled={loading}>Hủy</Button>
              <Button type="submit" form="finance-form" isLoading={loading} variant="primary">Lưu</Button>
            </ModalFooter>
          </Modal>

          {transactions.length === 0 ? (
            <EmptyState 
              title="Chưa có giao dịch" 
              description="Hệ thống chưa ghi nhận dòng tiền nào." 
              icon="receipt_long"
            />
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <Thead>
                    <Tr>
                      <Th>Ngày</Th>
                      <Th>Danh mục</Th>
                      <Th>Mô tả</Th>
                      <Th className="text-right">Số tiền</Th>
                      {isAdminOrOwner && <Th className="text-right">Thao tác</Th>}
                    </Tr>
                  </Thead>
                  <Tbody>
                    {transactions.map((t: any) => {
                      const isIncome = t.type === 'income';
                      return (
                        <Tr key={t.id}>
                          <Td>{t.date}</Td>
                          <Td className="font-medium text-main">
                            <Badge variant={isIncome ? 'success' : 'danger'} className="mr-2">
                              {isIncome ? 'THU' : 'CHI'}
                            </Badge>
                            {t.category}
                          </Td>
                          <Td className="max-w-[200px] truncate" title={t.description}>{t.description}</Td>
                          <Td className={`text-right font-bold ${isIncome ? 'text-success' : 'text-danger'}`}>
                            {isIncome ? '+' : '-'}{Number(t.amount).toLocaleString('vi-VN')} đ
                          </Td>
                          {isAdminOrOwner && (
                            <Td className="text-right whitespace-nowrap">
                              <Button 
                                variant="ghost"
                                size="sm"
                                className="text-danger hover:bg-danger-bg"
                                onClick={() => handleDelete(t.id)}
                                disabled={loading}
                              >
                                Xóa
                              </Button>
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
        </>
      )}
    </div>
  );
}
