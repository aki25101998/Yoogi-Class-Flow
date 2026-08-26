'use client';

import { useState } from 'react';
import { updateOrganizationAction } from './actions';

export default function SettingsClient({ organization, currentUserRole }: any) {
  const [formData, setFormData] = useState({ 
    name: organization.name, 
    slug: organization.slug 
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
      window.location.reload();
    } else {
      setError(res.error || 'Lỗi khi cập nhật');
    }
    
    setIsSubmitting(false);
  };

  return (
    <div style={{ maxWidth: '600px' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>Thông tin tổ chức</h2>
        </div>
        
        <div style={{ padding: '24px' }}>
          {error && <div style={{ color: 'red', marginBottom: '16px', padding: '12px', backgroundColor: '#fee2e2', borderRadius: '4px' }}>{error}</div>}
          {success && <div style={{ color: 'green', marginBottom: '16px', padding: '12px', backgroundColor: '#dcfce7', borderRadius: '4px' }}>{success}</div>}
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Tên tổ chức / Trung tâm</label>
              <input 
                required 
                disabled={!isAdminOrOwner}
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #d1d5db' }} 
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>URL tĩnh (Slug)</label>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ padding: '10px', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRight: 'none', borderRadius: '4px 0 0 4px', color: '#6b7280' }}>
                  https://app.com/
                </span>
                <input 
                  required 
                  disabled={!isAdminOrOwner}
                  value={formData.slug} 
                  onChange={e => setFormData({...formData, slug: e.target.value})} 
                  style={{ flex: 1, padding: '10px', borderRadius: '0 4px 4px 0', border: '1px solid #d1d5db' }} 
                />
              </div>
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>Được dùng để truy cập không gian làm việc của bạn.</p>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Gói dịch vụ (Subscription)</label>
              <div style={{ padding: '10px', backgroundColor: '#f9fafb', borderRadius: '4px', border: '1px solid #d1d5db', color: '#4b5563' }}>
                <span style={{ textTransform: 'capitalize', fontWeight: 'bold' }}>{organization.subscription_plan}</span> - Trạng thái: <span style={{ textTransform: 'capitalize' }}>{organization.subscription_status}</span>
              </div>
            </div>

            {isAdminOrOwner && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  style={{ padding: '10px 24px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontWeight: 'bold', opacity: isSubmitting ? 0.7 : 1 }}
                >
                  {isSubmitting ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            )}
            
            {!isAdminOrOwner && (
              <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '4px', fontSize: '14px' }}>
                Bạn đang xem với tư cách <strong>{currentUserRole}</strong>. Chỉ Admin hoặc Chủ sở hữu mới có thể thay đổi thiết lập này.
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
