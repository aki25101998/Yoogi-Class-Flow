import { createClient } from '@/utils/supabase/server';
import { getCurrentOrganizationContext } from '@/services/organization.service';
import ScheduleClient from './ScheduleClient';

export default async function SchedulePage() {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return <div>Access Denied</div>;

  const supabase = await createClient();
  
  // Get schedules
  const { data: schedules } = await supabase
    .from('schedules')
    .select('*, venue_classes(name), coaches(name), venues(name)')
    .eq('organization_id', context.organization.id)
    .order('start_time', { ascending: true });

  // Get active classes
  const { data: classes } = await supabase
    .from('venue_classes')
    .select('id, name')
    .eq('organization_id', context.organization.id)
    .eq('status', 'active');

  // Get active coaches
  const { data: coaches } = await supabase
    .from('coaches')
    .select('id, name')
    .eq('organization_id', context.organization.id)
    .eq('status', 'active');

  // Get active venues
  const { data: venues } = await supabase
    .from('venues')
    .select('id, name')
    .eq('organization_id', context.organization.id)
    .eq('status', 'active');

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Lịch dạy</h1>
      <ScheduleClient 
        schedules={schedules || []} 
        classes={classes || []}
        coaches={coaches || []}
        venues={venues || []}
        currentUserRole={context.membership?.role as string}
      />
    </div>
  );
}
