import BeltsClient from './BeltsClient';
import { getBeltsAction } from './actions';

export default async function BeltsPage() {
  const res = await getBeltsAction();
  const initialBelts = res.success && res.data ? res.data : [];

  return (
    <div style={{ padding: '24px' }}>
      <BeltsClient initialBelts={initialBelts} />
    </div>
  );
}
