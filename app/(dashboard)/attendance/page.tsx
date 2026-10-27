import { Suspense } from 'react';
import AttendanceClient from './AttendanceClient';

export default function AttendancePage() {
  return (
    <Suspense fallback={<div className="animate-pulse p-6 text-muted">Đang tải điểm danh...</div>}>
      <AttendanceClient />
    </Suspense>
  );
}
