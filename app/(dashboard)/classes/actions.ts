'use server';

import { assignCoachToClass, removeCoachFromClass } from '@/services/class-coaches.service';
import { createClient } from '@/utils/supabase/server';
import { getCurrentOrganizationContext } from '@/services/organization.service';
import { revalidatePath } from 'next/cache';

export async function assignCoachAction(classId: string, coachId: string, role: 'HEAD_COACH' | 'ASSISTANT_COACH') {
  return await assignCoachToClass(classId, coachId, role);
}

export async function removeCoachAction(classId: string, coachId: string) {
  return await removeCoachFromClass(classId, coachId);
}

export async function addClassAction(data: { name: string; venue_id: string; status: string; head_coach_id?: string; assistant_coach_id?: string }) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const supabase = await createClient();
  
  const { data: newClass, error } = await supabase.from('venue_classes').insert({
    organization_id: context.organization.id,
    venue_id: data.venue_id,
    name: data.name,
    status: data.status,
    start_time: '18:00', // default or could be inputs
    end_time: '20:00'
  }).select().single();

  if (error) return { success: false, error: error.message };
  
  if (data.head_coach_id) await assignCoachToClass(newClass.id, data.head_coach_id, 'HEAD_COACH');
  if (data.assistant_coach_id) await assignCoachToClass(newClass.id, data.assistant_coach_id, 'ASSISTANT_COACH');

  revalidatePath('/classes');
  return { success: true };
}

export async function updateClassAction(id: string, data: { name: string; venue_id: string; status: string; head_coach_id?: string; assistant_coach_id?: string }) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const supabase = await createClient();
  
  const { error } = await supabase.from('venue_classes')
    .update({
      name: data.name,
      venue_id: data.venue_id,
      status: data.status
    })
    .eq('id', id)
    .eq('organization_id', context.organization.id);

  if (error) return { success: false, error: error.message };

  // Remove existing coaches and re-assign (simplest way to update)
  await supabase.from('class_coaches').delete().eq('class_id', id);

  if (data.head_coach_id) await assignCoachToClass(id, data.head_coach_id, 'HEAD_COACH');
  if (data.assistant_coach_id) await assignCoachToClass(id, data.assistant_coach_id, 'ASSISTANT_COACH');

  revalidatePath('/classes');
  revalidatePath('/classes');
  return { success: true };
}

export async function enrollStudentAction(classId: string, studentId: string) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const supabase = await createClient();
  
  const { data: existing } = await supabase.from('class_students')
    .select('id, status')
    .eq('class_id', classId)
    .eq('student_id', studentId)
    .eq('organization_id', context.organization.id)
    .single();

  if (existing) {
    const { error } = await supabase.from('class_students')
      .update({ status: 'active' })
      .eq('id', existing.id);
    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await supabase.from('class_students').insert({
      organization_id: context.organization.id,
      class_id: classId,
      student_id: studentId,
      status: 'active'
    });
    if (error) return { success: false, error: error.message };
  }

  // Also drop them from any other active classes, since students usually belong to one class per org, or we can just leave it as is if they can belong to multiple.
  // The students edit UI handles dropping others. We will just enroll here.
  revalidatePath('/classes');
  return { success: true };
}

export async function unenrollStudentAction(classId: string, studentId: string) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const supabase = await createClient();
  
  const { error } = await supabase.from('class_students')
    .update({ status: 'dropped' })
    .eq('class_id', classId)
    .eq('student_id', studentId)
    .eq('organization_id', context.organization.id);

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/classes');
  return { success: true };
}
