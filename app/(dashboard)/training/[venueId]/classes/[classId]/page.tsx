import ClassDetailsClient from './ClassDetailsClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chi tiết Lớp học - Yoogi',
};

export default function ClassDetailsPage({ params }: { params: { venueId: string; classId: string } }) {
  return <ClassDetailsClient venueId={params.venueId} classId={params.classId} />;
}
