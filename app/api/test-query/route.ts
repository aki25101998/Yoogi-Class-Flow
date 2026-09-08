import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('venue_classes')
    .select(`
      *,
      schedules(id, day_of_week, start_time, end_time, status, effective_from, effective_until),
      class_students(id, status),
      class_coaches(role, coach_id, coaches(id, organization_members(profiles(name))))
    `)
    .limit(1);

  return NextResponse.json({ data, error });
}
