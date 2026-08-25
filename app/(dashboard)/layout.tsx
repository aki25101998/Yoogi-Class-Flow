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
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const { data, error } = await supabase.auth.getUser();
  
  if (error || !data?.user) {
    const cookieNames = cookieStore.getAll().map(c => `${c.name}=${c.value.substring(0, 15)}...`).join(', ');
    const debugDetails = `Session: ${!!sessionData?.session} | User: ${!!data?.user} | Err: ${error?.message || 'none'} | SessErr: ${sessionError?.message || 'none'} | Cookies: ${cookieNames}`;
    redirect(`/login?error=auth_failed&details=${encodeURIComponent(debugDetails)}`);
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
