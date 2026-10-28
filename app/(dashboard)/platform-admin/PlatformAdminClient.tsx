'use client';

import React, { useState, useEffect } from 'react';
import { 
  PlatformOrganization, 
  PlatformStats 
} from '@/services/platform-admin.service';
import { 
  provisionOrganizationAction, 
  updateOrganizationStatusAction,
  switchIntoWorkspaceAction,
  getPlatformOverviewAction 
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Sync state whenever props change from server
  useEffect(() => {
    setOrgs(initialOrgs);
    setStats(initialStats);
  }, [initialOrgs, initialStats]);

  // Provision Modal State
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [provisionForm, setProvisionForm] = useState({
    name: '',
    ownerEmail: '',
    ownerName: '',
    plan: 'starter',
    durationMonths: 12,
    createCoachProfile: true
  });
  const [formError, setFormError] = useState('');

  // Edit Center Modal State
  const [editingOrg, setEditingOrg] = useState<PlatformOrganization | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    plan: 'starter',
    status: 'active' as 'active' | 'suspended',
    expiresAtDate: ''
  });
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // Success Notification State
  const [successMessage, setSuccessMessage] = useState('');

  // Action Loading Indicator
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Helper: Calculate if an org is active or inactive/suspended
  const isOrgSuspended = (org: PlatformOrganization) => org.subscription_status === 'suspended';
  const isOrgExpired = (org: PlatformOrganization) => {
    if (!org.subscription_expires_at) return false;
    return new Date(org.subscription_expires_at).getTime() < Date.now();
  };
  const isOrgActive = (org: PlatformOrganization) => !isOrgSuspended(org) && !isOrgExpired(org);

  // Filtered Orgs
  const filteredOrgs = orgs.filter(org => {
    const matchesSearch = 
      org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.owner_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.owner_name.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'active') return isOrgActive(org);
    if (statusFilter === 'inactive') return !isOrgActive(org);
    return true;
  });

  const activeCount = orgs.filter(isOrgActive).length;
  const inactiveCount = orgs.length - activeCount;

  // Open Provision Modal
  const handleOpenProvisionModal = () => {
    setProvisionForm({
      name: '',
      ownerEmail: '',
      ownerName: '',
      plan: 'starter',
      durationMonths: 12,
      createCoachProfile: true
    });
    setFormError('');
    setIsProvisionModalOpen(true);
  };

  // Submit Provision Form
  const handleProvisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccessMessage('');

    if (!provisionForm.name.trim()) {
      setFormError('Vui lòng nhập tên trung tâm.');
      return;
    }
    if (!provisionForm.ownerEmail.trim()) {
      setFormError('Vui lòng nhập email của chủ trung tâm.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await provisionOrganizationAction(provisionForm);
      if (res.success) {
        setSuccessMessage(`Đã kích hoạt thành công trung tâm "${provisionForm.name}" cho chủ sở hữu ${provisionForm.ownerEmail}!`);
        setIsProvisionModalOpen(false);

        // Fetch fresh overview data immediately
        const fresh = await getPlatformOverviewAction();
        if (fresh.success) {
          setOrgs(fresh.data);
          setStats(fresh.stats);
        }
        router.refresh();
      } else {
        setFormError(res.error || 'Có lỗi xảy ra khi tạo trung tâm.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Lỗi hệ thống khi cấp phép trung tâm.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (org: PlatformOrganization) => {
    setEditingOrg(org);
    setEditForm({
      name: org.name,
      plan: org.subscription_plan || 'starter',
      status: org.subscription_status === 'suspended' ? 'suspended' : 'active',
      expiresAtDate: org.subscription_expires_at ? org.subscription_expires_at.slice(0, 10) : ''
    });
  };

  // Submit Edit Form
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrg) return;

    setIsEditSubmitting(true);
    try {
      const exactExpiresAt = editForm.expiresAtDate 
        ? new Date(editForm.expiresAtDate + 'T23:59:59.000Z').toISOString()
        : null;

      const res = await updateOrganizationStatusAction({
        orgId: editingOrg.id,
        name: editForm.name,
        plan: editForm.plan,
        status: editForm.status,
        exactExpiresAt
      });

      if (res.success) {
        // Update local state instantly
        setOrgs(prev => prev.map(o => o.id === editingOrg.id ? {
          ...o,
          name: editForm.name.trim() || o.name,
          subscription_plan: editForm.plan,
          subscription_status: editForm.status,
          subscription_expires_at: exactExpiresAt || undefined
        } : o));

        setSuccessMessage(`Đã cập nhật thông tin trung tâm "${editForm.name}" thành công!`);
        setEditingOrg(null);
        router.refresh();
      } else {
        alert(res.error || 'Lỗi khi cập nhật thông tin trung tâm.');
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi hệ thống.');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  // Quick Action: Extend Subscription (+1 Năm)
  const handleExtendSubscription = async (org: PlatformOrganization, months: number = 12) => {
    if (!confirm(`Bạn có chắc muốn gia hạn thêm ${months} tháng (1 năm) cho trung tâm "${org.name}"?`)) return;

    setActionLoadingId(org.id);
    try {
      const res = await updateOrganizationStatusAction({
        orgId: org.id,
        status: 'active',
        addMonths: months
      });

      if (res.success) {
        // Instantly update local state with new date
        setOrgs(prev => prev.map(o => o.id === org.id ? {
          ...o,
          subscription_status: 'active',
          subscription_expires_at: res.newExpiresAt || o.subscription_expires_at
        } : o));

        setSuccessMessage(`Đã gia hạn thành công trung tâm "${org.name}" thêm ${months} tháng!`);
        router.refresh();
      } else {
        alert(res.error || 'Lỗi khi gia hạn trung tâm.');
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi hệ thống khi gia hạn.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Quick Action: Toggle Lock / Unlock Status
  const handleToggleStatus = async (org: PlatformOrganization) => {
    const isCurrentlySuspended = org.subscription_status === 'suspended';
    const nextStatus: 'active' | 'suspended' = isCurrentlySuspended ? 'active' : 'suspended';
    const actionLabel = isCurrentlySuspended ? 'MỞ KHÓA' : 'KHÓA';

    const confirmMessage = isCurrentlySuspended
      ? `Bạn có chắc muốn MỞ KHÓA trung tâm "${org.name}"?\nTrung tâm sẽ khôi phục hoạt động bình thường cho chủ sở hữu và các HLV.`
      : `Bạn có chắc muốn KHÓA trung tâm "${org.name}"?\nNgười dùng thuộc trung tâm này sẽ bị tạm dừng truy cập vào hệ thống.`;

    if (!confirm(confirmMessage)) return;

    setActionLoadingId(org.id);
    try {
      const res = await updateOrganizationStatusAction({
        orgId: org.id,
        status: nextStatus
      });

      if (res.success) {
        // Instantly update local state
        setOrgs(prev => prev.map(o => o.id === org.id ? {
          ...o,
          subscription_status: nextStatus
        } : o));

        // Instantly update stats
        setStats(prev => ({
          ...prev,
          activeOrganizations: nextStatus === 'active' 
            ? prev.activeOrganizations + 1 
            : Math.max(0, prev.activeOrganizations - 1),
          expiredOrganizations: nextStatus === 'suspended'
            ? prev.expiredOrganizations + 1
            : Math.max(0, prev.expiredOrganizations - 1)
        }));

        setSuccessMessage(`Đã ${actionLabel.toLowerCase()} trung tâm "${org.name}" thành công!`);
        router.refresh();
      } else {
        alert(res.error || `Lỗi khi ${actionLabel.toLowerCase()} trung tâm.`);
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi hệ thống khi cập nhật trạng thái.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Quick Action: Switch into Workspace
  const handleSwitchIntoWorkspace = async (orgId: string, orgName: string) => {
    setActionLoadingId(orgId);
    try {
      const res = await switchIntoWorkspaceAction(orgId);
      if (res.success) {
        window.location.href = '/dashboard';
      } else {
        alert(res.error || `Không thể chuyển vào trung tâm "${orgName}".`);
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi hệ thống khi chuyển trung tâm.');
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
            onClick={handleOpenProvisionModal}
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
            <div className={styles.kpiValue}>{activeCount}</div>
            <div className={styles.kpiCaption}>Bản quyền còn thời hạn</div>
            <span className={`material-icons-round ${styles.kpiWatermark}`} style={{ color: 'var(--success)' }}>
              verified
            </span>
          </div>

          {/* Expired / Suspended Orgs */}
          <div className={`${styles.kpiItem} ${inactiveCount > 0 ? styles.kpiDanger : styles.kpiStatus}`}>
            <div className={styles.kpiLabel}>
              <div className={styles.kpiDot}></div>
              Đã khóa / Cần thu phí
            </div>
            <div className={styles.kpiValue}>{inactiveCount}</div>
            <div className={styles.kpiCaption}>Cần gia hạn hoặc đang khóa</div>
            <span className={`material-icons-round ${styles.kpiWatermark}`} style={{ color: inactiveCount > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
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
            Đang hoạt động ({activeCount})
          </button>
          <button
            className={`${styles.filterPill} ${statusFilter === 'inactive' ? styles.filterPillActive : ''}`}
            onClick={() => setStatusFilter('inactive')}
          >
            Đã khóa / Hết hạn ({inactiveCount})
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
                <div className={styles.entityAvatar} style={{
                  backgroundColor: isSuspended ? 'var(--danger-bg)' : 'var(--primary-light)',
                  color: isSuspended ? 'var(--danger)' : 'var(--primary)'
                }}>
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
                <div className={styles.entityBadge} style={{ width: '190px', gap: '6px', flexWrap: 'wrap' }}>
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

                  {/* Lock / Unlock Toggle Button */}
                  <Button
                    size="sm"
                    variant={isSuspended ? "success" : "danger"}
                    leftIcon={
                      <span className="material-icons-round" style={{ fontSize: '16px' }}>
                        {isSuspended ? 'lock_open' : 'lock'}
                      </span>
                    }
                    onClick={() => handleToggleStatus(org)}
                    disabled={actionLoadingId === org.id}
                  >
                    {isSuspended ? 'Mở khóa' : 'Khóa'}
                  </Button>

                  {/* Edit Center Button */}
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<span className="material-icons-round" style={{ fontSize: '16px' }}>edit</span>}
                    onClick={() => handleOpenEditModal(org)}
                    disabled={actionLoadingId === org.id}
                  >
                    Sửa
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
      <Modal isOpen={isProvisionModalOpen} onClose={() => setIsProvisionModalOpen(false)}>
        <ModalHeader 
          title="Cấp Phép Trung Tâm Mới" 
          onClose={() => setIsProvisionModalOpen(false)} 
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
                  value={provisionForm.name}
                  onChange={e => setProvisionForm({ ...provisionForm, name: e.target.value })}
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
                  value={provisionForm.ownerEmail}
                  onChange={e => setProvisionForm({ ...provisionForm, ownerEmail: e.target.value })}
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
                  placeholder="VD: Võ Sư Tiến Thông"
                  value={provisionForm.ownerName}
                  onChange={e => setProvisionForm({ ...provisionForm, ownerName: e.target.value })}
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
                    value={provisionForm.plan}
                    onChange={e => setProvisionForm({ ...provisionForm, plan: e.target.value })}
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
                    value={provisionForm.durationMonths}
                    onChange={e => setProvisionForm({ ...provisionForm, durationMonths: parseInt(e.target.value, 10) })}
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
                    <option value={120}>10 năm (Vô thời hạn)</option>
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
                  checked={provisionForm.createCoachProfile}
                  onChange={e => setProvisionForm({ ...provisionForm, createCoachProfile: e.target.checked })}
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
              onClick={() => setIsProvisionModalOpen(false)}
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

      {/* 6. EDIT CENTER MODAL */}
      <Modal isOpen={!!editingOrg} onClose={() => setEditingOrg(null)}>
        <ModalHeader 
          title={`Chỉnh Sửa Trung Tâm: ${editingOrg?.name || ''}`}
          onClose={() => setEditingOrg(null)} 
        />
        
        <form onSubmit={handleEditSubmit}>
          <ModalBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Tên trung tâm
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
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
                    Gói dịch vụ
                  </label>
                  <select
                    value={editForm.plan}
                    onChange={e => setEditForm({ ...editForm, plan: e.target.value })}
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
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                    Trạng thái hoạt động
                  </label>
                  <select
                    value={editForm.status}
                    onChange={e => setEditForm({ ...editForm, status: e.target.value as any })}
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
                    <option value="active">Đang hoạt động (Mở)</option>
                    <option value="suspended">Tạm khóa (Khóa)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Ngày hết hạn bản quyền (Để trống nếu Vô thời hạn)
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="date"
                    value={editForm.expiresAtDate}
                    onChange={e => setEditForm({ ...editForm, expiresAtDate: e.target.value })}
                    style={{
                      flex: 1,
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
                  {editForm.expiresAtDate && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditForm({ ...editForm, expiresAtDate: '' })}
                    >
                      Đặt Vô thời hạn
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </ModalBody>

          <ModalFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditingOrg(null)}
              disabled={isEditSubmitting}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isEditSubmitting}
              leftIcon={<span className="material-icons-round">save</span>}
            >
              Lưu Thay Đổi
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
