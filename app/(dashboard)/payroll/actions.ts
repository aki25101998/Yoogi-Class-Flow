'use server';

import { createClient } from '@/utils/supabase/server';
import { getCurrentOrganizationContext } from '@/services/organization.service';
import { revalidatePath } from 'next/cache';

export async function approveSalarySessionAction(sessionId: string) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const supabase = await createClient();
  
  // Fetch session details
  const { data: session } = await supabase.from('class_sessions')
    .select('class_id, coach_id, date, calculated_salary')
    .eq('id', sessionId)
    .single();
    
  if (!session) return { success: false, error: 'Session not found' };

  // Fetch teacher salary config
  const { data: config } = await supabase.from('teacher_salaries')
    .select('per_session, per_student')
    .eq('coach_id', session.coach_id)
    .eq('organization_id', context.organization.id)
    .single();

  const perSession = config?.per_session || 0;
  const perStudent = config?.per_student || 0;
  
  let studentsPresentCount = 0;
  
  if (perStudent > 0 && session.class_id) {
    // Fetch student attendance from new table
    const { count } = await supabase.from('student_session_attendance')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .eq('status', 'present');
      
    studentsPresentCount = count || 0;
  }

  const calculatedAmount = Number(perSession) + (studentsPresentCount * Number(perStudent));

  const { error } = await supabase.from('class_sessions')
    .update({
      status: 'approved',
      calculated_salary: calculatedAmount,
      salary_config_snapshot: {
        per_session: perSession,
        per_student: perStudent,
        students_present: studentsPresentCount,
        calculated_amount: calculatedAmount
      },
      approved_by: context.membership?.user_id || null,
      approved_at: new Date().toISOString()
    })
    .eq('id', sessionId)
    .eq('organization_id', context.organization.id);

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/payroll');
  return { success: true };
}

export async function payCoachSalaryAction(coachId: string, amount: number, sessionIds: string[]) {
  // We completely ignore the 'amount' parameter from the client for security.
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const supabase = await createClient();
  
  // Call RPC to atomically calculate, create finance transaction, and mark paid
  const { data, error } = await supabase.rpc('pay_approved_salary_sessions', {
    p_organization_id: context.organization.id,
    p_coach_id: coachId,
    p_session_ids: sessionIds,
    p_created_by: context.membership?.user_id || null
  });

  if (error) {
    return { success: false, error: error.message };
  }

  if (data && data.success === false) {
    return { success: false, error: data.error || 'Failed to process payment' };
  }

  revalidatePath('/payroll');
  return { success: true };
}

export async function updateSalaryConfigAction(coachId: string, perSession: number, perStudent: number) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const supabase = await createClient();
  
  const { data: existing } = await supabase.from('teacher_salaries')
    .select('id')
    .eq('coach_id', coachId)
    .eq('organization_id', context.organization.id)
    .single();

  let error;
  if (existing) {
    const res = await supabase.from('teacher_salaries')
      .update({ per_session: perSession, per_student: perStudent, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    error = res.error;
  } else {
    const res = await supabase.from('teacher_salaries')
      .insert({
        organization_id: context.organization.id,
        coach_id: coachId,
        per_session: perSession,
        per_student: perStudent
      });
    error = res.error;
  }

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/payroll');
  return { success: true };
}
