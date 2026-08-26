import ScheduleClient from './ScheduleClient';

export default function SchedulePage() {
  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Lịch dạy</h1>
      <ScheduleClient />
    </div>
  );
}
