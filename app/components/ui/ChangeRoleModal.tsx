import React, { useState } from 'react';
import { Modal } from './Modal';
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
    <Modal isOpen={isOpen} onClose={isLoading ? () => {} : onClose} title="Chỉnh sửa vai trò">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-sm text-muted">Thành viên</p>
          <p className="font-semibold text-main">{memberName}</p>
        </div>
        
        <div className="flex flex-col gap-2 mt-2">
          <p className="text-sm font-medium text-main">Vai trò mới</p>
          <div className="flex flex-col gap-2">
            {AVAILABLE_ROLES.map(role => (
              <label 
                key={role} 
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedRole === role 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:bg-surface-hover'
                }`}
              >
                <div className="flex items-center h-5">
                  <input
                    type="radio"
                    name="role"
                    value={role}
                    checked={selectedRole === role}
                    onChange={() => setSelectedRole(role)}
                    className="w-4 h-4 text-primary focus:ring-primary border-border"
                    disabled={isLoading}
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-main">{ROLE_LABELS[role]}</span>
                  <span className="text-xs text-muted mt-1">{ROLE_DESCRIPTIONS[role]}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Hủy
          </Button>
          <Button variant="primary" onClick={handleSave} isLoading={isLoading}>
            Lưu thay đổi
          </Button>
        </div>
      </div>
    </Modal>
  );
}
