import { requireAuth } from "@/utils/auth/requireAuth";
import { getCurrentOrganizationContext } from "@/services/organization.service";
import DashboardLayoutClient from "./DashboardLayoutClient";
import { DashboardProvider } from "./DashboardProvider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, coach: userData } = await requireAuth();
  const context = await getCurrentOrganizationContext();

  return (
    <DashboardProvider user={user} userData={userData} context={context}>
      <DashboardLayoutClient>
        {children}
      </DashboardLayoutClient>
    </DashboardProvider>
  );
}
