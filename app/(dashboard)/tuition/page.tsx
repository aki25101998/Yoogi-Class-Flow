import { createClient } from '@/utils/supabase/server';
import { getCurrentOrganizationContext } from '@/services/organization.service';
import TuitionClient from './TuitionClient';

export default async function TuitionPage() {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return <div>Access Denied</div>;

  const supabase = await createClient();
  
  // Get tuition
  const { data: tuitionList } = await supabase
    .from('tuition')
    .select('*, students(name), venue_classes(name)')
    .eq('organization_id', context.organization.id)
    .order('created_at', { ascending: false });

  // Get active students
  const { data: students } = await supabase
    .from('students')
    .select('id, name')
    .eq('organization_id', context.organization.id)
    .eq('status', 'active');

  // Get active classes
  const { data: classes } = await supabase
    .from('venue_classes')
    .select('id, name')
    .eq('organization_id', context.organization.id)
    .eq('status', 'active');

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Học phí</h1>
      <TuitionClient 
        tuitionList={tuitionList || []}
        students={students || []}
        classes={classes || []}
        currentUserRole={context.membership?.role as string}
      />
    </div>
  );
}
