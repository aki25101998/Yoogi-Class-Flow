import AttendanceClient from './AttendanceClient';

export default function AttendancePage() {
  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Điểm danh học viên</h1>
      <AttendanceClient />
    </div>
  );
}
