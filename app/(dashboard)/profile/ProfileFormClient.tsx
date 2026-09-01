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
            <CardContent className="pt-6 flex flex-col items-center">
              <div 
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  border: '4px solid var(--surface)',
                  overflow: 'hidden',
                  backgroundColor: 'var(--surface-hover)',
                  boxShadow: 'var(--shadow-sm)',
                  marginBottom: 'var(--space-4)',
                  position: 'relative',
                  cursor: 'pointer'
                }}
                onClick={() => fileInputRef.current?.click()}
                onMouseEnter={(e) => {
                  const overlay = e.currentTarget.querySelector('.avatar-overlay') as HTMLElement;
                  if (overlay) overlay.style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  const overlay = e.currentTarget.querySelector('.avatar-overlay') as HTMLElement;
                  if (overlay) overlay.style.opacity = '0';
                }}
            <CardContent className="pt-8 pb-6 flex flex-col items-center">
              <div className="relative group mb-5">
                <div 
                  className="w-32 h-32 rounded-full border-4 border-surface overflow-hidden bg-surface-hover shadow-lg relative cursor-pointer mx-auto transition-transform hover:scale-105 duration-200"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl font-semibold text-text-muted bg-surface-hover">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 gap-1">
                    <span className="material-icons-round text-white text-2xl">photo_camera</span>
                    <span className="text-white text-xs font-medium">Thay đổi</span>
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
                    className="absolute bottom-1 right-0 bg-danger text-white rounded-full p-1.5 shadow-md hover:bg-danger-hover transition-colors"
                    title="Xóa ảnh đã chọn"
                  >
                    <span className="material-icons-round text-sm block">close</span>
                  </button>
                )}
              </div>
              
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: 'none' }}
              />
              
              <div className="text-center w-full">
                <h3 className="font-bold text-xl text-main">{displayName}</h3>
                <div className="mt-2 mb-5 flex justify-center"><RoleBadge role={profile.role as any} /></div>
                
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full text-sm"
                  leftIcon={<span className="material-icons-round text-sm">cloud_upload</span>}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Tải ảnh mới lên
                </Button>
                {avatarFile && (
                  <div className="text-xs text-secondary mt-2 truncate px-2" title={avatarFile.name}>
                    Đã chọn: <span className="text-main font-medium">{avatarFile.name}</span>
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
                <span className="font-medium text-main capitalize">{profile.role}</span>
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
