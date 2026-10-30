'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { addScheduleAction, updateScheduleAction, deleteScheduleAction } from './actions';
import { useSchedule } from '@/hooks/useSchedule';
import { useDashboardContext } from '../DashboardProvider';

// UI Components
import { PageHeader } from '@/app/components/ui/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { Input, Select } from '@/app/components/ui/Input';
import { Card, CardContent } from '@/app/components/ui/Card';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/app/components/ui/Modal';
import styles from './ScheduleClient.module.css';

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

export default function ScheduleClient() {
  const { context } = useDashboardContext();
  const organizationId = context?.organization?.id;
  const currentUserRole = context?.membership?.role;

  const { schedules = [], classes = [], coaches = [], venues = [], isLoading } = useSchedule(organizationId);
  const queryClient = useQueryClient();

  // View mode: 'daily' (default) | 'weekly' | 'class'
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'class'>('daily');

  // Currently selected day (0 for Sunday, 1 for Monday...)
  const todayDayOfWeek = useMemo(() => new Date().getDay(), []);
  const [selectedDay, setSelectedDay] = useState<number>(todayDayOfWeek);

  // Filters for Admin
  const [venueFilter, setVenueFilter] = useState<string>('');
  const [coachFilter, setCoachFilter] = useState<string>('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    coach_id: '',
    venue_id: '',
    class_id: '',
    day_of_week: 1,
    start_time: '18:00',
    end_time: '20:00'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isAdminOrOwner = currentUserRole === 'admin' || currentUserRole === 'owner';

  // Filtered schedules
  const filteredSchedules = useMemo(() => {
    return schedules.filter((s: any) => {
      if (venueFilter && s.venue_id !== venueFilter) return false;
      if (coachFilter && s.coach_id !== coachFilter) return false;
      return true;
    });
  }, [schedules, venueFilter, coachFilter]);

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
      const count = filteredSchedules.filter((s: any) => s.day_of_week === d.value).length;
      return {
        ...d,
        dateNumber: date.getDate(),
        fullDateStr: `${date.getDate()}/${date.getMonth() + 1}`,
        isToday,
        count
      };
    });
  }, [filteredSchedules]);

  // Overall KPIs
  const stats = useMemo(() => {
    const totalSessions = filteredSchedules.length;
    const totalMinutes = filteredSchedules.reduce((acc: number, s: any) => {
      return acc + calculateMinutes(s.start_time, s.end_time);
    }, 0);
    const totalHours = (totalMinutes / 60).toFixed(1).replace('.0', '');
    const uniqueClasses = new Set(filteredSchedules.map((s: any) => s.class_id)).size;
    const uniqueCoaches = new Set(filteredSchedules.filter((s: any) => s.coach_id).map((s: any) => s.coach_id)).size;

    return { totalSessions, totalHours, uniqueClasses, uniqueCoaches };
  }, [filteredSchedules]);

  // Group by Class for 'class' view
  const classGroups = useMemo(() => {
    const map = new Map<string, any>();
    filteredSchedules.forEach((s: any) => {
      const classId = s.class_id;
      if (!map.has(classId)) {
        map.set(classId, {
          classId,
          className: s.venue_classes?.name || 'Chưa đặt tên lớp',
          venueId: s.venue_id,
          venueName: s.venues?.name || 'Trụ sở chính',
          coachName: s.coachName || 'Chưa gán HLV',
          startTime: s.start_time,
          endTime: s.end_time,
          schedules: []
        });
      }
      map.get(classId).schedules.push(s);
    });
    return Array.from(map.values()).sort((a, b) => a.className.localeCompare(b.className));
  }, [filteredSchedules]);

  // Focus day schedules
  const focusDaySchedules = useMemo(() => {
    return filteredSchedules
      .filter((s: any) => s.day_of_week === selectedDay)
      .sort((a: any, b: any) => (a.start_time || '').localeCompare(b.start_time || ''));
  }, [filteredSchedules, selectedDay]);

  const selectedDayInfo = useMemo(() => {
    return weekDays.find(d => d.value === selectedDay) || weekDays[0];
  }, [weekDays, selectedDay]);

  const resetForm = () => {
    setFormData({ coach_id: '', venue_id: '', class_id: '', day_of_week: 1, start_time: '18:00', end_time: '20:00' });
    setEditingId(null);
    setIsModalOpen(false);
    setError('');
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['schedules', organizationId] });
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (s: any) => {
    setFormData({
      coach_id: s.coach_id || '',
      venue_id: s.venue_id || '',
      class_id: s.class_id || '',
      day_of_week: s.day_of_week ?? 1,
      start_time: s.start_time || '18:00',
      end_time: s.end_time || '20:00'
    });
    setEditingId(s.id);
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    let res;
    if (editingId) {
      res = await updateScheduleAction(editingId, formData);
    } else {
      res = await addScheduleAction(formData);
    }

    setLoading(false);
    if (res.success) {
      resetForm();
      handleSuccess();
    } else setError(res.error || 'Lỗi khi xếp lịch');
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bạn có chắc muốn xóa ca lịch này?')) {
      setLoading(true);
      const res = await deleteScheduleAction(id);
      setLoading(false);
      if (res.success) handleSuccess();
      else alert(res.error || 'Lỗi khi xóa');
    }
  };

  return (
    <div className={styles.container}>
      <PageHeader
        title="Lịch dạy tuần"
        description="Quản lý và điều phối lịch học định kỳ toàn trung tâm"
        primaryAction={isAdminOrOwner ? (
          <Button
            onClick={openAddModal}
            leftIcon={<span className="material-icons-round">calendar_today</span>}
          >
            Thêm Lịch Mới
          </Button>
        ) : undefined}
      />

      {/* Top Controls: Filters & View Switcher */}
      <div className={styles.topControlsRow}>
        <div className={styles.filterBar}>
          <div className={styles.filterLabel}>
            <span className="material-icons-round" style={{ fontSize: '16px' }}>filter_alt</span>
            <span>Bộ lọc:</span>
          </div>

          <select
            className={styles.filterSelect}
            value={venueFilter}
            onChange={(e) => setVenueFilter(e.target.value)}
            title="Lọc theo cơ sở giảng dạy"
          >
            <option value="">-- Tất cả cơ sở --</option>
            {venues.map((v: any) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>

          <select
            className={styles.filterSelect}
            value={coachFilter}
            onChange={(e) => setCoachFilter(e.target.value)}
            title="Lọc theo huấn luyện viên"
          >
            <option value="">-- Tất cả HLV --</option>
            {coaches.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {(venueFilter || coachFilter) && (
            <button
              type="button"
              className={styles.clearFilterBtn}
              onClick={() => {
                setVenueFilter('');
                setCoachFilter('');
              }}
              title="Xóa bộ lọc"
            >
              <span className="material-icons-round" style={{ fontSize: '14px' }}>close</span>
              <span>Xóa lọc</span>
            </button>
          )}
        </div>

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
            title="Xem toàn cảnh 7 ngày trong tuần không cuộn ngang"
          >
            <span className={`material-icons-round ${styles.switchIcon}`}>grid_view</span>
            <span>Lưới tuần</span>
          </button>

          <button
            type="button"
            className={`${styles.switchBtn} ${viewMode === 'class' ? styles.switchBtnActive : ''}`}
            onClick={() => setViewMode('class')}
            title="Gom nhóm theo từng lớp học"
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
          <span>Lớp hoạt động: <strong className={styles.kpiValue}>{stats.uniqueClasses} lớp</strong></span>
        </div>
        <div className={styles.kpiPill}>
          <span className={styles.kpiDotPurple}></span>
          <span>HLV phụ trách: <strong className={styles.kpiValue}>{stats.uniqueCoaches} HLV</strong></span>
        </div>
      </div>

      {/* Modal Add / Edit Schedule */}
      <Modal isOpen={isModalOpen} onClose={loading ? () => { } : resetForm}>
        <ModalHeader title={editingId ? "Sửa Lịch Dạy" : "Thêm Lịch Dạy"} onClose={loading ? () => { } : resetForm} />
        <ModalBody>
          {error && <div style={{ color: 'var(--danger)', marginBottom: '16px', fontSize: '0.875rem' }}>{error}</div>}
          <form id="schedule-form" onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
            <Select
              label="Lớp học *"
              required
              value={formData.class_id}
              onChange={e => setFormData({ ...formData, class_id: e.target.value })}
              options={[
                { value: '', label: '-- Chọn lớp --' },
                ...classes.map((c: any) => ({ value: c.id, label: c.name }))
              ]}
            />
            <Select
              label="Huấn luyện viên *"
              required
              value={formData.coach_id}
              onChange={e => setFormData({ ...formData, coach_id: e.target.value })}
              options={[
                { value: '', label: '-- Chọn HLV --' },
                ...coaches.map((c: any) => ({ value: c.id, label: c.name }))
              ]}
            />
            <Select
              label="Địa điểm / Cơ sở *"
              required
              value={formData.venue_id}
              onChange={e => setFormData({ ...formData, venue_id: e.target.value })}
              options={[
                { value: '', label: '-- Chọn địa điểm --' },
                ...venues.map((v: any) => ({ value: v.id, label: v.name }))
              ]}
            />
            <Select
              label="Ngày trong tuần *"
              value={formData.day_of_week.toString()}
              onChange={e => setFormData({ ...formData, day_of_week: Number(e.target.value) })}
              options={DAYS_OF_WEEK.map(d => ({ value: d.value.toString(), label: d.label }))}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Input
                label="Giờ bắt đầu *"
                type="time"
                required
                value={formData.start_time}
                onChange={e => setFormData({ ...formData, start_time: e.target.value })}
              />
              <Input
                label="Giờ kết thúc *"
                type="time"
                required
                value={formData.end_time}
                onChange={e => setFormData({ ...formData, end_time: e.target.value })}
              />
            </div>
          </form>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={resetForm} disabled={loading}>Hủy</Button>
          <Button type="submit" form="schedule-form" isLoading={loading} variant="primary">Lưu Lịch</Button>
        </ModalFooter>
      </Modal>

      {/* Main Content Area */}
      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-center text-muted">
            <div className="flex flex-col items-center gap-3">
              <span className="material-icons-round animate-spin text-3xl text-primary">sync</span>
              <p className="text-sm font-medium">Đang tải toàn bộ lịch giảng dạy...</p>
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
                      Lịch dạy {selectedDayInfo.label} ({selectedDayInfo.fullDateStr})
                    </h3>
                    {selectedDayInfo.isToday && (
                      <span className={styles.todayHeaderBadge}>Hôm nay</span>
                    )}
                    <span className={styles.focusCountBadge}>
                      {focusDaySchedules.length} ca học được xếp
                    </span>
                  </div>

                  {!selectedDayInfo.isToday && (
                    <button
                      type="button"
                      className={styles.backToTodayBtn}
                      onClick={() => setSelectedDay(todayDayOfWeek)}
                    >
                      <span className="material-icons-round" style={{ fontSize: '15px' }}>today</span>
                      <span>Quay lại Hôm nay</span>
                    </button>
                  )}
                </div>

                {focusDaySchedules.length === 0 ? (
                  <div className={styles.emptyStateCard}>
                    <span className={`material-icons-round ${styles.emptyIcon}`}>event_busy</span>
                    <div className={styles.emptyTitle}>Không có ca học nào vào {selectedDayInfo.label}</div>
                    <p className={styles.emptySubtext}>
                      Chưa có lớp nào được xếp lịch định kỳ vào ngày này hoặc các ca học không khớp với bộ lọc.
                    </p>
                    {isAdminOrOwner && (
                      <Button onClick={openAddModal} variant="outline" size="sm" style={{ marginTop: '8px' }}>
                        + Xếp Lịch Cho {selectedDayInfo.label}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className={styles.sessionList}>
                    {focusDaySchedules.map((s: any) => {
                      const coachDisplayName = s.coachName || 'Chưa gán HLV';
                      const venueName = s.venues?.name || 'Trụ sở chính';
                      const classNameStr = s.venue_classes?.name || 'Chưa chọn lớp';
                      const duration = calculateDuration(s.start_time, s.end_time);

                      return (
                        <div key={s.id} className={styles.focusSessionCard}>
                          <div className={styles.sessionLeft}>
                            {/* Time Box */}
                            <div className={styles.sessionTimeBox}>
                              <span className={styles.sessionTimeRange}>
                                {s.start_time} - {s.end_time}
                              </span>
                              {duration && (
                                <span className={styles.sessionDuration}>{duration}</span>
                              )}
                            </div>

                            {/* Main Info */}
                            <div className={styles.sessionMainInfo}>
                              <div className={styles.sessionCategoryRow}>
                                <span className={styles.venueBadge}>
                                  <span className="material-icons-round">place</span>
                                  Nơi dạy
                                </span>
                                <span className={styles.sessionVenueTitle}>
                                  {venueName}
                                </span>
                              </div>

                              <div className={styles.sessionClassSubRow}>
                                <span className={styles.classSubChip} title={classNameStr}>
                                  🥋 {classNameStr}
                                </span>
                                <span className={`${styles.coachChip} ${!s.coach_id ? styles.coachChipUnassigned : ''}`}>
                                  <span className="material-icons-round">person</span>
                                  {coachDisplayName}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Admin Actions */}
                          {isAdminOrOwner && (
                            <div className={styles.sessionActions}>
                              <Link
                                href={`/attendance?classId=${s.class_id}`}
                                className={styles.actionBtnSecondary}
                                title="Điểm danh buổi học này"
                              >
                                <span className="material-icons-round" style={{ fontSize: '15px', color: 'var(--primary)' }}>how_to_reg</span>
                                <span>Điểm danh</span>
                              </Link>
                              <button
                                type="button"
                                onClick={() => openEditModal(s)}
                                disabled={loading}
                                className={styles.actionBtnEdit}
                                title="Chỉnh sửa ca lịch"
                              >
                                <span className="material-icons-round" style={{ fontSize: '15px' }}>edit</span>
                                <span>Sửa</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(s.id)}
                                disabled={loading}
                                className={styles.actionBtnDelete}
                                title="Xóa ca lịch này"
                              >
                                <span className="material-icons-round" style={{ fontSize: '15px' }}>delete_outline</span>
                                <span>Xóa</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ======================================================= */}
          {/* VIEW MODE 2: LƯỚI TUẦN THÍCH ỨNG (ADAPTIVE WEEKLY GRID) */}
          {/* ======================================================= */}
          {viewMode === 'weekly' && (
            <div className={styles.weekBoardWrapper}>
              <div className={styles.weekBoardGrid}>
                {DAYS_OF_WEEK.map(day => {
                  const daySchedules = filteredSchedules
                    .filter((s: any) => s.day_of_week === day.value)
                    .sort((a: any, b: any) => (a.start_time || '').localeCompare(b.start_time || ''));
                  const count = daySchedules.length;
                  const isToday = day.value === todayDayOfWeek;

                  return (
                    <div
                      key={day.value}
                      className={`${styles.weekCol} ${isToday ? styles.weekColToday : ''}`}
                    >
                      <div className={styles.weekColHeader}>
                        <span className={styles.weekColTitle}>{day.label}</span>
                        <span className={`${styles.weekColBadge} ${count > 0 ? styles.weekColBadgeActive : ''}`}>
                          {count} ca
                        </span>
                      </div>

                      <div className={styles.weekColBody}>
                        {count === 0 ? (
                          <div className={styles.weekEmptyDay}>
                            <span className="material-icons-round" style={{ fontSize: '16px', opacity: 0.5 }}>event_busy</span>
                            <span>Không có ca</span>
                          </div>
                        ) : (
                          daySchedules.map((s: any) => {
                            const coachDisplayName = s.coachName || 'Chưa gán HLV';
                            return (
                              <div key={s.id} className={styles.weekSessionCard}>
                                <div className={styles.weekSessionHeader}>
                                  <span className={styles.weekSessionTime}>
                                    <span className="material-icons-round" style={{ fontSize: '11px' }}>schedule</span>
                                    {s.start_time} - {s.end_time}
                                  </span>
                                </div>

                                <div className={styles.weekSessionVenue} title={s.venues?.name}>
                                  <span className="material-icons-round" style={{ fontSize: '14px', color: 'var(--accent-energy, #FF6B35)' }}>place</span>
                                  <span>{s.venues?.name || 'Trụ sở'}</span>
                                </div>

                                <div className={styles.weekSessionClass} title={s.venue_classes?.name}>
                                  🥋 {s.venue_classes?.name || 'Chưa chọn lớp'}
                                </div>

                                <div className={styles.weekSessionCoach} title={`HLV: ${coachDisplayName}`}>
                                  <span className="material-icons-round">person</span>
                                  <span>{coachDisplayName}</span>
                                </div>

                                {isAdminOrOwner && (
                                  <div className={styles.weekSessionActions}>
                                    <button
                                      type="button"
                                      onClick={() => openEditModal(s)}
                                      disabled={loading}
                                      className={`${styles.weekActionBtn} ${styles.weekActionBtnEdit}`}
                                      title="Sửa lịch"
                                    >
                                      Sửa
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDelete(s.id)}
                                      disabled={loading}
                                      className={`${styles.weekActionBtn} ${styles.weekActionBtnDelete}`}
                                      title="Xóa lịch"
                                    >
                                      Xóa
                                    </button>
                                  </div>
                                )}
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
            <>
              {classGroups.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted">
                    <p className="text-sm font-medium">Không tìm thấy lớp học nào phù hợp với bộ lọc hiện tại.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className={styles.classBentoGrid}>
                  {classGroups.map((group: any) => {
                    const daysWithClass = new Set(group.schedules.map((s: any) => s.day_of_week));
                    const duration = calculateDuration(group.startTime, group.endTime);

                    return (
                      <div key={group.classId} className={styles.classBentoCard}>
                        <div className={styles.classCardHeader}>
                          <div className={styles.classCardCategoryRow}>
                            <h4 className={styles.classCardVenueTitle}>
                              📍 {group.venueName}
                            </h4>
                            <span className={styles.classFreqBadge}>
                              {group.schedules.length} ca / tuần
                            </span>
                          </div>

                          <div className={styles.classCardClassRow}>
                            <span className={styles.classSubChip}>
                              🥋 {group.className}
                            </span>
                          </div>
                        </div>

                        {/* Time Banner */}
                        <div className={styles.classTimeBanner}>
                          <span className={styles.classTimeText}>
                            <span className="material-icons-round" style={{ fontSize: '16px', color: 'var(--primary)' }}>schedule</span>
                            {group.startTime} - {group.endTime}
                          </span>
                          {duration && (
                            <span className={styles.classDurationText}>{duration}</span>
                          )}
                        </div>

                        {/* Coach row */}
                        <div className={styles.classCoachRow}>
                          <span className="material-icons-round">person</span>
                          <span>HLV phụ trách: <strong>{group.coachName}</strong></span>
                        </div>

                        {/* Active Days Strip */}
                        <div className={styles.classDaysSection}>
                          <span className={styles.classDaysLabel}>Lịch học trong tuần:</span>
                          <div className={styles.classDaysList}>
                            {DAYS_OF_WEEK.map(d => {
                              const isActive = daysWithClass.has(d.value);
                              return (
                                <span
                                  key={d.value}
                                  className={`${styles.dayChip} ${isActive ? styles.dayChipActive : styles.dayChipInactive}`}
                                  title={`${d.label}: ${isActive ? 'Có ca dạy' : 'Nghỉ'}`}
                                >
                                  {d.short}
                                </span>
                              );
                            })}
                          </div>
                        </div>

                        {/* Footer Actions */}
                        <div className={styles.classCardFooter}>
                          <Link
                            href={`/attendance?classId=${group.classId}`}
                            className={styles.actionBtnSecondary}
                            title="Điểm danh lớp này"
                          >
                            <span className="material-icons-round" style={{ fontSize: '15px', color: 'var(--primary)' }}>how_to_reg</span>
                            <span>Điểm danh</span>
                          </Link>

                          {isAdminOrOwner && (
                            <div className={styles.classActionGroup}>
                              <button
                                type="button"
                                onClick={() => openEditModal(group.schedules[0])}
                                disabled={loading}
                                className={styles.actionBtnEdit}
                                title="Chỉnh sửa ca đầu tiên của lớp này"
                              >
                                <span className="material-icons-round" style={{ fontSize: '15px' }}>edit</span>
                                <span>Sửa</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
