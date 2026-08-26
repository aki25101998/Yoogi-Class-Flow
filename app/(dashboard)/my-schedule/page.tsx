import { createClient } from '@/utils/supabase/server';
import { getCurrentOrganizationContext } from '@/services/organization.service';

const DAYS_OF_WEEK = [
  { value: 1, label: 'Thứ 2' },
  { value: 2, label: 'Thứ 3' },
  { value: 3, label: 'Thứ 4' },
  { value: 4, label: 'Thứ 5' },
  { value: 5, label: 'Thứ 6' },
  { value: 6, label: 'Thứ 7' },
  { value: 0, label: 'Chủ Nhật' }
];

export default async function MySchedulePage() {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization || !context.coach) {
    return (
      <div style={{ padding: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Lịch dạy của tôi</h1>
        <p style={{ color: 'var(--danger)' }}>Bạn chưa được liên kết với hồ sơ HLV nào trong hệ thống.</p>
      </div>
    );
  }

  const supabase = await createClient();
  const coachId = context.coach.id;
  
  const { data: schedules } = await supabase
    .from('schedules')
    .select('*, venue_classes(name), venues(name)')
    .eq('organization_id', context.organization.id)
    .eq('coach_id', coachId);

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Lịch dạy của tôi</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '16px' }}>
        {DAYS_OF_WEEK.map(day => {
          const daySchedules = (schedules || []).filter((s: any) => s.day_of_week === day.value).sort((a: any, b: any) => a.start_time.localeCompare(b.start_time));
          
          return (
            <div key={day.value} style={{ backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', overflow: 'hidden' }}>
              <div style={{ backgroundColor: 'var(--surface-hover)', padding: '12px', fontWeight: 'bold', textAlign: 'center', borderBottom: '1px solid var(--border-light)' }}>
                {day.label}
              </div>
              <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {daySchedules.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>Trống</div>
                ) : (
                  daySchedules.map((s: any) => (
                    <div key={s.id} style={{ backgroundColor: 'var(--success-bg)', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', fontSize: '12px' }}>
                      <div style={{ fontWeight: 'bold', color: 'var(--success-text)', marginBottom: '4px' }}>{s.start_time} - {s.end_time}</div>
                      <div style={{ marginBottom: '2px' }}><strong>Lớp:</strong> {s.venue_classes?.name}</div>
                      <div style={{ marginBottom: '4px' }}><strong>Phòng:</strong> {s.venues?.name}</div>
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
