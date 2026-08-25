import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import DashboardLayoutClient from "./DashboardLayoutClient";
import { cookies } from 'next/headers';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  console.log("[DashboardLayout] Incoming cookies:", cookieStore.getAll().map(c => `${c.name}=${c.value.substring(0, 10)}...`).join(', '));

  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  
  console.log("[DashboardLayout] getUser result:", { user: !!data?.user, error });
  
  if (error || !data?.user) {
    const cookieNames = cookieStore.getAll().map(c => c.name).join(', ');
    redirect(`/login?error=auth_failed&details=${encodeURIComponent('Dashboard_No_User | Cookies: ' + (cookieNames || 'none'))}`);
  }

  const user = data.user;
  const email = user.email?.toLowerCase().trim();
  
  const { data: coaches } = await supabase.from('coaches').select('*').eq('email', email);
  
  if (!coaches || coaches.length === 0) {
    redirect("/login?error=unauthorized");
  }

  const userData = coaches[0];

  return (
    <DashboardLayoutClient user={user} userData={userData}>
      {children}
    </DashboardLayoutClient>
  );
}
