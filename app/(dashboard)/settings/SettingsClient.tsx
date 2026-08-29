'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateOrganizationAction } from './actions';
import { useDashboardContext } from '../DashboardProvider';

// UI Components
import { PageHeader } from '@/app/components/ui/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';

export default function SettingsClient() {
  const router = useRouter();
  const { context } = useDashboardContext();
  const organization = context?.organization;
  const currentUserRole = context?.membership?.role;

  const [formData, setFormData] = useState({ 
    name: organization?.name || ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  return (
    <div className="flex-col gap-6 max-w-2xl">
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
                <span className="capitalize font-bold text-main">{organization.subscription_plan}</span> - Trạng thái: <span className="capitalize text-main">{organization.subscription_status}</span>
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
    </div>
  );
}
