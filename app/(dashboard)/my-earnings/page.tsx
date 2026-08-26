import { createClient } from '@/utils/supabase/server';
import { getCurrentOrganizationContext } from '@/services/organization.service';

export default async function MyEarningsPage() {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization || !context.coach) {
    return (
      <div style={{ padding: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Thu nhập của tôi</h1>
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
    .order('date', { ascending: false });

  const unapproved = (sessions || []).filter((s: any) => s.status === 'checked_in');
  const approved = (sessions || []).filter((s: any) => s.status === 'approved');
  const paid = (sessions || []).filter((s: any) => s.status === 'paid');

  const pendingAmount = approved.reduce((acc: number, s: any) => acc + Number(s.calculated_salary), 0);
  const paidAmount = paid.reduce((acc: number, s: any) => acc + Number(s.calculated_salary), 0);

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Thu nhập của tôi</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px', maxWidth: '600px' }}>
        <div style={{ padding: '16px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>Chờ thanh toán (Đã duyệt)</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{pendingAmount.toLocaleString('vi-VN')} đ</div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{approved.length} buổi</div>
        </div>
        <div style={{ padding: '16px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>Đã thanh toán</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }}>{paidAmount.toLocaleString('vi-VN')} đ</div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{paid.length} buổi</div>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontWeight: 'bold' }}>
          Chi tiết buổi dạy
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#f3f4f6' }}>
            <tr>
              <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>Ngày</th>
              <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>Lớp</th>
              <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>Trạng thái</th>
              <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>Thu nhập</th>
            </tr>
          </thead>
          <tbody>
            {(!sessions || sessions.length === 0) ? (
              <tr>
                <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>Chưa có dữ liệu.</td>
              </tr>
            ) : (
              sessions.map((s: any) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px 16px' }}>{s.date}</td>
                  <td style={{ padding: '12px 16px' }}>{s.venue_classes?.name || '---'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {s.status === 'checked_in' && <span style={{ color: '#d97706' }}>Chờ duyệt</span>}
                    {s.status === 'approved' && <span style={{ color: '#2563eb' }}>Chờ thanh toán</span>}
                    {s.status === 'paid' && <span style={{ color: '#16a34a' }}>Đã thanh toán</span>}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '500' }}>
                    {s.status === 'checked_in' ? '---' : `${Number(s.calculated_salary).toLocaleString('vi-VN')} đ`}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
