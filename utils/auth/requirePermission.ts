import { requireAuth } from "./requireAuth";
import { redirect } from "next/navigation";

export async function requireRole(role: string) {
  const { user, coach } = await requireAuth();
  
  if (coach.role !== role && coach.role !== 'admin' && coach.role !== 'owner') {
    redirect("/dashboard?error=forbidden");
  }
  
  return { user, coach };
}

export async function requirePermission(permission: string) {
  const { user, coach } = await requireAuth();
  
  if (coach.role === 'admin' || coach.role === 'owner') {
    return { user, coach };
  }
  
  const permissions = Array.isArray(coach.permissions) ? coach.permissions : [];
  if (!permissions.includes(permission)) {
    redirect("/dashboard?error=forbidden");
  }
  
  return { user, coach };
}
