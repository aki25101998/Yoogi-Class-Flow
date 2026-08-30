import { Metadata } from 'next';
import VersionHistoryClient from './components/VersionHistoryClient';

export const metadata: Metadata = {
  title: 'Lịch sử phiên bản | Yoogi Class Flow',
  description: 'Xem các thay đổi dữ liệu của Organization và khôi phục phiên bản trước khi cần.',
};

export default function VersionHistoryPage() {
  return (
    <div className="page-container" style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: '32px' }}>
        <h1 className="page-title" style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>Lịch sử phiên bản</h1>
        <p className="page-subtitle" style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>Xem các thay đổi dữ liệu của tổ chức và khôi phục về trạng thái trước đó.</p>
      </div>

      <VersionHistoryClient />
    </div>
  );
}
