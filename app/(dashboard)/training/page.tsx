import TrainingVenuesClient from './TrainingVenuesClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quản lý Đào tạo - Yoogi',
  description: 'Quản lý địa điểm, lớp học và học viên',
};

export default function TrainingVenuesPage() {
  return <TrainingVenuesClient />;
}
