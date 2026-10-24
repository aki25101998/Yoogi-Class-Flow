'use client';

import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  inviteMemberAction, 
  revokeInvitationAction, 
  removeMemberAction,
  suspendMemberAction,
  reactivateMemberAction,
  changeRoleAction,
  importCoachesBatchAction,
  updateCoachNicknameAction
} from './actions';
import { OrganizationRole } from '@/types/organization';
import { useCoaches } from '@/hooks/useCoaches';
import { useDashboardContext } from '../DashboardProvider';
import dynamic from 'next/dynamic';
const ImportModal = dynamic(() => import('@/app/components/excel/ImportModal').then(mod => mod.ImportModal), { ssr: false });
const ExportButton = dynamic(() => import('@/app/components/excel/ExportButton').then(mod => mod.ExportButton), { ssr: false });
import { CoachesImportDef, CoachesExportDef } from '@/services/excel/definitions/coaches.def';
import styles from '@/app/styles/page-standard.module.css';

// UI Components
import { PageHeader } from '@/app/components/ui/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { Input, Select } from '@/app/components/ui/Input';
import { Badge } from '@/app/components/ui/Badge';
import { ChangeRoleModal } from '@/app/components/ui/ChangeRoleModal';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/app/components/ui/Modal';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { CoachQuickProfileModal } from '@/app/components/ui/CoachQuickProfileModal';

function CoachSkeleton() {
  return (
    <div className={`${styles.cardSkeleton} animate-pulse`}>
      <div className={styles.entityAvatar} style={{ background: 'var(--surface-hover)' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ height: '16px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-sm)', width: '35%' }} />
        <div style={{ height: '12px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-sm)', width: '50%' }} />
      </div>
      <div style={{ height: '24px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-full)', width: '90px' }} />
      <div style={{ height: '32px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-sm)', width: '100px' }} />
      <div style={{ height: '32px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-full)', width: '140px', justifySelf: 'flex-end' }} />
    </div>
  );
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Fallback for non-secure contexts
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch {
    return false;
  }
}

