'use client';

import React, { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from './Modal';
import { Button } from './Button';
import { OrganizationRole } from '@/types/organization';
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from './RoleBadge';

export interface AvailableRoleOption {
  code: string;
  name: string;
  baseRole: OrganizationRole;
  description: string;
}

interface ChangeRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: OrganizationRole;
  currentCustomTitle?: string;
  memberName: string;
  availableRoles?: AvailableRoleOption[];
  onSave: (newRole: OrganizationRole, customTitle?: string) => Promise<void>;
  isLoading: boolean;
}

const DEFAULT_SYSTEM_ROLES: OrganizationRole[] = ['owner', 'admin', 'head_coach', 'assistant_coach'];

export function ChangeRoleModal({
  isOpen,
  onClose,
  currentRole,
  currentCustomTitle = '',
  memberName,
  availableRoles,
  onSave,
  isLoading
}: ChangeRoleModalProps) {
  const [selectedRole, setSelectedRole] = useState<OrganizationRole>(currentRole);
  const [selectedTitle, setSelectedTitle] = useState<string>(currentCustomTitle || '');

  // When modal opens, sync current role
  useEffect(() => {
    if (isOpen) {
      setSelectedRole(currentRole);
      setSelectedTitle(currentCustomTitle || '');
    }
  }, [isOpen, currentRole, currentCustomTitle]);

  const handleSelectSystemRole = (role: OrganizationRole) => {
    setSelectedRole(role);
    setSelectedTitle('');
  };

  const handleSelectCustomRole = (roleOpt: AvailableRoleOption) => {
    setSelectedRole(roleOpt.baseRole);
    setSelectedTitle(roleOpt.name);
  };

  const handleSave = async () => {
    await onSave(selectedRole, selectedTitle || undefined);
  };

  // If organization has custom roles defined
  const customRoleList = (availableRoles || []).filter(
    r => !DEFAULT_SYSTEM_ROLES.includes(r.code as OrganizationRole)
  );

  return (
    <Modal isOpen={isOpen} onClose={isLoading ? () => {} : onClose} maxWidth="480px">
      <ModalHeader title="Chỉnh sửa vai trò" onClose={isLoading ? () => {} : onClose} />
      <ModalBody>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Thành viên</p>
            <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>{memberName}</p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>Vai trò mới</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {DEFAULT_SYSTEM_ROLES.map(role => {
                const isSelected = selectedRole === role && !selectedTitle;
                return (
                  <label 
                    key={role} 
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-lg)',
                      border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border-light)'}`,
                      backgroundColor: isSelected ? 'var(--primary-light)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', height: '20px' }}>
                      <input
                        type="radio"
                        name="role"
                        value={role}
                        checked={isSelected}
                        onChange={() => handleSelectSystemRole(role)}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                        disabled={isLoading}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: isSelected ? 'var(--primary)' : 'var(--text-main)' }}>
                        {ROLE_LABELS[role]}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '3px', lineHeight: 1.3 }}>
                        {ROLE_DESCRIPTIONS[role]}
                      </span>
                    </div>
                  </label>
                );
              })}

              {/* TÙY CHỌN VAI TRÒ TÙY BIẾN NẾU TỔ CHỨC CÓ TẠO THÊM */}
              {customRoleList.length > 0 && (
                <>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Vai trò theo cơ cấu tổ chức
                  </div>
                  {customRoleList.map(cr => {
                    const isSelected = selectedRole === cr.baseRole && selectedTitle.toLowerCase() === cr.name.toLowerCase();
                    return (
                      <label 
                        key={cr.code} 
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          padding: '12px 14px',
                          borderRadius: 'var(--radius-lg)',
                          border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border-light)'}`,
                          backgroundColor: isSelected ? 'var(--primary-light)' : 'transparent',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', height: '20px' }}>
                          <input
                            type="radio"
                            name="role"
                            value={cr.code}
                            checked={isSelected}
                            onChange={() => handleSelectCustomRole(cr)}
                            style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                            disabled={isLoading}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: isSelected ? 'var(--primary)' : 'var(--text-main)' }}>
                            {cr.name}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '3px', lineHeight: 1.3 }}>
                            {cr.description || ROLE_DESCRIPTIONS[cr.baseRole]}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={isLoading}>
          Hủy
        </Button>
        <Button variant="primary" onClick={handleSave} isLoading={isLoading}>
          Lưu thay đổi
        </Button>
      </ModalFooter>
    </Modal>
  );
}
