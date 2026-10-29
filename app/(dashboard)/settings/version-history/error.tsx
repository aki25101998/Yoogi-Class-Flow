"use client";

import { useEffect } from "react";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Button } from "@/app/components/ui/Button";
import { EmptyState } from "@/app/components/ui/EmptyState";

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
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <PageHeader 
        title="Lịch sử phiên bản" 
        description="Xem các thay đổi dữ liệu của tổ chức và khôi phục về trạng thái trước đó."
      />
      <EmptyState 
        icon="error_outline"
        title="Không thể tải lịch sử phiên bản"
        description="Đã có lỗi xảy ra trong quá trình tải dữ liệu. Vui lòng thử lại."
        action={
          <Button 
            onClick={() => reset()}
            variant="primary"
            leftIcon={<span className="material-icons-round">refresh</span>}
          >
            Thử lại
          </Button>
        }
      />
    </div>
  );
}
