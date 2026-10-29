import { Metadata } from 'next';
import VersionHistoryClient from './components/VersionHistoryClient';

export const metadata: Metadata = {
  title: 'Lịch sử phiên bản | Yoogi Class Flow',
  description: 'Xem các thay đổi dữ liệu của tổ chức và khôi phục về trạng thái trước đó.',
};

export default function VersionHistoryPage() {
  return <VersionHistoryClient />;
}
