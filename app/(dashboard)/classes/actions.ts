'use server';

import { assignCoachToClass, removeCoachFromClass } from '@/services/class-coaches.service';

export async function assignCoachAction(classId: string, coachId: string, role: 'HEAD_COACH' | 'ASSISTANT_COACH') {
  return await assignCoachToClass(classId, coachId, role);
}

export async function removeCoachAction(classId: string, coachId: string) {
  return await removeCoachFromClass(classId, coachId);
}
