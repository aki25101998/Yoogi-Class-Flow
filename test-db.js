const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Testing connection...");
  const { data: venues, error: venuesError } = await supabase.from('venues').select('id, name, status');
  if (venuesError) console.error("Error querying venues:", venuesError);
  else console.log("Venues data:", venues);

  const { data: classes, error: classesError } = await supabase.from('venue_classes').select('id, name, status');
  if (classesError) console.error("Error querying classes:", classesError);
  else console.log("Classes data:", classes);
}

test();
