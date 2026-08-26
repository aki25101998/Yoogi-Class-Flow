import { createClient } from '@/utils/supabase/server';
import { getCurrentOrganizationContext } from '@/services/organization.service';

export default async function MyCheckinPage() {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization || !context.coach) {
    return (
      <div style={{ padding: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Check-in</h1>
        <p style={{ color: '#ef4444' }}>Bạn chưa được liên kết với hồ sơ HLV nào trong hệ thống.</p>
      </div>
    );
  }

  const supabase = await createClient();
  const coachId = context.coach.id;

  // Lấy lịch dạy hôm nay
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday, etc.
  
  const { data: schedules } = await supabase
    .from('schedules')
    .select('*, venue_classes(name), venues(name)')
    .eq('organization_id', context.organization.id)
    .eq('coach_id', coachId)
    .eq('day_of_week', dayOfWeek);

  return (
    <div style={{ padding: '24px', maxWidth: '600px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Check-in Hôm Nay</h1>
      
      {(!schedules || schedules.length === 0) ? (
        <div style={{ padding: '24px', textAlign: 'center', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', color: '#6b7280' }}>
          Bạn không có lịch dạy nào trong hôm nay.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {schedules.map((s: any) => (
            <div key={s.id} style={{ padding: '16px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#111827', marginBottom: '8px' }}>
                {s.start_time} - {s.end_time}
              </div>
              <div style={{ marginBottom: '4px' }}><strong>Lớp:</strong> {s.venue_classes?.name}</div>
              <div style={{ marginBottom: '16px' }}><strong>Phòng:</strong> {s.venues?.name}</div>
              <button 
                disabled // Giả lập nút disabled cho UI tĩnh, thực tế có thể thêm action
                style={{ width: '100%', padding: '10px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'not-allowed', opacity: 0.8 }}
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
