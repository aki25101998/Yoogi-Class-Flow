const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Testing connection...");
  const { data, error } = await supabase.from('coaches').select('*').limit(1);
  if (error) {
    console.error("Error querying coaches:", error);
  } else {
    console.log("Coaches data:", data);
  }
}

test();
