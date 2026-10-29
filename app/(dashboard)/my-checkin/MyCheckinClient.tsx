'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDashboardContext } from '../DashboardProvider';
import { getBusinessDate, getBusinessDateString, calculateDuration } from '@/utils/date';
import { useTodaySessions } from '@/hooks/useTodaySessions';
import { checkInSessionAction } from '../dashboard/actions';
import { useQueryClient } from '@tanstack/react-query';

// UI Components
import { PageHeader } from '@/app/components/ui/PageHeader';
import { Card, CardContent } from '@/app/components/ui/Card';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import styles from '@/app/styles/page-standard.module.css';

export default function MyCheckinClient() {
  const router = useRouter();
  const { context } = useDashboardContext();
  const organizationId = context?.organization?.id;
  const coachId = context?.coach?.id;

  const todayObj = getBusinessDate();
  const dateStr = getBusinessDateString();
  const displayDate = todayObj.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Fetch only sessions for this coach
  const { sessions, isLoading, refetch } = useTodaySessions(organizationId, dateStr, coachId);
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(false);

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['todaySessions'] });
    queryClient.invalidateQueries({ queryKey: ['myAttendance'] });
    queryClient.invalidateQueries({ queryKey: ['mySchedule'] });
    refetch();
    router.refresh();
  };

  const handleCheckIn = async (session: any) => {
    if (confirm('Xác nhận Check-in cho buổi học này?')) {
      setLoading(true);
      const res = await checkInSessionAction(session.classId, dateStr, 'checked_in', session.scheduleId, session.sessionId);
      setLoading(false);
      if (res.success) {
        alert('Check-in thành công!');
        handleSuccess();
      } else {
        alert(res.error || 'Lỗi khi Check-in');
      }
    }
  };

  if (!coachId) {
    return (
      <div className="flex-col gap-6">
        <PageHeader title="Check-in Hôm Nay" description={displayDate} />
        <Card>
          <CardContent>
            <p className="text-danger">Bạn chưa được liên kết với hồ sơ HLV nào trong hệ thống.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-col gap-6">
      <PageHeader 
        title="Check-in Hôm Nay" 
        description={`Ngày: ${displayDate}`}
      />
      
      <div className={styles.listContainer}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Lịch dạy của bạn ({sessions.length})</h3>
          <Button variant="ghost" size="sm" onClick={handleSuccess} leftIcon={<span className="material-icons-round">refresh</span>}>Làm mới</Button>
        </div>

        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-24 bg-surface-hover rounded w-full"></div>
            <div className="h-24 bg-surface-hover rounded w-full"></div>
          </div>
        ) : sessions.length === 0 ? (
          <EmptyState 
            title="Không có lịch dạy"
            description="Bạn không có lịch dạy nào trong ngày hôm nay."
            icon="event_busy"
          />
        ) : (
          <div className={styles.sessionList}>
            {sessions.map((s: any) => {
              const durationStr = calculateDuration(s.startTime, s.end_time || s.endTime);
              const rawName = s.className || 'Lớp võ thuật';
              const displayName = rawName.toLowerCase().startsWith('lớp') ? rawName : `Lớp ${rawName}`;
              const venueId = s.venueId || s.venues?.id;

              return (
                <div key={s.classId + s.startTime} className={styles.sessionCard}>
                  <div className={styles.sessionLeft}>
                    {/* Time Box */}
                    <div className={styles.sessionTimeBox}>
                      <div className={styles.sessionTimeRange}>
                        {s.startTime} - {s.end_time || s.endTime}
                      </div>
                      {durationStr && (
                        <div className={styles.sessionDuration}>{durationStr}</div>
                      )}
                    </div>

                    {/* Main Info */}
                    <div className={styles.sessionMainInfo}>
                      <div className={styles.sessionCategoryRow}>
                        <span className={styles.venueBadge}>
                          <span className="material-icons-round">place</span>
                          NƠI DẠY
                        </span>
                        {s.originalCoachId !== s.currentCoachId ? (
                          <span className={styles.substituteChip}>
                            <span className="material-icons-round text-xs">swap_horiz</span>
                            Dạy thay HLV {s.originalCoachName}
                          </span>
                        ) : (
                          <span className={styles.roleChip}>HLV Phụ trách</span>
                        )}
                        {s.status === 'checked_in' && <Badge variant="success">Đã Check-in</Badge>}
                        {s.status === 'approved' && <Badge variant="primary">Đã Duyệt</Badge>}
                        {s.status === 'paid' && <Badge variant="primary">Đã Thanh Toán</Badge>}
                        {s.status === 'cancelled' && <Badge variant="danger">Đã Hủy</Badge>}
                        {(s.status === 'pending' || s.status === 'scheduled') && <Badge variant="default">Chưa Check-in</Badge>}
                      </div>

                      <div className={styles.sessionVenueTitle}>
                        <span>{s.venueName || 'Trụ sở chính'}</span>
                      </div>

                      <div className={styles.sessionClassSubRow}>
                        <span className={styles.classSubChip}>
                          <span>🥋</span>
                          <span>{displayName}</span>
                        </span>
                        <span className={styles.scheduleTypeTag}>• Lịch định kỳ</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className={styles.sessionActions}>
                    {venueId && (
                      <Link
                        href={`/training/${venueId}`}
                        className={styles.actionBtnSecondary}
                      >
                        <span className="material-icons-round text-sm">visibility</span>
                        <span>Xem lớp</span>
                      </Link>
                    )}

                    {(s.status === 'pending' || s.status === 'scheduled') ? (
                      <button
                        type="button"
                        className={styles.actionBtnTeal}
                        disabled={loading}
                        onClick={() => handleCheckIn(s)}
                      >
                        <span className="material-icons-round text-sm">check_circle</span>
                        <span>Check-in Ngay</span>
                      </button>
                    ) : (
                      <Link
                        href={`/attendance?date=${s.date || dateStr}&sessionId=${s.sessionId || ''}&classId=${s.classId}`}
                        className={styles.actionBtnPrimary}
                      >
                        <span className="material-icons-round text-sm">fact_check</span>
                        <span>Điểm danh học viên →</span>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