export default function CoachesClient() {
  const { context } = useDashboardContext();
  const organizationId = context?.organization?.id;
  const currentUserRole = context?.membership?.role;
  const currentUserId = context?.membership?.id;

  const { members, invitations, isLoading } = useCoaches(organizationId);
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'invitations' | 'suspended'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrganizationRole>('assistant_coach');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Link-first invitation result state
  const [invitationResult, setInvitationResult] = useState<{ url: string; id: string; expiresAt: string } | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [copyError, setCopyError] = useState(false);

  // Copy link state for invitation list
  const [copiedInvitationId, setCopiedInvitationId] = useState<string | null>(null);
  const [editingRoleMember, setEditingRoleMember] = useState<{id: string, name: string, role: OrganizationRole} | null>(null);
  const [editingNicknameMember, setEditingNicknameMember] = useState<{coachId: string, originalName: string, nickname: string} | null>(null);
  const [newNickname, setNewNickname] = useState('');
  const [quickProfileCoachId, setQuickProfileCoachId] = useState<string | null>(null);

  const isAdminOrOwner = currentUserRole === 'admin' || currentUserRole === 'owner';

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['coaches', organizationId] });
    queryClient.invalidateQueries({ queryKey: ['invitations', organizationId] });
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInvitationResult(null);
    setCopySuccess(false);
    setCopyError(false);
    setLoading(true);
    const res = await inviteMemberAction(email, role);
    setLoading(false);
    
    if (res.success && res.invitationUrl && res.invitationId && res.expiresAt) {
      setInvitationResult({
        url: res.invitationUrl,
        id: res.invitationId,
        expiresAt: res.expiresAt
      });
      setEmail('');
      handleSuccess();
    } else {
      setError(res.error || 'Lỗi tạo lời mời');
    }
  };

  const handleCopyLink = async (url: string, invId?: string) => {
    const success = await copyToClipboard(url);
    if (success) {
      if (invId) {
        setCopiedInvitationId(invId);
        setTimeout(() => setCopiedInvitationId(null), 2000);
      } else {
        setCopySuccess(true);
        setCopyError(false);
        setTimeout(() => setCopySuccess(false), 2000);
      }
    } else {
      if (!invId) {
        setCopyError(true);
        setCopySuccess(false);
      }
    }
  };

  const handleCloseInvitationResult = () => {
    setInvitationResult(null);
    setCopySuccess(false);
    setCopyError(false);
    setIsInviting(false);
  };

  const executeAction = async (actionFn: (id: string) => Promise<any>, id: string, confirmMsg?: string) => {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setLoading(true);
    const res = await actionFn(id);
    if (res.success) handleSuccess();
    else {
      alert(res.error || 'Lỗi hệ thống');
    }
    setLoading(false);
  };

  const executeChangeRole = async (id: string, newRole: OrganizationRole) => {
    setLoading(true);
    const res = await changeRoleAction(id, newRole);
    if (res.success) {
      handleSuccess();
      setEditingRoleMember(null);
    }
    else {
      alert(res.error || 'Lỗi đổi quyền');
    }
    setLoading(false);
  };

  const roleLabels: Record<string, string> = {
    owner: 'Chủ tổ chức',
    admin: 'Quản trị viên',
    head_coach: 'HLV trưởng',
    assistant_coach: 'HLV phụ'
  };

  const formatExpiryDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const isExpired = (dateStr: string) => {
    return new Date(dateStr) < new Date();
  };

  const getInvitationUrl = (invId: string) => {
    const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${appUrl}/invite/${invId}`;
  };

  const activeMembers = useMemo(() => members.filter((m: any) => m.status === 'active'), [members]);
  const suspendedMembers = useMemo(() => members.filter((m: any) => m.status === 'suspended'), [members]);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredActiveMembers = useMemo(() => {
    return activeMembers.filter((m: any) => {
      if (!normalizedSearch) return true;
      return (
        m.name?.toLowerCase().includes(normalizedSearch) ||
        m.email?.toLowerCase().includes(normalizedSearch) ||
        (m.nickname && m.nickname.toLowerCase().includes(normalizedSearch))
      );
    });
  }, [activeMembers, normalizedSearch]);

  const filteredSuspendedMembers = useMemo(() => {
    return suspendedMembers.filter((m: any) => {
      if (!normalizedSearch) return true;
      return (
        m.name?.toLowerCase().includes(normalizedSearch) ||
        m.email?.toLowerCase().includes(normalizedSearch) ||
        (m.nickname && m.nickname.toLowerCase().includes(normalizedSearch))
      );
    });
  }, [suspendedMembers, normalizedSearch]);

  const filteredInvitations = useMemo(() => {
    return invitations.filter((inv: any) => {
      if (!normalizedSearch) return true;
      return inv.email?.toLowerCase().includes(normalizedSearch);
    });
  }, [invitations, normalizedSearch]);

  const totalCount = members.length + invitations.length;
  const activeCount = activeMembers.length;
  const suspendedCount = suspendedMembers.length;
  const invitationsCount = invitations.length;

  return (
    <div className="flex-col gap-6">
      <PageHeader 
        title="Huấn luyện viên" 
        description="Quản lý danh sách huấn luyện viên và phân quyền"
        primaryAction={isAdminOrOwner ? (
          <div className="flex gap-2">
            <ExportButton data={activeMembers} definition={CoachesExportDef} />
            <Button 
              variant="outline" 
              onClick={() => setShowImport(true)}
              leftIcon={<span className="material-icons-round">upload_file</span>}
            >
              Import Excel
            </Button>
            <Button 
              onClick={() => { setIsInviting(!isInviting); setInvitationResult(null); setError(''); }}
              leftIcon={<span className="material-icons-round">person_add</span>}
            >
              Mời HLV
            </Button>
          </div>
        ) : (
          <ExportButton data={activeMembers} definition={CoachesExportDef} />
        )}
      />

      {showImport && (
        <ImportModal
          isOpen={showImport}
          onClose={() => setShowImport(false)}
          definition={CoachesImportDef}
          existingRecords={members}
          onImport={importCoachesBatchAction}
        />
      )}

      <Modal isOpen={isInviting} onClose={loading ? () => {} : handleCloseInvitationResult}>
        <ModalHeader title={invitationResult ? 'Đã tạo lời mời HLV' : 'Tạo lời mời mới'} onClose={loading ? () => {} : handleCloseInvitationResult} />
        <ModalBody>
          {invitationResult ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span className="material-icons-round" style={{ fontSize: '24px', color: 'var(--success)' }}>check_circle</span>
                <h3 style={{ fontWeight: 600, color: 'var(--success)' }}>Thành công!</h3>
              </div>
              
              <p style={{ fontSize: '0.875rem', marginBottom: '16px', color: 'var(--text-secondary)' }}>
                Gửi liên kết này cho HLV để tham gia:
              </p>

              <div style={{
                backgroundColor: 'var(--surface-hover)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '16px',
                border: '1px solid var(--border-light)',
                wordBreak: 'break-all',
                fontSize: '13px',
                fontFamily: 'monospace',
                color: 'var(--text-main)'
              }}>
                {invitationResult.url}
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
                <Button
                  variant={copySuccess ? 'success' : 'primary'}
                  size="sm"
                  onClick={() => handleCopyLink(invitationResult.url)}
                  leftIcon={<span className="material-icons-round" style={{ fontSize: '18px' }}>{copySuccess ? 'done' : 'content_copy'}</span>}
                >
                  {copySuccess ? 'Đã sao chép!' : 'Sao chép liên kết'}
                </Button>
                <Button variant="outline" size="sm" onClick={handleCloseInvitationResult}>
                  Đóng
                </Button>
              </div>

              {copyError && (
                <div style={{ color: 'var(--warning)', fontSize: '0.875rem', marginBottom: '12px', padding: '8px', backgroundColor: 'var(--warning-bg)', borderRadius: 'var(--radius-sm)' }}>
                  Không thể tự động sao chép. Vui lòng chọn và copy liên kết phía trên thủ công.
                </div>
              )}

              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <span className="material-icons-round" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '4px' }}>schedule</span>
                Lời mời có hiệu lực đến {formatExpiryDate(invitationResult.expiresAt)}.
              </p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                <span className="material-icons-round" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '4px' }}>chat</span>
                Hãy gửi liên kết này cho HLV qua Zalo, Messenger hoặc phương thức liên lạc khác.
              </p>
            </div>
          ) : (
            <div>
              {error && <div style={{ color: 'var(--danger)', marginBottom: '16px', fontSize: '0.875rem', fontWeight: 500, padding: '12px', backgroundColor: 'var(--danger-bg)', borderRadius: 'var(--radius-sm)' }}>{error}</div>}
              <form id="invite-form" onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <Input 
                  label="Email Google"
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required 
                />
                <Select 
                  label="Vai trò"
                  value={role} 
                  onChange={(e) => setRole(e.target.value as OrganizationRole)}
                  options={[
                    { value: 'assistant_coach', label: 'HLV phụ' },
                    { value: 'head_coach', label: 'HLV trưởng' },
                    ...(currentUserRole === 'owner' ? [{ value: 'admin', label: 'Quản trị viên' }] : [])
                  ]}
                />
              </form>
            </div>
          )}
        </ModalBody>
        {!invitationResult && (
          <ModalFooter>
            <Button variant="secondary" onClick={handleCloseInvitationResult} disabled={loading}>Hủy</Button>
            <Button type="submit" form="invite-form" isLoading={loading} variant="primary">Tạo lời mời</Button>
          </ModalFooter>
        )}
      </Modal>

      {/* Overview Metrics */}
      <div className={styles.overviewCard}>
        <div className={styles.overviewHeader}>
          <div className={styles.overviewTitle}>TỔNG QUAN HUẤN LUYỆN VIÊN</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Cập nhật theo thời gian thực
          </div>
        </div>
        <div className={styles.overviewGrid}>
          {/* Card 1: Tổng nhân sự */}
          <div className={`${styles.kpiItem} ${styles.kpiPrimary}`}>
            <div className={styles.kpiLabel}><div className={styles.kpiDot}></div> Tổng nhân sự</div>
            <div className={styles.kpiValue}>{totalCount}</div>
            <div className={styles.kpiCaption}>Toàn bộ đội ngũ HLV</div>
            <span className={`material-icons-round ${styles.kpiWatermark}`} style={{ color: 'var(--primary)' }}>sports_martial_arts</span>
          </div>

          {/* Card 2: Đang hoạt động */}
          <div className={`${styles.kpiItem} ${styles.kpiSuccess}`}>
            <div className={styles.kpiLabel}><div className={styles.kpiDot}></div> Đang hoạt động</div>
            <div className={styles.kpiValue}>{activeCount}</div>
            <div className={styles.kpiCaption}>Sẵn sàng đứng lớp</div>
            <span className={`material-icons-round ${styles.kpiWatermark}`} style={{ color: 'var(--success)' }}>bolt</span>
          </div>

          {/* Card 3: Lời mời chờ */}
          <div className={`${styles.kpiItem} ${styles.kpiWarning}`}>
            <div className={styles.kpiLabel}><div className={styles.kpiDot}></div> Lời mời chờ</div>
            <div className={styles.kpiValue}>{invitationsCount}</div>
            <div className={styles.kpiCaption}>Chờ HLV chấp thuận</div>
            <span className={`material-icons-round ${styles.kpiWatermark}`} style={{ color: 'var(--warning)' }}>mail</span>
          </div>

          {/* Card 4: Đã tạm ngưng */}
          <div className={`${styles.kpiItem} ${styles.kpiDanger}`}>
            <div className={styles.kpiLabel}><div className={styles.kpiDot}></div> Đã tạm ngưng</div>
            <div className={styles.kpiValue}>{suspendedCount}</div>
            <div className={styles.kpiCaption}>Nghỉ phép hoặc tạm ngưng</div>
            <span className={`material-icons-round ${styles.kpiWatermark}`} style={{ color: 'var(--danger)' }}>pause_circle</span>
          </div>
        </div>
      </div>

      {/* Toolbar & Filter Pills */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <span className={`material-icons-round ${styles.searchIcon}`}>search</span>
          <input 
            type="text" 
            className={styles.searchInput} 
            placeholder="Tìm HLV theo tên, biệt danh hoặc email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button 
              type="button" 
              className={styles.searchClearBtn}
              onClick={() => setSearchTerm('')}
              title="Xóa tìm kiếm"
            >
              <span className="material-icons-round" style={{ fontSize: '18px' }}>close</span>
            </button>
          )}
        </div>

        <div className={styles.filterGroup}>
          <button
            type="button"
            className={`${styles.filterPill} ${activeTab === 'all' ? styles.filterPillActive : ''}`}
            onClick={() => setActiveTab('all')}
          >
            Tất cả <span className={styles.filterPillCount}>{totalCount}</span>
          </button>
          <button
            type="button"
            className={`${styles.filterPill} ${activeTab === 'active' ? styles.filterPillActive : ''}`}
            onClick={() => setActiveTab('active')}
          >
            Đang hoạt động <span className={styles.filterPillCount}>{activeCount}</span>
          </button>
          <button
            type="button"
            className={`${styles.filterPill} ${activeTab === 'invitations' ? styles.filterPillActive : ''}`}
            onClick={() => setActiveTab('invitations')}
          >
            Lời mời <span className={styles.filterPillCount}>{invitationsCount}</span>
          </button>
          <button
            type="button"
            className={`${styles.filterPill} ${activeTab === 'suspended' ? styles.filterPillActive : ''}`}
            onClick={() => setActiveTab('suspended')}
          >
            Đã tạm ngưng <span className={styles.filterPillCount}>{suspendedCount}</span>
          </button>
        </div>
      </div>

      {/* Card-Row Entity List */}
      <div className={styles.entityList}>
        {isLoading ? (
          <>
            <CoachSkeleton />
            <CoachSkeleton />
            <CoachSkeleton />
          </>
        ) : (() => {
          const showActive = activeTab === 'all' || activeTab === 'active';
          const showSuspended = activeTab === 'all' || activeTab === 'suspended';
          const showInvitations = activeTab === 'all' || activeTab === 'invitations';

          const currentTotal = 
            (showActive ? filteredActiveMembers.length : 0) +
            (showSuspended ? filteredSuspendedMembers.length : 0) +
            (showInvitations ? filteredInvitations.length : 0);

          if (currentTotal === 0) {
            if (normalizedSearch) {
              return (
                <EmptyState 
                  title="Không tìm thấy huấn luyện viên" 
                  description={`Không có kết quả nào khớp với từ khóa "${searchTerm}".`}
                  icon="search_off"
                  action={
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setSearchTerm('')}
                      style={{ marginTop: '12px' }}
                    >
                      Xóa tìm kiếm
                    </Button>
                  }
                />
              );
            }

            if (activeTab === 'active') {
              return <EmptyState title="Chưa có HLV đang hoạt động" description="Không tìm thấy HLV nào trong danh sách." icon="people" />;
            }
            if (activeTab === 'suspended') {
              return <EmptyState title="Không có HLV nào bị tạm ngưng" description="Tất cả HLV đều đang hoạt động bình thường." icon="check_circle" />;
            }
            if (activeTab === 'invitations') {
              return <EmptyState title="Không có lời mời nào đang chờ" description="Bạn có thể mời HLV mới ở nút phía trên." icon="link" />;
            }
            return <EmptyState title="Chưa có nhân sự nào" description="Bạn có thể mời HLV mới ở nút phía trên." icon="people" />;
          }

          return (
            <>
              {/* Active Coaches */}
              {showActive && filteredActiveMembers.map((m: any) => (
                <div key={m.id} className={styles.entityCard}>
                  {/* Avatar */}
                  <div className={styles.entityAvatar}>
                    {m.photoUrl ? (
                      <img src={m.photoUrl} alt={m.name} className={styles.entityAvatarImg} />
                    ) : (
                      <span>{m.originalName?.[0]?.toUpperCase() || 'H'}</span>
                    )}
                  </div>

                  {/* Main Info */}
                  <div className={styles.entityMain}>
                    <div className={styles.entityTitleRow}>
                      <span className={styles.entityTitle}>{m.name}</span>
                      {m.coachId && isAdminOrOwner && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingNicknameMember({ coachId: m.coachId, originalName: m.originalName, nickname: m.nickname });
                            setNewNickname(m.nickname || '');
                          }}
                          className={styles.quickEditBtn}
                          title="Đổi tên gọi"
                        >
                          <span className="material-icons-round" style={{ fontSize: '15px' }}>edit</span>
                        </button>
                      )}
                    </div>
                    <div className={styles.entitySubtitle}>{m.email}</div>
                  </div>

                  {/* Role Badge */}
                  <div className={styles.entityBadge}>
                    <Badge variant={m.role === 'owner' || m.role === 'admin' ? 'primary' : 'default'}>
                      {roleLabels[m.role] || m.role}
                    </Badge>
                  </div>

                  {/* Metric */}
                  <div className={styles.entityMetric}>
                    <span className={styles.metricLabel}>Số lớp phụ trách</span>
                    <span className={styles.metricValue}>{m.classCount} lớp</span>
                  </div>

                  {/* Actions */}
                  {isAdminOrOwner && (
                    <div className={styles.entityActions}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (m.coachId) {
                            setQuickProfileCoachId(m.coachId);
                          } else {
                            console.error('Coach ID is missing for member', m);
                          }
                        }}
                        disabled={loading}
                        leftIcon={<span className="material-icons-round" style={{ fontSize: '16px' }}>visibility</span>}
                      >
                        Xem thông tin
                      </Button>

                      {m.id !== currentUserId && currentUserRole === 'owner' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingRoleMember({ id: m.id, name: m.name, role: m.role as OrganizationRole })}
                          disabled={loading}
                          leftIcon={<span className="material-icons-round" style={{ fontSize: '16px' }}>admin_panel_settings</span>}
                        >
                          Phân quyền
                        </Button>
                      )}

                      {m.id !== currentUserId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-danger hover:bg-danger-bg"
                          onClick={() => executeAction(removeMemberAction, m.id, 'Xóa hoàn toàn HLV này?')}
                          disabled={loading}
                          leftIcon={<span className="material-icons-round" style={{ fontSize: '16px' }}>delete_outline</span>}
                        >
                          Xóa
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Suspended Coaches */}
              {showSuspended && filteredSuspendedMembers.map((m: any) => (
                <div key={m.id} className={styles.entityCard} style={{ opacity: 0.85 }}>
                  {/* Avatar */}
                  <div className={styles.entityAvatar} style={{ filter: 'grayscale(0.6)' }}>
                    {m.photoUrl ? (
                      <img src={m.photoUrl} alt={m.name} className={styles.entityAvatarImg} />
                    ) : (
                      <span>{m.originalName?.[0]?.toUpperCase() || 'H'}</span>
                    )}
                  </div>

                  {/* Main Info */}
                  <div className={styles.entityMain}>
                    <div className={styles.entityTitleRow}>
                      <span className={styles.entityTitle}>{m.name}</span>
                      {m.coachId && isAdminOrOwner && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingNicknameMember({ coachId: m.coachId, originalName: m.originalName, nickname: m.nickname });
                            setNewNickname(m.nickname || '');
                          }}
                          className={styles.quickEditBtn}
                          title="Đổi tên gọi"
                        >
                          <span className="material-icons-round" style={{ fontSize: '15px' }}>edit</span>
                        </button>
                      )}
                    </div>
                    <div className={styles.entitySubtitle}>{m.email}</div>
                  </div>

                  {/* Role Badge */}
                  <div className={styles.entityBadge}>
                    <Badge variant="danger">{roleLabels[m.role] || m.role}</Badge>
                  </div>

                  {/* Metric */}
                  <div className={styles.entityMetric}>
                    <span className={styles.metricLabel}>Số lớp phụ trách</span>
                    <span className={styles.metricValue}>{m.classCount} lớp</span>
                  </div>

                  {/* Actions */}
                  {isAdminOrOwner && (
                    <div className={styles.entityActions}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (m.coachId) {
                            setQuickProfileCoachId(m.coachId);
                          } else {
                            console.error('Coach ID is missing for member', m);
                          }
                        }}
                        disabled={loading}
                        leftIcon={<span className="material-icons-round" style={{ fontSize: '16px' }}>visibility</span>}
                      >
                        Xem thông tin
                      </Button>

                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => executeAction(reactivateMemberAction, m.id, 'Kích hoạt lại HLV này?')}
                        disabled={loading}
                        leftIcon={<span className="material-icons-round" style={{ fontSize: '16px' }}>restore</span>}
                      >
                        Kích hoạt lại
                      </Button>

                      {m.id !== currentUserId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-danger hover:bg-danger-bg"
                          onClick={() => executeAction(removeMemberAction, m.id, 'Xóa hoàn toàn HLV này?')}
                          disabled={loading}
                          leftIcon={<span className="material-icons-round" style={{ fontSize: '16px' }}>delete_outline</span>}
                        >
                          Xóa
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Invitations */}
              {showInvitations && filteredInvitations.map((inv: any) => (
                <div key={inv.id} className={styles.entityCard}>
                  {/* Avatar */}
                  <div className={styles.entityAvatar} style={{ background: 'var(--warning-bg)', color: 'var(--warning-text)', borderColor: 'var(--warning)' }}>
                    <span className="material-icons-round" style={{ fontSize: '20px' }}>mail</span>
                  </div>

                  {/* Main Info */}
                  <div className={styles.entityMain}>
                    <div className={styles.entityTitleRow}>
                      <span className={styles.entityTitle}>{inv.email}</span>
                    </div>
                    <div className={styles.entitySubtitle}>Lời mời gia nhập tổ chức</div>
                  </div>

                  {/* Role Badge */}
                  <div className={styles.entityBadge}>
                    <Badge variant="info">{roleLabels[inv.role] || inv.role}</Badge>
                  </div>

                  {/* Metric */}
                  <div className={styles.entityMetric}>
                    <span className={styles.metricLabel}>Hạn lời mời</span>
                    <span className={styles.metricValue}>
                      {inv.expires_at ? (
                        isExpired(inv.expires_at) ? (
                          <Badge variant="danger">Đã hết hạn</Badge>
                        ) : (
                          formatExpiryDate(inv.expires_at)
                        )
                      ) : '-'}
                    </span>
                  </div>

                  {/* Actions */}
                  {isAdminOrOwner && (
                    <div className={styles.entityActions}>
                      {inv.expires_at && !isExpired(inv.expires_at) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyLink(getInvitationUrl(inv.id), inv.id)}
                          disabled={loading}
                          leftIcon={
                            <span className="material-icons-round" style={{ fontSize: '16px' }}>
                              {copiedInvitationId === inv.id ? 'done' : 'content_copy'}
                            </span>
                          }
                        >
                          {copiedInvitationId === inv.id ? 'Đã sao chép' : 'Sao chép link'}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => executeAction(revokeInvitationAction, inv.id, 'Thu hồi lời mời này?')}
                        disabled={loading}
                        leftIcon={<span className="material-icons-round" style={{ fontSize: '16px' }}>cancel</span>}
                      >
                        Thu hồi
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </>
          );
        })()}
      </div>

      {editingRoleMember && (
        <ChangeRoleModal
          isOpen={!!editingRoleMember}
          onClose={() => setEditingRoleMember(null)}
          currentRole={editingRoleMember.role}
          memberName={editingRoleMember.name}
          onSave={async (newRole) => {
            await executeChangeRole(editingRoleMember.id, newRole);
          }}
          isLoading={loading}
        />
      )}

      {editingNicknameMember && (
        <Modal isOpen={!!editingNicknameMember} onClose={() => setEditingNicknameMember(null)}>
          <ModalHeader title={`Đổi tên gọi: ${editingNicknameMember.originalName}`} onClose={() => setEditingNicknameMember(null)} />
          <ModalBody>
            <form id="edit-nickname-form" onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);
              const res = await updateCoachNicknameAction(editingNicknameMember.coachId, newNickname);
              if (res.success) {
                handleSuccess();
                setEditingNicknameMember(null);
              } else {
                alert(res.error || 'Lỗi hệ thống');
              }
              setLoading(false);
            }}>
              <Input
                label="Tên gợi nhớ (Nickname)"
                value={newNickname}
                onChange={e => setNewNickname(e.target.value)}
                placeholder=""
              />
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                Tên này sẽ được hiển thị để dễ dàng phân biệt các HLV có cùng tên. Để trống để sử dụng tên gốc.
              </p>
            </form>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setEditingNicknameMember(null)} disabled={loading}>Hủy</Button>
            <Button type="submit" form="edit-nickname-form" isLoading={loading} variant="primary">Lưu thay đổi</Button>
          </ModalFooter>
        </Modal>
      )}

      {quickProfileCoachId && (
        <CoachQuickProfileModal
          coachId={quickProfileCoachId}
          isOpen={!!quickProfileCoachId}
          onClose={() => setQuickProfileCoachId(null)}
        />
      )}
    </div>
  );
}
