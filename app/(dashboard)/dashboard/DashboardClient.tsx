'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDashboardContext } from '../DashboardProvider';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useTodaySessions } from '@/hooks/useTodaySessions';
import { cancelSessionAction, overrideCoachAction, checkInSessionAction } from './actions';
import { useClasses } from '@/hooks/useClasses';
import { getBusinessDate, getBusinessDateString, calculateDuration } from '@/utils/date';
import styles from '@/app/styles/page-standard.module.css';

// UI Components
import { PageHeader } from '@/app/components/ui/PageHeader';
import { Card, CardContent } from '@/app/components/ui/Card';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { Button } from '@/app/components/ui/Button';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/app/components/ui/Modal';
import { Select } from '@/app/components/ui/Input';
import { Badge } from '@/app/components/ui/Badge';
import { useQueryClient } from '@tanstack/react-query';

function StatSkeleton() {
  return (
    <div className="h-16 bg-surface-hover rounded w-full"></div>
  );
}

export default function DashboardClient() {
  const router = useRouter();
  const { context } = useDashboardContext();
  const organizationId = context?.organization?.id;
  
  const { stats, isLoading: statsLoading, isAdminOrOwner } = useDashboardStats(context);
  const { availableCoaches } = useClasses(organizationId);

  // We format date as YYYY-MM-DD for the backend
  const todayObj = getBusinessDate();
  const dateStr = getBusinessDateString(); // YYYY-MM-DD format
  const displayDate = todayObj.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // If coach, filter their sessions. If admin, show all
  const coachIdFilter = isAdminOrOwner ? undefined : context?.coach?.id;
  
  const { sessions, isLoading: sessionsLoading, refetch } = useTodaySessions(organizationId, dateStr, coachIdFilter);
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(false);
  const [overrideModalSession, setOverrideModalSession] = useState<any>(null);
  const [selectedNewCoachId, setSelectedNewCoachId] = useState('');

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['todaySessions'] });
    queryClient.invalidateQueries({ queryKey: ['myAttendance'] });
    queryClient.invalidateQueries({ queryKey: ['mySchedule'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    refetch();
    router.refresh();
  };

  const handleCancelSession = async (session: any) => {
    if (confirm('Bạn có chắc chắn muốn hủy buổi học này? Hệ thống sẽ ghi nhận trạng thái Hủy.')) {
      setLoading(true);
      const res = await cancelSessionAction(session.classId, dateStr, session.scheduleId, session.sessionId);
      setLoading(false);
      if (res.success) {
        alert('Hủy buổi học thành công.');
        handleSuccess();
      } else {
        alert(res.error || 'Lỗi khi hủy buổi học');
      }
    }
  };

  const handleOverrideCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideModalSession || !selectedNewCoachId) return;
    
    setLoading(true);
    const res = await overrideCoachAction(
      overrideModalSession.classId, 
      dateStr, 
      selectedNewCoachId, 
      overrideModalSession.scheduleId, 
      overrideModalSession.sessionId
    );
    setLoading(false);
    
    if (res.success) {
      setOverrideModalSession(null);
      setSelectedNewCoachId('');
      alert('Đã xếp HLV dạy thay thành công!');
      handleSuccess();
    } else {
      alert(res.error || 'Lỗi khi xếp HLV dạy thay');
    }
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'cancelled': return <Badge variant="danger">Đã Hủy</Badge>;
      case 'checked_in': return <Badge variant="success">Đã Check-in</Badge>;
      case 'approved': return <Badge variant="primary">Đã Duyệt</Badge>;
      case 'paid': return <Badge variant="primary">Đã Thanh Toán</Badge>;
      case 'scheduled': return <Badge variant="warning">Dạy Thay</Badge>;
      default: return <Badge variant="default">Chưa Check-in</Badge>;
    }
  };

  return (
    <div className="flex-col gap-6">
      <PageHeader 
        title="Tổng Quan Hệ Thống" 
        description={`Hôm nay: ${displayDate}`}
      />

      <div className={styles.overviewCard}>
        <div className={styles.overviewGrid}>
        {statsLoading ? (
          <>
            {isAdminOrOwner && <StatSkeleton />}
            <StatSkeleton />
            {isAdminOrOwner && <StatSkeleton />}
            {isAdminOrOwner && <StatSkeleton />}
          </>
        ) : (
          <>
            {isAdminOrOwner && (
              <div className={`${styles.kpiItem} ${styles.kpiPrimary}`}>
                <div className={styles.kpiLabel}><div className={styles.kpiDot}></div> Huấn luyện viên</div>
                <div className={styles.kpiValue}>{stats.coachCount}</div>
                <div className={styles.kpiCaption}>Đội ngũ giảng dạy</div>
                <span className={`material-icons-round ${styles.kpiWatermark}`} style={{ color: 'var(--primary)' }}>sports_martial_arts</span>
              </div>
            )}

            <div className={`${styles.kpiItem} ${styles.kpiInfo}`}>
              <div className={styles.kpiLabel}><div className={styles.kpiDot}></div> {isAdminOrOwner ? 'Lớp học đang mở' : 'Lớp được phân công'}</div>
              <div className={styles.kpiValue}>{stats.classCount}</div>
              <div className={styles.kpiCaption}>Lớp học hoạt động</div>
              <span className={`material-icons-round ${styles.kpiWatermark}`} style={{ color: 'var(--info)' }}>school</span>
            </div>

            {isAdminOrOwner && (
              <div className={`${styles.kpiItem} ${styles.kpiSuccess}`}>
                <div className={styles.kpiLabel}><div className={styles.kpiDot}></div> Học viên</div>
                <div className={styles.kpiValue}>{stats.studentCount}</div>
                <div className={styles.kpiCaption}>Võ sinh đăng ký</div>
                <span className={`material-icons-round ${styles.kpiWatermark}`} style={{ color: 'var(--success)' }}>groups</span>
              </div>
            )}

            {isAdminOrOwner && (
              <div className={`${styles.kpiItem} ${styles.kpiWarning}`}>
                <div className={styles.kpiLabel}><div className={styles.kpiDot}></div> Địa điểm</div>
                <div className={styles.kpiValue}>{stats.venueCount}</div>
                <div className={styles.kpiCaption}>Cơ sở & chi nhánh</div>
                <span className={`material-icons-round ${styles.kpiWatermark}`} style={{ color: 'var(--warning)' }}>place</span>
              </div>
            )}
          </>
        )}
        </div>
      </div>

      <div className={styles.listContainer}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Lịch hôm nay</h3>
          <div className="flex items-center gap-2">
            <span className={styles.sectionCount}>{sessions.length} buổi</span>
            <Button variant="ghost" size="sm" onClick={handleSuccess} leftIcon={<span className="material-icons-round">refresh</span>}>Làm mới</Button>
          </div>
        </div>
          
          {sessionsLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-20 bg-surface-hover rounded w-full"></div>
              <div className="h-20 bg-surface-hover rounded w-full"></div>
            </div>
          ) : sessions.length === 0 ? (
            <EmptyState 
              title="Không có lịch dạy"
              description="Hiện không có lịch dạy nào trong ngày hôm nay."
              icon="event_busy"
            />
          ) : (
            <div className={styles.sessionList}>
              {sessions.map((s: any) => {
                const durationStr = calculateDuration(s.startTime, s.endTime);
                const rawName = s.className || 'Lớp võ thuật';
                const displayName = rawName.toLowerCase().startsWith('lớp') ? rawName : `Lớp ${rawName}`;
                const venueId = s.venueId || s.venues?.id;

                return (
                  <div key={s.classId + s.startTime} className={styles.sessionCard}>
                    <div className={styles.sessionLeft}>
                      {/* Time Box */}
                      <div className={styles.sessionTimeBox}>
                        <div className={styles.sessionTimeRange}>
                          {s.startTime} - {s.endTime}
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
                          <span className={styles.roleChip}>
                            HLV: {s.currentCoachName || 'Chưa có HLV'}
                          </span>
                          {s.originalCoachId !== s.currentCoachId && (
                            <span className={styles.substituteChip}>
                              <span className="material-icons-round text-xs">swap_horiz</span>
                              Dạy thay {s.originalCoachName}
                            </span>
                          )}
                          {getStatusBadge(s.status)}
                        </div>

                        <div className={styles.sessionVenueTitle}>
                          <span>{s.venueName || 'Trụ sở chính'}</span>
                        </div>

                        <div className={styles.sessionClassSubRow}>
                          <span className={styles.classSubChip}>
                            <span>🥋</span>
                            <span>{displayName}</span>
                          </span>
                          <span className={styles.scheduleTypeTag}>• Lịch hôm nay</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className={styles.sessionActions}>
                      {/* Admin Actions */}
                      {isAdminOrOwner && s.status !== 'cancelled' && (
                        <>
                          <button
                            type="button"
                            className={styles.actionBtnSecondary}
                            disabled={loading || s.status === 'checked_in' || s.status === 'approved' || s.status === 'paid'}
                            onClick={() => { setOverrideModalSession(s); setSelectedNewCoachId(s.currentCoachId); }}
                            title="Xếp HLV khác dạy thay"
                          >
                            <span className="material-icons-round text-sm">swap_horiz</span>
                            <span>Đổi HLV</span>
                          </button>
                          <button
                            type="button"
                            className={styles.actionBtnDanger}
                            disabled={loading}
                            onClick={() => handleCancelSession(s)}
                            title="Hủy buổi học này"
                          >
                            <span className="material-icons-round text-sm">cancel</span>
                            <span>Hủy Buổi</span>
                          </button>
                        </>
                      )}

                      {/* Link View Class */}
                      {venueId && (
                        <Link
                          href={`/training/${venueId}`}
                          className={styles.actionBtnSecondary}
                        >
                          <span className="material-icons-round text-sm">visibility</span>
                          <span>Xem lớp</span>
                        </Link>
                      )}

                      {/* Coach Actions */}
                      {(!isAdminOrOwner) && (s.status === 'pending' || s.status === 'scheduled') && (
                        <button
                          type="button"
                          className={styles.actionBtnTeal}
                          disabled={loading}
                          onClick={() => handleCheckIn(s)}
                        >
                          <span className="material-icons-round text-sm">check_circle</span>
                          <span>Check-in Ngay</span>
                        </button>
                      )}

                      {/* Student Attendance Action when checked in */}
                      {s.status !== 'cancelled' && s.status !== 'pending' && s.status !== 'scheduled' && (
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

      {/* Override Coach Modal */}
      <Modal isOpen={!!overrideModalSession} onClose={loading ? () => {} : () => setOverrideModalSession(null)}>
        <ModalHeader title="Xếp HLV dạy thay" onClose={loading ? () => {} : () => setOverrideModalSession(null)} />
        <ModalBody>
          <form id="override-form" onSubmit={handleOverrideCoach} className="flex-col gap-4">
            <p className="text-sm text-secondary mb-4">
              Bạn đang xếp HLV dạy thay cho lớp <strong>{overrideModalSession?.className}</strong> (Giờ: {overrideModalSession?.startTime}).
            </p>
            <Select 
              label="Chọn HLV thay thế *"
              required
              value={selectedNewCoachId}
              onChange={e => setSelectedNewCoachId(e.target.value)}
              options={[
                { value: '', label: '-- Chọn HLV --' },
                ...availableCoaches.map((c: any) => ({ value: c.id, label: c.name }))
              ]}
            />
          </form>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={() => setOverrideModalSession(null)} disabled={loading}>Hủy</Button>
          <Button type="submit" form="override-form" isLoading={loading} variant="primary">Lưu thay đổi</Button>
        </ModalFooter>
      </Modal>

    </div>
  );
}
