'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { updateOrganizationAction, seedSampleDataAction } from './actions';
import { useDashboardContext } from '../DashboardProvider';

// UI Components
import { PageHeader } from '@/app/components/ui/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { formatBusinessDateVN } from '@/utils/date';
import styles from '@/app/styles/page-standard.module.css';

export default function SettingsClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
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

  // Seed sample data state
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedResult, setSeedResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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

  const handleSeedData = async () => {
    if (!isAdminOrOwner) return;
    const confirmed = window.confirm(
      'Hệ thống sẽ nạp dữ liệu mẫu gồm:\n- 8 Cấp đai võ thuật\n- 3 Chi nhánh tập luyện\n- 4 Huấn luyện viên\n- 6 Lớp học\n- 16 Học viên & phân lớp\n- Lịch học tuần & Điểm danh\n- Học phí & Sổ quỹ thu chi\n\nBạn có muốn tiến hành không?'
    );
    if (!confirmed) return;

    setSeedLoading(true);
    setSeedResult(null);

    try {
      const res = await seedSampleDataAction();
      if (res.success) {
        setSeedResult({ type: 'success', message: res.message || 'Nạp dữ liệu mẫu thành công!' });
        await queryClient.invalidateQueries();
        router.refresh();
      } else {
        setSeedResult({ type: 'error', message: res.error || 'Nạp dữ liệu thất bại.' });
      }
    } catch (err: any) {
      setSeedResult({ type: 'error', message: err.message || 'Đã xảy ra lỗi không xác định.' });
    } finally {
      setSeedLoading(false);
    }
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
      {/* 1. PAGE HEADER (FULL WIDTH) */}
      <PageHeader 
        title="Cài đặt Chung" 
        description="Quản lý định danh trung tâm, cấu hình bản quyền và thiết lập vận hành"
      />

      {/* 2. OVERVIEW KPI GRID (4 CÂN ĐỐI) */}
      <div className={styles.overviewCard}>
        <div className={styles.overviewHeader}>
          <div className={styles.overviewTitle}>
            <span className="material-icons-round" style={{ fontSize: '18px', color: 'var(--primary)' }}>domain</span>
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

      {/* 3. RESPONSIVE GRID (EXPANDED TO FULL WIDTH) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isAdminOrOwner ? 'repeat(auto-fit, minmax(460px, 1fr))' : '1fr',
        gap: 'var(--space-6)',
        alignItems: 'start'
      }}>
        {/* CARD 1: THÔNG TIN TỔ CHỨC */}
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
              Thông tin tổ chức & Bản quyền
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
                label="Tên tổ chức / Trung tâm đào tạo"
                required 
                disabled={!isAdminOrOwner}
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                placeholder="Nhập tên trung tâm võ thuật / thể thao..."
              />
              
              {/* Subscription Capsule */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Gói dịch vụ & Trạng thái bản quyền (Subscription)
                </label>
                <div style={{ 
                  padding: '16px', 
                  background: 'var(--surface-hover)', 
                  borderRadius: 'var(--radius-xl)', 
                  border: '1px solid var(--border-light)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="material-icons-round" style={{ color: 'var(--primary)', fontSize: '20px' }}>verified</span>
                      <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>Gói {planName}</span>
                    </div>
                    <Badge variant={planStatus === 'active' ? 'success' : 'warning'}>
                      {planStatus === 'active' ? 'Đang hoạt động' : 'Tạm dừng'}
                    </Badge>
                  </div>
                  
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="material-icons-round" style={{ fontSize: '16px', color: 'var(--text-muted)' }}>schedule</span>
                    <span>Hạn sử dụng: <strong>{expiryText}</strong></span>
                  </div>
                </div>
              </div>

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

        {/* CARD 2: DỮ LIỆU MẪU KIỂM THỬ (SAMPLE DATA) */}
        {isAdminOrOwner && (
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
                    <span className="material-icons-round" style={{ fontSize: '20px' }}>auto_awesome</span>
                  </div>
                  Dữ Liệu Mẫu Kiểm Thử (Sample Data)
                </CardTitle>
                <Badge variant="warning">Môi trường thử nghiệm</Badge>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '6px 0 0 0', lineHeight: 1.4 }}>
                Khởi tạo dữ liệu thực tế 1-chạm để kiểm tra toàn bộ tính năng: Chi nhánh, Lớp học, HLV, Học viên, Lịch học, Điểm danh, Học phí và Sổ quỹ.
              </p>
            </CardHeader>
            
            <CardContent style={{ padding: '24px' }}>
              {seedResult && (
                <div 
                  style={{
                    marginBottom: '16px',
                    fontSize: '0.875rem',
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-xl)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    background: seedResult.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
                    color: seedResult.type === 'success' ? 'var(--success)' : 'var(--danger)',
                    border: `1px solid ${seedResult.type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                  }}
                >
                  <span className="material-icons-round" style={{ fontSize: '1.25rem', marginTop: '2px' }}>
                    {seedResult.type === 'success' ? 'check_circle' : 'error'}
                  </span>
                  <div style={{ flex: 1, whiteSpace: 'pre-line' }}>{seedResult.message}</div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div 
                  style={{
                    padding: '18px',
                    borderRadius: 'var(--radius-xl)',
                    background: 'var(--surface-hover)',
                    border: '1px dashed var(--border-light)',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '14px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    <span className="material-icons-round" style={{ color: 'var(--primary)', fontSize: '1.2rem' }}>verified</span>
                    <span>3 Chi nhánh võ thuật</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    <span className="material-icons-round" style={{ color: 'var(--primary)', fontSize: '1.2rem' }}>sports_kabaddi</span>
                    <span>4 Huấn luyện viên</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    <span className="material-icons-round" style={{ color: 'var(--primary)', fontSize: '1.2rem' }}>groups</span>
                    <span>6 Lớp & 16 Học viên</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    <span className="material-icons-round" style={{ color: 'var(--primary)', fontSize: '1.2rem' }}>calendar_month</span>
                    <span>Lịch tuần & Điểm danh</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    <span className="material-icons-round" style={{ color: 'var(--accent-energy)', fontSize: '1.2rem' }}>account_balance_wallet</span>
                    <span>Học phí & Sổ quỹ thu chi</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    <span className="material-icons-round" style={{ color: 'var(--primary)', fontSize: '1.2rem' }}>military_tech</span>
                    <span>8 Cấp đai võ đạo</span>
                  </div>
                </div>

                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  paddingTop: '8px', 
                  flexWrap: 'wrap', 
                  gap: '12px' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                    <span className="material-icons-round" style={{ fontSize: '16px', color: 'var(--primary)' }}>shield</span>
                    <span>An toàn: Không ghi đè hay xóa dữ liệu hiện có</span>
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    isLoading={seedLoading}
                    disabled={seedLoading}
                    onClick={handleSeedData}
                    leftIcon={<span className="material-icons-round">play_circle_filled</span>}
                    style={{
                      boxShadow: 'var(--shadow-teal-glow)',
                      borderRadius: 'var(--radius-full)'
                    }}
                  >
                    Nạp Dữ Liệu Mẫu Ngay
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
