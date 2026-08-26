import { createClient } from '@/utils/supabase/server';
import { getCurrentOrganizationContext } from '@/services/organization.service';
import StudentsClient from './StudentsClient';

export default async function StudentsPage() {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return <div>Access Denied</div>;

  const supabase = await createClient();
  
  // Get students with their enrolled classes
  const { data: students } = await supabase
    .from('students')
    .select('*, class_students(id, class_id, venue_classes(name, start_time, end_time))')
    .eq('organization_id', context.organization.id)
    .order('created_at', { ascending: false });

  // Get available classes for enrollment
  const { data: availableClasses } = await supabase
    .from('venue_classes')
    .select('id, name, start_time, end_time')
    .eq('organization_id', context.organization.id)
    .eq('status', 'active');

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Học viên</h1>
      <StudentsClient 
        initialStudents={students || []} 
        availableClasses={availableClasses || []}
        currentUserRole={context.membership?.role as string}
      />
    </div>
  );
}
