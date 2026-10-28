'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useDashboardContext } from '../DashboardProvider';
import { useMySchedule } from '@/hooks/useMySchedule';

// UI Components
import { PageHeader } from '@/app/components/ui/PageHeader';
import { Card, CardContent } from '@/app/components/ui/Card';
import styles from './MySchedule.module.css';

const DAYS_OF_WEEK = [
  { value: 1, label: 'Thứ 2', short: 'T2' },
  { value: 2, label: 'Thứ 3', short: 'T3' },
  { value: 3, label: 'Thứ 4', short: 'T4' },
  { value: 4, label: 'Thứ 5', short: 'T5' },
  { value: 5, label: 'Thứ 6', short: 'T6' },
  { value: 6, label: 'Thứ 7', short: 'T7' },
  { value: 0, label: 'Chủ Nhật', short: 'CN' }
];

function calculateDuration(start?: string, end?: string): string {
  if (!start || !end) return '';
  const [sh, sm] = (start || '').split(':').map(Number);
  const [eh, em] = (end || '').split(':').map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return '';
  const diffMinutes = (eh * 60 + em) - (sh * 60 + sm);
  if (diffMinutes <= 0) return '';
  if (diffMinutes < 60) return `${diffMinutes} phút`;
  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  return mins > 0 ? `${hours}h ${mins}p` : `${hours} giờ`;
}

function calculateMinutes(start?: string, end?: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = (start || '').split(':').map(Number);
  const [eh, em] = (end || '').split(':').map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 0;
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  return diff > 0 ? diff : 0;
}

