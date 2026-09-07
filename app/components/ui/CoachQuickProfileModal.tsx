'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Modal, ModalHeader, ModalBody, ModalFooter } from './Modal';
import { Button } from './Button';
import { Badge } from './Badge';
import { Input, Select } from './Input';
import { useCoachQuickProfile } from '@/hooks/useCoachQuickProfile';
import { useDashboardContext } from '@/app/(dashboard)/DashboardProvider';
import { updateCoachFullProfileAction } from '@/app/(dashboard)/coaches/actions';
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

  const handleSave = () => {
    if (!coachId) return;
    setErrorMsg('');
    setSuccessMsg('');
    
    startTransition(async () => {
      try {
        const res = await updateCoachFullProfileAction(coachId, {
          name: formData.name,
          nickname: formData.nickname,
          email: formData.email,
          phone: formData.phone,
          cccd: formData.cccd,
          role: formData.role,
          status: formData.status,
          photo_url: formData.photo_url
        });

        if (res.success) {
          setSuccessMsg('Đã cập nhật hồ sơ thành công.');
          queryClient.invalidateQueries({ queryKey: ['coach_quick_profile'] });
          queryClient.invalidateQueries({ queryKey: ['coaches'] });
          await refetch();
          
          // Toast success then close edit mode
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
    // Reset to original data
    if (data?.coach) {
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
            <div className="w-20 h-20 bg-surface-hover rounded-full"></div>
            <div className="flex flex-col gap-2">
              <div className="h-6 w-40 bg-surface-hover rounded"></div>
              <div className="h-4 w-24 bg-surface-hover rounded"></div>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div className="h-4 w-3/4 bg-surface-hover rounded"></div>
            <div className="h-4 w-1/2 bg-surface-hover rounded"></div>
            <div className="h-4 w-2/3 bg-surface-hover rounded"></div>
          </div>
          <div className="h-32 bg-surface-hover rounded w-full"></div>
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
      <div className="flex flex-col gap-8 p-1" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
        
        {/* Messages */}
        {errorMsg && (
          <div className="bg-danger-bg text-danger p-3 rounded-md border border-danger/20 flex items-start gap-2 mx-4 mt-4">
            <span className="material-icons-round text-danger" style={{ fontSize: 20 }}>error</span>
            <span className="text-sm font-medium mt-0.5">{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="bg-success-bg text-success p-3 rounded-md border border-success/20 flex items-start gap-2 mx-4 mt-4">
            <span className="material-icons-round text-success" style={{ fontSize: 20 }}>check_circle</span>
            <span className="text-sm font-medium mt-0.5">{successMsg}</span>
          </div>
        )}

        {/* Profile Header section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--border-light)] pb-6 px-4 pt-4">
          <div className="flex items-center gap-5">
            <div className="flex-shrink-0 relative">
              {editMode && formData.photo_url ? (
                <img src={formData.photo_url} alt="Avatar Preview" className="w-20 h-20 rounded-full object-cover border-2 border-[var(--border-light)] shadow-sm" />
              ) : !editMode && data.coach.avatarUrl ? (
                <img src={data.coach.avatarUrl} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-2 border-[var(--border-light)] shadow-sm" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-surface-hover border-2 border-[var(--border-light)] shadow-sm flex items-center justify-center text-secondary">
                  <span className="material-icons-round" style={{ fontSize: 40 }}>person</span>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-2xl font-bold m-0 leading-tight text-main">
                {editMode ? (formData.name || 'Chưa có tên') : data.coach.name}
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={data.coach.role === 'owner' || data.coach.role === 'admin' ? 'primary' : 'default'}>
                  {roleLabels[editMode ? formData.role : data.coach.role] || (editMode ? formData.role : data.coach.role)}
                </Badge>
                <Badge variant={
                  (editMode ? formData.status : data.coach.status) === 'active' ? 'success' : 
                  (editMode ? formData.status : data.coach.status) === 'suspended' ? 'danger' : 'default'
                }>
                  {statusLabels[editMode ? formData.status : data.coach.status] || (editMode ? formData.status : data.coach.status)}
                </Badge>
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

        {/* Thông tin cá nhân */}
        <div className="flex flex-col gap-4 px-4">
          <h4 className="text-sm font-semibold text-secondary uppercase tracking-wider m-0 flex items-center gap-2">
            <span className="material-icons-round" style={{ fontSize: 18 }}>badge</span>
            Thông tin cá nhân
          </h4>
          
          {editMode ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-6 bg-surface p-5 rounded-xl border border-[var(--border-light)] shadow-sm">
              <div className="sm:col-span-2">
                <Input
                  label="URL Ảnh đại diện"
                  value={formData.photo_url}
                  onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>
              <Input
                label="Tên HLV"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <Input
                label="Tên gọi / Nickname"
                value={formData.nickname}
                onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                placeholder="Tên gọi để dễ phân biệt"
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
                <span className="text-secondary bg-surface-hover p-2.5 rounded border border-[var(--border-light)] cursor-not-allowed flex items-center h-[42px]">
                  {data.coach.joinedAt ? formatDate(data.coach.joinedAt) : 'Chưa cập nhật'}
                </span>
                <p className="text-xs text-secondary mt-1.5 italic">Ngày tham gia là dữ liệu hệ thống, không thể sửa.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-6 text-sm bg-surface p-6 rounded-xl border border-[var(--border-light)] shadow-sm">
              <div className="flex flex-col gap-1">
                <span className="text-secondary text-xs uppercase tracking-wider font-semibold">Email</span>
                <span className="font-medium text-main text-base">{data.coach.email !== '-' ? data.coach.email : <span className="text-secondary italic font-normal text-sm">Chưa cập nhật</span>}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-secondary text-xs uppercase tracking-wider font-semibold">Số điện thoại</span>
                <span className="font-medium text-main text-base">{data.coach.phone !== '-' ? data.coach.phone : <span className="text-secondary italic font-normal text-sm">Chưa cập nhật</span>}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-secondary text-xs uppercase tracking-wider font-semibold">CCCD / CMND</span>
                <span className="font-medium text-main text-base">{data.coach.cccd !== '-' ? data.coach.cccd : <span className="text-secondary italic font-normal text-sm">Chưa cập nhật</span>}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-secondary text-xs uppercase tracking-wider font-semibold">Ngày tham gia</span>
                <span className="font-medium text-main text-base">{data.coach.joinedAt ? formatDate(data.coach.joinedAt) : <span className="text-secondary italic font-normal text-sm">Chưa cập nhật</span>}</span>
              </div>
            </div>
          )}
        </div>

        {/* Thông tin quản trị (Role/Status) */}
        {editMode && isAdminOrOwner && (
          <div className="flex flex-col gap-4 px-4">
             <h4 className="text-sm font-semibold text-secondary uppercase tracking-wider m-0 flex items-center gap-2">
              <span className="material-icons-round" style={{ fontSize: 18 }}>admin_panel_settings</span>
              Thông tin quản trị
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-6 bg-surface p-5 rounded-xl border border-[var(--border-light)] shadow-sm">
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

        {/* Lớp đang phụ trách */}
        {!editMode && (
          <div className="flex flex-col gap-4 px-4 pb-4">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-semibold text-secondary uppercase tracking-wider m-0 flex items-center gap-2">
                <span className="material-icons-round" style={{ fontSize: 18 }}>school</span>
                Lớp đang phụ trách
              </h4>
              <Badge variant="default">{data.classes.length} lớp</Badge>
            </div>
            
            {data.classes.length === 0 ? (
              <div className="bg-surface-hover rounded-xl p-8 text-center border border-[var(--border-light)] flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center shadow-sm">
                  <span className="material-icons-round text-secondary" style={{ fontSize: 24 }}>info_outline</span>
                </div>
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
                    className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-surface border border-[var(--border-light)] hover:border-primary hover:bg-[var(--primary-light)] cursor-pointer transition-all shadow-sm"
                  >
                    <div className="flex flex-col gap-1.5 mb-3 sm:mb-0">
                      <div className="flex items-center gap-2">
                        <h5 className="font-semibold text-main text-base m-0 group-hover:text-primary transition-colors">{cls.name}</h5>
                        {cls.status !== 'active' && (
                          <Badge variant="warning" className="scale-90 origin-left">{cls.status}</Badge>
                        )}
                      </div>
                      <div className="flex items-center text-sm text-secondary gap-1.5">
                        <span className="material-icons-round" style={{ fontSize: 16 }}>location_on</span>
                        <span className="truncate max-w-[200px]">{cls.venueName}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-secondary bg-surface-hover py-1.5 px-3 rounded-lg">
                      <div className="flex items-center gap-1.5" title="Vai trò trong lớp">
                        <span className={`material-icons-round ${cls.role === 'HEAD_COACH' ? 'text-primary' : ''}`} style={{ fontSize: 18 }}>
                          {cls.role === 'HEAD_COACH' ? 'star' : 'person'}
                        </span>
                        <span className={cls.role === 'HEAD_COACH' ? 'text-primary font-medium' : ''}>
                          {cls.role === 'HEAD_COACH' ? 'HLV trưởng' : 'HLV phụ'}
                        </span>
                      </div>
                      <div className="w-px h-4 bg-[var(--border-light)]"></div>
                      <div className="flex items-center gap-1.5" title="Học viên active">
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
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={(!isPending) ? onClose : () => {}}>
      {/* Container override width via inline style for Modal body, or use a custom wrap */}
      <div className="max-w-[720px] w-full bg-surface rounded-xl shadow-xl flex flex-col m-auto relative z-50 pointer-events-auto" style={{ maxHeight: '90vh' }}>
        <div className="modal-header border-b border-[var(--border-light)] px-6 py-5 flex justify-between items-start">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold m-0 text-main">{editMode ? 'Chỉnh sửa hồ sơ' : 'Hồ sơ HLV'}</h2>
            <p className="text-sm text-secondary m-0">Thông tin chi tiết và quản lý hồ sơ huấn luyện viên</p>
          </div>
          {!isPending && (
            <button
              type="button"
              onClick={onClose}
              className="modal-close-btn p-1 hover:bg-surface-hover rounded-full transition-colors"
              aria-label="Close modal"
            >
              <span className="material-icons-round text-secondary" style={{ fontSize: '24px' }}>close</span>
            </button>
          )}
        </div>
        
        <div className="flex-1 overflow-hidden p-2">
          {renderContent()}
        </div>
        
        <div className="modal-footer border-t border-[var(--border-light)] px-6 py-4 flex justify-end gap-3 bg-surface-hover/30 rounded-b-xl">
          {editMode ? (
            <>
              <Button variant="secondary" onClick={handleCancel} disabled={isPending}>Hủy</Button>
              <Button variant="primary" onClick={handleSave} isLoading={isPending} leftIcon={!isPending && <span className="material-icons-round" style={{ fontSize: 18 }}>save</span>}>
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
