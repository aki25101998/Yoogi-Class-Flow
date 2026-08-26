import SettingsClient from './SettingsClient';

export default function SettingsPage() {
  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Cài đặt tổ chức</h1>
      <SettingsClient />
    </div>
  );
}
