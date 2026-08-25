import { requireAuth } from "@/utils/auth/requireAuth";
import { getCurrentOrganizationContext } from "@/services/organization.service";
import DashboardLayoutClient from "./DashboardLayoutClient";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, coach: userData } = await requireAuth();
  const context = await getCurrentOrganizationContext();

  return (
    <DashboardLayoutClient user={user} userData={userData} context={context}>
      {children}
    </DashboardLayoutClient>
  );
}
