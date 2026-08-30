'use server';

import { createClient } from '@/utils/supabase/server';
import { getCurrentOrganizationContext } from '@/services/organization.service';
import { revalidatePath } from 'next/cache';

export async function addStudentAction(data: { name: string; phone?: string; parent_name?: string; parent_phone?: string; dob?: string; current_belt_id?: string | null; venue_id?: string | null }) {
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
    current_belt_id: data.current_belt_id || null,
    venue_id: data.venue_id || null,
    status: 'active'
  });

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/students');
  return { success: true };
}

export async function updateStudentAction(
  id: string, 
  data: { 
    name: string; 
    phone?: string; 
    parent_name?: string; 
    parent_phone?: string; 
    dob?: string; 
    status?: string;
    current_belt_id?: string | null;
    venue_id?: string | null;
  },
  newClassId?: string
) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const supabase = await createClient();
  
  const { error } = await supabase.from('students')
    .update(data)
    .eq('id', id)
    .eq('organization_id', context.organization.id);

  if (error) return { success: false, error: error.message };

  // Handle class changes
  if (newClassId !== undefined) {
    // 1. Get current active classes
    const { data: currentActive } = await supabase
      .from('class_students')
      .select('id, class_id')
      .eq('student_id', id)
      .eq('status', 'active')
      .eq('organization_id', context.organization.id);

    // If there's an existing class and it's different from the new one
    const currentClassId = currentActive && currentActive.length > 0 ? currentActive[0].class_id : null;

    if (newClassId !== currentClassId) {
      // If changing to a different class, drop the old one(s)
      if (currentActive && currentActive.length > 0) {
        await supabase
          .from('class_students')
          .update({ status: 'dropped' })
          .eq('student_id', id)
          .eq('status', 'active')
          .eq('organization_id', context.organization.id);
      }
      
      // If a new class was selected (not empty), enroll the student
      if (newClassId) {
        await supabase
          .from('class_students')
          .insert({
            organization_id: context.organization.id,
            student_id: id,
            class_id: newClassId,
            status: 'active'
          });
      }
    }
  }
  
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

export async function importStudentsBatchAction(students: any[]) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const supabase = await createClient();
  
  const { data, error } = await supabase.rpc('import_students_batch', {
    p_org_id: context.organization.id,
    p_students: students,
    p_summary: `Import Excel ${students.length} học viên`
  });

  if (error) {
    return { success: false, error: error.message };
  }

  if (data && data.success) {
    revalidatePath('/students');
    return { success: true, count: data.count };
  }

  return { success: false, error: data?.error || 'Unknown error during import' };
}
