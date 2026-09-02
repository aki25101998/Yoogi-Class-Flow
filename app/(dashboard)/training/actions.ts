'use server';

import { createClient } from '@/utils/supabase/server';
import { getCurrentOrganizationContext } from '@/services/organization.service';
import { revalidatePath } from 'next/cache';
import { assignCoachToClass, removeCoachFromClass } from '@/services/class-coaches.service';

// --- VENUES ---

export async function addVenueAction(data: { name: string; address?: string; status?: string }) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const supabase = await createClient();
  
  const { error } = await supabase.from('venues').insert({
    organization_id: context.organization.id,
    name: data.name,
    address: data.address,
    status: data.status || 'active'
  });

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/training');
  return { success: true };
}

export async function updateVenueAction(id: string, data: { name: string; address?: string; status?: string }) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const supabase = await createClient();
  
  const { error } = await supabase.from('venues')
    .update(data)
    .eq('id', id)
    .eq('organization_id', context.organization.id);

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/training');
  return { success: true };
}

export async function importVenuesBatchAction(venues: any[]) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const supabase = await createClient();
  
  const { data, error } = await supabase.rpc('import_venues_batch', {
    p_org_id: context.organization.id,
    p_venues: venues,
    p_summary: `Import Excel ${venues.length} địa điểm`
  });

  if (error) {
    return { success: false, error: error.message };
  }

  if (data && data.success) {
    revalidatePath('/training');
    return { success: true, count: data.count };
  }

  return { success: false, error: data?.error || 'Unknown error during import' };
}

// --- CLASSES ---

export async function addClassAction(data: { name: string; venue_id: string; status: string; head_coach_id?: string; assistant_coach_id?: string }) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  if (!data.name || data.name.trim().length === 0) {
    return { success: false, error: 'Tên lớp học không được để trống.' };
  }

  const supabase = await createClient();
  const orgId = context.organization.id;
  
  const { data: venue, error: venueError } = await supabase
    .from('venues')
    .select('id')
    .eq('id', data.venue_id)
    .eq('organization_id', orgId)
    .single();

  if (venueError || !venue) {
    return { success: false, error: 'Địa điểm không thuộc tổ chức hiện tại.' };
  }

  const { data: newClass, error } = await supabase.from('venue_classes').insert({
    organization_id: orgId,
    venue_id: data.venue_id,
    name: data.name.trim(),
    status: data.status,
    start_time: '18:00', // default
    end_time: '20:00'
  }).select().single();

  if (error) return { success: false, error: error.message };
  
  if (data.head_coach_id) await assignCoachToClass(newClass.id, data.head_coach_id, 'HEAD_COACH');
  if (data.assistant_coach_id) await assignCoachToClass(newClass.id, data.assistant_coach_id, 'ASSISTANT_COACH');

  revalidatePath('/training');
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
  
  const { data: venue, error: venueError } = await supabase
    .from('venues')
    .select('id')
    .eq('id', data.venue_id)
    .eq('organization_id', orgId)
    .single();

  if (venueError || !venue) {
    return { success: false, error: 'Địa điểm không thuộc tổ chức hiện tại.' };
  }

  const { data: existingClass, error: classError } = await supabase
    .from('venue_classes')
    .select('id')
    .eq('id', id)
    .eq('organization_id', orgId)
    .single();

  if (classError || !existingClass) {
    return { success: false, error: 'Lớp không tồn tại hoặc không thuộc tổ chức hiện tại.' };
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

  await supabase.from('class_coaches').delete().eq('class_id', id).eq('organization_id', orgId);

  if (data.head_coach_id) await assignCoachToClass(id, data.head_coach_id, 'HEAD_COACH');
  if (data.assistant_coach_id) await assignCoachToClass(id, data.assistant_coach_id, 'ASSISTANT_COACH');

  revalidatePath('/training');
  return { success: true };
}

// --- STUDENTS ---

