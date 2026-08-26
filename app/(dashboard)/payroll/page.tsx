import PayrollClient from './PayrollClient';

export default function PayrollPage() {
  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Bảng lương HLV</h1>
      <PayrollClient />
    </div>
  );
}
