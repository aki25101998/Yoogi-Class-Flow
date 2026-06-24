import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import DashboardLayoutClient from "./DashboardLayoutClient";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  
  if (error || !data?.user) {
    redirect("/login");
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
