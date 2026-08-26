import { createClient } from '@/utils/supabase/server';
import { getCurrentOrganizationContext } from '@/services/organization.service';
import PayrollClient from './PayrollClient';

export default async function PayrollPage() {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return <div>Access Denied</div>;

  const supabase = await createClient();
  
  // Lấy danh sách HLV
  const { data: coaches } = await supabase
    .from('coaches')
    .select('id, name')
    .eq('organization_id', context.organization.id)
    .eq('status', 'active');

  // Lấy cấu hình lương
  const { data: salaryConfigs } = await supabase
    .from('teacher_salaries')
    .select('*')
    .eq('organization_id', context.organization.id);

  // Lấy các buổi dạy (điểm danh HLV)
  const { data: salarySessions } = await supabase
    .from('teacher_salary_sessions')
    .select('*, venue_classes(name)')
    .eq('organization_id', context.organization.id)
    .order('date', { ascending: false });

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Bảng lương HLV</h1>
      <PayrollClient 
        coaches={coaches || []}
        salaryConfigs={salaryConfigs || []}
        salarySessions={salarySessions || []}
        currentUserRole={context.membership?.role as string}
      />
    </div>
  );
}
