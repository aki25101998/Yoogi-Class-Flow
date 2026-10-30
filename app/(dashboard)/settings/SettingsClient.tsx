'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { updateOrganizationAction } from './actions';
import { useDashboardContext } from '../DashboardProvider';

// UI Components
import { PageHeader } from '@/app/components/ui/PageHeader';
import { SettingsNavTabs } from './components/SettingsNavTabs';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { formatBusinessDateVN } from '@/utils/date';
import styles from '@/app/styles/page-standard.module.css';

export default function SettingsClient() {
  const router = useRouter();
  const { context } = useDashboardContext();
  const organization = context?.organization;
  const currentUserRole = context?.membership?.role;

  const [formData, setFormData] = useState({ 
    name: organization?.name || ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const isAdminOrOwner = currentUserRole === 'admin' || currentUserRole === 'owner';

  const handleCopyOrgId = () => {
    if (!organization?.id) return;
    navigator.clipboard.writeText(organization.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdminOrOwner) return;
    
    setError('');
    setSuccess('');
    setIsSubmitting(true);
    
    const res = await updateOrganizationAction(formData);
    
    if (res.success) {
      setSuccess('Cập nhật thông tin trung tâm thành công!');
      setTimeout(() => setSuccess(''), 3000);
      router.refresh();
    } else {
      setError(res.error || 'Lỗi khi cập nhật');
    }
    
    setIsSubmitting(false);
  };

  const planName = (organization?.subscription_plan || 'starter').toUpperCase();
  const planStatus = (organization?.subscription_status || 'active').toLowerCase();
  const expiryText = organization?.subscription_expires_at 
    ? formatBusinessDateVN(organization.subscription_expires_at) 
    : 'Không thời hạn (Vĩnh viễn)';

  const roleDisplay = currentUserRole === 'owner' 
    ? 'Chủ sở hữu (Owner)' 
    : (currentUserRole === 'admin' 
      ? 'Quản trị viên (Admin)' 
      : (currentUserRole === 'head_coach' 
        ? 'HLV Trưởng' 
        : 'Trợ giảng'));

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* 1. PAGE HEADER */}
      <PageHeader 
        title="Thông tin Trung tâm" 
        description="Quản lý định danh cơ sở đào tạo, nhận diện thương hiệu và bản quyền dịch vụ SaaS"
      />

      {/* 2. SUB NAVIGATION TABS */}
      <SettingsNavTabs />

      {/* 3. OVERVIEW KPI GRID (4 CÂN ĐỐI) */}
      <div className={styles.overviewCard}>
        <div className={styles.overviewHeader}>
          <div className={styles.overviewTitle}>
            <span className="material-icons-round" style={{ fontSize: '18px', color: 'var(--primary)' }}>apartment</span>
            THÔNG TIN TỔNG QUAN HỆ THỐNG
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Định danh trung tâm & Bản quyền dịch vụ
          </div>
        </div>
        <div className={styles.overviewGrid}>
          {/* 1. Tên tổ chức */}
          <div className={`${styles.kpiItem} ${styles.kpiPrimary}`}>
            <div className={styles.kpiLabel}><div className={styles.kpiDot}></div> Tên trung tâm</div>
            <div className={styles.kpiValue} style={{ fontSize: '1.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {organization?.name || 'Chưa đặt tên'}
            </div>
            <div className={styles.kpiCaption}>Tổ chức đang hoạt động</div>
            <span className={`material-icons-round ${styles.kpiWatermark}`} style={{ color: 'var(--primary)' }}>business</span>
          </div>

          {/* 2. Gói dịch vụ */}
          <div className={`${styles.kpiItem} ${styles.kpiSuccess}`}>
            <div className={styles.kpiLabel}><div className={styles.kpiDot}></div> Gói bản quyền</div>
            <div className={styles.kpiValue}>{planName}</div>
            <div className={styles.kpiCaption}>Trạng thái: {planStatus === 'active' ? 'Đang hoạt động' : 'Tạm dừng'}</div>
            <span className={`material-icons-round ${styles.kpiWatermark}`} style={{ color: 'var(--success)' }}>workspace_premium</span>
          </div>

          {/* 3. Hạn dùng bản quyền */}
          <div className={`${styles.kpiItem} ${styles.kpiInfo}`}>
            <div className={styles.kpiLabel}><div className={styles.kpiDot}></div> Hạn dùng bản quyền</div>
            <div className={styles.kpiValue} style={{ fontSize: '1.15rem' }}>
              {organization?.subscription_expires_at ? formatBusinessDateVN(organization.subscription_expires_at) : 'Vĩnh viễn'}
            </div>
            <div className={styles.kpiCaption}>Bảo hộ bởi Yoogi Platform</div>
            <span className={`material-icons-round ${styles.kpiWatermark}`} style={{ color: 'var(--info)' }}>verified</span>
          </div>

          {/* 4. Quyền hạn */}
          <div className={`${styles.kpiItem} ${styles.kpiWarning}`}>
            <div className={styles.kpiLabel}><div className={styles.kpiDot}></div> Vai trò của bạn</div>
            <div className={styles.kpiValue} style={{ fontSize: '1.15rem' }}>{roleDisplay}</div>
            <div className={styles.kpiCaption}>{isAdminOrOwner ? 'Toàn quyền quản trị trung tâm' : 'Xem thông tin cơ bản'}</div>
            <span className={`material-icons-round ${styles.kpiWatermark}`} style={{ color: 'var(--warning)' }}>admin_panel_settings</span>
          </div>
        </div>
      </div>

      {/* 4. RESPONSIVE GRID (2 KHỐI CÂN ĐỐI) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
        gap: 'var(--space-6)',
        alignItems: 'start'
      }}>
        {/* CARD 1: THÔNG TIN TỔ CHỨC & ĐỊNH DANH */}
        <Card style={{ background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-2xl)', overflow: 'hidden' }}>
          <CardHeader style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', background: 'var(--surface-hover)' }}>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span className="material-icons-round" style={{ fontSize: '20px' }}>apartment</span>
              </div>
              Thông Tin Định Danh Trung Tâm
            </CardTitle>
          </CardHeader>
          
          <CardContent style={{ padding: '24px' }}>
            {error && (
              <div style={{ 
                color: 'var(--danger)', 
                background: 'var(--danger-bg)', 
                border: '1px solid var(--danger-border, rgba(239, 68, 68, 0.2))', 
                padding: '12px 16px', 
                borderRadius: 'var(--radius-lg)', 
                fontSize: '0.875rem', 
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span className="material-icons-round" style={{ fontSize: '18px' }}>error</span>
                {error}
              </div>
            )}
            
            {success && (
              <div style={{ 
                color: 'var(--success)', 
                background: 'var(--success-bg)', 
                border: '1px solid var(--success-border, rgba(34, 197, 94, 0.2))', 
                padding: '12px 16px', 
                borderRadius: 'var(--radius-lg)', 
                fontSize: '0.875rem', 
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span className="material-icons-round" style={{ fontSize: '18px' }}>check_circle</span>
                {success}
              </div>
            )}
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <Input 
                label="Tên tổ chức / Trung tâm đào tạo *"
                required 
                disabled={!isAdminOrOwner}
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                placeholder="Nhập tên trung tâm võ thuật / thể thao..."
              />

              {/* Organization ID Chip */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Mã định danh trung tâm (Organization ID)
                </label>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  background: 'var(--surface-hover)', 
                  padding: '8px 14px', 
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-light)'
                }}>
                  <code style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    {organization?.id || '---'}
                  </code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyOrgId}
                    leftIcon={<span className="material-icons-round" style={{ fontSize: '16px' }}>{copiedId ? 'check' : 'content_copy'}</span>}
                  >
                    {copiedId ? 'Đã sao chép' : 'Sao chép ID'}
                  </Button>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0 2px' }}>
                  Dùng mã này khi cần đối soát bản quyền hoặc liên hệ đội ngũ kỹ thuật hỗ trợ.
                </p>
              </div>

              {isAdminOrOwner && (
                <div style={{ paddingTop: '12px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end' }}>
                  <Button 
                    type="submit" 
                    variant="primary"
                    isLoading={isSubmitting}
                    disabled={isSubmitting}
                    leftIcon={<span className="material-icons-round">save</span>}
                    style={{ borderRadius: 'var(--radius-full)' }}
                  >
                    Lưu Thay Đổi
                  </Button>
                </div>
              )}
              
              {!isAdminOrOwner && (
                <div style={{ 
                  padding: '14px 16px', 
                  background: 'var(--warning-bg)', 
                  color: 'var(--warning)', 
                  borderRadius: 'var(--radius-lg)', 
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span className="material-icons-round" style={{ fontSize: '18px' }}>lock</span>
                  <span>Bạn đang xem với tư cách <strong>{roleDisplay}</strong>. Chỉ Quản trị viên hoặc Chủ sở hữu mới có thể chỉnh sửa thiết lập này.</span>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* CARD 2: BẢN QUYỀN SAAS & HỖ TRỢ VẬN HÀNH */}
        <Card style={{ 
          background: 'var(--surface)', 
          border: '1px solid var(--border-light)', 
          borderRadius: 'var(--radius-2xl)', 
          overflow: 'hidden' 
        }}>
          <CardHeader style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', background: 'var(--surface-hover)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'rgba(255, 107, 53, 0.12)',
                  color: 'var(--accent-energy)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <span className="material-icons-round" style={{ fontSize: '20px' }}>workspace_premium</span>
                </div>
                Bản Quyền Dịch Vụ & Hỗ Trợ
              </CardTitle>
              <Badge variant={planStatus === 'active' ? 'success' : 'warning'}>
                {planStatus === 'active' ? 'Đang hoạt động' : 'Tạm dừng'}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Subscription Detail Capsule */}
            <div style={{ 
              padding: '18px', 
              background: 'var(--surface-hover)', 
              borderRadius: 'var(--radius-xl)', 
              border: '1px solid var(--border-light)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-icons-round" style={{ color: 'var(--primary)', fontSize: '22px' }}>verified</span>
                  <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>Gói {planName}</span>
                </div>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Mã gói: {planName.toLowerCase()}</span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-icons-round" style={{ fontSize: '18px', color: 'var(--text-muted)' }}>schedule</span>
                  <span>Thời hạn sử dụng: <strong style={{ color: 'var(--text-main)' }}>{expiryText}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-icons-round" style={{ fontSize: '18px', color: 'var(--success)' }}>check_circle</span>
                  <span>Mô hình cấp phép: <strong>B2B SaaS Chuyên Nghiệp</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-icons-round" style={{ fontSize: '18px', color: 'var(--primary)' }}>sync</span>
                  <span>Sao lưu tự động & Bảo toàn phiên bản (Undo/Redo)</span>
                </div>
              </div>
            </div>

            {/* Founder Contact & License Assistance */}
            <div style={{
              padding: '16px 18px',
              borderRadius: 'var(--radius-xl)',
              background: 'rgba(20, 184, 166, 0.06)',
              border: '1px solid rgba(20, 184, 166, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="material-icons-round" style={{ fontSize: '18px' }}>support_agent</span>
                  Cần nâng cấp gói hoặc gia hạn bản quyền?
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Liên hệ Nhà sáng lập Yoogi Platform: <strong>aki251098@gmail.com</strong>
                </div>
              </div>
              <a 
                href="mailto:aki251098@gmail.com?subject=Yoogi%20Class%20Flow%20-%20Yêu%20cầu%20bản%20quyền"
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--primary)',
                  color: '#ffffff',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: 'var(--shadow-teal-glow)'
                }}
              >
                <span className="material-icons-round" style={{ fontSize: '16px' }}>mail</span>
                Gửi Yêu Cầu
              </a>
            </div>

            {/* Quick link to Data Management */}
            {isAdminOrOwner && (
              <div style={{ 
                paddingTop: '12px', 
                borderTop: '1px solid var(--border-light)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Cần kiểm thử hoặc làm sạch hệ thống?
                </span>
                <Link
                  href="/settings/data"
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: 'var(--primary)',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span>Chuyển sang Quản trị dữ liệu</span>
                  <span className="material-icons-round" style={{ fontSize: '16px' }}>arrow_forward</span>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
