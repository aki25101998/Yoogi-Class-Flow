import VenuesClient from './VenuesClient';

export default function VenuesPage() {
  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Địa điểm</h1>
      <VenuesClient />
    </div>
  );
}
