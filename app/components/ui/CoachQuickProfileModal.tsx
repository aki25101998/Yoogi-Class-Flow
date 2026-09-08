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
import styles from './CoachQuickProfileModal.module.css';

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
        <div className="text-center p-6 text-muted">
          Đang tải thông tin...
        </div>
      );
    }

    if (isError || !data) {
      return (
        <div className="text-center p-6">
          <p className="text-danger">Không thể tải thông tin HLV.</p>
          <p className="text-secondary mt-2">Vui lòng thử lại.</p>
        </div>
      );
    }

    const currentStatus = editMode ? formData.status : data.coach.status;
    const currentRole = editMode ? formData.role : data.coach.role;
    
    // Determine status class
    let statusClass = styles.statusInactive;
    if (currentStatus === 'active') statusClass = styles.statusActive;
    if (currentStatus === 'suspended') statusClass = styles.statusSuspended;

    return (
      <div className={styles.container}>
        {errorMsg && (
          <div className={styles.errorBox}>
            <span className="material-icons-round" style={{ fontSize: 20 }}>error</span>
            <span>{errorMsg}</span>
          </div>
        )}
        
        {successMsg && (
          <div className={styles.successBox}>
            <span className="material-icons-round" style={{ fontSize: 20 }}>check_circle</span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* 1. PROFILE IDENTITY */}
        <div className={styles.profileIdentity}>
          <div className={styles.profileInfo}>
            <div className={styles.avatarWrapper}>
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className={styles.avatarImage} />
              ) : (
                <span className="material-icons-round" style={{ fontSize: 32 }}>person</span>
              )}
            </div>
            
            <div className={styles.profileDetails}>
              <h3 className={styles.profileName}>
                {editMode ? (formData.name || 'Chưa có tên') : data.coach.originalName}
              </h3>
              <div className={styles.profileMeta}>
                <span>{roleLabels[currentRole] || 'Chưa xác định'}</span>
                <span className={styles.dotSeparator}>•</span>
                <span className={`${styles.statusIndicator} ${statusClass}`}>
                  <span className={styles.statusDot}></span>
                  {statusLabels[currentStatus] || currentStatus}
                </span>
              </div>
            </div>
          </div>
          
          {isAdminOrOwner && !editMode && (
            <div className={styles.actionWrapper}>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setEditMode(true)}
                leftIcon={<span className="material-icons-round" style={{ fontSize: 16 }}>edit</span>}
              >
                Chỉnh sửa
              </Button>
            </div>
          )}
        </div>

        {/* 2. PERSONAL INFORMATION */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h4 className={styles.sectionTitle}>Thông tin cá nhân</h4>
            <div className={styles.sectionDivider}></div>
          </div>
          
          {editMode ? (
            <div className={styles.infoGrid}>
              <div className="flex flex-col gap-2">
                <span className={styles.infoLabel}>Ảnh đại diện</span>
                <div className={styles.avatarUploadRow}>
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Preview" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 48, height: 48, borderRadius: 8, background: 'var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                      <span className="material-icons-round">person</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                      Thay ảnh
                    </Button>
                    {avatarPreview && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => {
                        setAvatarPreview(null);
                        setAvatarFile(null);
                        setFormData(prev => ({ ...prev, photo_url: '' }));
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}>
                        Xóa ảnh
                      </Button>
                    )}
                  </div>
                  <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleAvatarChange} />
                </div>
              </div>
              <div></div> {/* Empty div to force correct grid flow if needed, but it's ok */}
              
              <Input label="Tên HLV" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              <Input label="Tên gọi / Nickname" value={formData.nickname} onChange={(e) => setFormData({ ...formData, nickname: e.target.value })} />
              <Input label="Email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              <Input label="Số điện thoại" type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              <Input label="CCCD / CMND" value={formData.cccd} onChange={(e) => setFormData({ ...formData, cccd: e.target.value })} />
              
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Ngày tham gia</span>
                <div className={styles.readonlyField}>
                  {data.coach.joinedAt ? formatDate(data.coach.joinedAt) : 'Chưa cập nhật'}
                </div>
                <span className={styles.readonlyHint}>Dữ liệu hệ thống, không thể sửa.</span>
              </div>
            </div>
          ) : (
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Email</span>
                {data.coach.email !== '-' ? (
                  <span className={styles.infoValue}>{data.coach.email}</span>
                ) : (
                  <span className={styles.infoValueEmpty}>Chưa cập nhật</span>
                )}
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Số điện thoại</span>
                {data.coach.phone !== '-' ? (
                  <span className={styles.infoValue}>{data.coach.phone}</span>
                ) : (
                  <span className={styles.infoValueEmpty}>Chưa cập nhật</span>
                )}
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>CCCD / CMND</span>
                {data.coach.cccd !== '-' ? (
                  <span className={styles.infoValue}>{data.coach.cccd}</span>
                ) : (
                  <span className={styles.infoValueEmpty}>Chưa cập nhật</span>
                )}
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Ngày tham gia</span>
                {data.coach.joinedAt ? (
                  <span className={styles.infoValue}>{formatDate(data.coach.joinedAt)}</span>
                ) : (
                  <span className={styles.infoValueEmpty}>Chưa cập nhật</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 3. ADMIN INFO (Edit Mode Only) */}
        {editMode && isAdminOrOwner && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h4 className={styles.sectionTitle}>Thông tin quản trị</h4>
              <div className={styles.sectionDivider}></div>
            </div>
            <div className={styles.infoGrid}>
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

        {/* 4. ASSIGNED CLASSES */}
        {!editMode && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h4 className={styles.sectionTitle}>Lớp đang phụ trách</h4>
              <div className={styles.sectionDivider}></div>
              {data.classes.length > 0 && (
                <Badge variant="default">{data.classes.length} LỚP</Badge>
              )}
            </div>
            
            {data.classes.length === 0 ? (
              <div className={styles.emptyState}>
                <span className="material-icons-round" style={{ fontSize: 24, opacity: 0.5 }}>event_busy</span>
                <span>HLV chưa được phân công lớp nào.</span>
              </div>
            ) : (
              <div className={styles.classList}>
                {data.classes.map((cls) => (
                  <div 
                    key={cls.id} 
                    className={styles.classCard}
                    onClick={() => {
                      onClose();
                      router.push(`/training?classId=${cls.id}`);
                    }}
                  >
                    <div className={styles.classCardHeader}>
                      <h5 className={styles.classTitle}>{cls.name}</h5>
                      <Badge variant={cls.role === 'HEAD_COACH' ? 'primary' : 'default'}>
                        {cls.role === 'HEAD_COACH' ? 'HLV TRƯỞNG' : 'HLV PHỤ'}
                      </Badge>
                    </div>
                    <div className={styles.classMetaList}>
                      <span className={styles.classMetaItem}>
                        <span className="material-icons-round" style={{ fontSize: 16 }}>location_on</span>
                        {cls.venueName}
                      </span>
                      <span className={styles.classMetaItem}>
                        <span className="material-icons-round" style={{ fontSize: 16 }}>groups</span>
                        {cls.studentCount} học viên
                      </span>
                      {cls.status !== 'active' && (
                        <span className={`${styles.classMetaItem} text-warning`}>
                          <span className="material-icons-round" style={{ fontSize: 16 }}>warning_amber</span>
                          {cls.status}
                        </span>
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

  // We rely on Modal's own container for width and headers, 
  // ensuring styling matches other generic modals exactly.
  return (
    <Modal isOpen={isOpen} onClose={(!isPending) ? onClose : () => {}}>
      <div className="modal-header">
        <h2>{editMode ? 'Chỉnh sửa hồ sơ HLV' : 'Hồ sơ HLV'}</h2>
        {!isPending && (
          <button type="button" onClick={onClose} className="modal-close-btn" aria-label="Close modal">
            <span className="material-icons-round" style={{ fontSize: '20px' }}>close</span>
          </button>
        )}
      </div>
      
      <div className="modal-body">
        {renderContent()}
      </div>
      
      <div className="modal-footer">
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
    </Modal>
  );
}
