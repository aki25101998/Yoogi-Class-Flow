'use server';

import { createClient } from '@/utils/supabase/server';
import { getCurrentOrganizationContext } from '@/services/organization.service';
import { revalidatePath } from 'next/cache';

export async function approveSalarySessionAction(sessionId: string) {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const supabase = await createClient();
  
  // Fetch session details
  const { data: session } = await supabase.from('teacher_salary_sessions')
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
    // Fetch student attendance
    const { data: attendance } = await supabase.from('student_attendance')
      .select('records')
      .eq('class_id', session.class_id)
      .eq('date', session.date)
      .single();
      
    if (attendance && attendance.records) {
      studentsPresentCount = (attendance.records as any[]).filter(r => r.status === 'present').length;
    }
  }

  const calculatedAmount = Number(perSession) + (studentsPresentCount * Number(perStudent));

  const { error } = await supabase.from('teacher_salary_sessions')
    .update({
      status: 'approved',
      calculated_salary: calculatedAmount,
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
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return { success: false, error: 'Access Denied' };

  const supabase = await createClient();
  
  // Create finance transaction
  const { error: financeError } = await supabase.from('finance_transactions').insert({
    organization_id: context.organization.id,
    type: 'expense',
    category: 'payroll',
    amount: amount,
    date: new Date().toISOString().split('T')[0],
    description: `Thanh toán lương cho HLV (Coach ID: ${coachId})`
  });

  if (financeError) return { success: false, error: financeError.message };

  // Update sessions as paid
  const { error: updateError } = await supabase.from('teacher_salary_sessions')
    .update({ status: 'paid' })
    .in('id', sessionIds)
    .eq('organization_id', context.organization.id);
    
  if (updateError) return { success: false, error: updateError.message };

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
