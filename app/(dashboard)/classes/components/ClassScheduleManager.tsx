'use client';

import { useState } from 'react';
import { 
  addScheduleToClassAction, 
  updateScheduleTimeAction, 
  deleteScheduleFromClassAction 
} from '../actions';
import { Button } from '@/app/components/ui/Button';
import { Input, Select } from '@/app/components/ui/Input';
import styles from './ClassScheduleManager.module.css';

const DAYS_OPTIONS = [
  { value: '1', label: 'Thứ 2', name: 'T2', sub: 'Thứ Hai', num: 1, isWeekend: false },
  { value: '2', label: 'Thứ 3', name: 'T3', sub: 'Thứ Ba', num: 2, isWeekend: false },
  { value: '3', label: 'Thứ 4', name: 'T4', sub: 'Thứ Tư', num: 3, isWeekend: false },
  { value: '4', label: 'Thứ 5', name: 'T5', sub: 'Thứ Năm', num: 4, isWeekend: false },
  { value: '5', label: 'Thứ 6', name: 'T6', sub: 'Thứ Sáu', num: 5, isWeekend: false },
  { value: '6', label: 'Thứ 7', name: 'T7', sub: 'Thứ Bảy', num: 6, isWeekend: true },
  { value: '0', label: 'CN', name: 'CN', sub: 'Chủ Nhật', num: 0, isWeekend: true }
];

const PRESETS = [
  { label: '2 - 4 - 6', days: [1, 3, 5] },
  { label: '3 - 5 - 7', days: [2, 4, 6] },
  { label: 'Cuối tuần (T7, CN)', days: [6, 0] },
  { label: 'T2 - T6', days: [1, 2, 3, 4, 5] },
  { label: 'Tất cả cả tuần', days: [1, 2, 3, 4, 5, 6, 0] },
];

export function formatDayOfWeek(day: number) {
  return day === 0 ? 'CN' : `Thứ ${day + 1}`;
}

export function formatClassSchedules(schedules?: any[]) {
  const activeSchedules = (schedules || []).filter((s:any) => s.status === 'active');
  if (activeSchedules.length === 0) return 'Chưa có lịch học';
  const days = activeSchedules.map((s:any) => formatDayOfWeek(s.day_of_week));
  const uniqueDays = Array.from(new Set(days));
  return uniqueDays.join(', ');
}

interface ClassScheduleManagerProps {
  classId: string;
  schedules: any[];
  onSuccess: () => void;
}

