'use client';

import { useDashboardContext } from '../DashboardProvider';
import { useMySchedule } from '@/hooks/useMySchedule';
import { useMemo } from 'react';

export default function MyCheckinClient() {
  const { context } = useDashboardContext();
  const organizationId = context?.organization?.id;
  const coachId = context?.coach?.id;

  const { schedules, isLoading } = useMySchedule(organizationId, coachId);

  const todaySchedules = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 is Sunday
    return schedules.filter(s => s.day_of_week === dayOfWeek).sort((a: any, b: any) => a.start_time.localeCompare(b.start_time));
  }, [schedules]);

  if (!coachId) {
    return (
      <div style={{ padding: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Check-in</h1>
        <p style={{ color: 'var(--danger)' }}>Bạn chưa được liên kết với hồ sơ HLV nào trong hệ thống.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '600px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Check-in Hôm Nay</h1>
      
      {isLoading ? (
        <div style={{ padding: '24px', textAlign: 'center', backgroundColor: 'var(--surface-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}>
          Đang tải dữ liệu...
        </div>
      ) : todaySchedules.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', backgroundColor: 'var(--surface-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}>
          Bạn không có lịch dạy nào trong hôm nay.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {todaySchedules.map((s: any) => (
            <div key={s.id} style={{ padding: '16px', backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
              <div style={{ fontWeight: 'bold', fontSize: '18px', color: 'var(--text-main)', marginBottom: '8px' }}>
                {s.start_time} - {s.end_time}
              </div>
              <div style={{ marginBottom: '4px' }}><strong>Lớp:</strong> {s.venue_classes?.name}</div>
              <div style={{ marginBottom: '16px' }}><strong>Phòng:</strong> {s.venues?.name}</div>
              <button 
                disabled
                style={{ width: '100%', padding: '10px', backgroundColor: 'var(--success)', color: 'var(--text-on-primary)', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 'bold', cursor: 'not-allowed', opacity: 0.8 }}
              >
                Tính năng Check-in đang phát triển
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
