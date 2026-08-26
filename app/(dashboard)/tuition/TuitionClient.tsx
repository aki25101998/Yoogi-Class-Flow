'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { addTuitionAction, deleteTuitionAction, recordPaymentAction } from './actions';
import { useTuition } from '@/hooks/useTuition';
import { useDashboardContext } from '../DashboardProvider';

// UI Components
import { PageHeader } from '@/app/components/ui/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { Input, Select } from '@/app/components/ui/Input';
import { Card, CardContent } from '@/app/components/ui/Card';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { Badge } from '@/app/components/ui/Badge';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/app/components/ui/Table';

function TuitionSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent>
        <div className="h-10 bg-surface-hover rounded w-full mb-4"></div>
        <div className="h-10 bg-surface-hover rounded w-full mb-4"></div>
        <div className="h-10 bg-surface-hover rounded w-full"></div>
      </CardContent>
    </Card>
  );
}

export default function TuitionClient() {
  const { context } = useDashboardContext();
  const organizationId = context?.organization?.id;
  const currentUserRole = context?.membership?.role;

  const { tuitionList, students, classes, isLoading: isFetching } = useTuition(organizationId);
  const queryClient = useQueryClient();

  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ student_id: '', class_id: '', amount: 0, due_date: '' });
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isAdminOrOwner = currentUserRole === 'admin' || currentUserRole === 'owner';

  const resetForm = () => {
    setFormData({ student_id: '', class_id: '', amount: 0, due_date: '' });
    setIsAdding(false);
    setError('');
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['tuition', organizationId] });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await addTuitionAction(formData);
    setLoading(false);
    if (res.success) {
      resetForm();
      handleSuccess();
    } else setError(res.error || 'Lỗi khi thêm khoản thu');
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bạn có chắc muốn xóa khoản thu này?')) {
      setLoading(true);
      const res = await deleteTuitionAction(id);
      setLoading(false);
      if (res.success) handleSuccess();
      else alert(res.error || 'Lỗi khi xóa');
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!paymentId) return;
    
    setLoading(true);
    const res = await recordPaymentAction(paymentId, paymentAmount);
    setLoading(false);
    if (res.success) {
      setPaymentId(null);
      setPaymentAmount(0);
      handleSuccess();
    } else {
      setError(res.error || 'Lỗi khi ghi nhận thanh toán');
    }
  };

  return (
    <div className="flex-col gap-6">
      <PageHeader 
        title="Quản lý Học phí" 
        description="Quản lý các khoản thu và thanh toán học phí của học viên"
        primaryAction={isAdminOrOwner && !isAdding ? (
          <Button 
            onClick={() => setIsAdding(true)}
            leftIcon={<span className="material-icons-round">request_quote</span>}
          >
            Thêm Khoản Thu
          </Button>
        ) : undefined}
      />

      {isAdding && (
        <Card className="mb-6">
          <CardContent>
            <h3 className="font-semibold text-lg mb-4 text-main">Thêm khoản thu học phí mới</h3>
            {error && <div className="text-danger mb-4 text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <Select 
                label="Học viên *"
                required 
                value={formData.student_id} 
                onChange={e => setFormData({...formData, student_id: e.target.value})}
                options={[
                  { value: '', label: '-- Chọn học viên --' },
                  ...students.map((s: any) => ({ value: s.id, label: s.name }))
                ]}
              />
              <Select 
                label="Lớp học (Tùy chọn)"
                value={formData.class_id} 
                onChange={e => setFormData({...formData, class_id: e.target.value})}
                options={[
                  { value: '', label: '-- Chọn lớp --' },
                  ...classes.map((c: any) => ({ value: c.id, label: c.name }))
                ]}
              />
              <Input 
                label="Số tiền (VNĐ) *"
                type="number" 
                required 
                value={formData.amount} 
                onChange={e => setFormData({...formData, amount: Number(e.target.value)})} 
              />
              <Input 
                label="Kỳ hạn (YYYY-MM)"
                type="month" 
                required 
                value={formData.due_date} 
                onChange={e => setFormData({...formData, due_date: e.target.value})} 
              />
              <div className="col-span-full mt-2 flex gap-2">
                <Button type="submit" isLoading={loading} variant="primary">Lưu</Button>
                <Button type="button" variant="secondary" onClick={resetForm} disabled={loading}>Hủy</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {paymentId && (
        <Card className="mb-6 border-success">
          <CardContent>
            <h3 className="font-semibold text-lg mb-4 text-success">Ghi nhận thanh toán</h3>
            <form onSubmit={handlePayment} className="flex gap-4 items-end flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <Input 
                  label="Số tiền thanh toán (VNĐ)"
                  type="number" 
                  required 
                  min="1" 
                  value={paymentAmount} 
                  onChange={e => setPaymentAmount(Number(e.target.value))} 
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" isLoading={loading} className="bg-success text-success-text hover:bg-success-text hover:text-success-bg border-none">
                  Xác nhận
                </Button>
                <Button type="button" variant="secondary" onClick={() => { setPaymentId(null); setPaymentAmount(0); }} disabled={loading}>
                  Hủy
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isFetching ? (
        <TuitionSkeleton />
      ) : tuitionList.length === 0 ? (
        <EmptyState 
          title="Chưa có khoản thu nào" 
          description="Hệ thống chưa ghi nhận khoản thu học phí nào." 
          icon="account_balance_wallet"
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <Thead>
                <Tr>
                  <Th>Học viên</Th>
                  <Th>Lớp / Kỳ hạn</Th>
                  <Th>Số tiền</Th>
                  <Th>Thanh toán</Th>
                  <Th>Trạng thái</Th>
                  {isAdminOrOwner && <Th className="text-right">Thao tác</Th>}
                </Tr>
              </Thead>
              <Tbody>
                {tuitionList.map((t: any) => {
                  const amount = Number(t.amount) || 0;
                  const paid = Number(t.paid_amount) || 0;
                  const remaining = amount - paid;
                  
                  return (
                    <Tr key={t.id}>
                      <Td className="font-medium text-main">{t.students?.name}</Td>
                      <Td>
                        <div className="font-medium">{t.venue_classes?.name || 'Tất cả lớp'}</div>
                        <div className="text-sm text-secondary">{t.due_date}</div>
                      </Td>
                      <Td>{amount.toLocaleString('vi-VN')} đ</Td>
                      <Td>
                        <div className="text-success text-sm">Đã đóng: {paid.toLocaleString('vi-VN')} đ</div>
                        {remaining > 0 && <div className="text-danger text-sm">Còn nợ: {remaining.toLocaleString('vi-VN')} đ</div>}
                      </Td>
                      <Td>
                        <Badge 
                          variant={t.status === 'paid' ? 'success' : (t.status === 'partial' ? 'warning' : 'danger')}
                        >
                          {t.status === 'paid' ? 'Đã thu đủ' : (t.status === 'partial' ? 'Thu một phần' : 'Chưa thu')}
                        </Badge>
                      </Td>
                      {isAdminOrOwner && (
                        <Td className="text-right whitespace-nowrap">
                          {t.status !== 'paid' && (
                            <Button 
                              variant="outline"
                              size="sm"
                              className="mr-2 text-success border-success hover:bg-success-bg"
                              onClick={() => { setPaymentId(t.id); setPaymentAmount(remaining); }}
                              disabled={loading}
                            >
                              Thanh toán
                            </Button>
                          )}
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
    </div>
  );
}
