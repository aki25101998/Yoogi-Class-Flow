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
        <div className="flex flex-col gap-6 animate-pulse p-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-surface-hover rounded-full"></div>
            <div className="flex flex-col gap-2">
              <div className="h-5 w-40 bg-surface-hover rounded"></div>
              <div className="h-3 w-24 bg-surface-hover rounded"></div>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div className="h-4 w-3/4 bg-surface-hover rounded"></div>
            <div className="h-4 w-1/2 bg-surface-hover rounded"></div>
          </div>
        </div>
      );
    }

    if (isError || !data) {
      return (
        <div className="text-center p-6">
          <span className="material-icons-round text-danger mb-2" style={{ fontSize: 32 }}>error_outline</span>
          <p className="text-danger">Không thể tải thông tin HLV.</p>
          <p className="text-secondary text-sm mt-1">Vui lòng thử lại.</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col pb-4">
        {/* Messages */}
        {errorMsg && (
          <div className="bg-danger-bg text-danger p-3 rounded-md border border-danger/20 flex items-start gap-2 mx-6 mt-5">
            <span className="material-icons-round text-danger" style={{ fontSize: 20 }}>error</span>
            <span className="text-sm font-medium mt-0.5">{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="bg-success-bg text-success p-3 rounded-md border border-success/20 flex items-start gap-2 mx-6 mt-5">
            <span className="material-icons-round text-success" style={{ fontSize: 20 }}>check_circle</span>
            <span className="text-sm font-medium mt-0.5">{successMsg}</span>
          </div>
        )}

        {/* Profile Identity - Compact Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--border-light)] px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-16 h-16 rounded-full object-cover border-2 border-[var(--border-light)] shadow-sm" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-surface-hover border-2 border-[var(--border-light)] shadow-sm flex items-center justify-center text-secondary">
                  <span className="material-icons-round" style={{ fontSize: 32 }}>person</span>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-xl font-bold m-0 leading-tight text-main truncate max-w-[200px] sm:max-w-[400px]">
                {editMode ? (formData.name || 'Chưa có tên') : data.coach.name}
              </h3>
              <div className="flex items-center gap-2 flex-wrap text-sm">
                <span className={`font-medium ${data.coach.role === 'owner' || data.coach.role === 'admin' ? 'text-primary' : 'text-secondary'}`}>
                  {roleLabels[editMode ? formData.role : data.coach.role]}
                </span>
                <span className="text-secondary">•</span>
                <span className={
                  (editMode ? formData.status : data.coach.status) === 'active' ? 'text-success font-medium' : 
                  (editMode ? formData.status : data.coach.status) === 'suspended' ? 'text-danger font-medium' : 'text-secondary font-medium'
                }>
                  {statusLabels[editMode ? formData.status : data.coach.status]}
                </span>
              </div>
            </div>
          </div>
          
          {isAdminOrOwner && !editMode && (
            <Button 
              variant="outline" 
              onClick={() => setEditMode(true)}
              leftIcon={<span className="material-icons-round" style={{ fontSize: 18 }}>edit</span>}
            >
              Chỉnh sửa
            </Button>
          )}
        </div>

        {/* Scrollable Body Fields */}
        <div className="flex flex-col gap-6 px-6 py-5">
          {/* Thông tin cá nhân */}
          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-bold text-secondary uppercase tracking-wider m-0">Thông tin cá nhân</h4>
            
            {editMode ? (
              <div className="flex flex-col gap-5">
                {/* Avatar Upload UI */}
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-main">Ảnh đại diện</span>
                  <div className="flex items-center gap-4 bg-surface p-4 rounded-lg border border-[var(--border-light)]">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Preview" className="w-16 h-16 rounded-full object-cover border border-[var(--border-light)]" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-surface-hover border border-[var(--border-light)] flex items-center justify-center text-secondary">
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
                    <span className="text-secondary bg-surface-hover px-3 py-2 rounded-md border border-[var(--border-light)] cursor-not-allowed flex items-center h-[42px] text-sm">
                      {data.coach.joinedAt ? formatDate(data.coach.joinedAt) : 'Chưa cập nhật'}
                    </span>
                    <p className="text-xs text-secondary mt-1.5 italic">Ngày tham gia là dữ liệu hệ thống, không thể sửa.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-sm">
                <div className="flex flex-col gap-1">
                  <span className="text-secondary text-xs uppercase font-medium">Email</span>
                  <span className="font-medium text-main">{data.coach.email !== '-' ? data.coach.email : <span className="text-secondary italic font-normal text-sm">Chưa cập nhật</span>}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-secondary text-xs uppercase font-medium">Số điện thoại</span>
                  <span className="font-medium text-main">{data.coach.phone !== '-' ? data.coach.phone : <span className="text-secondary italic font-normal text-sm">Chưa cập nhật</span>}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-secondary text-xs uppercase font-medium">CCCD / CMND</span>
                  <span className="font-medium text-main">{data.coach.cccd !== '-' ? data.coach.cccd : <span className="text-secondary italic font-normal text-sm">Chưa cập nhật</span>}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-secondary text-xs uppercase font-medium">Ngày tham gia</span>
                  <span className="font-medium text-main">{data.coach.joinedAt ? formatDate(data.coach.joinedAt) : <span className="text-secondary italic font-normal text-sm">Chưa cập nhật</span>}</span>
                </div>
              </div>
            )}
          </div>

          {/* Thông tin quản trị */}
          {editMode && isAdminOrOwner && (
            <div className="flex flex-col gap-4 mt-2">
              <h4 className="text-xs font-bold text-secondary uppercase tracking-wider m-0">Thông tin quản trị</h4>
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
            <div className="flex flex-col gap-4 mt-2">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-secondary uppercase tracking-wider m-0">Lớp đang phụ trách</h4>
                <Badge variant="default">{data.classes.length} lớp</Badge>
              </div>
              
              {data.classes.length === 0 ? (
                <div className="bg-surface-hover rounded-xl p-6 text-center border border-[var(--border-light)] flex flex-col items-center gap-2">
                  <span className="material-icons-round text-secondary" style={{ fontSize: 24 }}>info_outline</span>
                  <p className="text-secondary text-sm m-0">HLV chưa được phân công lớp nào.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {data.classes.map((cls) => (
                    <div 
                      key={cls.id} 
                      onClick={() => {
                        onClose();
                        router.push(`/training?classId=${cls.id}`);
                      }}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-surface border border-[var(--border-light)] hover:border-primary cursor-pointer transition-colors"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <h5 className="font-medium text-main text-[15px] m-0 group-hover:text-primary transition-colors">{cls.name}</h5>
                          {cls.status !== 'active' && (
                            <Badge variant="warning" className="scale-90 origin-left">{cls.status}</Badge>
                          )}
                        </div>
                        <div className="flex items-center text-sm text-secondary gap-1.5">
                          <span className="material-icons-round" style={{ fontSize: 16 }}>location_on</span>
                          <span className="truncate max-w-[200px]">{cls.venueName}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 text-sm text-secondary mt-2 sm:mt-0">
                        <div className="flex items-center gap-1">
                          <span className={`material-icons-round ${cls.role === 'HEAD_COACH' ? 'text-primary' : ''}`} style={{ fontSize: 18 }}>
                            {cls.role === 'HEAD_COACH' ? 'star' : 'person'}
                          </span>
                          <span className={cls.role === 'HEAD_COACH' ? 'text-primary font-medium' : ''}>
                            {cls.role === 'HEAD_COACH' ? 'HLV trưởng' : 'HLV phụ'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="material-icons-round" style={{ fontSize: 18 }}>groups</span>
                          <span className="font-medium text-main">{cls.studentCount}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={(!isPending) ? onClose : () => {}}>
      <div className="max-w-[760px] w-full bg-surface rounded-xl shadow-xl flex flex-col m-auto relative z-50 pointer-events-auto overflow-hidden" style={{ maxHeight: '90vh' }}>
        {/* Sticky Header */}
        <div className="flex-shrink-0 modal-header border-b border-[var(--border-light)] px-6 py-4 flex justify-between items-center bg-surface z-10">
          <h2 className="text-lg font-bold m-0 text-main">{editMode ? 'Chỉnh sửa hồ sơ' : 'Hồ sơ HLV'}</h2>
          {!isPending && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-surface-hover rounded-full transition-colors flex items-center justify-center text-secondary"
              aria-label="Đóng"
            >
              <span className="material-icons-round text-xl">close</span>
            </button>
          )}
        </div>
        
        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto">
          {renderContent()}
        </div>
        
        {/* Sticky Footer */}
        <div className="flex-shrink-0 modal-footer border-t border-[var(--border-light)] px-6 py-4 flex justify-end gap-3 bg-surface z-10">
          {editMode ? (
            <>
              <Button variant="secondary" onClick={handleCancel} disabled={isPending}>Hủy</Button>
              <Button variant="primary" onClick={handleSave} isLoading={isPending} disabled={isPending} leftIcon={!isPending && <span className="material-icons-round" style={{ fontSize: 18 }}>save</span>}>
                Lưu thay đổi
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={onClose}>Đóng</Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