export async function addStudentAction(data: { name: string; phone?: string; parent_name?: string; parent_phone?: string; dob: string; current_belt_id?: string | null; venue_id: string; class_id?: string }) {
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
  
  const { data: venue, error: venueError } = await supabase
    .from('venues')
    .select('id')
    .eq('id', data.venue_id)
    .eq('organization_id', orgId)
    .single();

  if (venueError || !venue) {
    return { success: false, error: 'Địa điểm không thuộc tổ chức hiện tại.' };
  }

  if (data.class_id) {
    const { data: classData, error: classError } = await supabase
      .from('venue_classes')
      .select('id, venue_id, status')
      .eq('id', data.class_id)
      .eq('organization_id', orgId)
      .single();
    
    if (classError || !classData) {
      return { success: false, error: 'Lớp không tồn tại hoặc không thuộc tổ chức hiện tại.' };
    }
    if (classData.venue_id !== data.venue_id) {
      return { success: false, error: 'Lớp không thuộc địa điểm của học viên.' };
    }
    if (classData.status !== 'active') {
      return { success: false, error: 'Lớp không còn hoạt động.' };
    }
  }

  const { data: newStudent, error } = await supabase.from('students').insert({
    organization_id: orgId,
    name: data.name.trim(),
    phone: data.phone,
    parent_name: data.parent_name,
    parent_phone: data.parent_phone,
    dob: data.dob,
    current_belt_id: data.current_belt_id || null,
    venue_id: data.venue_id || null,
    status: 'active'
  }).select().single();

  if (error) return { success: false, error: error.message };
  
  if (data.class_id && newStudent) {
    await supabase.from('class_students').insert({
      organization_id: orgId,
      student_id: newStudent.id,
      class_id: data.class_id,
      status: 'active'
    });
  }
  
  revalidatePath('/training');
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

  const supabase = await createClient();
  const orgId = context.organization.id;

  const safeData = { ...data };
  delete (safeData as any).organization_id;
  delete (safeData as any).id;
  safeData.name = safeData.name.trim();
  
  const { error } = await supabase.from('students')
    .update(safeData)
    .eq('id', id)
    .eq('organization_id', orgId);

  if (error) return { success: false, error: error.message };

  if (newClassId !== undefined) {
    if (newClassId) {
      const { data: classData, error: classError } = await supabase
        .from('venue_classes')
        .select('id, venue_id, status')
        .eq('id', newClassId)
        .eq('organization_id', orgId)
        .single();
      
      if (classError || !classData) {
        return { success: false, error: 'Lớp không tồn tại hoặc không thuộc tổ chức hiện tại.' };
      }
      if (classData.venue_id !== data.venue_id) {
        return { success: false, error: 'Lớp không thuộc địa điểm của học viên.' };
      }
      if (classData.status !== 'active') {
        return { success: false, error: 'Lớp không còn hoạt động.' };
      }
    }

    const { data: currentActive } = await supabase
      .from('class_students')
      .select('id, class_id')
      .eq('student_id', id)
      .eq('status', 'active')
      .eq('organization_id', orgId);

    const currentClassId = currentActive && currentActive.length > 0 ? currentActive[0].class_id : null;

    if (newClassId !== currentClassId) {
      // Ensure any current active classes are dropped (enforce 1 active class rule)
      await supabase
        .from('class_students')
        .update({ status: 'dropped' })
        .eq('student_id', id)
        .eq('status', 'active')
        .eq('organization_id', orgId);
      
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
  
  revalidatePath('/training');
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
  
  revalidatePath('/training');
  return { success: true };
}

export async function unenrollStudentAction(studentId: string, classId: string) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const supabase = await createClient();
  
  const { error } = await supabase.from('class_students')
    .update({ status: 'dropped' })
    .eq('student_id', studentId)
    .eq('class_id', classId)
    .eq('organization_id', context.organization.id);

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/training');
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
    revalidatePath('/training');
    return { success: true, count: data.count };
  }

  return { success: false, error: data?.error || 'Unknown error during import' };
}
