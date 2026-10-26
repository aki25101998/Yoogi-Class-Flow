'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { updateOrganizationAction, seedSampleDataAction } from './actions';
import { useDashboardContext } from '../DashboardProvider';

// UI Components
import { PageHeader } from '@/app/components/ui/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';

export default function SettingsClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { context } = useDashboardContext();
  const organization = context?.organization;
  const currentUserRole = context?.membership?.role;

  const [formData, setFormData] = useState({ 
    name: organization?.name || ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Seed sample data state
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedResult, setSeedResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isAdminOrOwner = currentUserRole === 'admin' || currentUserRole === 'owner';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdminOrOwner) return;
    
    setError('');
    setSuccess('');
    setIsSubmitting(true);
    
    const res = await updateOrganizationAction(formData);
    
    if (res.success) {
      setSuccess('Cập nhật thành công!');
      setTimeout(() => setSuccess(''), 3000);
      router.refresh();
    } else {
      setError(res.error || 'Lỗi khi cập nhật');
    }
    
    setIsSubmitting(false);
  };

  const handleSeedData = async () => {
    if (!isAdminOrOwner) return;
    const confirmed = window.confirm(
      'Hệ thống sẽ nạp dữ liệu mẫu gồm:\n- 8 Cấp đai võ thuật\n- 3 Chi nhánh tập luyện\n- 4 Huấn luyện viên\n- 6 Lớp học\n- 16 Học viên & phân lớp\n- Lịch học tuần & Điểm danh\n- Học phí & Sổ quỹ thu chi\n\nBạn có muốn tiến hành không?'
    );
    if (!confirmed) return;

    setSeedLoading(true);
    setSeedResult(null);

    try {
      const res = await seedSampleDataAction();
      if (res.success) {
        setSeedResult({ type: 'success', message: res.message || 'Nạp dữ liệu mẫu thành công!' });
        await queryClient.invalidateQueries();
        router.refresh();
      } else {
        setSeedResult({ type: 'error', message: res.error || 'Nạp dữ liệu thất bại.' });
      }
    } catch (err: any) {
      setSeedResult({ type: 'error', message: err.message || 'Đã xảy ra lỗi không xác định.' });
    } finally {
      setSeedLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <PageHeader 
        title="Cài đặt Chung" 
        description="Quản lý thông tin chung của tổ chức/trung tâm"
      />

      <Card>
        <CardHeader className="border-b border-light pb-4">
          <CardTitle>Thông tin tổ chức</CardTitle>
        </CardHeader>
        
        <CardContent className="pt-6">
          {error && <div className="text-danger mb-4 text-sm bg-danger-bg p-3 rounded-md">{error}</div>}
          {success && <div className="text-success mb-4 text-sm bg-success-bg p-3 rounded-md">{success}</div>}
          
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <Input 
              label="Tên tổ chức / Trung tâm"
              required 
              disabled={!isAdminOrOwner}
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
            />
            
            <div>
              <label className="block mb-2 text-sm font-medium text-main">Gói dịch vụ (Subscription)</label>
              <div className="p-3 bg-surface-hover rounded-md border border-light text-secondary text-sm">
                <span className="capitalize font-bold text-main">{organization?.subscription_plan || 'starter'}</span> - Trạng thái: <span className="capitalize text-main">{organization?.subscription_status || 'active'}</span>
              </div>
            </div>

            {isAdminOrOwner && (
              <div className="mt-4 pt-4 border-t border-light flex justify-end">
                <Button 
                  type="submit" 
                  variant="primary"
                  isLoading={isSubmitting}
                  disabled={isSubmitting}
                  leftIcon={<span className="material-icons-round">save</span>}
                >
                  Lưu Thay Đổi
                </Button>
              </div>
            )}
            
            {!isAdminOrOwner && (
              <div className="mt-4 p-3 bg-warning-bg text-warning rounded-md text-sm">
                Bạn đang xem với tư cách <strong>{currentUserRole}</strong>. Chỉ Admin hoặc Chủ sở hữu mới có thể thay đổi thiết lập này.
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Seed Demo Data Card */}
      {isAdminOrOwner && (
        <Card style={{ border: '1px solid var(--primary-light)', background: 'var(--surface)' }}>
          <CardHeader className="border-b border-light pb-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-icons-round" style={{ color: 'var(--primary)' }}>auto_awesome</span>
                Dữ Liệu Mẫu Kiểm Thử (Sample Data)
              </CardTitle>
              <p className="text-sm text-secondary mt-1">
                Khởi tạo dữ liệu thực tế để kiểm tra toàn bộ tính năng: Chi nhánh, Lớp học, HLV, Học viên, Lịch học, Điểm danh, Học phí và Sổ quỹ.
              </p>
            </div>
          </CardHeader>
          
          <CardContent className="pt-6">
            {seedResult && (
              <div 
                className={`mb-4 text-sm p-4 rounded-xl flex items-start gap-3 ${
                  seedResult.type === 'success' 
                    ? 'bg-success-bg text-success border border-success-border' 
                    : 'bg-danger-bg text-danger border border-danger-border'
                }`}
              >
                <span className="material-icons-round" style={{ fontSize: '1.25rem', marginTop: '2px' }}>
                  {seedResult.type === 'success' ? 'check_circle' : 'error'}
                </span>
                <div style={{ flex: 1, whiteSpace: 'pre-line' }}>{seedResult.message}</div>
              </div>
            )}

            <div className="flex flex-col gap-4">
              <div 
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-lg, 12px)',
                  background: 'var(--surface-hover)',
                  border: '1px dashed var(--border-light)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '12px'
                }}
              >
                <div className="flex items-center gap-2 text-sm text-secondary">
                  <span className="material-icons-round" style={{ color: 'var(--primary)', fontSize: '1.1rem' }}>verified</span>
                  <span>3 Chi nhánh võ thuật</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-secondary">
                  <span className="material-icons-round" style={{ color: 'var(--primary)', fontSize: '1.1rem' }}>sports_kabaddi</span>
                  <span>4 Huấn luyện viên</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-secondary">
                  <span className="material-icons-round" style={{ color: 'var(--primary)', fontSize: '1.1rem' }}>groups</span>
                  <span>6 Lớp học & 16 Học viên</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-secondary">
                  <span className="material-icons-round" style={{ color: 'var(--primary)', fontSize: '1.1rem' }}>calendar_month</span>
                  <span>Lịch tuần & Buổi điểm danh</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-secondary">
                  <span className="material-icons-round" style={{ color: 'var(--accent-energy)', fontSize: '1.1rem' }}>account_balance_wallet</span>
                  <span>Học phí & Sổ quỹ thu chi</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-secondary">
                  <span className="material-icons-round" style={{ color: 'var(--primary)', fontSize: '1.1rem' }}>military_tech</span>
                  <span>8 Cấp đai võ đạo</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-secondary">
                  An toàn: Không xóa dữ liệu hiện có của bạn
                </span>
                <Button
                  type="button"
                  variant="primary"
                  isLoading={seedLoading}
                  disabled={seedLoading}
                  onClick={handleSeedData}
                  leftIcon={<span className="material-icons-round">play_circle_filled</span>}
                  style={{
                    boxShadow: 'var(--shadow-teal-glow)',
                    borderRadius: 'var(--radius-full)'
                  }}
                >
                  Nạp Dữ Liệu Mẫu Ngay
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
