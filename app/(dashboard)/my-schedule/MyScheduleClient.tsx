'use client';

import { useDashboardContext } from '../DashboardProvider';
import { useMySchedule } from '@/hooks/useMySchedule';

// UI Components
import { PageHeader } from '@/app/components/ui/PageHeader';
import { Card } from '@/app/components/ui/Card';
import { EmptyState } from '@/app/components/ui/EmptyState';
import styles from '@/app/styles/page-standard.module.css';

const DAYS_OF_WEEK = [
  { value: 1, label: 'Thứ 2' },
  { value: 2, label: 'Thứ 3' },
  { value: 3, label: 'Thứ 4' },
  { value: 4, label: 'Thứ 5' },
  { value: 5, label: 'Thứ 6' },
  { value: 6, label: 'Thứ 7' },
  { value: 0, label: 'Chủ Nhật' }
];

export default function MyScheduleClient() {
  const { context } = useDashboardContext();
  const organizationId = context?.organization?.id;
  const coachId = context?.coach?.id;

  const { schedules, isLoading } = useMySchedule(organizationId, coachId);

  if (!coachId) {
    return (
      <div className="flex-col gap-6">
        <PageHeader title="Lịch dạy của tôi" />
        <Card>
          <div className="p-6 text-danger font-medium">
            Bạn chưa được liên kết với hồ sơ HLV nào trong hệ thống.
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-col gap-6">
      <PageHeader 
        title="Lịch dạy của tôi" 
        description="Lịch cố định hàng tuần của bạn"
      />
      
      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-surface-hover rounded w-full"></div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {DAYS_OF_WEEK.map(day => {
            const daySchedules = (schedules || []).filter((s: any) => s.day_of_week === day.value).sort((a: any, b: any) => a.start_time.localeCompare(b.start_time));
            
            return (
              <div key={day.value} className="bg-surface rounded-md border border-light overflow-hidden">
                <div className="bg-surface-hover p-3 font-bold text-center border-b border-light text-main">
                  {day.label}
                </div>
                <div className="p-3 flex flex-col gap-3">
                  {daySchedules.length === 0 ? (
                    <div className="text-center text-muted text-sm italic py-4">Trống</div>
                  ) : (
                    daySchedules.map((s: any) => (
                      <div key={s.id} className="bg-success-bg p-3 rounded-md border border-light text-sm">
                        <div className="font-bold text-success mb-2">{s.start_time} - {s.end_time}</div>
                        <div className="mb-1 text-main font-medium">{s.venue_classes?.name}</div>
                        <div className="text-xs text-secondary flex items-center gap-1">
                          <span className="material-icons-round text-[14px]">place</span>
                          {s.venues?.name}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
