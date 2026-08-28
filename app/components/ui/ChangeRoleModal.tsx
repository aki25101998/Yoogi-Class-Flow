import React, { useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from './Modal';
import { Button } from './Button';
import { OrganizationRole } from '@/types/organization';
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from './RoleBadge';

interface ChangeRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: OrganizationRole;
  memberName: string;
  onSave: (newRole: OrganizationRole) => Promise<void>;
  isLoading: boolean;
}

const AVAILABLE_ROLES: OrganizationRole[] = ['owner', 'admin', 'head_coach', 'assistant_coach'];

export function ChangeRoleModal({
  isOpen,
  onClose,
  currentRole,
  memberName,
  onSave,
  isLoading
}: ChangeRoleModalProps) {
  const [selectedRole, setSelectedRole] = useState<OrganizationRole>(currentRole);

  // When modal opens, sync current role
  React.useEffect(() => {
    if (isOpen) {
      setSelectedRole(currentRole);
    }
  }, [isOpen, currentRole]);

  const handleSave = async () => {
    if (selectedRole !== currentRole) {
      await onSave(selectedRole);
    } else {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={isLoading ? () => {} : onClose}>
      <ModalHeader title="Chỉnh sửa vai trò" onClose={isLoading ? () => {} : onClose} />
      <ModalBody>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Thành viên</p>
            <p style={{ fontWeight: 600, color: 'var(--text-main)' }}>{memberName}</p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>Vai trò mới</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {AVAILABLE_ROLES.map(role => (
                <label 
                  key={role} 
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px',
                    borderRadius: 'var(--radius-lg)',
                    border: `1px solid ${selectedRole === role ? 'var(--primary)' : 'var(--border-light)'}`,
                    backgroundColor: selectedRole === role ? 'var(--primary-light)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', height: '20px' }}>
                    <input
                      type="radio"
                      name="role"
                      value={role}
                      checked={selectedRole === role}
                      onChange={() => setSelectedRole(role)}
                      style={{ width: '16px', height: '16px' }}
                      disabled={isLoading}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>{ROLE_LABELS[role]}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{ROLE_DESCRIPTIONS[role]}</span>
                  </div>
                </label>
              ))}
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
