import { createClient } from '@/utils/supabase/server';
import { getCurrentOrganizationContext } from '@/services/organization.service';

export default async function MyAttendancePage() {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization || !context.coach) {
    return (
      <div style={{ padding: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Lịch sử điểm danh</h1>
        <p style={{ color: '#ef4444' }}>Bạn chưa được liên kết với hồ sơ HLV nào trong hệ thống.</p>
      </div>
    );
  }

  const supabase = await createClient();
  const coachId = context.coach.id;
  
  const { data: sessions } = await supabase
    .from('teacher_salary_sessions')
    .select('*, venue_classes(name)')
    .eq('organization_id', context.organization.id)
    .eq('coach_id', coachId)
    .order('date', { ascending: false })
    .limit(30);

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Lịch sử điểm danh (30 buổi gần nhất)</h1>
      
      {(!sessions || sessions.length === 0) ? (
        <div style={{ padding: '24px', textAlign: 'center', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', color: '#6b7280' }}>
          Chưa có dữ liệu điểm danh.
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f3f4f6' }}>
              <tr>
                <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>Ngày</th>
                <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>Lớp</th>
                <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s: any) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px 16px' }}>{s.date}</td>
                  <td style={{ padding: '12px 16px' }}>{s.venue_classes?.name || '---'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {s.status === 'checked_in' && <span style={{ color: '#d97706' }}>Đã Check-in</span>}
                    {s.status === 'approved' && <span style={{ color: '#2563eb' }}>Đã được duyệt</span>}
                    {s.status === 'paid' && <span style={{ color: '#16a34a' }}>Đã thanh toán lương</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
