import { getCurrentCoach } from "./getCurrentCoach";
import { redirect } from "next/navigation";

export async function requireAuth() {
  const { user, coach } = await getCurrentCoach();
  
  if (!user) {
    redirect("/login");
  }
  
  if (!coach) {
    redirect("/login?error=unauthorized");
  }
  
  return { user, coach };
}
