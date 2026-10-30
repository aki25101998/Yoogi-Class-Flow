'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { updateOrganizationAction, seedSampleDataAction, resetOrganizationDataAction } from './actions';
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

  // Reset all data state
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetConfirmInput, setResetConfirmInput] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

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

  const handleResetData = async () => {
    if (!isAdminOrOwner) return;

    setResetLoading(true);
    setSeedResult(null);

    try {
      const res = await resetOrganizationDataAction();
      if (res.success) {
        setSeedResult({ 
          type: 'success', 
          message: res.message || 'Đã xóa toàn bộ dữ liệu tổ chức thành công. Hệ thống đã trở về trạng thái sạch sẽ.' 
        });
        setIsResetModalOpen(false);
        setResetConfirmInput('');
        await queryClient.invalidateQueries();
        router.refresh();
      } else {
        setSeedResult({ 
          type: 'error', 
          message: res.error || 'Lỗi khi xóa dữ liệu tổ chức.' 
        });
      }
    } catch (err: any) {
      setSeedResult({ 
        type: 'error', 
        message: err.message || 'Đã xảy ra lỗi không xác định.' 
      });
    } finally {
      setResetLoading(false);
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

  const isResetInputValid = () => {
    const trimmed = resetConfirmInput.trim().toLowerCase();
    const orgName = (organization?.name || '').trim().toLowerCase();
    return trimmed === 'xóa dữ liệu' || trimmed === 'xoa du lieu' || trimmed === 'xoa het' || (orgName && trimmed === orgName);
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* 1. PAGE HEADER */}
      <PageHeader 
        title="Thông tin & Quản trị Trung tâm" 
        description="Quản lý định danh cơ sở đào tạo, bản quyền dịch vụ SaaS và quản trị dữ liệu vận hành"
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

      {/* 4. PHÂN VÙNG 1: THÔNG TIN ĐỊNH DANH & BẢN QUYỀN SAAS */}
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
              Thông Tin Định Danh Cơ Sở
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
          </CardContent>
        </Card>
      </div>

      {/* 5. PHÂN VÙNG 2: QUẢN TRỊ DỮ LIỆU & KIỂM THỬ (CHỈ ADMIN/OWNER) */}
      {isAdminOrOwner && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
          {/* Section Divider Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 0 4px 0',
            borderBottom: '1px solid var(--border-light)'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 107, 53, 0.12)',
              color: 'var(--accent-energy)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span className="material-icons-round" style={{ fontSize: '20px' }}>tune</span>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
                Quản Trị Dữ Liệu & Kiểm Thử Hệ Thống
              </h3>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Khởi tạo dữ liệu thực nghiệm để kiểm tra tính năng hoặc dọn sạch hệ thống trước khi vận hành thực tế
              </p>
            </div>
          </div>

          {/* Feedback Alert if Seed or Reset executed */}
          {seedResult && (
            <div 
              style={{
                fontSize: '0.875rem',
                padding: '16px 20px',
                borderRadius: 'var(--radius-xl)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                background: seedResult.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
                color: seedResult.type === 'success' ? 'var(--success)' : 'var(--danger)',
                border: `1px solid ${seedResult.type === 'success' ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`
              }}
            >
              <span className="material-icons-round" style={{ fontSize: '1.4rem', marginTop: '2px' }}>
                {seedResult.type === 'success' ? 'check_circle' : 'error'}
              </span>
              <div style={{ flex: 1, whiteSpace: 'pre-line', lineHeight: 1.5 }}>{seedResult.message}</div>
            </div>
          )}

          {/* Grid 2 Thẻ Dữ Liệu: Seed Data & Danger Zone */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
            gap: 'var(--space-6)',
            alignItems: 'start'
          }}>
            {/* THẺ 1: NẠP DỮ LIỆU MẪU KIỂM THỬ */}
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
                      background: 'rgba(20, 184, 166, 0.12)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <span className="material-icons-round" style={{ fontSize: '20px' }}>auto_awesome</span>
                    </div>
                    Khởi Tạo Dữ Liệu Mẫu Kiểm Thử
                  </CardTitle>
                  <Badge variant="success">1-Chạm kiểm thử</Badge>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '6px 0 0 0', lineHeight: 1.4 }}>
                  Nạp ngay 6 phân hệ cốt lõi để trải nghiệm thực tế mọi tính năng điểm danh, xếp lịch, học phí và tính lương.
                </p>
              </CardHeader>
              
              <CardContent style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div 
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-xl)',
                    background: 'var(--surface-hover)',
                    border: '1px dashed var(--border-light)',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    <span className="material-icons-round" style={{ color: 'var(--primary)', fontSize: '1.15rem' }}>location_on</span>
                    <span>3 Chi nhánh võ thuật</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    <span className="material-icons-round" style={{ color: 'var(--primary)', fontSize: '1.15rem' }}>sports_martial_arts</span>
                    <span>4 Huấn luyện viên</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    <span className="material-icons-round" style={{ color: 'var(--primary)', fontSize: '1.15rem' }}>groups</span>
                    <span>6 Lớp & 16 Học viên</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    <span className="material-icons-round" style={{ color: 'var(--primary)', fontSize: '1.15rem' }}>calendar_month</span>
                    <span>Lịch tuần & Điểm danh</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    <span className="material-icons-round" style={{ color: 'var(--accent-energy)', fontSize: '1.15rem' }}>account_balance_wallet</span>
                    <span>Học phí & Sổ quỹ</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    <span className="material-icons-round" style={{ color: 'var(--primary)', fontSize: '1.15rem' }}>military_tech</span>
                    <span>8 Cấp đai võ đạo</span>
                  </div>
                </div>

                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  flexWrap: 'wrap', 
                  gap: '12px',
                  paddingTop: '6px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                    <span className="material-icons-round" style={{ fontSize: '16px', color: 'var(--primary)' }}>check_circle</span>
                    <span>Không ghi đè tài khoản quản trị hiện tại</span>
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    isLoading={seedLoading}
                    disabled={seedLoading || resetLoading}
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
              </CardContent>
            </Card>

            {/* THẺ 2: VÙNG NGUY HIỂM: XÓA TOÀN BỘ DỮ LIỆU */}
            <Card style={{ 
              background: 'var(--surface)', 
              border: '1px solid rgba(239, 68, 68, 0.25)', 
              borderRadius: 'var(--radius-2xl)', 
              overflow: 'hidden' 
            }}>
              <CardHeader style={{ padding: '20px 24px', borderBottom: '1px solid rgba(239, 68, 68, 0.15)', background: 'rgba(239, 68, 68, 0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--danger)' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: 'var(--radius-lg)',
                      background: 'var(--danger-bg)',
                      color: 'var(--danger)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <span className="material-icons-round" style={{ fontSize: '20px' }}>warning</span>
                    </div>
                    Vùng Nguy Hiểm: Dọn Sạch Dữ Liệu
                  </CardTitle>
                  <Badge variant="danger">Không thể hoàn tác</Badge>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '6px 0 0 0', lineHeight: 1.4 }}>
                  Xóa sạch học viên, lớp học, điểm danh, lịch học & tài chính sau khi đã thử nghiệm xong để bắt đầu vận hành mới.
                </p>
              </CardHeader>

              <CardContent style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-xl)',
                  background: 'rgba(239, 68, 68, 0.05)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  fontSize: '0.8125rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6
                }}>
                  <div style={{ fontWeight: 700, color: 'var(--danger)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="material-icons-round" style={{ fontSize: '16px' }}>delete_forever</span>
                    Dữ liệu sẽ được dọn sạch hoàn toàn:
                  </div>
                  • Học viên, đai đẳng, đăng ký lớp học<br />
                  • Chi nhánh, lớp học, lịch định kỳ & buổi học thực tế<br />
                  • Điểm danh, học phí, sổ quỹ thu chi & bảng lương HLV<br />
                  <div style={{ marginTop: '8px', color: 'var(--success)', fontWeight: 600 }}>
                    ✓ Tài khoản Chủ sở hữu (Owner) và Gói bản quyền SaaS luôn được bảo toàn tuyệt đối 100%.
                  </div>
                </div>

                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  flexWrap: 'wrap', 
                  gap: '12px',
                  paddingTop: '6px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--danger)', fontSize: '0.8125rem' }}>
                    <span className="material-icons-round" style={{ fontSize: '16px' }}>shield</span>
                    <span>Xác nhận 2 bước an toàn</span>
                  </div>
                  <Button
                    type="button"
                    variant="danger"
                    disabled={seedLoading || resetLoading}
                    onClick={() => {
                      setResetConfirmInput('');
                      setIsResetModalOpen(true);
                    }}
                    leftIcon={<span className="material-icons-round">delete_forever</span>}
                    style={{
                      borderRadius: 'var(--radius-full)',
                      boxShadow: '0 4px 14px rgba(239, 68, 68, 0.25)'
                    }}
                  >
                    Xóa Toàn Bộ Dữ Liệu
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA TOÀN BỘ DỮ LIỆU */}
      {isResetModalOpen && (
        <div 
          className="modal-backdrop"
          onClick={() => {
            if (!resetLoading) setIsResetModalOpen(false);
          }}
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(0, 0, 0, 0.75)', 
            backdropFilter: 'blur(5px)',
            zIndex: 1100, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div 
            className="modal-content"
            onClick={e => e.stopPropagation()}
            style={{ 
              background: 'var(--surface)', 
              borderRadius: 'var(--radius-2xl)', 
              width: '100%', 
              maxWidth: '540px', 
              boxShadow: 'var(--shadow-xl)',
              overflow: 'hidden',
              border: '1px solid rgba(239, 68, 68, 0.3)'
            }}
          >
            {/* Header Cảnh báo */}
            <div style={{ padding: '28px 24px 20px 24px', textAlign: 'center' }}>
              <div style={{ 
                width: '64px', 
                height: '64px', 
                borderRadius: '50%', 
                background: 'var(--danger-bg)', 
                color: 'var(--danger)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                margin: '0 auto 16px auto',
                boxShadow: '0 0 25px rgba(239, 68, 68, 0.3)'
              }}>
                <span className="material-icons-round" style={{ fontSize: '38px' }}>warning</span>
              </div>

              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--danger)', margin: '0 0 8px 0' }}>
                Xác nhận Xóa Toàn Bộ Dữ Liệu?
              </h2>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '18px', lineHeight: 1.5 }}>
                Bạn đang chuẩn bị dọn sạch toàn bộ dữ liệu của trung tâm <strong>{organization?.name}</strong>. Hành động này là <strong>vĩnh viễn và không thể hoàn tác</strong>.
              </p>

              {/* Hộp gõ xác nhận an toàn */}
              <div style={{ textAlign: 'left', marginBottom: '8px' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Nhập chữ <strong style={{ color: 'var(--danger)' }}>XÓA DỮ LIỆU</strong> để xác nhận:
                </label>
                <input 
                  type="text"
                  placeholder="Gõ XÓA DỮ LIỆU vào đây..."
                  value={resetConfirmInput}
                  onChange={e => setResetConfirmInput(e.target.value)}
                  disabled={resetLoading}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-light)',
                    background: 'var(--surface-hover)',
                    color: 'var(--text-main)',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                  autoFocus
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div style={{ 
              padding: '16px 24px', 
              borderTop: '1px solid var(--border-light)', 
              display: 'flex', 
              gap: '12px', 
              background: 'var(--surface)' 
            }}>
              <Button 
                onClick={() => setIsResetModalOpen(false)}
                disabled={resetLoading}
                variant="outline"
                style={{ flex: 1 }}
              >
                Hủy bỏ
              </Button>
              
              <Button 
                onClick={handleResetData}
                disabled={resetLoading || !isResetInputValid()}
                isLoading={resetLoading}
                variant="danger"
                style={{ flex: 1.4 }}
                leftIcon={<span className="material-icons-round">delete_forever</span>}
              >
                {resetLoading ? 'Đang xóa sạch...' : 'Xác nhận Xóa Hết'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
