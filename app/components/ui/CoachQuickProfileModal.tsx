'use client';

import React, { useState, useEffect, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from './Modal';
import { Button } from './Button';
import { Badge } from './Badge';
import { Input, Select } from './Input';
import { useCoachQuickProfile } from '@/hooks/useCoachQuickProfile';
import { useDashboardContext } from '@/app/(dashboard)/DashboardProvider';
import { updateCoachFullProfileAction, uploadAdminCoachAvatarAction } from '@/app/(dashboard)/coaches/actions';
import { OrganizationRole } from '@/types/organization';
import { useQueryClient } from '@tanstack/react-query';

interface CoachQuickProfileModalProps {
  coachId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const roleLabels: Record<string, string> = {
  owner: 'Chủ tổ chức',
  admin: 'Quản trị viên',
  head_coach: 'HLV trưởng',
  assistant_coach: 'HLV phụ'
};

const statusLabels: Record<string, string> = {
  active: 'Đang hoạt động',
  suspended: 'Đã tạm ngưng',
  inactive: 'Không hoạt động'
};

export function CoachQuickProfileModal({ coachId, isOpen, onClose }: CoachQuickProfileModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { context } = useDashboardContext();
  const organizationId = context?.organization?.id;
  const currentUserRole = context?.membership?.role;
  const isAdminOrOwner = currentUserRole === 'admin' || currentUserRole === 'owner';

  const { data, isLoading, isError, refetch } = useCoachQuickProfile(organizationId, coachId);
  
  const [isPending, startTransition] = useTransition();
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    nickname: '',
    email: '',
    phone: '',
    cccd: '',
    role: 'assistant_coach' as OrganizationRole,
    status: 'active',
    photo_url: ''
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Avatar upload states
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync data to form when editMode opens
  useEffect(() => {
    if (isOpen && data?.coach && !editMode) {
      setFormData({
        name: data.coach.originalName !== '-' ? data.coach.originalName : '',
        nickname: data.coach.nickname || '',
        email: data.coach.email !== '-' ? data.coach.email : '',
        phone: data.coach.phone !== '-' ? data.coach.phone : '',
        cccd: data.coach.cccd !== '-' ? data.coach.cccd : '',
        role: (data.coach.role as OrganizationRole) || 'assistant_coach',
        status: data.coach.status || 'active',
        photo_url: data.coach.avatarUrl || ''
      });
      setAvatarPreview(data.coach.avatarUrl || null);
      setAvatarFile(null);
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, data, editMode]);

  // Reset states on close
  useEffect(() => {
    if (!isOpen) {
      setEditMode(false);
      setErrorMsg('');
      setSuccessMsg('');
      setAvatarFile(null);
      setAvatarPreview(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setErrorMsg('Kích thước ảnh không được vượt quá 2MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setErrorMsg('Vui lòng chọn file hình ảnh (jpg, png, webp)');
        return;
      }
      
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setErrorMsg('');
    }
  };

  const handleSave = () => {
    if (!coachId) return;
    setErrorMsg('');
    setSuccessMsg('');
    
    startTransition(async () => {
      try {
        let finalPhotoUrl = formData.photo_url;

        // 1. Upload avatar if changed
        if (avatarFile) {
          const formDataUpload = new FormData();
          formDataUpload.append('avatar', avatarFile);
          const uploadRes = await uploadAdminCoachAvatarAction(coachId, formDataUpload);
          if (uploadRes.success && uploadRes.avatarUrl) {
            finalPhotoUrl = uploadRes.avatarUrl;
          } else {
            setErrorMsg(uploadRes.error || 'Lỗi khi tải ảnh lên');
            return;
          }
        }

        // 2. Update profile
        const res = await updateCoachFullProfileAction(coachId, {
          name: formData.name,
          nickname: formData.nickname,
          email: formData.email,
          phone: formData.phone,
          cccd: formData.cccd,
          role: formData.role,
          status: formData.status,
          photo_url: finalPhotoUrl
        });

        if (res.success) {
          setSuccessMsg('Đã cập nhật hồ sơ thành công.');
          queryClient.invalidateQueries({ queryKey: ['coach_quick_profile'] });
          queryClient.invalidateQueries({ queryKey: ['coaches'] });
          await refetch();
          
          setTimeout(() => {
            setEditMode(false);
            setSuccessMsg('');
          }, 1500);
        } else {
          setErrorMsg(res.error || 'Có lỗi xảy ra khi lưu thay đổi.');
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Lỗi hệ thống.');
      }
    });
  };

  const handleCancel = () => {
    setEditMode(false);
    setErrorMsg('');
    setSuccessMsg('');
    setAvatarFile(null);
    if (data?.coach) {
      setAvatarPreview(data.coach.avatarUrl || null);
      setFormData({
        name: data.coach.originalName !== '-' ? data.coach.originalName : '',
        nickname: data.coach.nickname || '',
        email: data.coach.email !== '-' ? data.coach.email : '',
        phone: data.coach.phone !== '-' ? data.coach.phone : '',
        cccd: data.coach.cccd !== '-' ? data.coach.cccd : '',
        role: (data.coach.role as OrganizationRole) || 'assistant_coach',
        status: data.coach.status || 'active',
        photo_url: data.coach.avatarUrl || ''
      });
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col gap-8 animate-pulse">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 bg-surface-hover rounded-2xl"></div>
            <div className="flex flex-col gap-3">
              <div className="h-6 w-48 bg-surface-hover rounded"></div>
              <div className="h-4 w-32 bg-surface-hover rounded"></div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="h-12 bg-surface-hover rounded"></div>
            <div className="h-12 bg-surface-hover rounded"></div>
            <div className="h-12 bg-surface-hover rounded"></div>
            <div className="h-12 bg-surface-hover rounded"></div>
          </div>
        </div>
      );
    }

    if (isError || !data) {
      return (
        <div className="text-center p-8 bg-surface-hover/50 rounded-xl border border-[var(--border-light)]">
          <span className="material-icons-round text-danger mb-3" style={{ fontSize: 36 }}>error_outline</span>
          <h3 className="text-lg font-semibold text-main mb-1">Không thể tải thông tin</h3>
          <p className="text-secondary text-sm">Đã có lỗi xảy ra khi lấy dữ liệu HLV. Vui lòng thử lại.</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-8">
        {/* Messages */}
        {errorMsg && (
          <div className="bg-danger-bg text-danger p-4 rounded-xl border border-danger/20 flex items-start gap-3">
            <span className="material-icons-round text-danger mt-0.5" style={{ fontSize: 20 }}>error</span>
            <span className="text-sm font-medium leading-relaxed">{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="bg-success-bg text-success p-4 rounded-xl border border-success/20 flex items-start gap-3">
            <span className="material-icons-round text-success mt-0.5" style={{ fontSize: 20 }}>check_circle</span>
            <span className="text-sm font-medium leading-relaxed">{successMsg}</span>
          </div>
        )}

        {/* Profile Identity - Modern Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 bg-surface rounded-2xl">
          <div className="flex items-center gap-5">
            <div className="flex-shrink-0 relative">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-20 h-20 rounded-2xl object-cover shadow-sm border border-[var(--border-light)]" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-surface-hover border border-[var(--border-light)] shadow-sm flex items-center justify-center text-secondary">
                  <span className="material-icons-round" style={{ fontSize: 40 }}>person</span>
                </div>
              )}
              {((editMode ? formData.status : data.coach.status) === 'active') && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-success border-2 border-surface rounded-full"></div>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <h3 className="text-2xl font-bold m-0 leading-tight text-main tracking-tight truncate max-w-[200px] sm:max-w-[360px]">
                {editMode ? (formData.name || 'Chưa có tên') : data.coach.name}
              </h3>
              <div className="flex items-center gap-2.5 flex-wrap text-[15px]">
                <span className={`font-medium ${data.coach.role === 'owner' || data.coach.role === 'admin' ? 'text-primary' : 'text-secondary'}`}>
                  {roleLabels[editMode ? formData.role : data.coach.role]}
                </span>
                <span className="text-[var(--border-light)]">|</span>
                <span className={
                  (editMode ? formData.status : data.coach.status) === 'active' ? 'text-success font-medium flex items-center gap-1.5' : 
                  (editMode ? formData.status : data.coach.status) === 'suspended' ? 'text-danger font-medium flex items-center gap-1.5' : 'text-secondary font-medium flex items-center gap-1.5'
                }>
                  <span className="text-[10px]">●</span>
                  {statusLabels[editMode ? formData.status : data.coach.status]}
                </span>
              </div>
            </div>
          </div>
          
          {isAdminOrOwner && !editMode && (
            <Button 
              variant="outline" 
              onClick={() => setEditMode(true)}
              className="!px-3 !py-2 !text-sm bg-surface-hover/50 hover:bg-surface-hover border-transparent hover:border-[var(--border-light)]"
            >
              <span className="material-icons-round mr-1.5" style={{ fontSize: 16 }}>edit</span>
              Chỉnh sửa
            </Button>
          )}
        </div>

        {/* Thông tin cá nhân */}
        <div className="flex flex-col gap-5">
          <h4 className="text-xs font-bold text-secondary uppercase tracking-widest m-0 flex items-center gap-2">
            Thông tin cá nhân
            <div className="h-px bg-[var(--border-light)] flex-1"></div>
          </h4>
          
          {editMode ? (
            <div className="flex flex-col gap-6">
              {/* Avatar Upload UI */}
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-main">Ảnh đại diện</span>
                <div className="flex items-center gap-4 bg-surface-hover/30 p-4 rounded-xl border border-[var(--border-light)]">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Preview" className="w-16 h-16 rounded-xl object-cover border border-[var(--border-light)]" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-surface-hover border border-[var(--border-light)] flex items-center justify-center text-secondary">
                      <span className="material-icons-round">person</span>
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" className="!py-1.5 !px-3 !text-sm" onClick={() => fileInputRef.current?.click()}>
                        Thay ảnh
                      </Button>
                      {avatarPreview && (
                        <Button type="button" variant="secondary" className="!py-1.5 !px-3 !text-sm" onClick={() => {
                          setAvatarPreview(null);
                          setAvatarFile(null);
                          setFormData(prev => ({ ...prev, photo_url: '' }));
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}>
                          Xóa ảnh
                        </Button>
                      )}
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/jpeg,image/png,image/webp" 
                      onChange={handleAvatarChange} 
                    />
                  </div>
                </div>
              </div>

              {/* 2-Column Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Input
                  label="Tên HLV"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                <Input
                  label="Tên gọi / Nickname"
                  value={formData.nickname}
                  onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                />
                <Input
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <Input
                  label="Số điện thoại"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
                <Input
                  label="CCCD / CMND"
                  value={formData.cccd}
                  onChange={(e) => setFormData({ ...formData, cccd: e.target.value })}
                />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-main mb-1.5">Ngày tham gia</span>
                  <span className="text-secondary bg-surface-hover/50 px-3 py-2 rounded-lg border border-transparent cursor-not-allowed flex items-center h-[42px] text-sm">
                    {data.coach.joinedAt ? formatDate(data.coach.joinedAt) : 'Chưa cập nhật'}
                  </span>
                  <p className="text-[11px] text-secondary/70 mt-1.5">Dữ liệu hệ thống, không thể sửa.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs uppercase font-semibold tracking-wide text-secondary/70">Email</span>
                <span className="font-medium text-main text-[15px]">
                  {data.coach.email !== '-' ? data.coach.email : <span className="text-secondary/50 italic font-normal">Chưa cập nhật</span>}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs uppercase font-semibold tracking-wide text-secondary/70">Số điện thoại</span>
                <span className="font-medium text-main text-[15px]">
                  {data.coach.phone !== '-' ? data.coach.phone : <span className="text-secondary/50 italic font-normal">Chưa cập nhật</span>}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs uppercase font-semibold tracking-wide text-secondary/70">CCCD / CMND</span>
                <span className="font-medium text-main text-[15px]">
                  {data.coach.cccd !== '-' ? data.coach.cccd : <span className="text-secondary/50 italic font-normal">Chưa cập nhật</span>}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs uppercase font-semibold tracking-wide text-secondary/70">Ngày tham gia</span>
                <span className="font-medium text-main text-[15px]">
                  {data.coach.joinedAt ? formatDate(data.coach.joinedAt) : <span className="text-secondary/50 italic font-normal">Chưa cập nhật</span>}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Thông tin quản trị */}
        {editMode && isAdminOrOwner && (
          <div className="flex flex-col gap-5">
            <h4 className="text-xs font-bold text-secondary uppercase tracking-widest m-0 flex items-center gap-2">
              Thông tin quản trị
              <div className="h-px bg-[var(--border-light)] flex-1"></div>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Select
                label="Vai trò"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as OrganizationRole })}
                options={[
                  { value: 'assistant_coach', label: 'HLV phụ' },
                  { value: 'head_coach', label: 'HLV trưởng' },
                  ...(currentUserRole === 'owner' ? [{ value: 'admin', label: 'Quản trị viên' }] : [])
                ]}
                disabled={data.coach.role === 'owner' && currentUserRole !== 'owner'}
              />
              <Select
                label="Trạng thái hệ thống"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                options={[
                  { value: 'active', label: 'Đang hoạt động' },
                  { value: 'suspended', label: 'Đã tạm ngưng' }
                ]}
                disabled={data.coach.role === 'owner'}
              />
            </div>
          </div>
        )}

        {/* Lớp đang phụ trách (chỉ hiện khi xem) */}
        {!editMode && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-secondary uppercase tracking-widest m-0 flex items-center gap-2 flex-1">
                Lớp đang phụ trách
                <div className="h-px bg-[var(--border-light)] flex-1 mr-4"></div>
              </h4>
              <Badge variant="default" className="text-xs !py-0.5 !px-2 bg-surface-hover text-secondary border-[var(--border-light)] font-semibold">
                {data.classes.length} LỚP
              </Badge>
            </div>
            
            {data.classes.length === 0 ? (
              <div className="bg-surface-hover/30 rounded-2xl p-8 text-center border border-[var(--border-light)] border-dashed flex flex-col items-center gap-3">
                <span className="material-icons-round text-secondary/50" style={{ fontSize: 32 }}>event_busy</span>
                <p className="text-secondary text-[15px] m-0">HLV chưa được phân công lớp nào.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {data.classes.map((cls) => (
                  <div 
                    key={cls.id} 
                    onClick={() => {
                      onClose();
                      router.push(`/training?classId=${cls.id}`);
                    }}
                    className="group relative flex flex-col p-4 rounded-2xl bg-surface-hover/30 border border-[var(--border-light)] hover:border-primary/50 hover:bg-surface hover:shadow-md cursor-pointer transition-all duration-200"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h5 className="font-bold text-main text-base m-0 pr-4 group-hover:text-primary transition-colors line-clamp-1">{cls.name}</h5>
                      <Badge 
                        variant={cls.role === 'HEAD_COACH' ? 'primary' : 'secondary'} 
                        className={`flex-shrink-0 text-[10px] uppercase tracking-wider font-bold !py-1 !px-2.5 ${cls.role === 'HEAD_COACH' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-surface-hover text-secondary border-[var(--border-light)]'}`}
                      >
                        {cls.role === 'HEAD_COACH' ? 'HLV TRƯỞNG' : 'HLV PHỤ'}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-sm text-secondary">
                      <div className="flex items-center gap-2">
                        <span className="material-icons-round text-secondary/70" style={{ fontSize: 16 }}>location_on</span>
                        <span className="truncate max-w-[200px]">{cls.venueName}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="material-icons-round text-secondary/70" style={{ fontSize: 16 }}>groups</span>
                        <span><strong className="text-main font-semibold">{cls.studentCount}</strong> học viên</span>
                      </div>

                      {cls.status !== 'active' && (
                        <div className="flex items-center gap-2 text-warning">
                          <span className="material-icons-round" style={{ fontSize: 16 }}>warning_amber</span>
                          <span className="font-medium">{cls.status}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={(!isPending) ? onClose : () => {}}>
      <div className="max-w-[640px] w-full bg-surface rounded-2xl shadow-2xl border border-[var(--border-light)] flex flex-col m-auto relative z-50 pointer-events-auto overflow-hidden" style={{ maxHeight: '90vh' }}>
        {/* Simple Header */}
        <div className="flex-shrink-0 px-6 py-5 flex justify-between items-center bg-surface z-10">
          <h2 className="text-lg font-bold m-0 text-main tracking-tight">{editMode ? 'Chỉnh sửa hồ sơ HLV' : 'Hồ sơ HLV'}</h2>
          {!isPending && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-hover text-secondary transition-colors"
              aria-label="Đóng"
            >
              <span className="material-icons-round text-[20px]">close</span>
            </button>
          )}
        </div>
        
        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
          {renderContent()}
        </div>
        
        {/* Sticky Footer */}
        <div className="flex-shrink-0 border-t border-[var(--border-light)] px-6 py-4 flex justify-end gap-3 bg-surface z-10">
          {editMode ? (
            <>
              <Button variant="secondary" onClick={handleCancel} disabled={isPending}>Hủy</Button>
              <Button variant="primary" onClick={handleSave} isLoading={isPending} disabled={isPending} leftIcon={!isPending && <span className="material-icons-round" style={{ fontSize: 18 }}>save</span>}>
                Lưu thay đổi
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={onClose} className="!px-6">Đóng</Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
