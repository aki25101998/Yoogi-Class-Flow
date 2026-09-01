'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboardContext } from '../DashboardProvider';
import { updateMyCoachProfile } from '@/app/actions/profile.actions';

// UI Components
import { PageHeader } from '@/app/components/ui/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { RoleBadge } from '@/app/components/ui/RoleBadge';

export default function ProfileFormClient() {
  const router = useRouter();
  const { userData, context, user } = useDashboardContext();
  
  // userData has the coach fields, context.profile has the profile fields.
  // Actually, userData contains everything we need: name, email, avatar_url, phone, cccd, level, membership_number, etc.
  const profile = userData;

  const [formData, setFormData] = useState({ 
    name: profile?.name || '',
    phone: profile?.phone || '',
    cccd: profile?.cccd || '',
    level: profile?.level || '',
    membership_number: profile?.membership_number || '',
  });

  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!profile) {
    return (
      <div className="flex-col gap-6">
        <PageHeader title="Hồ sơ cá nhân" />
        <Card>
          <CardContent className="pt-6">
            <div className="text-secondary">Hồ sơ huấn luyện viên chưa được thiết lập. Vui lòng liên hệ quản trị viên để hoàn tất.</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Kích thước ảnh không được vượt quá 2MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Vui lòng chọn file hình ảnh (jpg, png, webp...)');
        return;
      }
      
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);
    
    const formDataObj = new FormData();
    formDataObj.append('name', formData.name);
    formDataObj.append('phone', formData.phone);
    formDataObj.append('cccd', formData.cccd);
    formDataObj.append('level', formData.level);
    formDataObj.append('membership_number', formData.membership_number);
    
    if (avatarFile) {
      formDataObj.append('avatar', avatarFile);
    }
    
    const res = await updateMyCoachProfile(formDataObj);
    
    if (res.success) {
      setSuccess('Đã cập nhật hồ sơ cá nhân thành công!');
      if (res.avatarUrl) {
        setAvatarPreview(res.avatarUrl);
      }
      // Reset file input
      setAvatarFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      setTimeout(() => setSuccess(''), 3000);
      router.refresh();
    } else {
      setError(res.error || 'Lỗi khi cập nhật hồ sơ');
    }
    
    setIsSubmitting(false);
  };

  const displayName = profile.name || user?.user_metadata?.full_name || 'Người dùng';

  return (
    <div className="flex-col gap-6 max-w-4xl">
      <PageHeader 
        title="Hồ sơ cá nhân" 
        description="Quản lý thông tin cá nhân và hồ sơ huấn luyện viên của bạn."
      />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-6)' }}>
        {/* Cột trái: Thông tin hiển thị */}
        <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <Card>
            <CardContent style={{ padding: 'var(--space-8) var(--space-6)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div 
                style={{
                  position: 'relative',
                  marginBottom: 'var(--space-5)',
                  display: 'flex',
                  justifyContent: 'center'
                }}
              >
                <div 
                  style={{
                    width: '128px',
                    height: '128px',
                    borderRadius: '50%',
                    border: '4px solid var(--surface)',
                    overflow: 'hidden',
                    backgroundColor: 'var(--surface-hover)',
                    boxShadow: 'var(--shadow-lg)',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'transform 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    const overlay = e.currentTarget.querySelector('.avatar-overlay') as HTMLElement;
                    if (overlay) overlay.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    const overlay = e.currentTarget.querySelector('.avatar-overlay') as HTMLElement;
                    if (overlay) overlay.style.opacity = '0';
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  
                  <div 
                    className="avatar-overlay"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: 'rgba(0, 0, 0, 0.6)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0,
                      transition: 'opacity 0.2s',
                      gap: '4px'
                    }}
                  >
                    <span className="material-icons-round" style={{ color: 'white', fontSize: '24px' }}>photo_camera</span>
                    <span style={{ color: 'white', fontSize: '12px', fontWeight: 500 }}>Thay đổi</span>
                  </div>
                </div>
                
                {avatarFile && (
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAvatarFile(null);
                      setAvatarPreview(profile?.avatar_url || null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    style={{
                      position: 'absolute',
                      bottom: '4px',
                      right: '0',
                      backgroundColor: 'var(--danger)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      padding: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: 'var(--shadow-md)',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--danger-hover)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--danger)'}
                    title="Xóa ảnh đã chọn"
                  >
                    <span className="material-icons-round" style={{ fontSize: '16px' }}>close</span>
                  </button>
                )}
              </div>
              
              <input 
                type="file" 
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleAvatarChange}
              />
              
              <div style={{ width: '100%', textAlign: 'center' }}>
                <h3 style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--text-main)', marginBottom: '8px' }}>{displayName}</h3>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                  <RoleBadge role={profile.role as any} />
                </div>
                
                <Button 
                  type="button" 
                  variant="outline" 
                  style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
                  leftIcon={<span className="material-icons-round" style={{ fontSize: '16px' }}>cloud_upload</span>}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Tải ảnh mới lên
                </Button>
                {avatarFile && (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 8px' }} title={avatarFile.name}>
                    Đã chọn: <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{avatarFile.name}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-light pb-3">
              <CardTitle className="text-sm">Thông tin tài khoản</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col gap-3 text-sm">
              <div className="flex justify-between border-b border-light pb-2">
                <span className="text-secondary">Email</span>
                <span className="font-medium text-main">{profile.email || user?.email}</span>
              </div>
              <div className="flex justify-between border-b border-light pb-2">
                <span className="text-secondary">Vai trò</span>
                <span className="font-medium text-main uppercase">{profile.role}</span>
              </div>
              <div className="flex justify-between border-b border-light pb-2">
                <span className="text-secondary">Cơ sở</span>
                <span className="font-medium text-main">{context?.organization?.name || '---'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Trạng thái</span>
                <span className={`font-medium ${profile.status === 'active' ? 'text-success' : 'text-danger'}`}>
                  {profile.status === 'active' ? 'Đang hoạt động' : 'Đã khóa'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cột phải: Form chỉnh sửa */}
        <div style={{ flex: '2 1 500px' }}>
          <Card>
            <CardHeader className="border-b border-light pb-4">
              <CardTitle>Chỉnh sửa hồ sơ</CardTitle>
            </CardHeader>
            
            <CardContent className="pt-6">
              {error && <div className="text-danger mb-4 text-sm bg-danger-bg p-3 rounded-md">{error}</div>}
              {success && <div className="text-success mb-4 text-sm bg-success-bg p-3 rounded-md">{success}</div>}
              
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-6)' }}>
                  <div style={{ flex: '1 1 calc(50% - 12px)' }}>
                    <Input 
                      label="Họ và tên"
                      required 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                    />
                  </div>
                  <div style={{ flex: '1 1 calc(50% - 12px)' }}>
                    <Input 
                      label="Số điện thoại"
                      value={formData.phone} 
                      onChange={e => setFormData({...formData, phone: e.target.value})} 
                    />
                  </div>
                  <div style={{ flex: '1 1 calc(50% - 12px)' }}>
                    <Input 
                      label="Số CCCD"
                      value={formData.cccd} 
                      onChange={e => setFormData({...formData, cccd: e.target.value})} 
                    />
                  </div>
                  <div style={{ flex: '1 1 calc(50% - 12px)' }}>
                    <Input 
                      label="Mã hội viên"
                      value={formData.membership_number} 
                      onChange={e => setFormData({...formData, membership_number: e.target.value})} 
                    />
                  </div>
                  <div style={{ flex: '1 1 calc(50% - 12px)' }}>
                    <Input 
                      label="Cấp đai"
                      value={formData.level} 
                      onChange={e => setFormData({...formData, level: e.target.value})} 
                    />
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-light flex justify-end gap-3">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => {
                      setFormData({
                        name: profile?.name || '',
                        phone: profile?.phone || '',
                        cccd: profile?.cccd || '',
                        level: profile?.level || '',
                        membership_number: profile?.membership_number || '',
                      });
                      setAvatarFile(null);
                      setAvatarPreview(profile?.avatar_url || null);
                      setError('');
                      setSuccess('');
                    }}
                    disabled={isSubmitting}
                  >
                    Hủy
                  </Button>
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
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
