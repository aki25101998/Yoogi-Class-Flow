'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Modal, ModalHeader, ModalBody, ModalFooter } from './Modal';
import { Button } from './Button';
import { Badge } from './Badge';
import { useCoachQuickProfile } from '@/hooks/useCoachQuickProfile';
import { useDashboardContext } from '@/app/(dashboard)/DashboardProvider';

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
  suspended: 'Đã tạm ngưng'
};

export function CoachQuickProfileModal({ coachId, isOpen, onClose }: CoachQuickProfileModalProps) {
  const router = useRouter();
  const { context } = useDashboardContext();
  const organizationId = context?.organization?.id;

  const { data, isLoading, isError } = useCoachQuickProfile(organizationId, coachId);

  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalHeader title="Hồ sơ nhanh HLV" onClose={onClose} />
      <ModalBody>
        {isLoading ? (
          <div className="flex flex-col gap-6 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-surface-hover rounded-full"></div>
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
        ) : isError || !data ? (
          <div className="text-center p-6">
            <span className="material-icons-round text-danger mb-2" style={{ fontSize: 32 }}>error_outline</span>
            <p className="text-danger">Không thể tải thông tin HLV.</p>
            <p className="text-secondary text-sm mt-1">Vui lòng thử lại.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6" style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '4px' }}>
            {/* Header section */}
            <div className="flex items-center gap-4 border-b border-[var(--border-light)] pb-4">
              <div className="flex-shrink-0">
                {data.coach.avatarUrl ? (
                  <img src={data.coach.avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full object-cover border border-[var(--border-light)]" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-surface-hover border border-[var(--border-light)] flex items-center justify-center text-secondary">
                    <span className="material-icons-round" style={{ fontSize: 32 }}>person</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-xl font-bold m-0 leading-tight">{data.coach.name}</h3>
                <div>
                  <Badge variant={data.coach.role === 'owner' || data.coach.role === 'admin' ? 'primary' : 'default'}>
                    {roleLabels[data.coach.role] || data.coach.role}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Thông tin cá nhân */}
            <div>
              <h4 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-3">Thông tin cá nhân</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4 text-sm">
                <div className="flex flex-col">
                  <span className="text-secondary mb-1">Email</span>
                  <span className="font-medium text-main">{data.coach.email !== '-' ? data.coach.email : <span className="text-secondary italic font-normal">Chưa cập nhật</span>}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-secondary mb-1">Số điện thoại</span>
                  <span className="font-medium text-main">{data.coach.phone !== '-' ? data.coach.phone : <span className="text-secondary italic font-normal">Chưa cập nhật</span>}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-secondary mb-1">CCCD / CMND</span>
                  <span className="font-medium text-main">{data.coach.cccd !== '-' ? data.coach.cccd : <span className="text-secondary italic font-normal">Chưa cập nhật</span>}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-secondary mb-1">Ngày tham gia</span>
                  <span className="font-medium text-main">{data.coach.joinedAt ? formatDate(data.coach.joinedAt) : <span className="text-secondary italic font-normal">Chưa cập nhật</span>}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-secondary mb-1">Trạng thái hệ thống</span>
                  <div className="mt-1">
                     <Badge variant={data.coach.status === 'active' ? 'success' : 'danger'}>
                      {statusLabels[data.coach.status] || data.coach.status}
                     </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Lớp đang phụ trách */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-semibold text-secondary uppercase tracking-wider m-0">Lớp đang phụ trách</h4>
                <Badge variant="default">{data.classes.length} lớp</Badge>
              </div>
              
              {data.classes.length === 0 ? (
                <div className="bg-surface-hover rounded-md p-4 text-center border border-[var(--border-light)]">
                  <span className="material-icons-round text-secondary mb-1">info</span>
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
                      className="group flex flex-col p-3 rounded-md bg-surface border border-[var(--border-light)] hover:border-primary hover:bg-surface-hover cursor-pointer transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h5 className="font-semibold text-main m-0 group-hover:text-primary transition-colors">{cls.name}</h5>
                        {cls.status !== 'active' && (
                          <Badge variant="warning" className="scale-90 origin-top-right">{cls.status}</Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center text-sm text-secondary gap-4">
                        <div className="flex items-center gap-1" title="Chi nhánh">
                          <span className="material-icons-round" style={{ fontSize: 16 }}>location_on</span>
                          <span className="truncate max-w-[120px]">{cls.venueName}</span>
                        </div>
                        <div className="flex items-center gap-1" title="Vai trò trong lớp">
                          <span className="material-icons-round" style={{ fontSize: 16 }}>
                            {cls.role === 'HEAD_COACH' ? 'star' : 'person'}
                          </span>
                          <span className={cls.role === 'HEAD_COACH' ? 'text-primary font-medium' : ''}>
                            {cls.role === 'HEAD_COACH' ? 'HLV trưởng' : 'HLV phụ'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1" title="Học viên active">
                          <span className="material-icons-round" style={{ fontSize: 16 }}>groups</span>
                          <span>{cls.studentCount} hv</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>Đóng</Button>
      </ModalFooter>
    </Modal>
  );
}
