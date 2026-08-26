import { getCurrentOrganizationContext } from '@/services/organization.service';
import SettingsClient from './SettingsClient';

export default async function SettingsPage() {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.organization) return <div>Access Denied</div>;

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Cài đặt tổ chức</h1>
      <SettingsClient 
        organization={context.organization}
        currentUserRole={context.membership?.role as string}
      />
    </div>
  );
}
