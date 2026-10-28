import { requireAuth } from "@/utils/auth/requireAuth";
import DashboardLayoutClient from "./DashboardLayoutClient";
import { DashboardProvider } from "./DashboardProvider";
import { isFounderEmail, FOUNDER_EMAIL } from "@/services/platform-admin.service";
import Link from "next/link";
import { logout } from "@/app/actions/auth.actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, coach: userData, context } = await requireAuth();

  const isFounder = isFounderEmail(user?.email);
  const orgStatus = context?.organization?.subscription_status;
  const isSuspended = orgStatus === 'suspended';

  const expiresAt = context?.organization?.subscription_expires_at;
  const isExpired = expiresAt && new Date(expiresAt).getTime() < Date.now();

  // If organization is locked/suspended AND current user is NOT the founder
  if (isSuspended && !isFounder) {
    return (
      <DashboardProvider user={user} userData={userData} context={context}>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--background)',
          padding: '24px'
        }}>
          <div style={{
            maxWidth: '520px',
            width: '100%',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-2xl)',
            padding: '36px 32px',
            textAlign: 'center',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--danger-bg)',
              color: 'var(--danger)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px'
            }}>
              <span className="material-icons-round" style={{ fontSize: '36px' }}>lock</span>
            </div>

            <h1 style={{
              fontSize: '1.375rem',
              fontWeight: 800,
              color: 'var(--text-main)',
              marginBottom: '8px'
            }}>
              Trung Tâm Đang Tạm Khóa
            </h1>

            <p style={{
              fontSize: '0.9375rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              marginBottom: '24px'
            }}>
              Bản quyền của trung tâm <strong>&quot;{context?.organization?.name}&quot;</strong> hiện đang bị tạm dừng hoạt động trên nền tảng Yoogi.
            </p>

            <div style={{
              backgroundColor: 'var(--surface-hover)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px',
              textAlign: 'left',
              fontSize: '0.8125rem',
              color: 'var(--text-secondary)',
              marginBottom: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div><strong>Nhà sáng lập:</strong> {FOUNDER_EMAIL}</div>
              <div><strong>Hỗ trợ:</strong> Vui lòng liên hệ quản trị viên hoặc thanh toán gia hạn để tiếp tục sử dụng.</div>
            </div>

            <form action={logout}>
              <button
                type="submit"
                style={{
                  width: '100%',
                  height: '44px',
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-full)',
                  color: 'var(--text-main)',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                Đăng Xuất
              </button>
            </form>
          </div>
        </div>
      </DashboardProvider>
    );
  }

  return (
    <DashboardProvider user={user} userData={userData} context={context}>
      {/* 1. Founder Warning Banner if viewing a suspended center */}
      {isSuspended && isFounder && (
        <div style={{
          backgroundColor: '#FEF2F2',
          borderBottom: '1px solid #FCA5A5',
          color: '#991B1B',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.875rem',
          fontWeight: 600,
          position: 'sticky',
          top: 0,
          zIndex: 9999
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-icons-round" style={{ fontSize: '18px' }}>lock</span>
            <span>
              Trung tâm &quot;{context?.organization?.name}&quot; hiện đang BỊ KHÓA đối với người dùng thường. Bạn đang xem với quyền Nhà sáng lập.
            </span>
          </div>
          <Link
            href="/platform-admin"
            style={{
              padding: '4px 12px',
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              borderRadius: '9999px',
              textDecoration: 'none',
              fontSize: '0.75rem',
              fontWeight: 700
            }}
          >
            Quay Lại Cổng Founder
          </Link>
        </div>
      )}

      {/* 2. Expiration Banner for active centers */}
      {!isSuspended && isExpired && (
        <div style={{
          backgroundColor: '#FFFBEB',
          borderBottom: '1px solid #FDE68A',
          color: '#92400E',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.875rem',
          fontWeight: 600,
          position: 'sticky',
          top: 0,
          zIndex: 9998
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-icons-round" style={{ fontSize: '18px' }}>warning</span>
            <span>
              Bản quyền của trung tâm &quot;{context?.organization?.name}&quot; đã hết hạn. Vui lòng liên hệ Nhà sáng lập để gia hạn.
            </span>
          </div>
          {isFounder ? (
            <Link
              href="/platform-admin"
              style={{
                padding: '4px 12px',
                backgroundColor: 'var(--primary)',
                color: '#FFFFFF',
                borderRadius: '9999px',
                textDecoration: 'none',
                fontSize: '0.75rem',
                fontWeight: 700
              }}
            >
              Gia Hạn Ngay
            </Link>
          ) : (
            <span style={{ fontSize: '0.75rem' }}>Liên hệ: {FOUNDER_EMAIL}</span>
          )}
        </div>
      )}

      <DashboardLayoutClient>
        {children}
      </DashboardLayoutClient>
    </DashboardProvider>
  );
}
