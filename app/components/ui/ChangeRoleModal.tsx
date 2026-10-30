'use client';

import React, { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from './Modal';
import { Button } from './Button';
import { RoleBadge, ROLE_LABELS, ROLE_DESCRIPTIONS } from './RoleBadge';
import { OrganizationRole } from '@/types/organization';

export interface RolePreset {
  name: string;
  role: OrganizationRole;
  icon: string;
  description: string;
  permissions: string[];
}

export const ROLE_PRESETS: RolePreset[] = [
  {
    name: 'Quản trị viên toàn quyền',
    role: 'admin',
    icon: 'security',
    description: 'Có toàn quyền trên tất cả các phân hệ quản lý trung tâm',
    permissions: [
      'manage_coaches', 'manage_students', 'manage_venues',
      'manage_schedule', 'manage_attendance',
      'view_payroll', 'manage_tuition', 'manage_finance',
      'manage_members', 'manage_settings'
    ]
  },
  {
    name: 'Quản lý cơ sở',
    role: 'admin',
    icon: 'storefront',
    description: 'Quản lý vận hành cơ sở: học viên, lớp học, lịch dạy, điểm danh và thu học phí',
    permissions: [
      'manage_coaches', 'manage_students', 'manage_venues',
      'manage_schedule', 'manage_attendance', 'manage_tuition'
    ]
  },
  {
    name: 'HLV Trưởng',
    role: 'head_coach',
    icon: 'sports_martial_arts',
    description: 'Phụ trách hoạt động chuyên môn, xếp lịch lớp, theo dõi học viên và điểm danh',
    permissions: [
      'manage_students', 'manage_venues', 'manage_schedule', 'manage_attendance'
    ]
  },
  {
    name: 'Trợ giảng',
    role: 'assistant_coach',
    icon: 'person_outline',
    description: 'Hỗ trợ lớp học và thực hiện điểm danh học viên theo phân công',
    permissions: [
      'manage_attendance'
    ]
  },
  {
    name: 'Lễ tân & CSKH',
    role: 'assistant_coach',
    icon: 'support_agent',
    description: 'Tiếp đón phụ huynh, quản lý học viên, điểm danh và thu phí',
    permissions: [
      'manage_students', 'manage_attendance', 'manage_tuition'
    ]
  },
  {
    name: 'Kế toán trung tâm',
    role: 'assistant_coach',
    icon: 'account_balance_wallet',
    description: 'Kiểm soát bảng lương HLV, thu học phí và sổ quỹ thu chi',
    permissions: [
      'view_payroll', 'manage_tuition', 'manage_finance'
    ]
  }
];

export interface PermissionItem {
  key: string;
  label: string;
  description: string;
}

export interface PermissionGroup {
  title: string;
  icon: string;
  permissions: PermissionItem[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    title: 'Vận hành & Đào tạo',
    icon: 'school',
    permissions: [
      { key: 'manage_coaches', label: 'Huấn luyện viên', description: 'Xem, thêm mới, quản lý hồ sơ HLV' },
      { key: 'manage_students', label: 'Học viên', description: 'Quản lý học viên, thêm mới và phân lớp' },
      { key: 'manage_venues', label: 'Cơ sở & Lớp học', description: 'Quản lý chi nhánh đào tạo và danh sách lớp' }
    ]
  },
  {
    title: 'Lịch dạy & Điểm danh',
    icon: 'calendar_month',
    permissions: [
      { key: 'manage_schedule', label: 'Lịch dạy tuần', description: 'Xếp lịch, điều phối ca dạy và phân công HLV' },
      { key: 'manage_attendance', label: 'Quản lý điểm danh', description: 'Xem, sửa điểm danh và duyệt buổi học' }
    ]
  },
  {
    title: 'Tài chính & Lương',
    icon: 'payments',
    permissions: [
      { key: 'view_payroll', label: 'Bảng lương HLV', description: 'Xem bảng lương, chốt lương và cấu hình lương' },
      { key: 'manage_tuition', label: 'Học phí', description: 'Quản lý đợt thu phí, thu tiền và công nợ' },
      { key: 'manage_finance', label: 'Sổ quỹ thu chi', description: 'Ghi chép thu chi và xem báo cáo dòng tiền' }
    ]
  },
  {
    title: 'Hệ thống & Cài đặt',
    icon: 'admin_panel_settings',
    permissions: [
      { key: 'manage_members', label: 'Đội ngũ & Phân quyền', description: 'Mời thành viên, chỉnh sửa vai trò và phân quyền' },
      { key: 'manage_settings', label: 'Cài đặt trung tâm', description: 'Cấu hình trung tâm, cấp đai và phiên bản' }
    ]
  }
];

const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap(g => g.permissions.map(p => p.key));

interface ChangeRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: OrganizationRole;
  currentCustomTitle?: string;
  currentPermissions?: string[];
  memberName: string;
  onSave: (newRole: OrganizationRole, customTitle?: string, permissions?: string[]) => Promise<void>;
  isLoading: boolean;
}

