import { getCurrentCoach } from "./getCurrentCoach";
import { redirect } from "next/navigation";

export async function requireAuth() {
  const { user, coach, context } = await getCurrentCoach();
  
  if (!user) {
    redirect("/login");
  }
  
  if (!coach) {
    redirect("/login?error=unauthorized");
  }
  
  return { user, coach, context };
}
