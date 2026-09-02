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

  if (!data.name || data.name.trim().length === 0) {
    return { success: false, error: 'Tên lớp học không được để trống.' };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;

  // Verify venue belongs to org
  const { data: venue } = await supabase
    .from('venues')
    .select('id')
    .eq('id', data.venue_id)
    .eq('organization_id', orgId)
    .single();

  if (!venue) {
    return { success: false, error: 'Địa điểm không tồn tại trong tổ chức này.' };
  }
  
  const { data: newClass, error } = await supabase.from('venue_classes').insert({
    organization_id: orgId,
    venue_id: data.venue_id,
    name: data.name.trim(),
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

  if (!data.name || data.name.trim().length === 0) {
    return { success: false, error: 'Tên lớp học không được để trống.' };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;

  // Verify venue belongs to org
  const { data: venue } = await supabase
    .from('venues')
    .select('id')
    .eq('id', data.venue_id)
    .eq('organization_id', orgId)
    .single();

  if (!venue) {
    return { success: false, error: 'Địa điểm không tồn tại trong tổ chức này.' };
  }
  
  const { error } = await supabase.from('venue_classes')
    .update({
      name: data.name.trim(),
      venue_id: data.venue_id,
      status: data.status
    })
    .eq('id', id)
    .eq('organization_id', orgId);

  if (error) return { success: false, error: error.message };

  // Remove existing coaches and re-assign (simplest way to update)
  await supabase.from('class_coaches').delete().eq('class_id', id).eq('organization_id', orgId);

  if (data.head_coach_id) await assignCoachToClass(id, data.head_coach_id, 'HEAD_COACH');
  if (data.assistant_coach_id) await assignCoachToClass(id, data.assistant_coach_id, 'ASSISTANT_COACH');

  revalidatePath('/classes');
  return { success: true };
}

export async function enrollStudentAction(classId: string, studentId: string) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const supabase = await createClient();
  const orgId = context.organization.id;

  // §2.2 — Verify student exists, active, same org
  const { data: student } = await supabase
    .from('students')
    .select('id, status')
    .eq('id', studentId)
    .eq('organization_id', orgId)
    .single();

  if (!student) {
    return { success: false, error: 'Học viên không tồn tại trong tổ chức này.' };
  }

  if (student.status !== 'active') {
    return { success: false, error: 'Học viên này hiện đang không hoạt động. Vui lòng kích hoạt lại trước khi đăng ký lớp.' };
  }

  // Verify class exists, same org
  const { data: cls } = await supabase
    .from('venue_classes')
    .select('id, status')
    .eq('id', classId)
    .eq('organization_id', orgId)
    .single();

  if (!cls) {
    return { success: false, error: 'Lớp học không tồn tại trong tổ chức này.' };
  }
  
  const { data: existing } = await supabase.from('class_students')
    .select('id, status')
    .eq('class_id', classId)
    .eq('student_id', studentId)
    .eq('organization_id', orgId)
    .single();

  if (existing) {
    const { error } = await supabase.from('class_students')
      .update({ status: 'active' })
      .eq('id', existing.id);
    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await supabase.from('class_students').insert({
      organization_id: orgId,
      class_id: classId,
      student_id: studentId,
      status: 'active'
    });
    if (error) return { success: false, error: error.message };
  }

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