const AVAILABLE_ROLES: OrganizationRole[] = ['owner', 'admin', 'head_coach', 'assistant_coach'];

export function ChangeRoleModal({
  isOpen,
  onClose,
  currentRole,
  currentCustomTitle = '',
  currentPermissions = [],
  memberName,
  onSave,
  isLoading
}: ChangeRoleModalProps) {
  const [selectedRole, setSelectedRole] = useState<OrganizationRole>(currentRole);
  const [customTitle, setCustomTitle] = useState<string>(currentCustomTitle);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // Sync state when modal opens or props change
  useEffect(() => {
    if (isOpen) {
      setSelectedRole(currentRole);
      setCustomTitle(currentCustomTitle || '');
      
      // Filter out internal prefix tags like title:
      const cleanPerms = (currentPermissions || []).filter(p => !p.startsWith('title:'));
      
      // If current role has no explicit modular permissions yet, default based on role
      if (cleanPerms.length === 0) {
        if (currentRole === 'admin' || currentRole === 'owner') {
          setSelectedPermissions([...ALL_PERMISSION_KEYS]);
        } else if (currentRole === 'head_coach') {
          setSelectedPermissions(['manage_students', 'manage_venues', 'manage_schedule', 'manage_attendance']);
        } else {
          setSelectedPermissions(['manage_attendance']);
        }
      } else {
        setSelectedPermissions(cleanPerms);
      }
    }
  }, [isOpen, currentRole, currentCustomTitle, currentPermissions]);

  const handleApplyPreset = (preset: RolePreset) => {
    setCustomTitle(preset.name);
    setSelectedRole(preset.role);
    setSelectedPermissions([...preset.permissions]);
  };

  const togglePermission = (key: string) => {
    setSelectedPermissions(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const toggleGroup = (groupKeys: string[]) => {
    const allInGroupSelected = groupKeys.every(k => selectedPermissions.includes(k));
    if (allInGroupSelected) {
      setSelectedPermissions(prev => prev.filter(k => !groupKeys.includes(k)));
    } else {
      setSelectedPermissions(prev => Array.from(new Set([...prev, ...groupKeys])));
    }
  };

  const handleSelectAll = () => {
    setSelectedPermissions([...ALL_PERMISSION_KEYS]);
  };

  const handleDeselectAll = () => {
    setSelectedPermissions([]);
  };

  const handleSave = async () => {
    await onSave(selectedRole, customTitle.trim(), selectedPermissions);
  };

  return (
    <Modal isOpen={isOpen} onClose={isLoading ? () => {} : onClose} maxWidth="740px">
      <ModalHeader title="Chỉnh sửa vai trò & Phân quyền" onClose={isLoading ? () => {} : onClose} />
      
      <ModalBody style={{ maxHeight: 'calc(85vh - 130px)', overflowY: 'auto', padding: '20px 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          
          {/* 1. THÀNH VIÊN ĐANG ĐƯỢC CẤP QUYỀN */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            background: 'var(--surface-hover)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border-light)',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '1rem'
              }}>
                {memberName.charAt(0).toUpperCase()}
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Thành viên đang chỉnh sửa
                </span>
                <p style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1rem', margin: 0 }}>
                  {memberName}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Hiện tại:</span>
              <RoleBadge role={currentRole} customTitle={currentCustomTitle} />
            </div>
          </div>

          {/* 2. TÊN CHỨC DANH / VAI TRÒ TÙY CHỈNH */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-icons-round" style={{ fontSize: '18px', color: 'var(--primary)' }}>badge</span>
                Tên chức danh / Vai trò hiển thị
              </label>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Tùy biến theo cơ cấu tổ chức của bạn
              </span>
            </div>

            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="VD: Quản lý cơ sở 1, Giám đốc kỹ thuật, Lễ tân & CSKH, Trợ giảng..."
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '0.9375rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-light)',
                background: 'var(--surface)',
                color: 'var(--text-main)',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-light)'}
            />

            {/* MẪU VAI TRÒ NHANH (PRESETS) */}
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Gợi ý mẫu vai trò phổ biến:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {ROLE_PRESETS.map((preset) => {
                  const isCurrent = customTitle.toLowerCase() === preset.name.toLowerCase();
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      disabled={isLoading}
                      title={preset.description}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.75rem',
                        fontWeight: isCurrent ? 600 : 500,
                        background: isCurrent ? 'var(--primary-light)' : 'var(--surface-hover)',
                        color: isCurrent ? 'var(--primary)' : 'var(--text-secondary)',
                        border: `1px solid ${isCurrent ? 'var(--primary)' : 'var(--border-light)'}`,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span className="material-icons-round" style={{ fontSize: '14px' }}>{preset.icon}</span>
                      {preset.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3. CẤP ĐỘ HỆ THỐNG CỐT LÕI (BASE SYSTEM ROLE) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-icons-round" style={{ fontSize: '18px', color: 'var(--primary)' }}>vpn_key</span>
                Cấp độ bảo mật hệ thống (Base System Role)
              </label>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Xác định quyền truy cập nền tảng
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '8px' }}>
              {AVAILABLE_ROLES.map(role => {
                const isSelected = selectedRole === role;
                return (
                  <label 
                    key={role} 
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-lg)',
                      border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border-light)'}`,
                      backgroundColor: isSelected ? 'var(--primary-light)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={role}
                      checked={isSelected}
                      onChange={() => setSelectedRole(role)}
                      style={{ marginTop: '2px', width: '15px', height: '15px', accentColor: 'var(--primary)' }}
                      disabled={isLoading}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: isSelected ? 'var(--primary)' : 'var(--text-main)' }}>
                        {ROLE_LABELS[role]}
                      </span>
                      <span style={{ fontSize: '0.71875rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.3 }}>
                        {ROLE_DESCRIPTIONS[role]}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 4. MA TRẬN PHÂN QUYỀN CHỨC NĂNG (GRANULAR FUNCTION PERMISSIONS) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="material-icons-round" style={{ fontSize: '18px', color: 'var(--primary)' }}>tune</span>
                  Tùy chỉnh chức năng được phép thao tác
                </label>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Đã chọn <strong style={{ color: 'var(--primary)' }}>{selectedPermissions.length}</strong> / {ALL_PERMISSION_KEYS.length} chức năng
                </span>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  disabled={isLoading}
                  style={{
                    padding: '3px 8px',
                    fontSize: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    background: 'var(--surface-hover)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  Chọn tất cả
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  disabled={isLoading}
                  style={{
                    padding: '3px 8px',
                    fontSize: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    background: 'var(--surface-hover)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  Bỏ tất cả
                </button>
              </div>
            </div>

            {/* DANH SÁCH NHÓM QUYỀN */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
              {PERMISSION_GROUPS.map((group) => {
                const groupKeys = group.permissions.map(p => p.key);
                const selectedInGroupCount = groupKeys.filter(k => selectedPermissions.includes(k)).length;
                const isGroupAllSelected = selectedInGroupCount === groupKeys.length;

                return (
                  <div
                    key={group.title}
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border-light)',
                      borderRadius: 'var(--radius-xl)',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    {/* GROUP HEADER */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="material-icons-round" style={{ fontSize: '17px', color: 'var(--primary)' }}>
                          {group.icon}
                        </span>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-main)' }}>
                          {group.title}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleGroup(groupKeys)}
                        disabled={isLoading}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: isGroupAllSelected ? 'var(--primary)' : 'var(--text-muted)',
                          fontSize: '0.6875rem',
                          cursor: 'pointer',
                          fontWeight: 600,
                          padding: '2px 4px'
                        }}
                      >
                        {isGroupAllSelected ? 'Bỏ chọn hết' : `Chọn hết (${selectedInGroupCount}/${groupKeys.length})`}
                      </button>
                    </div>

                    {/* GROUP ITEMS */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {group.permissions.map((perm) => {
                        const isChecked = selectedPermissions.includes(perm.key);
                        return (
                          <label
                            key={perm.key}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '8px',
                              padding: '6px 8px',
                              borderRadius: 'var(--radius-md)',
                              background: isChecked ? 'rgba(20, 184, 166, 0.06)' : 'transparent',
                              cursor: 'pointer',
                              transition: 'background 0.15s'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => togglePermission(perm.key)}
                              disabled={isLoading}
                              style={{ marginTop: '2px', accentColor: 'var(--primary)', width: '14px', height: '14px' }}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.78125rem', fontWeight: isChecked ? 600 : 500, color: isChecked ? 'var(--primary)' : 'var(--text-main)' }}>
                                {perm.label}
                              </span>
                              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', lineHeight: 1.25 }}>
                                {perm.description}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={isLoading}>
          Hủy
        </Button>
        <Button 
          variant="primary" 
          onClick={handleSave} 
          isLoading={isLoading}
          leftIcon={<span className="material-icons-round" style={{ fontSize: '17px' }}>save</span>}
        >
          Lưu thay đổi vai trò
        </Button>
      </ModalFooter>
    </Modal>
  );
}
