'use server';

import { createClient } from '@/utils/supabase/server';
import { getCurrentOrganizationContext } from '@/services/organization.service';
import { revalidatePath } from 'next/cache';

export async function addStudentAction(data: { name: string; phone?: string; parent_name?: string; parent_phone?: string; dob?: string }) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const supabase = await createClient();
  
  const { error } = await supabase.from('students').insert({
    organization_id: context.organization.id,
    name: data.name,
    phone: data.phone,
    parent_name: data.parent_name,
    parent_phone: data.parent_phone,
    dob: data.dob,
    status: 'active'
  });

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/students');
  return { success: true };
}

export async function updateStudentAction(id: string, data: { name: string; phone?: string; parent_name?: string; parent_phone?: string; dob?: string; status?: string }) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const supabase = await createClient();
  
  const { error } = await supabase.from('students')
    .update(data)
    .eq('id', id)
    .eq('organization_id', context.organization.id);

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/students');
  return { success: true };
}

export async function deleteStudentAction(id: string) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const supabase = await createClient();
  
  const { error } = await supabase.from('students')
    .delete()
    .eq('id', id)
    .eq('organization_id', context.organization.id);

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/students');
  return { success: true };
}

export async function enrollStudentAction(studentId: string, classId: string) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const supabase = await createClient();
  
  const { error } = await supabase.from('class_students').insert({
    organization_id: context.organization.id,
    student_id: studentId,
    class_id: classId,
    status: 'active'
  });

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/students');
  return { success: true };
}

export async function unenrollStudentAction(studentId: string, classId: string) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const supabase = await createClient();
  
  const { error } = await supabase.from('class_students')
    .delete()
    .eq('student_id', studentId)
    .eq('class_id', classId)
    .eq('organization_id', context.organization.id);

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/students');
  return { success: true };
}
