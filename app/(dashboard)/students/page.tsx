import StudentsClient from './StudentsClient';

export default function StudentsPage() {
  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Học viên</h1>
      <StudentsClient />
    </div>
  );
}
