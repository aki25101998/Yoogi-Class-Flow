import { createClient } from '@/utils/supabase/server';
import { getCurrentOrganizationContext } from '@/services/organization.service';
import ClassesClient from './ClassesClient';

export default async function ClassesPage() {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return <div>Access Denied</div>;

  const supabase = await createClient();
  
  // Get classes
  const { data: classes } = await supabase
    .from('venue_classes')
    .select('*, class_coaches(*, coaches(name))')
    .eq('organization_id', context.organization.id);

  // Get available coaches for assignment
  const { data: availableCoaches } = await supabase
    .from('coaches')
    .select('id, name, role')
    .eq('organization_id', context.organization.id)
    .eq('status', 'active');

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Lớp học</h1>
      <ClassesClient 
        initialClasses={classes || []} 
        availableCoaches={availableCoaches || []}
        currentUserRole={context.membership?.role as string}
      />
    </div>
  );
}
