import { createClient } from '@/utils/supabase/server';
import { getCurrentOrganizationContext } from '@/services/organization.service';
import VenuesClient from './VenuesClient';

export default async function VenuesPage() {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return <div>Access Denied</div>;

  const supabase = await createClient();
  
  // Get venues
  const { data: venues } = await supabase
    .from('venues')
    .select('*')
    .eq('organization_id', context.organization.id)
    .order('created_at', { ascending: false });

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Địa điểm</h1>
      <VenuesClient 
        initialVenues={venues || []} 
        currentUserRole={context.membership?.role as string}
      />
    </div>
  );
}
