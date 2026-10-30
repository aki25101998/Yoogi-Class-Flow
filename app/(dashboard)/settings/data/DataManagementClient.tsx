'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { seedSampleDataAction, resetOrganizationDataAction } from '../actions';
import { useDashboardContext } from '../../DashboardProvider';

// UI Components
import { PageHeader } from '@/app/components/ui/PageHeader';
import { SettingsNavTabs } from '../components/SettingsNavTabs';
import { Button } from '@/app/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import styles from '@/app/styles/page-standard.module.css';

export default function DataManagementClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { context } = useDashboardContext();
  const organization = context?.organization;
  const currentUserRole = context?.membership?.role;

  // Seed sample data state
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedResult, setSeedResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Reset all data state
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetConfirmInput, setResetConfirmInput] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const isAdminOrOwner = currentUserRole === 'admin' || currentUserRole === 'owner';

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

  const isResetInputValid = () => {
    const trimmed = resetConfirmInput.trim().toLowerCase();
    const orgName = (organization?.name || '').trim().toLowerCase();
    return trimmed === 'xóa dữ liệu' || trimmed === 'xoa du lieu' || trimmed === 'xoa het' || (orgName && trimmed === orgName);
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* 1. PAGE HEADER */}
      <PageHeader 
        title="Quản trị Dữ liệu & Kiểm thử" 
        description="Khởi tạo dữ liệu thực nghiệm kiểm thử hoặc dọn sạch hệ thống trước khi vận hành thực tế"
      />

      {/* 2. SUB NAVIGATION TABS */}
      <SettingsNavTabs />

      {/* 3. OVERVIEW KPI GRID (4 CÂN ĐỐI) */}
      <div className={styles.overviewCard}>
        <div className={styles.overviewHeader}>
          <div className={styles.overviewTitle}>
            <span className="material-icons-round" style={{ fontSize: '18px', color: 'var(--primary)' }}>tune</span>
            TRẠNG THÁI MÔI TRƯỜNG DỮ LIỆU
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Công cụ khởi tạo và làm sạch hệ thống
          </div>
        </div>
        <div className={styles.overviewGrid}>
          {/* 1. Môi trường kiểm thử */}
          <div className={`${styles.kpiItem} ${styles.kpiPrimary}`}>
            <div className={styles.kpiLabel}><div className={styles.kpiDot}></div> Trạng thái trung tâm</div>
            <div className={styles.kpiValue} style={{ fontSize: '1.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {organization?.name || 'Đang tải...'}
            </div>
            <div className={styles.kpiCaption}>Môi trường quản trị vận hành</div>
            <span className={`material-icons-round ${styles.kpiWatermark}`} style={{ color: 'var(--primary)' }}>settings_suggest</span>
          </div>

          {/* 2. Dữ liệu mẫu 1-chạm */}
          <div className={`${styles.kpiItem} ${styles.kpiSuccess}`}>
            <div className={styles.kpiLabel}><div className={styles.kpiDot}></div> Dữ liệu mẫu kiểm thử</div>
            <div className={styles.kpiValue} style={{ fontSize: '1.25rem' }}>1-Chạm</div>
            <div className={styles.kpiCaption}>Khởi tạo đủ 6 phân hệ cốt lõi</div>
            <span className={`material-icons-round ${styles.kpiWatermark}`} style={{ color: 'var(--success)' }}>auto_awesome</span>
          </div>

          {/* 3. Dọn sạch dữ liệu */}
          <div className={`${styles.kpiItem} ${styles.kpiWarning}`}>
            <div className={styles.kpiLabel}><div className={styles.kpiDot}></div> Dọn sạch dữ liệu</div>
            <div className={styles.kpiValue} style={{ fontSize: '1.25rem' }}>Sạch 100%</div>
            <div className={styles.kpiCaption}>Chuẩn bị vận hành thực tế</div>
            <span className={`material-icons-round ${styles.kpiWatermark}`} style={{ color: 'var(--warning)' }}>cleaning_services</span>
          </div>

          {/* 4. Bảo toàn chủ sở hữu */}
          <div className={`${styles.kpiItem} ${styles.kpiInfo}`}>
            <div className={styles.kpiLabel}><div className={styles.kpiDot}></div> Bảo toàn an toàn</div>
            <div className={styles.kpiValue} style={{ fontSize: '1.25rem' }}>Owner & SaaS</div>
            <div className={styles.kpiCaption}>Tài khoản và bản quyền an toàn</div>
            <span className={`material-icons-round ${styles.kpiWatermark}`} style={{ color: 'var(--info)' }}>security</span>
          </div>
        </div>
      </div>

      {/* FEEDBACK ALERT */}
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

      {/* MAIN CONTENT GRID */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
        gap: 'var(--space-6)',
        alignItems: 'start'
      }}>
        {/* CARD 1: NẠP DỮ LIỆU MẪU KIỂM THỬ */}
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
              <Badge variant="success">Khuyên dùng khi bắt đầu</Badge>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '6px 0 0 0', lineHeight: 1.4 }}>
              Tự động khởi tạo ngay một trung tâm hoàn chỉnh với lịch dạy, lớp học, huấn luyện viên, học viên và thu chi để bạn trải nghiệm toàn diện hệ thống.
            </p>
          </CardHeader>
          
          <CardContent style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                <span className="material-icons-round" style={{ color: 'var(--primary)', fontSize: '1.2rem' }}>location_on</span>
                <span>3 Chi nhánh tập luyện</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <span className="material-icons-round" style={{ color: 'var(--primary)', fontSize: '1.2rem' }}>sports_martial_arts</span>
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
              flexWrap: 'wrap', 
              gap: '12px',
              paddingTop: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                <span className="material-icons-round" style={{ fontSize: '16px', color: 'var(--primary)' }}>check_circle</span>
                <span>Không ghi đè tài khoản quản trị hiện tại</span>
              </div>
              <Button
                type="button"
                variant="primary"
                isLoading={seedLoading}
                disabled={seedLoading || resetLoading || !isAdminOrOwner}
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

        {/* CARD 2: VÙNG NGUY HIỂM: XÓA TOÀN BỘ DỮ LIỆU */}
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
              <Badge variant="danger">Thao tác không thể hoàn tác</Badge>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '6px 0 0 0', lineHeight: 1.4 }}>
              Xóa sạch toàn bộ học viên, lớp học, điểm danh, lịch học & tài chính sau khi đã kiểm thử xong để chuẩn bị vận hành chính thức.
            </p>
          </CardHeader>

          <CardContent style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{
              padding: '16px 20px',
              borderRadius: 'var(--radius-xl)',
              background: 'rgba(239, 68, 68, 0.05)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              fontSize: '0.8125rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.6
            }}>
              <div style={{ fontWeight: 700, color: 'var(--danger)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-icons-round" style={{ fontSize: '16px' }}>delete_forever</span>
                Những dữ liệu sẽ bị xóa hoàn toàn:
              </div>
              • Toàn bộ học viên, đai đẳng, đăng ký lớp học<br />
              • Toàn bộ chi nhánh, lớp học và lịch học định kỳ<br />
              • Toàn bộ buổi học thực tế, điểm danh HLV & học viên<br />
              • Toàn bộ học phí, sổ quỹ thu chi & bảng lương HLV<br />
              <div style={{ marginTop: '8px', color: 'var(--success)', fontWeight: 600 }}>
                ✓ Tài khoản Chủ sở hữu (Owner) và Gói bản quyền SaaS được giữ nguyên an toàn 100%.
              </div>
            </div>

            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              flexWrap: 'wrap', 
              gap: '12px',
              paddingTop: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--danger)', fontSize: '0.8125rem' }}>
                <span className="material-icons-round" style={{ fontSize: '16px' }}>shield</span>
                <span>Yêu cầu gõ xác nhận để tránh bấm nhầm</span>
              </div>
              <Button
                type="button"
                variant="danger"
                disabled={seedLoading || resetLoading || !isAdminOrOwner}
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

