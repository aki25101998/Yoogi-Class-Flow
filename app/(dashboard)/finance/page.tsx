import { Suspense } from 'react';
import FinanceClient from './FinanceClient';

export default function FinancePage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem' }}>Đang tải sổ quỹ...</div>}>
      <FinanceClient />
    </Suspense>
  );
}
