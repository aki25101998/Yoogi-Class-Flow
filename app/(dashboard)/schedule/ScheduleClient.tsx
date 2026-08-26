'use client';

import { useState } from 'react';
import { addScheduleAction, deleteScheduleAction } from './actions';

const DAYS_OF_WEEK = [
  { value: 1, label: 'Thứ 2' },
  { value: 2, label: 'Thứ 3' },
  { value: 3, label: 'Thứ 4' },
  { value: 4, label: 'Thứ 5' },
  { value: 5, label: 'Thứ 6' },
  { value: 6, label: 'Thứ 7' },
  { value: 0, label: 'Chủ Nhật' }
];

export default function ScheduleClient({ schedules, classes, coaches, venues, currentUserRole }: any) {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ coach_id: '', venue_id: '', class_id: '', day_of_week: 1, start_time: '18:00', end_time: '20:00' });
  const [error, setError] = useState('');

  const isAdminOrOwner = currentUserRole === 'admin' || currentUserRole === 'owner';

  const resetForm = () => {
    setFormData({ coach_id: '', venue_id: '', class_id: '', day_of_week: 1, start_time: '18:00', end_time: '20:00' });
    setIsAdding(false);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await addScheduleAction(formData);
    if (res.success) window.location.reload();
    else setError(res.error || 'Lỗi khi xếp lịch');
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bạn có chắc muốn xóa lịch này?')) {
      const res = await deleteScheduleAction(id);
      if (res.success) window.location.reload();
      else alert(res.error || 'Lỗi khi xóa');
    }
  };

  return (
    <div>
      {isAdminOrOwner && !isAdding && (
        <button 
          onClick={() => setIsAdding(true)}
          style={{ marginBottom: '24px', padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          + Thêm Lịch Mới
        </button>
      )}

      {isAdding && (
        <div style={{ marginBottom: '24px', padding: '24px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Thêm Lịch Dạy</h3>
          {error && <div style={{ color: 'red', marginBottom: '16px' }}>{error}</div>}
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Lớp học</label>
              <select required value={formData.class_id} onChange={e => setFormData({...formData, class_id: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}>
                <option value="">-- Chọn lớp --</option>
                {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Huấn luyện viên</label>
              <select required value={formData.coach_id} onChange={e => setFormData({...formData, coach_id: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}>
                <option value="">-- Chọn HLV --</option>
                {coaches.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Địa điểm</label>
              <select required value={formData.venue_id} onChange={e => setFormData({...formData, venue_id: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}>
                <option value="">-- Chọn địa điểm --</option>
                {venues.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Ngày trong tuần</label>
              <select value={formData.day_of_week} onChange={e => setFormData({...formData, day_of_week: Number(e.target.value)})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}>
                {DAYS_OF_WEEK.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Giờ bắt đầu</label>
              <input type="time" required value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Giờ kết thúc</label>
              <input type="time" required value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }} />
            </div>
            <div style={{ gridColumn: '1 / -1', marginTop: '8px', display: 'flex', gap: '8px' }}>
              <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Lưu</button>
              <button type="button" onClick={resetForm} style={{ padding: '8px 16px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Hủy</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '16px' }}>
        {DAYS_OF_WEEK.map(day => {
          const daySchedules = schedules.filter((s: any) => s.day_of_week === day.value).sort((a: any, b: any) => a.start_time.localeCompare(b.start_time));
          
          return (
            <div key={day.value} style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              <div style={{ backgroundColor: '#f3f4f6', padding: '12px', fontWeight: 'bold', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>
                {day.label}
              </div>
              <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {daySchedules.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '12px' }}>Trống</div>
                ) : (
                  daySchedules.map((s: any) => (
                    <div key={s.id} style={{ backgroundColor: '#f0fdf4', padding: '8px', borderRadius: '6px', border: '1px solid #bbf7d0', fontSize: '12px' }}>
                      <div style={{ fontWeight: 'bold', color: '#166534', marginBottom: '4px' }}>{s.start_time} - {s.end_time}</div>
                      <div style={{ marginBottom: '2px' }}><strong>Lớp:</strong> {s.venue_classes?.name}</div>
                      <div style={{ marginBottom: '2px' }}><strong>HLV:</strong> {s.coaches?.name}</div>
                      <div style={{ marginBottom: '4px' }}><strong>Phòng:</strong> {s.venues?.name}</div>
                      {isAdminOrOwner && (
                        <div style={{ textAlign: 'right' }}>
                          <button onClick={() => handleDelete(s.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px' }}>Xóa</button>
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
    </div>
  );
}