export default function ClassScheduleManager({ classId, schedules, onSuccess }: ClassScheduleManagerProps) {
  const [isAddingSchedule, setIsAddingSchedule] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState('');

  const [quickAddData, setQuickAddData] = useState({
    days_of_week: [] as number[],
    start_time: '18:00',
    end_time: '19:30',
    effective_from: '',
    effective_until: ''
  });

  const [editScheduleData, setEditScheduleData] = useState({
    day_of_week: 1,
    start_time: '18:00',
    end_time: '19:30',
    effective_from: '',
    effective_until: ''
  });

  const activeSchedules = schedules
    .filter((s: any) => s.status === 'active')
    .sort((a: any, b: any) => {
      // Sort Monday (1) through Saturday (6) first, Sunday (0) last
      const orderA = a.day_of_week === 0 ? 7 : a.day_of_week;
      const orderB = b.day_of_week === 0 ? 7 : b.day_of_week;
      return orderA - orderB;
    });

  const handleAddSchedule = async () => {
    setScheduleError('');
    if (quickAddData.days_of_week.length === 0) {
      setScheduleError('Vui lòng chọn ít nhất một ngày học trong tuần');
      return;
    }

    setScheduleLoading(true);
    const res = await addScheduleToClassAction({
      class_id: classId,
      ...quickAddData
    });
    setScheduleLoading(false);
    if (res.success) {
      setIsAddingSchedule(false);
      setQuickAddData({
        days_of_week: [],
        start_time: '18:00',
        end_time: '19:30',
        effective_from: '',
        effective_until: ''
      });
      onSuccess();
    } else {
      setScheduleError(res.error || 'Lỗi thêm lịch học');
    }
  };

  const handleUpdateSchedule = async (id: string) => {
    setScheduleError('');
    setScheduleLoading(true);
    const res = await updateScheduleTimeAction(id, editScheduleData);
    setScheduleLoading(false);
    if (res.success) {
      setEditingScheduleId(null);
      onSuccess();
    } else {
      setScheduleError(res.error || 'Lỗi cập nhật lịch học');
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa lịch này khỏi lớp?')) return;
    setScheduleLoading(true);
    const res = await deleteScheduleFromClassAction(id);
    setScheduleLoading(false);
    if (res.success) {
      onSuccess();
    } else {
      alert(res.error || 'Lỗi khi xóa');
    }
  };

  const toggleDaySelection = (dayValue: number) => {
    setQuickAddData(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(dayValue)
        ? prev.days_of_week.filter(d => d !== dayValue)
        : [...prev.days_of_week, dayValue]
    }));
  };

  const applyPreset = (presetDays: number[]) => {
    const isExactMatch = 
      quickAddData.days_of_week.length === presetDays.length &&
      presetDays.every(d => quickAddData.days_of_week.includes(d));

    if (isExactMatch) {
      // Toggle off
      setQuickAddData(prev => ({ ...prev, days_of_week: [] }));
    } else {
      // Set preset
      setQuickAddData(prev => ({ ...prev, days_of_week: [...presetDays] }));
    }
  };

  const calculateDuration = (start: string, end: string) => {
    if (!start || !end) return '';
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff <= 0) return 'Giờ kết thúc phải sau giờ bắt đầu';
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    if (hours > 0 && mins > 0) return `${diff} phút (${hours}h ${mins}m)`;
    if (hours > 0) return `${diff} phút (${hours} giờ)`;
    return `${diff} phút`;
  };

  return (
    <div className={styles.scheduleSection}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>
          <span className={`material-icons-round ${styles.sectionTitleIcon}`}>schedule</span>
          <span>Lịch học của lớp</span>
        </div>
        <span className={styles.scheduleCountBadge}>
          {activeSchedules.length} buổi / tuần
        </span>
      </div>
      
      {scheduleError && (
        <div className={styles.errorBanner}>
          <span className="material-icons-round" style={{ fontSize: 18 }}>error_outline</span>
          <span>{scheduleError}</span>
        </div>
      )}

      {/* Existing Schedules List */}
      <div className={styles.scheduleList}>
        {activeSchedules.map((sch: any) => {
          const isWeekend = sch.day_of_week === 6 || sch.day_of_week === 0;
          return (
            <div key={sch.id} className={styles.scheduleItem}>
              {editingScheduleId === sch.id ? (
                <div style={{ width: '100%', padding: '4px 0' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                    <Select
                      label="Thứ"
                      value={editScheduleData.day_of_week.toString()}
                      onChange={(e) => setEditScheduleData({...editScheduleData, day_of_week: parseInt(e.target.value)})}
                      options={DAYS_OPTIONS}
                    />
                    <Input
                      label="Bắt đầu"
                      type="time"
                      value={editScheduleData.start_time}
                      onChange={(e) => setEditScheduleData({...editScheduleData, start_time: e.target.value})}
                    />
                    <Input
                      label="Kết thúc"
                      type="time"
                      value={editScheduleData.end_time}
                      onChange={(e) => setEditScheduleData({...editScheduleData, end_time: e.target.value})}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <Button variant="ghost" size="sm" onClick={() => setEditingScheduleId(null)}>Hủy</Button>
                    <Button variant="primary" size="sm" isLoading={scheduleLoading} onClick={() => handleUpdateSchedule(sch.id)}>Lưu</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className={styles.scheduleItemLeft}>
                    <span className={`${styles.dayPillBadge} ${isWeekend ? styles.weekendBadge : ''}`}>
                      {formatDayOfWeek(sch.day_of_week)}
                    </span>
                    <div className={styles.timeDisplay}>
                      <span className={`material-icons-round ${styles.timeIcon}`}>schedule</span>
                      <span>{sch.start_time} – {sch.end_time}</span>
                    </div>
                  </div>
                  <div className={styles.scheduleItemActions}>
                    <button 
                      type="button" 
                      className={styles.actionIconBtn} 
                      title="Chỉnh sửa giờ"
                      disabled={scheduleLoading}
                      onClick={() => {
                        setEditScheduleData({
                          day_of_week: sch.day_of_week,
                          start_time: sch.start_time,
                          end_time: sch.end_time,
                          effective_from: sch.effective_from || '',
                          effective_until: sch.effective_until || ''
                        });
                        setEditingScheduleId(sch.id);
                        setIsAddingSchedule(false);
                      }}
                    >
                      <span className="material-icons-round" style={{ fontSize: 18 }}>edit</span>
                    </button>
                    <button 
                      type="button" 
                      className={`${styles.actionIconBtn} ${styles.actionIconBtnDanger}`}
                      title="Xóa buổi này"
                      disabled={scheduleLoading}
                      onClick={() => handleDeleteSchedule(sch.id)}
                    >
                      <span className="material-icons-round" style={{ fontSize: 18 }}>delete</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
        {activeSchedules.length === 0 && (
          <div className={styles.emptySchedule}>
            Chưa có lịch học nào. Bấm &apos;Thêm lịch học&apos; bên dưới để thiết lập thời gian học.
          </div>
        )}
      </div>

      {/* Add New Schedule Section */}
      {!isAddingSchedule ? (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => { setIsAddingSchedule(true); setEditingScheduleId(null); }}
          leftIcon={<span className="material-icons-round" style={{ fontSize: 18 }}>add</span>}
        >
          Thêm lịch học
        </Button>
      ) : (
        <div className={styles.addScheduleCard}>
          {/* Section Header with Live Counter Badge */}
          <div className={styles.cardHeaderRow}>
            <div className={styles.cardHeaderTitle}>
              <span className="material-icons-round" style={{ fontSize: 18, color: 'var(--primary)' }}>calendar_today</span>
              <span>Ngày học trong tuần</span>
            </div>
            {quickAddData.days_of_week.length > 0 && (
              <span className={styles.selectedCountBadge}>
                <span className="material-icons-round" style={{ fontSize: 13 }}>check</span>
                Đã chọn: {quickAddData.days_of_week.length} ngày
              </span>
            )}
          </div>

          {/* Quick Presets Micro-chips */}
          <div className={styles.presetsRow}>
            <span className={styles.presetLabel}>Chọn nhanh:</span>
            {PRESETS.map(preset => {
              const isMatch = 
                quickAddData.days_of_week.length === preset.days.length &&
                preset.days.every(d => quickAddData.days_of_week.includes(d));
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPreset(preset.days)}
                  className={`${styles.presetChip} ${isMatch ? styles.presetChipActive : ''}`}
                >
                  {preset.label}
                </button>
              );
            })}
            {quickAddData.days_of_week.length > 0 && (
              <button
                type="button"
                onClick={() => setQuickAddData(prev => ({ ...prev, days_of_week: [] }))}
                className={`${styles.presetChip} ${styles.presetChipClear}`}
                title="Bỏ chọn tất cả"
              >
                Xóa chọn
              </button>
            )}
          </div>

          {/* 7-Day Modern Grid */}
          <div className={styles.daysGrid}>
            {DAYS_OPTIONS.map(day => {
              const isSelected = quickAddData.days_of_week.includes(day.num);
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDaySelection(day.num)}
                  className={`${styles.dayBtn} ${day.isWeekend ? styles.dayBtnWeekend : ''} ${isSelected ? styles.dayBtnSelected : ''}`}
                  title={`${day.sub} (${isSelected ? 'Đang chọn' : 'Bấm để chọn'})`}
                >
                  <span className={styles.dayBtnName}>{day.name}</span>
                  <span className={styles.dayBtnSub}>{day.sub}</span>
                  <span className={styles.dayIndicatorDot} />
                </button>
              );
            })}
          </div>
          
          {/* Time Range Inputs */}
          <div className={styles.timeInputsGrid}>
            <Input
              label="Giờ bắt đầu"
              type="time"
              value={quickAddData.start_time}
              onChange={e => setQuickAddData({...quickAddData, start_time: e.target.value})}
            />
            <Input
              label="Giờ kết thúc"
              type="time"
              value={quickAddData.end_time}
              onChange={e => setQuickAddData({...quickAddData, end_time: e.target.value})}
            />
          </div>

          {/* Dynamic Duration Preview */}
          <div className={styles.durationPreview}>
            <span className="material-icons-round" style={{ fontSize: 15, color: 'var(--primary)' }}>timelapse</span>
            <span>Thời lượng mỗi buổi: <strong>{calculateDuration(quickAddData.start_time, quickAddData.end_time)}</strong></span>
          </div>
          
          {/* Action Buttons */}
          <div className={styles.cardActionsRow}>
            <button 
              type="button" 
              className={styles.btnCancelGhost} 
              onClick={() => setIsAddingSchedule(false)}
            >
              Hủy
            </button>
            <button 
              type="button" 
              className={styles.btnAddPill} 
              disabled={scheduleLoading || quickAddData.days_of_week.length === 0} 
              onClick={handleAddSchedule}
            >
              <span className="material-icons-round" style={{ fontSize: 16 }}>add_circle</span>
              <span>{scheduleLoading ? 'Đang lưu...' : 'Thêm lịch học'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
