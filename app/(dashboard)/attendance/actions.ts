'use server';

import { createClient } from '@/utils/supabase/server';
import { getCurrentOrganizationContext } from '@/services/organization.service';
import { revalidatePath } from 'next/cache';

export async function saveAttendanceAction(classId: string, date: string, records: any[]) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const supabase = await createClient();
  
  // Check if attendance already exists for this class and date
  const { data: existing } = await supabase
    .from('student_attendance')
    .select('id')
    .eq('class_id', classId)
    .eq('date', date)
    .eq('organization_id', context.organization.id)
    .single();

  let error;

  if (existing) {
    const { error: updateError } = await supabase
      .from('student_attendance')
      .update({ records, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    error = updateError;
  } else {
    const { error: insertError } = await supabase
      .from('student_attendance')
      .insert({
        organization_id: context.organization.id,
        class_id: classId,
        date,
        records
      });
    error = insertError;
  }

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/attendance');
  return { success: true };
}
