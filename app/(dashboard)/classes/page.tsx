import ClassesClient from './ClassesClient';

export default function ClassesPage() {
  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Lớp học</h1>
      <ClassesClient />
    </div>
  );
}
