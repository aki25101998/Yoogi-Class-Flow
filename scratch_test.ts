import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function test() {
  const { data: coaches, error: err1 } = await supabase.from('coaches').select('id, organization_id').limit(1);
  if (err1 || !coaches || coaches.length === 0) {
    console.error('No coaches found', err1);
    return;
  }
  
  const coachId = coaches[0].id;
  const organizationId = coaches[0].organization_id;

  console.log('Testing with coachId', coachId, 'orgId', organizationId);

  const { data: coachData, error: coachError } = await supabase
    .from('coaches')
    .select(`
      id,
      phone,
      cccd,
      status,
      created_at,
      nickname,
      photo_url,
      organization_member_id,
      organization_members!inner (
        id,
        organization_id,
        role,
        status,
        profiles (
          name,
          email,
          avatar_url,
          phone
        )
      )
    `)
    .eq('id', coachId)
    .eq('organization_id', organizationId)
    .single();

  console.log('Coach Data Error:', coachError);
  console.log('Coach Data:', JSON.stringify(coachData, null, 2));
}

test();
