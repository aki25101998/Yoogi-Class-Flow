import FinanceClient from './FinanceClient';

export default function FinancePage() {
  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Sổ quỹ</h1>
      <FinanceClient />
    </div>
  );
}
