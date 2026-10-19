'use client';

import { useDashboardContext } from '../DashboardProvider';
import { useMySchedule } from '@/hooks/useMySchedule';

// UI Components
import { PageHeader } from '@/app/components/ui/PageHeader';
import { Card, CardContent } from '@/app/components/ui/Card';
import styles from '../schedule/ScheduleClient.module.css';

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
      <div className="flex flex-col gap-6">
        <PageHeader title="Lịch dạy của tôi" />
        <Card>
          <CardContent className="p-6 text-danger font-medium">
            Bạn chưa được liên kết với hồ sơ HLV nào trong hệ thống.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader 
        title="Lịch dạy của tôi" 
        description="Lịch giảng dạy cố định hàng tuần được phân công cho bạn"
      />
      
      {isLoading ? (
        <div className={styles.boardScrollWrapper}>
          <div className={`${styles.scheduleGrid} animate-pulse`}>
            {DAYS_OF_WEEK.map(day => (
              <div key={day.value} className={styles.dayColumn}>
                <div className={styles.dayHeader}>
                  <span className={styles.dayTitle}>{day.label}</span>
                  <span className={styles.dayBadge}>--</span>
                </div>
                <div className={styles.dayBody}>
                  <div className="h-24 bg-surface-hover rounded-md w-full"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className={styles.boardScrollWrapper}>
          <div className={styles.scheduleGrid}>
            {DAYS_OF_WEEK.map(day => {
              const daySchedules = (schedules || [])
                .filter((s: any) => s.day_of_week === day.value)
                .sort((a: any, b: any) => (a.start_time || '').localeCompare(b.start_time || ''));
              
              const count = daySchedules.length;

              return (
                <div key={day.value} className={styles.dayColumn}>
                  <div className={styles.dayHeader}>
                    <span className={styles.dayTitle}>{day.label}</span>
                    <span className={`${styles.dayBadge} ${count > 0 ? styles.dayBadgeActive : ''}`}>
                      {count} ca
                    </span>
                  </div>

                  <div className={styles.dayBody}>
                    {count === 0 ? (
                      <div className={styles.emptyDay}>
                        <span className={`material-icons-round ${styles.emptyDayIcon}`}>event_available</span>
                        <span>Không có lịch</span>
                      </div>
                    ) : (
                      daySchedules.map((s: any) => (
                        <div key={s.id} className={styles.sessionCard} style={{ borderLeftColor: 'var(--success)' }}>
                          <div className={styles.sessionTimeHeader}>
                            <span className={styles.timePill} style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)' }}>
                              <span className="material-icons-round">schedule</span>
                              {s.start_time} - {s.end_time}
                            </span>
                          </div>

                          <div className={styles.className} title={s.venue_classes?.name}>
                            {s.venue_classes?.name || 'Lớp học'}
                          </div>

                          <div className={styles.sessionMeta}>
                            <div className={styles.metaRow} title={`Địa điểm: ${s.venues?.name || 'Trụ sở chính'}`}>
                              <span className="material-icons-round">place</span>
                              <span>{s.venues?.name || 'Trụ sở chính'}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
