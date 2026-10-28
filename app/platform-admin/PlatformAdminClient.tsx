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

  const handleOpenModal = (presetEmail?: string, presetName?: string) => {
    setFormData({
      name: presetName || '',
      ownerEmail: presetEmail || '',
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Page Title & Main Action */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <h1 style={{
            fontSize: '26px',
            fontWeight: 900,
            color: 'var(--text-main)',
            letterSpacing: '-0.5px',
            margin: '0 0 8px 0'
          }}>
            Quản Lý Bản Quyền Nền Tảng
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
            Tạo mới, cấp phép và quản lý thời hạn trung tâm cho khách hàng đã thanh toán.
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 24px',
            backgroundColor: 'var(--primary)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(20, 184, 166, 0.35)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--primary-hover)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--primary)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <span className="material-icons-round" style={{ fontSize: '20px' }}>add_business</span>
          <span>Cấp Phép Trung Tâm Mới</span>
        </button>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div style={{
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: '#059669',
          padding: '16px 20px',
          borderRadius: '12px',
          fontSize: '14px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.1)'
        }}>
          <span className="material-icons-round" style={{ fontSize: '22px', color: '#10b981' }}>check_circle</span>
          <span style={{ flex: 1 }}>{successMessage}</span>
          <button 
            onClick={() => setSuccessMessage('')} 
            style={{ background: 'none', border: 'none', color: '#059669', cursor: 'pointer', fontSize: '18px', padding: '4px' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 4 Bento KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '20px'
      }}>
        {/* Total Orgs */}
        <div style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border-light)',
          borderRadius: '18px',
          padding: '24px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              TỔNG TRUNG TÂM
            </span>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              backgroundColor: 'rgba(20, 184, 166, 0.12)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span className="material-icons-round" style={{ fontSize: '22px' }}>apartment</span>
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
            {stats.totalOrganizations}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' }}>
            Đang vận hành trên Yoogi
          </div>
        </div>

        {/* Active Orgs */}
        <div style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border-light)',
          borderRadius: '18px',
          padding: '24px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.6px', textTransform: 'uppercase', color: '#10b981' }}>
              ĐANG HOẠT ĐỘNG
            </span>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span className="material-icons-round" style={{ fontSize: '22px' }}>verified</span>
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 900, color: '#10b981', letterSpacing: '-0.5px' }}>
            {stats.activeOrganizations}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' }}>
            Bản quyền còn hạn
          </div>
        </div>

        {/* Expired Orgs */}
        <div style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border-light)',
          borderRadius: '18px',
          padding: '24px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.6px', textTransform: 'uppercase', color: stats.expiredOrganizations > 0 ? '#ef4444' : 'var(--text-muted)' }}>
              HẾT HẠN / CẦN THU PHÍ
            </span>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              backgroundColor: stats.expiredOrganizations > 0 ? 'rgba(239, 68, 68, 0.12)' : 'var(--surface-hover)',
              color: stats.expiredOrganizations > 0 ? '#ef4444' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span className="material-icons-round" style={{ fontSize: '22px' }}>
                {stats.expiredOrganizations > 0 ? 'warning' : 'schedule'}
              </span>
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 900, color: stats.expiredOrganizations > 0 ? '#ef4444' : 'var(--text-main)', letterSpacing: '-0.5px' }}>
            {stats.expiredOrganizations}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' }}>
            Cần nhắc đóng phí gia hạn
          </div>
        </div>

        {/* Scale: Coaches & Students */}
        <div style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border-light)',
          borderRadius: '18px',
          padding: '24px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              QUY MÔ TOÀN HỆ THỐNG
            </span>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              backgroundColor: 'rgba(255, 107, 53, 0.12)',
              color: '#ff6b35',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span className="material-icons-round" style={{ fontSize: '22px' }}>groups</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '32px', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
              {stats.totalStudents}
            </span>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>học viên</span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>
            Cùng {stats.totalCoaches} huấn luyện viên
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border-light)',
        borderRadius: '20px',
        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        overflow: 'hidden'
      }}>
        {/* Filter & Search Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '260px', maxWidth: '420px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 16px',
              backgroundColor: 'var(--surface-hover)',
              border: '1px solid var(--border-light)',
              borderRadius: '12px',
              width: '100%',
              transition: 'border-color 0.2s'
            }}>
              <span className="material-icons-round" style={{ fontSize: '20px', color: 'var(--text-muted)' }}>search</span>
              <input
                type="text"
                placeholder="Tìm theo tên trung tâm hoặc email chủ..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: '14px',
                  color: 'var(--text-main)',
                  width: '100%'
                }}
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px' }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: '6px', backgroundColor: 'var(--surface-hover)', padding: '5px', borderRadius: '12px' }}>
            <button
              onClick={() => setStatusFilter('all')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: statusFilter === 'all' ? 'var(--surface)' : 'transparent',
                color: statusFilter === 'all' ? 'var(--text-main)' : 'var(--text-secondary)',
                boxShadow: statusFilter === 'all' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              Tất cả ({orgs.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: statusFilter === 'active' ? 'var(--surface)' : 'transparent',
                color: statusFilter === 'active' ? '#10b981' : 'var(--text-secondary)',
                boxShadow: statusFilter === 'active' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              Còn hạn ({stats.activeOrganizations})
            </button>
            <button
              onClick={() => setStatusFilter('expired')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: statusFilter === 'expired' ? 'var(--surface)' : 'transparent',
                color: statusFilter === 'expired' ? '#ef4444' : 'var(--text-secondary)',
                boxShadow: statusFilter === 'expired' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              Hết hạn ({stats.expiredOrganizations})
            </button>
          </div>
        </div>

        {/* Organizations Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '1px solid var(--border-light)' }}>
                <th style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--text-muted)', fontSize: '12px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  TRUNG TÂM
                </th>
                <th style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--text-muted)', fontSize: '12px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  CHỦ SỞ HỮU (OWNER)
                </th>
                <th style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--text-muted)', fontSize: '12px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  GÓI DỊCH VỤ
                </th>
                <th style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--text-muted)', fontSize: '12px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  HẠN DÙNG
                </th>
                <th style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--text-muted)', fontSize: '12px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  QUY MÔ
                </th>
                <th style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--text-muted)', fontSize: '12px', letterSpacing: '0.5px', textTransform: 'uppercase', textAlign: 'right' }}>
                  THAO TÁC
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredOrgs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <span className="material-icons-round" style={{ fontSize: '48px', opacity: 0.4, marginBottom: '12px', display: 'block' }}>
                      search_off
                    </span>
                    <div style={{ fontSize: '15px', fontWeight: 600 }}>Không tìm thấy trung tâm nào phù hợp</div>
                  </td>
                </tr>
              ) : (
                filteredOrgs.map((org) => {
                  const remainingDays = getRemainingDays(org.subscription_expires_at);
                  const isExpired = remainingDays !== null && remainingDays <= 0;
                  const isSuspended = org.subscription_status === 'suspended';

                  let statusBadgeBg = 'rgba(16, 185, 129, 0.12)';
                  let statusBadgeColor = '#059669';
                  let statusText = 'Đang hoạt động';

                  if (isSuspended) {
                    statusBadgeBg = 'rgba(239, 68, 68, 0.12)';
                    statusBadgeColor = '#dc2626';
                    statusText = 'Đã khóa';
                  } else if (isExpired) {
                    statusBadgeBg = 'rgba(239, 68, 68, 0.12)';
                    statusBadgeColor = '#dc2626';
                    statusText = 'Hết hạn';
                  } else if (remainingDays !== null && remainingDays <= 15) {
                    statusBadgeBg = 'rgba(245, 158, 11, 0.12)';
                    statusBadgeColor = '#d97706';
                    statusText = `Còn ${remainingDays} ngày`;
                  }

                  const planUpper = (org.subscription_plan || 'starter').toUpperCase();
                  const initials = org.name.trim().slice(0, 2).toUpperCase();

                  return (
                    <tr 
                      key={org.id} 
                      style={{ 
                        borderBottom: '1px solid var(--border-light)',
                        transition: 'background-color 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {/* Name & ID with Avatar */}
                      <td style={{ padding: '20px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '12px',
                            backgroundColor: 'rgba(20, 184, 166, 0.12)',
                            color: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '14px',
                            letterSpacing: '0.5px'
                          }}>
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '15px', marginBottom: '3px' }}>
                              {org.name}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                              ID: {org.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Owner Info */}
                      <td style={{ padding: '20px 24px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '14px', marginBottom: '2px' }}>
                          {org.owner_name}
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          {org.owner_email}
                        </div>
                      </td>

                      {/* Plan & Status */}
                      <td style={{ padding: '20px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{
                            padding: '3px 10px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 800,
                            letterSpacing: '0.5px',
                            backgroundColor: 'var(--surface-hover)',
                            border: '1px solid var(--border-light)',
                            color: 'var(--text-secondary)'
                          }}>
                            {planUpper}
                          </span>
                          <span style={{
                            padding: '3px 10px',
                            borderRadius: '100px',
                            fontSize: '12px',
                            fontWeight: 700,
                            backgroundColor: statusBadgeBg,
                            color: statusBadgeColor
                          }}>
                            {statusText}
                          </span>
                        </div>
                      </td>

                      {/* Expiration Date */}
                      <td style={{ padding: '20px 24px' }}>
                        <div style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '14px' }}>
                          {formatDate(org.subscription_expires_at)}
                        </div>
                        {remainingDays !== null && (
                          <div style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            marginTop: '2px',
                            color: isExpired ? '#ef4444' : remainingDays <= 15 ? '#f59e0b' : 'var(--text-muted)'
                          }}>
                            {isExpired ? `Quá hạn ${Math.abs(remainingDays)} ngày` : `Còn ${remainingDays} ngày`}
                          </div>
                        )}
                      </td>

                      {/* Scale */}
                      <td style={{ padding: '20px 24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                            <span className="material-icons-round" style={{ fontSize: '16px', color: 'var(--primary)' }}>sports_martial_arts</span>
                            <span>{org.coaches_count || 0} HLV</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                            <span className="material-icons-round" style={{ fontSize: '16px', color: '#ff6b35' }}>people</span>
                            <span>{org.students_count || 0} Học viên</span>
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                          {/* Extend 1 Year */}
                          <button
                            onClick={() => handleExtendSubscription(org, 12)}
                            disabled={actionLoadingId === org.id}
                            title="Gia hạn thêm 1 năm (12 tháng)"
                            style={{
                              padding: '8px 14px',
                              borderRadius: '8px',
                              backgroundColor: 'rgba(16, 185, 129, 0.1)',
                              color: '#059669',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              fontSize: '13px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.15s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.2)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.1)'}
                          >
                            <span className="material-icons-round" style={{ fontSize: '17px' }}>add_circle</span>
                            <span>+1 Năm</span>
                          </button>

                          {/* Lock / Unlock */}
                          <button
                            onClick={() => handleToggleStatus(org)}
                            disabled={actionLoadingId === org.id}
                            title={isSuspended ? "Mở khóa trung tâm" : "Khóa trung tâm"}
                            style={{
                              padding: '8px 14px',
                              borderRadius: '8px',
                              backgroundColor: isSuspended ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              color: isSuspended ? '#059669' : '#dc2626',
                              border: `1px solid ${isSuspended ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                              fontSize: '13px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.15s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                          >
                            <span className="material-icons-round" style={{ fontSize: '17px' }}>
                              {isSuspended ? 'lock_open' : 'lock'}
                            </span>
                            <span>{isSuspended ? 'Mở' : 'Khóa'}</span>
                          </button>

                          {/* Switch Into Workspace */}
                          <button
                            onClick={() => handleSwitchIntoWorkspace(org.id, org.name)}
                            disabled={actionLoadingId === org.id}
                            title="Chuyển vào trung tâm này để kiểm tra"
                            style={{
                              padding: '8px 14px',
                              borderRadius: '8px',
                              backgroundColor: 'var(--surface-hover)',
                              color: 'var(--text-main)',
                              border: '1px solid var(--border-light)',
                              fontSize: '13px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.15s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-light)'}
                          >
                            <span className="material-icons-round" style={{ fontSize: '17px', color: 'var(--primary)' }}>open_in_new</span>
                            <span>Vào xem</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Provision Organization */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '24px',
          backdropFilter: 'blur(5px)'
        }}>
          <div style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border-light)',
            borderRadius: '20px',
            maxWidth: '540px',
            width: '100%',
            boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '24px 28px',
              borderBottom: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--surface)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(20, 184, 166, 0.12)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <span className="material-icons-round" style={{ fontSize: '22px' }}>add_business</span>
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                    Cấp Phép Trung Tâm Mới
                  </h2>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Khởi tạo trung tâm & trao quyền Chủ sở hữu (Owner)
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'var(--surface-hover)',
                  border: 'none',
                  borderRadius: '8px',
                  width: '32px',
                  height: '32px',
                  fontSize: '18px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleProvisionSubmit} style={{ padding: '28px' }}>
              {formError && (
                <div style={{
                  padding: '14px 18px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#dc2626',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '20px'
                }}>
                  {formError}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* Org Name */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
                    Tên trung tâm <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Trung tâm Võ thuật ABC"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--background)',
                      color: 'var(--text-main)',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Owner Email */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
                    Email Chủ trung tâm (Owner) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="VD: tienthongv@gmail.com"
                    value={formData.ownerEmail}
                    onChange={e => setFormData({ ...formData, ownerEmail: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--background)',
                      color: 'var(--text-main)',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                  />
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                    Email này sẽ được trao toàn quyền Quản trị (Owner) của trung tâm mới.
                  </div>
                </div>

                {/* Owner Name (Optional) */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
                    Tên chủ sở hữu (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Tiến Thông Võ"
                    value={formData.ownerName}
                    onChange={e => setFormData({ ...formData, ownerName: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--background)',
                      color: 'var(--text-main)',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Plan & Duration */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
                      Gói cước
                    </label>
                    <select
                      value={formData.plan}
                      onChange={e => setFormData({ ...formData, plan: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--background)',
                        color: 'var(--text-main)',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                        outline: 'none'
                      }}
                    >
                      <option value="starter">Starter (Cơ bản)</option>
                      <option value="pro">Pro (Chuyên nghiệp)</option>
                      <option value="enterprise">Enterprise (Chuỗi cơ sở)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
                      Thời hạn bản quyền
                    </label>
                    <select
                      value={formData.durationMonths}
                      onChange={e => setFormData({ ...formData, durationMonths: parseInt(e.target.value, 10) })}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--background)',
                        color: 'var(--text-main)',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                        outline: 'none'
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

                {/* Checkbox: Create Coach Record */}
                <div style={{
                  padding: '14px 16px',
                  backgroundColor: 'var(--surface-hover)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    id="createCoach"
                    checked={formData.createCoachProfile}
                    onChange={e => setFormData({ ...formData, createCoachProfile: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                  <label htmlFor="createCoach" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer', userSelect: 'none' }}>
                    Tạo hồ sơ HLV cho chủ trung tâm (để chủ có thể trực tiếp đứng lớp dạy)
                  </label>
                </div>
              </div>

              {/* Form Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '28px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  style={{
                    padding: '12px 20px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'transparent',
                    color: 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '12px 26px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: 'var(--primary)',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '14px',
                    cursor: isSubmitting ? 'wait' : 'pointer',
                    boxShadow: '0 4px 14px rgba(20, 184, 166, 0.35)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <span className="material-icons-round" style={{ fontSize: '18px' }}>
                    {isSubmitting ? 'sync' : 'check'}
                  </span>
                  <span>{isSubmitting ? 'Đang kích hoạt...' : 'Kích Hoạt Trung Tâm'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
