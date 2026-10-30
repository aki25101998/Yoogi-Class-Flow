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
  customTitle?: string;
  onClick?: () => void;
  className?: string;
}

export function RoleBadge({ role, customTitle, onClick, className = '' }: RoleBadgeProps) {
  const defaultLabel = ROLE_LABELS[role] || 'Không xác định';
  const label = customTitle?.trim() ? customTitle.trim() : defaultLabel;
  const variant = ROLE_BADGE_VARIANTS[role] || 'default';

  return (
    <Badge
      variant={variant}
      className={`font-bold tracking-normal !px-2.5 ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''} ${className}`}
      onClick={onClick}
      title={customTitle?.trim() ? `${customTitle.trim()} (${defaultLabel})` : (ROLE_DESCRIPTIONS[role] || label)}
    >
      <span className="inline-flex items-center gap-[4px] leading-none">
        {label}
      </span>
    </Badge>
  );
}