export default function MyScheduleClient() {
  const { context } = useDashboardContext();
  const organizationId = context?.organization?.id;
  const coachId = context?.coach?.id;

  const { schedules = [], isLoading } = useMySchedule(organizationId, coachId);

  // View mode: 'daily' (default) | 'weekly' | 'class'
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'class'>('daily');

  // Currently selected day (0 for Sunday, 1 for Monday...)
  const todayDayOfWeek = useMemo(() => new Date().getDay(), []);
  const [selectedDay, setSelectedDay] = useState<number>(todayDayOfWeek);

  // Compute dates for current week
  const weekDays = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay();
    const distanceToMonday = (currentDay + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - distanceToMonday);

    return DAYS_OF_WEEK.map((d, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      const isToday = d.value === currentDay;
      const count = (schedules || []).filter((s: any) => s.day_of_week === d.value).length;
      return {
        ...d,
        dateNumber: date.getDate(),
        fullDateStr: `${date.getDate()}/${date.getMonth() + 1}`,
        isToday,
        count
      };
    });
  }, [schedules]);

  // Overall KPIs
  const stats = useMemo(() => {
    const totalSessions = (schedules || []).length;
    const totalMinutes = (schedules || []).reduce((acc: number, s: any) => {
      return acc + calculateMinutes(s.start_time, s.end_time);
    }, 0);
    const totalHours = (totalMinutes / 60).toFixed(1).replace('.0', '');
    const uniqueClasses = new Set((schedules || []).map((s: any) => s.class_id)).size;

    return { totalSessions, totalHours, uniqueClasses };
  }, [schedules]);

  // Group by Class for 'class' view
  const classGroups = useMemo(() => {
    const map = new Map<string, any>();
    (schedules || []).forEach((s: any) => {
      const classId = s.class_id;
      if (!map.has(classId)) {
        map.set(classId, {
          classId,
          className: s.venue_classes?.name || 'Lớp học',
          venueName: s.venues?.name || 'Trụ sở chính',
          venueId: s.venue_id,
          startTime: s.start_time,
          endTime: s.end_time,
          days: new Set<number>([s.day_of_week]),
          sessions: [s]
        });
      } else {
        const existing = map.get(classId);
        existing.days.add(s.day_of_week);
        existing.sessions.push(s);
      }
    });
    return Array.from(map.values());
  }, [schedules]);

  // Schedules for selected day in 'daily' view
  const selectedDaySchedules = useMemo(() => {
    return (schedules || [])
      .filter((s: any) => s.day_of_week === selectedDay)
      .sort((a: any, b: any) => (a.start_time || '').localeCompare(b.start_time || ''));
  }, [schedules, selectedDay]);

  const selectedDayInfo = useMemo(() => {
    return weekDays.find(d => d.value === selectedDay);
  }, [weekDays, selectedDay]);

  if (!coachId) {
    return (
      <div className={styles.container}>
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
    <div className={styles.container}>
      {/* Header & View Switcher */}
      <div className={styles.headerRow}>
        <PageHeader 
          title="Lịch dạy của tôi" 
          description="Lịch giảng dạy cố định hàng tuần được phân công cho bạn"
        />

        {/* View Switcher Capsule */}
        <div className={styles.viewSwitcher}>
          <button
            type="button"
            className={`${styles.switchBtn} ${viewMode === 'daily' ? styles.switchBtnActive : ''}`}
            onClick={() => setViewMode('daily')}
            title="Xem theo từng ngày với chi tiết ca học"
          >
            <span className={`material-icons-round ${styles.switchIcon}`}>view_day</span>
            <span>Hàng ngày</span>
          </button>

          <button
            type="button"
            className={`${styles.switchBtn} ${viewMode === 'weekly' ? styles.switchBtnActive : ''}`}
            onClick={() => setViewMode('weekly')}
            title="Xem toàn cảnh 7 ngày trong tuần"
          >
            <span className={`material-icons-round ${styles.switchIcon}`}>grid_view</span>
            <span>Lưới tuần</span>
          </button>

          <button
            type="button"
            className={`${styles.switchBtn} ${viewMode === 'class' ? styles.switchBtnActive : ''}`}
            onClick={() => setViewMode('class')}
            title="Gom nhóm theo từng lớp học phụ trách"
          >
            <span className={`material-icons-round ${styles.switchIcon}`}>school</span>
            <span>Theo lớp</span>
          </button>
        </div>
      </div>

      {/* Quick KPI Bar */}
      <div className={styles.kpiBar}>
        <div className={styles.kpiPill}>
          <span className={styles.kpiDotTeal}></span>
          <span>Tổng ca tuần: <strong className={styles.kpiValue}>{stats.totalSessions} ca</strong></span>
        </div>
        <div className={styles.kpiPill}>
          <span className={styles.kpiDotOrange}></span>
          <span>Thời lượng: <strong className={styles.kpiValue}>~{stats.totalHours} giờ dạy</strong></span>
        </div>
        <div className={styles.kpiPill}>
          <span className={styles.kpiDotBlue}></span>
          <span>Lớp phụ trách: <strong className={styles.kpiValue}>{stats.uniqueClasses} lớp</strong></span>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-center text-muted">
            <div className="flex flex-col items-center gap-3">
              <span className="material-icons-round animate-spin text-3xl text-primary">sync</span>
              <p className="text-sm font-medium">Đang tải lịch giảng dạy của bạn...</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ======================================================= */}
          {/* VIEW MODE 1: HÀNG NGÀY (DAILY STRIP + FOCUS AGENDA)    */}
          {/* ======================================================= */}
          {viewMode === 'daily' && (
            <>
              {/* 7-Day Interactive Strip */}
              <div className={styles.dayStripWrapper}>
                <div className={styles.dayStripGrid}>
                  {weekDays.map(d => {
                    const isSelected = d.value === selectedDay;
                    return (
                      <div
                        key={d.value}
                        className={`
                          ${styles.dayPill}
                          ${isSelected ? styles.dayPillActive : ''}
                          ${d.isToday && !isSelected ? styles.dayPillToday : ''}
                          ${d.isToday && isSelected ? styles.dayPillActiveToday : ''}
                        `}
                        onClick={() => setSelectedDay(d.value)}
                      >
                        {d.isToday && (
                          <span className={styles.todayTag}>HÔM NAY</span>
                        )}
                        <span className={styles.dayName}>{d.label}</span>
                        <span className={styles.dayDate}>{d.dateNumber}</span>
                        <span className={`${styles.dayBadge} ${d.count === 0 ? styles.dayBadgeZero : ''}`}>
                          {d.count > 0 ? `● ${d.count} ca` : 'Nghỉ'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Focused Day Details */}
              <div className={styles.focusContainer}>
                <div className={styles.focusHeader}>
                  <div className={styles.focusTitleGroup}>
                    <h3 className={styles.focusTitle}>
                      {selectedDayInfo?.label}, {selectedDayInfo?.fullDateStr}
                    </h3>
                    {selectedDayInfo?.isToday && (
                      <span className={styles.todayHeaderBadge}>Hôm nay</span>
                    )}
                    <span className={styles.focusCountBadge}>
                      • {selectedDaySchedules.length > 0 
                        ? `${selectedDaySchedules.length} ca giảng dạy` 
                        : 'Không có ca dạy'}
                    </span>
                  </div>

                  {selectedDay !== todayDayOfWeek && (
                    <button
                      type="button"
                      onClick={() => setSelectedDay(todayDayOfWeek)}
                      className={styles.backToTodayBtn}
                      title="Quay lại xem lịch ngày hôm nay"
                    >
                      <span className="material-icons-round text-sm">today</span>
                      <span>Quay lại Hôm nay</span>
                    </button>
                  )}
                </div>

                {selectedDaySchedules.length === 0 ? (
                  <div className={styles.emptyStateContainer}>
                    <span className={`material-icons-round ${styles.emptyIcon}`}>weekend</span>
                    <div className={styles.emptyText}>
                      {selectedDayInfo?.isToday ? 'Hôm nay bạn không có lịch dạy' : `${selectedDayInfo?.label} không có lịch dạy`}
                    </div>
                    <div className={styles.emptySubtext}>
                      {selectedDayInfo?.isToday 
                        ? 'Chúc bạn có một ngày nghỉ ngơi tràn đầy năng lượng hoặc dành thời gian bồi dưỡng chuyên môn! 🌴'
                        : 'Bạn không có ca dạy cố định nào được xếp vào ngày này trong tuần.'}
                    </div>
                  </div>
                ) : (
                  <div className={styles.sessionList}>
                    {selectedDaySchedules.map((s: any) => {
                      const durationStr = calculateDuration(s.start_time, s.end_time);
                      const rawName = s.venue_classes?.name || 'Lớp võ thuật';
                      const displayName = rawName.toLowerCase().startsWith('lớp') ? rawName : `Lớp ${rawName}`;

                      return (
                        <div key={s.id} className={styles.focusSessionCard}>
                          <div className={styles.sessionLeft}>
                            {/* Dedicated Time Box */}
                            <div className={styles.sessionTimeBox}>
                              <div className={styles.sessionTimeRange}>
                                {s.start_time} - {s.end_time}
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
                                <span className={styles.roleChip}>HLV Phụ trách</span>
                              </div>
                              <div className={styles.sessionVenueTitle}>
                                <span>{s.venues?.name || 'Trụ sở chính'}</span>
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

                          <div className={styles.sessionActions}>
                            {s.venue_id && (
                              <Link
                                href={`/training/${s.venue_id}`}
                                className={styles.actionBtnSecondary}
                              >
                                <span className="material-icons-round text-sm">visibility</span>
                                <span>Xem lớp</span>
                              </Link>
                            )}
                            <Link
                              href={`/attendance?classId=${s.class_id || ''}`}
                              className={styles.actionBtnPrimary}
                            >
                              <span className="material-icons-round text-sm">fact_check</span>
                              <span>Điểm danh học viên →</span>
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ======================================================= */}
          {/* VIEW MODE 2: LƯỚI TUẦN THÍCH ỨNG (ADAPTIVE WEEKLY BOARD)*/}
          {/* ======================================================= */}
          {viewMode === 'weekly' && (
            <div className={styles.weekBoardWrapper}>
              <div className={styles.weekBoardGrid}>
                {weekDays.map(d => {
                  const daySchedules = (schedules || [])
                    .filter((s: any) => s.day_of_week === d.value)
                    .sort((a: any, b: any) => (a.start_time || '').localeCompare(b.start_time || ''));
                  const count = daySchedules.length;

                  return (
                    <div 
                      key={d.value} 
                      className={`${styles.weekCol} ${d.isToday ? styles.weekColToday : ''}`}
                    >
                      <div className={styles.weekColHeader}>
                        <span className={styles.weekColTitle}>
                          {d.label} {d.isToday && <span style={{ color: 'var(--accent-energy)', fontSize: '0.7rem' }}>(Hôm nay)</span>}
                        </span>
                        <span className={`${styles.weekColBadge} ${count > 0 ? styles.weekColBadgeActive : ''}`}>
                          {count} ca
                        </span>
                      </div>

                      <div className={styles.weekColBody}>
                        {count === 0 ? (
                          <div className={styles.weekEmptyDay}>
                            <span className="material-icons-round text-base opacity-40">event_available</span>
                            <span>Không có lịch</span>
                          </div>
                        ) : (
                          daySchedules.map((s: any) => {
                            const rawName = s.venue_classes?.name || 'Lớp võ thuật';
                            const displayName = rawName.toLowerCase().startsWith('lớp') ? rawName : `Lớp ${rawName}`;

                            return (
                              <div key={s.id} className={styles.weekSessionCard}>
                                <div className={styles.weekSessionTime}>
                                  <span className="material-icons-round text-xs">schedule</span>
                                  <span>{s.start_time} - {s.end_time}</span>
                                </div>
                                <div className={styles.weekSessionVenue} title={`Địa điểm: ${s.venues?.name || 'Trụ sở'}`}>
                                  <span className="material-icons-round text-xs" style={{ color: 'var(--accent-energy, #FF6B35)' }}>place</span>
                                  <span>{s.venues?.name || 'Trụ sở'}</span>
                                </div>
                                <div className={styles.weekSessionClass}>
                                  <span>🥋</span>
                                  <span>{displayName}</span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ======================================================= */}
          {/* VIEW MODE 3: THEO LỚP HỌC (CLASS BENTO CARDS)          */}
          {/* ======================================================= */}
          {viewMode === 'class' && (
            <div className={styles.classBentoGrid}>
              {classGroups.length === 0 ? (
                <Card className="col-span-full">
                  <CardContent className="p-8 text-center text-muted">
                    Bạn hiện chưa được phân công phụ trách lớp học nào.
                  </CardContent>
                </Card>
              ) : (
                classGroups.map(cg => {
                  const durationStr = calculateDuration(cg.startTime, cg.endTime);
                  return (
                    <div key={cg.classId} className={styles.classBentoCard}>
                      <div className={styles.classCardHeader}>
                        <div>
                          <h4 className={styles.classCardTitle}>{cg.className}</h4>
                          <div className={styles.classCardVenue}>
                            <span className="material-icons-round text-sm">place</span>
                            <span>{cg.venueName}</span>
                          </div>
                        </div>
                        <span className={styles.classFreqBadge}>
                          {cg.days.size} buổi / tuần
                        </span>
                      </div>

                      <div className={styles.classTimeBanner}>
                        <div className={styles.classTimeText}>
                          <span className="material-icons-round text-primary text-sm">schedule</span>
                          <span>{cg.startTime} - {cg.endTime}</span>
                        </div>
                        {durationStr && (
                          <span className={styles.classDurationText}>{durationStr}</span>
                        )}
                      </div>

                      <div className={styles.classDaysSection}>
                        <div className={styles.classDaysLabel}>Lịch học trong tuần:</div>
                        <div className={styles.classDaysList}>
                          {DAYS_OF_WEEK.map(d => {
                            const isClassDay = cg.days.has(d.value);
                            return (
                              <span
                                key={d.value}
                                className={`${styles.dayChip} ${isClassDay ? styles.dayChipActive : styles.dayChipInactive}`}
                              >
                                {d.short}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border-light mt-1">
                        <Link
                          href={`/training/${cg.venueId}`}
                          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                        >
                          <span className="material-icons-round text-sm">info</span>
                          Chi tiết lớp
                        </Link>
                        <Link
                          href={`/attendance?classId=${cg.classId}`}
                          className="text-xs font-bold text-accent hover:underline flex items-center gap-1"
                          style={{ color: 'var(--accent-energy, #FF6B35)' }}
                        >
                          <span>Điểm danh lớp</span>
                          <span className="material-icons-round text-sm">arrow_forward</span>
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
