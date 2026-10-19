'use client';

import { useState } from 'react';
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
  { value: 1, label: 'Thứ 2' },
  { value: 2, label: 'Thứ 3' },
  { value: 3, label: 'Thứ 4' },
  { value: 4, label: 'Thứ 5' },
  { value: 5, label: 'Thứ 6' },
  { value: 6, label: 'Thứ 7' },
  { value: 0, label: 'Chủ Nhật' }
];

function ScheduleSkeleton() {
  return (
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
              <div className="h-24 bg-surface-hover rounded-md w-full"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ScheduleClient() {
  const { context } = useDashboardContext();
  const organizationId = context?.organization?.id;
  const currentUserRole = context?.membership?.role;

  const { schedules, classes, coaches, venues, isLoading } = useSchedule(organizationId);
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ coach_id: '', venue_id: '', class_id: '', day_of_week: 1, start_time: '18:00', end_time: '20:00' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isAdminOrOwner = currentUserRole === 'admin' || currentUserRole === 'owner';

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
    if (confirm('Bạn có chắc muốn xóa lịch này?')) {
      setLoading(true);
      const res = await deleteScheduleAction(id);
      setLoading(false);
      if (res.success) handleSuccess();
      else alert(res.error || 'Lỗi khi xóa');
    }
  };

  return (
    <div className="flex-col gap-6">
      <PageHeader 
        title="Lịch dạy tuần" 
        description="Quản lý lịch học định kỳ của các lớp trong tuần"
        primaryAction={isAdminOrOwner ? (
          <Button 
            onClick={openAddModal}
            leftIcon={<span className="material-icons-round">calendar_today</span>}
          >
            Thêm Lịch Mới
          </Button>
        ) : undefined}
      />

      <Modal isOpen={isModalOpen} onClose={loading ? () => {} : resetForm}>
        <ModalHeader title={editingId ? "Sửa Lịch Dạy" : "Thêm Lịch Dạy"} onClose={loading ? () => {} : resetForm} />
        <ModalBody>
          {error && <div style={{ color: 'var(--danger)', marginBottom: '16px', fontSize: '0.875rem' }}>{error}</div>}
          <form id="schedule-form" onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
            <Select 
              label="Lớp học *"
              required 
              value={formData.class_id} 
              onChange={e => setFormData({...formData, class_id: e.target.value})}
              options={[
                { value: '', label: '-- Chọn lớp --' },
                ...classes.map((c: any) => ({ value: c.id, label: c.name }))
              ]}
            />
            <Select 
              label="Huấn luyện viên *"
              required 
              value={formData.coach_id} 
              onChange={e => setFormData({...formData, coach_id: e.target.value})}
              options={[
                { value: '', label: '-- Chọn HLV --' },
                ...coaches.map((c: any) => ({ value: c.id, label: c.name }))
              ]}
            />
            <Select 
              label="Địa điểm *"
              required 
              value={formData.venue_id} 
              onChange={e => setFormData({...formData, venue_id: e.target.value})}
              options={[
                { value: '', label: '-- Chọn địa điểm --' },
                ...venues.map((v: any) => ({ value: v.id, label: v.name }))
              ]}
            />
            <Select 
              label="Ngày trong tuần"
              value={formData.day_of_week.toString()} 
              onChange={e => setFormData({...formData, day_of_week: Number(e.target.value)})}
              options={DAYS_OF_WEEK.map(d => ({ value: d.value.toString(), label: d.label }))}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Input 
                label="Giờ bắt đầu"
                type="time" 
                required 
                value={formData.start_time} 
                onChange={e => setFormData({...formData, start_time: e.target.value})} 
              />
              <Input 
                label="Giờ kết thúc"
                type="time" 
                required 
                value={formData.end_time} 
                onChange={e => setFormData({...formData, end_time: e.target.value})} 
              />
            </div>
          </form>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={resetForm} disabled={loading}>Hủy</Button>
          <Button type="submit" form="schedule-form" isLoading={loading} variant="primary">Lưu</Button>
        </ModalFooter>
      </Modal>

      {isLoading ? (
        <ScheduleSkeleton />
      ) : (
        <div className={styles.boardScrollWrapper}>
          <div className={styles.scheduleGrid}>
            {DAYS_OF_WEEK.map(day => {
              const daySchedules = schedules
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
                        <span className={`material-icons-round ${styles.emptyDayIcon}`}>event_busy</span>
                        <span>Không có ca dạy</span>
                      </div>
                    ) : (
                      daySchedules.map((s: any) => {
                        const coachDisplayName = s.coachName || s.coaches?.name || 'Chưa gán HLV';
                        return (
                          <div key={s.id} className={styles.sessionCard}>
                            <div className={styles.sessionTimeHeader}>
                              <span className={styles.timePill}>
                                <span className="material-icons-round">schedule</span>
                                {s.start_time} - {s.end_time}
                              </span>
                            </div>

                            <div className={styles.className} title={s.venue_classes?.name}>
                              {s.venue_classes?.name || 'Chưa chọn lớp'}
                            </div>

                            <div className={styles.sessionMeta}>
                              <div className={styles.metaRow} title={`HLV: ${coachDisplayName}`}>
                                <span className="material-icons-round">person</span>
                                <span>{coachDisplayName}</span>
                              </div>
                              <div className={styles.metaRow} title={`Địa điểm: ${s.venues?.name || 'Trụ sở chính'}`}>
                                <span className="material-icons-round">place</span>
                                <span>{s.venues?.name || 'Trụ sở chính'}</span>
                              </div>
                            </div>

                            {isAdminOrOwner && (
                              <div className={styles.sessionActions}>
                                <button 
                                  onClick={() => openEditModal(s)} 
                                  disabled={loading}
                                  className={`${styles.actionBtn} ${styles.actionBtnEdit}`}
                                  title="Chỉnh sửa lịch"
                                >
                                  Sửa
                                </button>
                                <button 
                                  onClick={() => handleDelete(s.id)} 
                                  disabled={loading}
                                  className={`${styles.actionBtn} ${styles.actionBtnDelete}`}
                                  title="Xóa lịch này"
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
    </div>
  );
}
