import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase
    .from('venue_classes')
    .select(`
      *,
      schedules(id, day_of_week, start_time, end_time, status, effective_from, effective_until),
      class_students(id, status),
      class_coaches(role, coach_id, coaches(id, organization_members(profiles(name))))
    `)
    .limit(1);
    
  if (error) {
    console.error('ERROR DETAILS:', JSON.stringify(error, null, 2));
  } else {
    console.log('SUCCESS, data length:', data.length);
  }
}

test();
