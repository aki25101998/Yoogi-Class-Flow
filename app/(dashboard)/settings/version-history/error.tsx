"use client";

import { useEffect } from "react";

export default function VersionHistoryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="page-container" style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', textAlign: 'center', paddingTop: '64px' }}>
      <span className="material-icons-round" style={{ fontSize: '48px', color: 'var(--danger)', marginBottom: '16px' }}>error_outline</span>
      <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>Không thể tải lịch sử phiên bản</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Đã có lỗi xảy ra trong quá trình tải dữ liệu. Vui lòng thử lại.</p>
      <button 
        onClick={() => reset()}
        className="btn btn-primary"
      >
        Thử lại
      </button>
    </div>
  );
}
