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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 'var(--space-4)', overflowX: 'auto', minWidth: '800px' }} className="animate-pulse">
      {DAYS_OF_WEEK.map(day => (
        <div key={day.value} className="bg-surface rounded-md border border-light overflow-hidden flex flex-col h-full min-h-[300px]">
          <div className="bg-surface-hover p-3 font-semibold text-center border-b border-light h-10"></div>
          <div className="p-3 flex-col gap-3 flex-1">
            <div className="h-24 bg-surface-hover rounded w-full"></div>
            <div className="h-24 bg-surface-hover rounded w-full"></div>
          </div>
        </div>
      ))}
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 'var(--space-4)', overflowX: 'auto', minWidth: '800px' }}>
          {DAYS_OF_WEEK.map(day => {
            const daySchedules = schedules.filter((s: any) => s.day_of_week === day.value).sort((a: any, b: any) => a.start_time.localeCompare(b.start_time));
            
            return (
              <div key={day.value} className="bg-surface rounded-md border border-light overflow-hidden flex flex-col h-full min-h-[300px]">
                <div className="bg-surface-hover p-3 font-semibold text-center border-b border-light text-main">
                  {day.label}
                </div>
                <div className="p-3 flex-col gap-3 flex-1">
                  {daySchedules.length === 0 ? (
                    <div className="text-center text-muted text-sm italic py-4">Trống</div>
                  ) : (
                    daySchedules.map((s: any) => (
                      <div key={s.id} className="bg-primary-light border border-primary text-primary p-2 rounded-md text-xs relative flex flex-col">
                        <div className="font-bold mb-1">{s.start_time} - {s.end_time}</div>
                        <div className="mb-1 truncate" title={s.venue_classes?.name}><strong>Lớp:</strong> {s.venue_classes?.name}</div>
                        <div className="mb-1 truncate" title={s.coaches?.name}><strong>HLV:</strong> {s.coaches?.name}</div>
                        <div className="mb-1 truncate" title={s.venues?.name}><strong>Phòng:</strong> {s.venues?.name}</div>
                        {isAdminOrOwner && (
                          <div className="flex gap-2 justify-end mt-2">
                            <button 
                              onClick={() => openEditModal(s)} 
                              disabled={loading}
                              className="text-primary hover:underline cursor-pointer border-none bg-transparent text-[10px]"
                            >
                              Sửa
                            </button>
                            <button 
                              onClick={() => handleDelete(s.id)} 
                              disabled={loading}
                              className="text-danger hover:underline cursor-pointer border-none bg-transparent text-[10px]"
                            >
                              Ngừng
                            </button>
                          </div>
                        )}
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
