'use client';

import React, { useState } from 'react';
import { 
  PlatformOrganization, 
  PlatformStats 
} from '@/services/platform-admin.service';
import { 
  provisionOrganizationAction, 
  updateOrganizationStatusAction,
  switchIntoWorkspaceAction 
} from './actions';
import { useRouter } from 'next/navigation';
import styles from '@/app/styles/page-standard.module.css';
import { PageHeader } from '@/app/components/ui/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/app/components/ui/Modal';

interface Props {
  initialOrgs: PlatformOrganization[];
  initialStats: PlatformStats;
}

export default function PlatformAdminClient({ initialOrgs, initialStats }: Props) {
  const router = useRouter();
  const [orgs, setOrgs] = useState<PlatformOrganization[]>(initialOrgs);
  const [stats, setStats] = useState<PlatformStats>(initialStats);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('all');

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    ownerEmail: '',
    ownerName: '',
    plan: 'starter',
    durationMonths: 12,
    createCoachProfile: true
  });
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Action Loading State
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Filtered Orgs
  const filteredOrgs = orgs.filter(org => {
    const matchesSearch = 
      org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.owner_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.owner_name.toLowerCase().includes(searchTerm.toLowerCase());

    const isExpired = org.subscription_expires_at && new Date(org.subscription_expires_at).getTime() < Date.now();
    const effectiveStatus = (org.subscription_status === 'expired' || isExpired) ? 'expired' : 'active';

    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && effectiveStatus === statusFilter;
  });

  const handleOpenModal = () => {
    setFormData({
      name: '',
      ownerEmail: '',
      ownerName: '',
      plan: 'starter',
      durationMonths: 12,
      createCoachProfile: true
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleProvisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccessMessage('');

    if (!formData.name.trim()) {
      setFormError('Vui lòng nhập tên trung tâm.');
      return;
    }
    if (!formData.ownerEmail.trim()) {
      setFormError('Vui lòng nhập email của chủ trung tâm.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await provisionOrganizationAction(formData);
      if (res.success) {
        setSuccessMessage(`Đã kích hoạt thành công trung tâm "${formData.name}" cho chủ sở hữu ${formData.ownerEmail}!`);
        setIsModalOpen(false);
        router.refresh();
      } else {
        setFormError(res.error || 'Có lỗi xảy ra khi tạo trung tâm.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Lỗi hệ thống.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExtendSubscription = async (org: PlatformOrganization, months: number) => {
    if (!confirm(`Bạn có chắc muốn gia hạn thêm ${months} tháng cho trung tâm "${org.name}"?`)) return;

    setActionLoadingId(org.id);
    try {
      const res = await updateOrganizationStatusAction(org.id, 'active', months);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || 'Lỗi khi gia hạn trung tâm.');
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleStatus = async (org: PlatformOrganization) => {
    const isCurrentlyActive = org.subscription_status === 'active';
    const nextStatus = isCurrentlyActive ? 'suspended' : 'active';
    const actionLabel = isCurrentlyActive ? 'KHÓA' : 'MỞ KHÓA';

    if (!confirm(`Bạn có chắc muốn ${actionLabel} trung tâm "${org.name}"?`)) return;

    setActionLoadingId(org.id);
    try {
      const res = await updateOrganizationStatusAction(org.id, nextStatus);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || `Lỗi khi ${actionLabel} trung tâm.`);
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSwitchIntoWorkspace = async (orgId: string, orgName: string) => {
    setActionLoadingId(orgId);
    try {
      const res = await switchIntoWorkspaceAction(orgId);
      if (res.success) {
        window.location.href = '/dashboard';
      } else {
        alert(res.error || 'Không thể chuyển vào trung tâm này.');
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Vô thời hạn';
    const d = new Date(isoString);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getRemainingDays = (isoString?: string) => {
    if (!isoString) return null;
    const diffTime = new Date(isoString).getTime() - Date.now();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div>
      {/* 1. STANDARD PAGE HEADER */}
      <PageHeader
        title="Quản Lý Bản Quyền Nền Tảng"
        description="Cấp phép, kích hoạt và quản lý thời hạn trung tâm cho khách hàng đã thanh toán."
        primaryAction={
          <Button
            variant="primary"
            leftIcon={<span className="material-icons-round">add_business</span>}
            onClick={handleOpenModal}
          >
            Cấp Phép Trung Tâm Mới
          </Button>
        }
      />

      {/* Success Notification Bar */}
      {successMessage && (
        <div style={{
          backgroundColor: 'var(--success-bg)',
          color: 'var(--success-text)',
          border: '1px solid var(--success)',
          padding: '12px 18px',
          borderRadius: 'var(--radius-lg)',
          marginBottom: 'var(--space-4)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.875rem',
          fontWeight: 600
        }}>
          <span className="material-icons-round" style={{ fontSize: '20px' }}>check_circle</span>
          <span style={{ flex: 1 }}>{successMessage}</span>
          <button 
            onClick={() => setSuccessMessage('')} 
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '18px' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. OVERVIEW KPI BENTO CARD */}
      <div className={styles.overviewCard}>
        <div className={styles.overviewHeader}>
          <div className={styles.overviewTitle}>
            <span className="material-icons-round" style={{ color: 'var(--primary)' }}>analytics</span>
            TỔNG QUAN NỀN TẢNG YOOGI
          </div>
          <Badge variant="success">Founder Suite</Badge>
        </div>

        <div className={styles.overviewGrid}>
          {/* Total Orgs */}
          <div className={`${styles.kpiItem} ${styles.kpiPrimary}`}>
            <div className={styles.kpiLabel}>
              <div className={styles.kpiDot}></div>
              Tổng trung tâm
            </div>
            <div className={styles.kpiValue}>{stats.totalOrganizations}</div>
            <div className={styles.kpiCaption}>Đang vận hành trên hệ thống</div>
            <span className={`material-icons-round ${styles.kpiWatermark}`} style={{ color: 'var(--primary)' }}>
              domain
            </span>
          </div>

          {/* Active Orgs */}
          <div className={`${styles.kpiItem} ${styles.kpiSuccess}`}>
            <div className={styles.kpiLabel}>
              <div className={styles.kpiDot}></div>
              Đang hoạt động
            </div>
            <div className={styles.kpiValue}>{stats.activeOrganizations}</div>
            <div className={styles.kpiCaption}>Bản quyền còn thời hạn</div>
            <span className={`material-icons-round ${styles.kpiWatermark}`} style={{ color: 'var(--success)' }}>
              verified
            </span>
          </div>

          {/* Expired Orgs */}
          <div className={`${styles.kpiItem} ${stats.expiredOrganizations > 0 ? styles.kpiDanger : styles.kpiStatus}`}>
            <div className={styles.kpiLabel}>
              <div className={styles.kpiDot}></div>
              Hết hạn / Cần thu phí
            </div>
            <div className={styles.kpiValue}>{stats.expiredOrganizations}</div>
            <div className={styles.kpiCaption}>Cần nhắc đóng phí gia hạn</div>
            <span className={`material-icons-round ${styles.kpiWatermark}`} style={{ color: stats.expiredOrganizations > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
              schedule
            </span>
          </div>

          {/* System Scale */}
          <div className={`${styles.kpiItem} ${styles.kpiInfo}`}>
            <div className={styles.kpiLabel}>
              <div className={styles.kpiDot}></div>
              Quy mô học viên
            </div>
            <div className={styles.kpiValue}>{stats.totalStudents}</div>
            <div className={styles.kpiCaption}>Cùng {stats.totalCoaches} huấn luyện viên</div>
            <span className={`material-icons-round ${styles.kpiWatermark}`} style={{ color: 'var(--info)' }}>
              groups
            </span>
          </div>
        </div>
      </div>

      {/* 3. TOOLBAR & FILTER PILLS */}
      <div className={styles.toolbar}>
        {/* Search input */}
        <div className={styles.searchWrapper}>
          <span className={`material-icons-round ${styles.searchIcon}`}>search</span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Tìm theo tên trung tâm hoặc email chủ..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button 
              className={styles.searchClearBtn}
              onClick={() => setSearchTerm('')}
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className={styles.filterGroup}>
          <button
            className={`${styles.filterPill} ${statusFilter === 'all' ? styles.filterPillActive : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            Tất cả ({orgs.length})
          </button>
          <button
            className={`${styles.filterPill} ${statusFilter === 'active' ? styles.filterPillActive : ''}`}
            onClick={() => setStatusFilter('active')}
          >
            Còn hạn ({stats.activeOrganizations})
          </button>
          <button
            className={`${styles.filterPill} ${statusFilter === 'expired' ? styles.filterPillActive : ''}`}
            onClick={() => setStatusFilter('expired')}
          >
            Hết hạn ({stats.expiredOrganizations})
          </button>
        </div>
      </div>

      {/* 4. ENTITY LIST ROWS (Yoogi Standard) */}
      <div className={styles.listContainer}>
        {filteredOrgs.length === 0 ? (
          <div className={styles.emptyCompact}>
            <span className={`material-icons-round ${styles.emptyIcon}`}>domain_disabled</span>
            <div className={styles.emptyTitle}>Không tìm thấy trung tâm nào</div>
            <div className={styles.emptyDesc}>
              Thử tìm kiếm với từ khóa khác hoặc bấm nút Cấp Phép Trung Tâm Mới.
            </div>
          </div>
        ) : (
          filteredOrgs.map((org) => {
            const remainingDays = getRemainingDays(org.subscription_expires_at);
            const isExpired = remainingDays !== null && remainingDays <= 0;
            const isSuspended = org.subscription_status === 'suspended';

            let statusVariant: 'success' | 'warning' | 'danger' | 'default' = 'success';
            let statusText = 'Đang hoạt động';

            if (isSuspended) {
              statusVariant = 'danger';
              statusText = 'Đã khóa';
            } else if (isExpired) {
              statusVariant = 'danger';
              statusText = 'Hết hạn';
            } else if (remainingDays !== null && remainingDays <= 15) {
              statusVariant = 'warning';
              statusText = `Còn ${remainingDays} ngày`;
            }

            const planUpper = (org.subscription_plan || 'starter').toUpperCase();
            const initials = org.name.trim().slice(0, 2).toUpperCase();

            return (
              <div key={org.id} className={styles.entityCard}>
                {/* 1. Avatar */}
                <div className={styles.entityAvatar}>
                  {initials}
                </div>

                {/* 2. Main Center & Owner Info */}
                <div className={styles.entityMain}>
                  <div className={styles.entityTitleRow}>
                    <span className={styles.entityTitle}>{org.name}</span>
                    <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                      ID: {org.id.slice(0, 8)}...
                    </span>
                  </div>
                  <div className={styles.entitySubtitle}>
                    Chủ sở hữu: <strong>{org.owner_name}</strong> • {org.owner_email}
                  </div>
                </div>

                {/* 3. Badges: Plan & Status */}
                <div className={styles.entityBadge} style={{ width: '180px', gap: '6px', flexWrap: 'wrap' }}>
                  <Badge variant="primary">{planUpper}</Badge>
                  <Badge variant={statusVariant}>{statusText}</Badge>
                </div>

                {/* 4. Metric 1: Hạn dùng */}
                <div className={styles.entityMetric} style={{ width: '150px' }}>
                  <div className={styles.metricLabel}>HẠN SỬ DỤNG</div>
                  <div className={styles.metricValue}>{formatDate(org.subscription_expires_at)}</div>
                  {remainingDays !== null && (
                    <span style={{
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      color: isExpired ? 'var(--danger)' : remainingDays <= 15 ? 'var(--warning)' : 'var(--text-muted)'
                    }}>
                      {isExpired ? `Quá hạn ${Math.abs(remainingDays)} ngày` : `Còn ${remainingDays} ngày`}
                    </span>
                  )}
                </div>

                {/* 5. Metric 2: Quy mô */}
                <div className={styles.entityMetric} style={{ width: '130px' }}>
                  <div className={styles.metricLabel}>QUY MÔ</div>
                  <div className={styles.metricValue}>{org.coaches_count || 0} HLV</div>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
                    {org.students_count || 0} học viên
                  </span>
                </div>

                {/* 6. Actions */}
                <div className={styles.entityActions} style={{ gap: '8px' }}>
                  {/* +1 Năm */}
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<span className="material-icons-round" style={{ fontSize: '16px', color: 'var(--success)' }}>update</span>}
                    onClick={() => handleExtendSubscription(org, 12)}
                    disabled={actionLoadingId === org.id}
                  >
                    +1 Năm
                  </Button>

                  {/* Lock / Unlock */}
                  <Button
                    size="sm"
                    variant={isSuspended ? "success" : "danger"}
                    leftIcon={<span className="material-icons-round" style={{ fontSize: '16px' }}>{isSuspended ? 'lock_open' : 'lock'}</span>}
                    onClick={() => handleToggleStatus(org)}
                    disabled={actionLoadingId === org.id}
                  >
                    {isSuspended ? 'Mở' : 'Khóa'}
                  </Button>

                  {/* Switch into Workspace */}
                  <Button
                    size="sm"
                    variant="secondary"
                    leftIcon={<span className="material-icons-round" style={{ fontSize: '16px' }}>open_in_new</span>}
                    onClick={() => handleSwitchIntoWorkspace(org.id, org.name)}
                    disabled={actionLoadingId === org.id}
                  >
                    Vào xem
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. PROVISION MODAL (Standard Yoogi UI) */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <ModalHeader 
          title="Cấp Phép Trung Tâm Mới" 
          onClose={() => setIsModalOpen(false)} 
        />
        
        <form onSubmit={handleProvisionSubmit}>
          <ModalBody>
            {formError && (
              <div style={{
                padding: '12px 16px',
                backgroundColor: 'var(--danger-bg)',
                color: 'var(--danger-text)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                fontWeight: 600,
                marginBottom: '16px'
              }}>
                {formError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Tên trung tâm <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Trung tâm Võ thuật ABC"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '0 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text-main)',
                    fontSize: '0.875rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Email Chủ trung tâm (Owner) <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="VD: tienthongv@gmail.com"
                  value={formData.ownerEmail}
                  onChange={e => setFormData({ ...formData, ownerEmail: e.target.value })}
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '0 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text-main)',
                    fontSize: '0.875rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Email này sẽ được trao toàn quyền Quản trị (Owner) của trung tâm mới.
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Tên hiển thị chủ sở hữu (Tùy chọn)
                </label>
                <input
                  type="text"
                  placeholder="VD: Tiến Thông Võ"
                  value={formData.ownerName}
                  onChange={e => setFormData({ ...formData, ownerName: e.target.value })}
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '0 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text-main)',
                    fontSize: '0.875rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                    Gói cước
                  </label>
                  <select
                    value={formData.plan}
                    onChange={e => setFormData({ ...formData, plan: e.target.value })}
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--surface)',
                      color: 'var(--text-main)',
                      fontSize: '0.875rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="starter">Starter (Cơ bản)</option>
                    <option value="pro">Pro (Chuyên nghiệp)</option>
                    <option value="enterprise">Enterprise (Chuỗi cơ sở)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                    Thời hạn bản quyền
                  </label>
                  <select
                    value={formData.durationMonths}
                    onChange={e => setFormData({ ...formData, durationMonths: parseInt(e.target.value, 10) })}
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--surface)',
                      color: 'var(--text-main)',
                      fontSize: '0.875rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value={1}>1 tháng</option>
                    <option value={3}>3 tháng</option>
                    <option value={6}>6 tháng</option>
                    <option value={12}>12 tháng (1 năm)</option>
                    <option value={24}>24 tháng (2 năm)</option>
                    <option value={120}>10 năm (Vĩnh viễn)</option>
                  </select>
                </div>
              </div>

              <div style={{
                padding: '12px 14px',
                backgroundColor: 'var(--surface-hover)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <input
                  type="checkbox"
                  id="createCoachProfile"
                  checked={formData.createCoachProfile}
                  onChange={e => setFormData({ ...formData, createCoachProfile: e.target.checked })}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                />
                <label htmlFor="createCoachProfile" style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-main)', cursor: 'pointer' }}>
                  Tạo hồ sơ Huấn luyện viên cho chủ trung tâm (để chủ có thể đứng lớp dạy)
                </label>
              </div>
            </div>
          </ModalBody>

          <ModalFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              leftIcon={<span className="material-icons-round">check</span>}
            >
              Kích Hoạt Trung Tâm
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
