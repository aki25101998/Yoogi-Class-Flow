'use server';

import { createClient } from '@/utils/supabase/server';
import { getCurrentOrganizationContext } from '@/services/organization.service';
import { revalidatePath } from 'next/cache';

export async function addStudentAction(data: { name: string; phone?: string; parent_name?: string; parent_phone?: string; dob: string; current_belt_id?: string | null; venue_id: string }) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  if (!data.name || data.name.trim().length === 0) {
    return { success: false, error: 'Tên học viên không được để trống.' };
  }
  if (!data.dob || data.dob.trim().length === 0) {
    return { success: false, error: 'Ngày sinh không được để trống.' };
  }
  if (!data.venue_id) {
    return { success: false, error: 'Địa điểm học không được để trống.' };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;

  // Verify belt belongs to org if provided
  if (data.current_belt_id) {
    const { data: belt } = await supabase
      .from('organization_belts')
      .select('id')
      .eq('id', data.current_belt_id)
      .eq('organization_id', orgId)
      .single();
    
    if (!belt) {
      return { success: false, error: 'Cấp đai không tồn tại trong tổ chức này.' };
    }
  }

  // Verify venue belongs to org if provided
  if (data.venue_id) {
    const { data: venue } = await supabase
      .from('venues')
      .select('id')
      .eq('id', data.venue_id)
      .eq('organization_id', orgId)
      .single();
    
    if (!venue) {
      return { success: false, error: 'Địa điểm không tồn tại trong tổ chức này.' };
    }
  }
  
  const { error } = await supabase.from('students').insert({
    organization_id: orgId,
    name: data.name.trim(),
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
    dob: string; 
    status?: string;
    current_belt_id?: string | null;
    venue_id: string;
  },
  newClassId?: string
) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  if (!data.name || data.name.trim().length === 0) {
    return { success: false, error: 'Tên học viên không được để trống.' };
  }
  if (!data.dob || data.dob.trim().length === 0) {
    return { success: false, error: 'Ngày sinh không được để trống.' };
  }
  if (data.venue_id === null || data.venue_id === undefined || data.venue_id === '') {
    return { success: false, error: 'Địa điểm học không được để trống.' };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;

  // Verify belt belongs to org if provided
  if (data.current_belt_id) {
    const { data: belt } = await supabase
      .from('organization_belts')
      .select('id')
      .eq('id', data.current_belt_id)
      .eq('organization_id', orgId)
      .single();
    
    if (!belt) {
      return { success: false, error: 'Cấp đai không tồn tại trong tổ chức này.' };
    }
  }

  // Verify venue belongs to org if provided
  if (data.venue_id) {
    const { data: venue } = await supabase
      .from('venues')
      .select('id')
      .eq('id', data.venue_id)
      .eq('organization_id', orgId)
      .single();
    
    if (!venue) {
      return { success: false, error: 'Địa điểm không tồn tại trong tổ chức này.' };
    }
  }

  // Verify newClassId belongs to org if provided
  if (newClassId) {
    const { data: cls } = await supabase
      .from('venue_classes')
      .select('id')
      .eq('id', newClassId)
      .eq('organization_id', orgId)
      .single();
    
    if (!cls) {
      return { success: false, error: 'Lớp học không tồn tại trong tổ chức này.' };
    }
  }

  // Strip organization_id from data to prevent tampering
  const safeData = { ...data };
  delete (safeData as any).organization_id;
  delete (safeData as any).id;
  safeData.name = safeData.name.trim();
  
  const { error } = await supabase.from('students')
    .update(safeData)
    .eq('id', id)
    .eq('organization_id', orgId);

  if (error) return { success: false, error: error.message };

  // Handle class changes
  if (newClassId !== undefined) {
    // 1. Get current active classes
    const { data: currentActive } = await supabase
      .from('class_students')
      .select('id, class_id')
      .eq('student_id', id)
      .eq('status', 'active')
      .eq('organization_id', orgId);

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
          .eq('organization_id', orgId);
      }
      
      // If a new class was selected (not empty), enroll the student
      if (newClassId) {
        await supabase
          .from('class_students')
          .insert({
            organization_id: orgId,
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
  const orgId = context.organization.id;

  // Verify student and class belong to org
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
    return { success: false, error: 'Học viên này hiện đang không hoạt động.' };
  }

  const { data: cls } = await supabase
    .from('venue_classes')
    .select('id')
    .eq('id', classId)
    .eq('organization_id', orgId)
    .single();

  if (!cls) {
    return { success: false, error: 'Lớp học không tồn tại trong tổ chức này.' };
  }
  
  const { error } = await supabase.from('class_students').insert({
    organization_id: orgId,
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
  
  // Use UPDATE (soft delete) instead of DELETE to preserve history
  const { error } = await supabase.from('class_students')
    .update({ status: 'dropped' })
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
