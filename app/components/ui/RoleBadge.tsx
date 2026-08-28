import React from 'react';
import { Badge, BadgeVariant } from './Badge';
import { OrganizationRole } from '@/types/organization';

export const ROLE_LABELS: Record<OrganizationRole, string> = {
  owner: 'Chủ trung tâm',
  admin: 'Quản trị viên',
  head_coach: 'HLV trưởng',
  assistant_coach: 'HLV phụ',
};

export const ROLE_DESCRIPTIONS: Record<OrganizationRole, string> = {
  owner: 'Toàn quyền quản lý trung tâm',
  admin: 'Quản lý vận hành và thành viên',
  head_coach: 'Quản lý hoạt động chuyên môn và lớp học',
  assistant_coach: 'Thực hiện các hoạt động được phân công',
};

const ROLE_BADGE_VARIANTS: Record<OrganizationRole, BadgeVariant> = {
  owner: 'primary',
  admin: 'info',
  head_coach: 'warning',
  assistant_coach: 'success',
};

interface RoleBadgeProps {
  role: OrganizationRole;
  onClick?: () => void;
  className?: string;
  isEditable?: boolean;
}

export function RoleBadge({ role, onClick, className = '', isEditable = false }: RoleBadgeProps) {
  const label = ROLE_LABELS[role] || 'Không xác định';
  const variant = ROLE_BADGE_VARIANTS[role] || 'default';

  return (
    <Badge
      variant={variant}
      className={`!normal-case tracking-normal !px-2.5 ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''} ${className}`}
      onClick={onClick}
      title={ROLE_DESCRIPTIONS[role] || label}
    >
      <span className="inline-flex items-center gap-[4px] leading-none">
        {label}
        {isEditable && <span className="material-icons-round text-[7px] opacity-60 flex-shrink-0 leading-none">edit</span>}
      </span>
    </Badge>
  );
}
