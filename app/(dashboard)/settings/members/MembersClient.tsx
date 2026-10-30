'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { inviteMemberAction, revokeInvitationAction, removeMemberAction, changeRoleAction } from './actions';
import { OrganizationRole } from '@/types/organization';
import { RoleBadge } from '@/app/components/ui/RoleBadge';
import { ChangeRoleModal } from '@/app/components/ui/ChangeRoleModal';

// UI Components
import { PageHeader } from '@/app/components/ui/PageHeader';
import { SettingsNavTabs } from '../components/SettingsNavTabs';
import { Button } from '@/app/components/ui/Button';
import { Input, Select } from '@/app/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { EmptyState } from '@/app/components/ui/EmptyState';
import styles from '@/app/styles/page-standard.module.css';

export default function MembersClient({ initialMembers, initialInvitations, currentUserRole, currentUserId }: any) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers || []);
  const [invitations, setInvitations] = useState(initialInvitations || []);
  const [isInviting, setIsInviting] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrganizationRole>('assistant_coach');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'admins' | 'coaches' | 'invitations'>('all');

  // Role change state
  const [selectedMember, setSelectedMember] = useState<{ id: string; role: OrganizationRole; name: string } | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [roleChangeLoading, setRoleChangeLoading] = useState(false);

  const isAdminOrOwner = currentUserRole === 'admin' || currentUserRole === 'owner';

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await inviteMemberAction(email, role);
    setLoading(false);
    if (res.success) {
      setIsInviting(false);
      setEmail('');
      router.refresh();
    } else {
      setError(res.error || 'Lỗi gửi lời mời');
    }
  };

  const handleRevoke = async (id: string) => {
    if (confirm('Bạn có chắc muốn thu hồi lời mời này?')) {
      setLoading(true);
      await revokeInvitationAction(id);
      setLoading(false);
      router.refresh();
    }
  };

  const handleRemove = async (id: string) => {
    if (confirm('Bạn có chắc muốn xóa thành viên này khỏi tổ chức?')) {
      setLoading(true);
      const res = await removeMemberAction(id);
      setLoading(false);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || 'Lỗi khi xóa thành viên');
      }
    }
  };

  const handleOpenRoleModal = (member: any) => {
    if (isAdminOrOwner && member.id !== currentUserId) {
      if (currentUserRole === 'admin' && member.role === 'owner') return;
      setSelectedMember({ id: member.id, role: member.role, name: member.profiles?.name || 'Thành viên' });
      setIsRoleModalOpen(true);
    }
  };

  const handleRoleSave = async (newRole: OrganizationRole) => {
    if (!selectedMember) return;
    setRoleChangeLoading(true);
    const res = await changeRoleAction(selectedMember.id, newRole);
    setRoleChangeLoading(false);
    if (res.success) {
      setIsRoleModalOpen(false);
      setSelectedMember(null);
      router.refresh();
    } else {
      alert(res.error || 'Lỗi khi thay đổi vai trò');
    }
  };

  // KPI Calculations
  const totalMembersCount = members.length;
  const adminCount = members.filter((m: any) => m.role === 'owner' || m.role === 'admin').length;
  const coachCount = members.filter((m: any) => m.role === 'head_coach' || m.role === 'assistant_coach').length;
  const invitationsCount = invitations.length;

  // Filter & Search Logic
  const filteredMembers = useMemo(() => {
    return members.filter((m: any) => {
      // Role tab filter
      if (filterRole === 'admins' && !(m.role === 'owner' || m.role === 'admin')) return false;
      if (filterRole === 'coaches' && !(m.role === 'head_coach' || m.role === 'assistant_coach')) return false;
      if (filterRole === 'invitations') return false;

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const name = (m.profiles?.name || '').toLowerCase();
        const mail = (m.profiles?.email || '').toLowerCase();
        return name.includes(term) || mail.includes(term);
      }
      return true;
    });
  }, [members, filterRole, searchTerm]);

  const filteredInvitations = useMemo(() => {
    if (filterRole === 'admins' || filterRole === 'coaches') return [];
    return invitations.filter((inv: any) => {
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return (inv.email || '').toLowerCase().includes(term);
      }
      return true;
    });
  }, [invitations, filterRole, searchTerm]);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* 1. PAGE HEADER */}
      <PageHeader 
        title="Đội ngũ & Phân quyền" 
        description="Quản lý thành viên, phân quyền hạn và gửi lời mời tham gia trung tâm"
        primaryAction={isAdminOrOwner && !isInviting ? (
          <Button 
            onClick={() => setIsInviting(true)}
            leftIcon={<span className="material-icons-round">person_add</span>}
            style={{ borderRadius: 'var(--radius-full)', boxShadow: 'var(--shadow-teal-glow)' }}
          >
            Mời thành viên
          </Button>
        ) : undefined}
      />

      {/* 2. SUB NAVIGATION TABS */}
      <SettingsNavTabs />

      {/* 3. OVERVIEW KPI GRID (4 CÂN ĐỐI) */}
      <div className={styles.overviewCard}>
        <div className={styles.overviewHeader}>
          <div className={styles.overviewTitle}>
            <span className="material-icons-round" style={{ fontSize: '18px', color: 'var(--primary)' }}>manage_accounts</span>
            TỔNG QUAN ĐỘI NGŨ THÀNH VIÊN
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Cập nhật theo phân quyền thực tế
          </div>
        </div>
        <div className={styles.overviewGrid}>
          {/* Card 1: Tổng thành viên */}
          <div className={`${styles.kpiItem} ${styles.kpiPrimary}`}>
            <div className={styles.kpiLabel}><div className={styles.kpiDot}></div> Tổng thành viên</div>
            <div className={styles.kpiValue}>{totalMembersCount}</div>
            <div className={styles.kpiCaption}>Tài khoản đang hoạt động</div>
            <span className={`material-icons-round ${styles.kpiWatermark}`} style={{ color: 'var(--primary)' }}>groups</span>
          </div>

          {/* Card 2: Quản trị viên */}
          <div className={`${styles.kpiItem} ${styles.kpiSuccess}`}>
            <div className={styles.kpiLabel}><div className={styles.kpiDot}></div> Quản trị viên</div>
            <div className={styles.kpiValue}>{adminCount}</div>
            <div className={styles.kpiCaption}>Chủ sở hữu & Admin</div>
            <span className={`material-icons-round ${styles.kpiWatermark}`} style={{ color: 'var(--success)' }}>admin_panel_settings</span>
          </div>

          {/* Card 3: Huấn luyện viên */}
          <div className={`${styles.kpiItem} ${styles.kpiInfo}`}>
            <div className={styles.kpiLabel}><div className={styles.kpiDot}></div> Huấn luyện viên</div>
            <div className={styles.kpiValue}>{coachCount}</div>
            <div className={styles.kpiCaption}>HLV Trưởng & Trợ giảng</div>
            <span className={`material-icons-round ${styles.kpiWatermark}`} style={{ color: 'var(--info)' }}>sports_martial_arts</span>
          </div>

          {/* Card 4: Lời mời đang chờ */}
          <div className={`${styles.kpiItem} ${styles.kpiWarning}`}>
            <div className={styles.kpiLabel}><div className={styles.kpiDot}></div> Lời mời đang chờ</div>
            <div className={styles.kpiValue}>{invitationsCount}</div>
            <div className={styles.kpiCaption}>Chờ người dùng đồng ý</div>
            <span className={`material-icons-round ${styles.kpiWatermark}`} style={{ color: 'var(--warning)' }}>mail</span>
          </div>
        </div>
      </div>

      {/* FORM GỬI LỜI MỜI THÀNH VIÊN */}
      {isInviting && (
        <Card style={{ 
          background: 'var(--surface)', 
          border: '1px solid var(--border-light)', 
          borderRadius: 'var(--radius-2xl)', 
          overflow: 'hidden' 
        }}>
          <CardHeader style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-light)', background: 'var(--surface-hover)' }}>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', fontWeight: 700 }}>
              <span className="material-icons-round" style={{ color: 'var(--primary)', fontSize: '20px' }}>person_add</span>
              Gửi lời mời thành viên mới
            </CardTitle>
          </CardHeader>
          <CardContent style={{ padding: '24px' }}>
            {error && (
              <div style={{
                color: 'var(--danger)',
                background: 'var(--danger-bg)',
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
            <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                <Input 
                  label="Địa chỉ Email người được mời *"
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="name@example.com"
                  required 
                />
                <Select 
                  label="Vai trò cấp quyền *"
                  value={role} 
                  onChange={(e) => setRole(e.target.value as OrganizationRole)}
                  options={[
                    { value: 'assistant_coach', label: 'Trợ giảng (Assistant Coach)' },
                    { value: 'head_coach', label: 'Huấn luyện viên Trưởng (Head Coach)' },
                    ...(currentUserRole === 'owner' ? [{ value: 'admin', label: 'Quản trị viên (Admin)' }] : [])
                  ]}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px' }}>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsInviting(false)} 
                  disabled={loading}
                >
                  Hủy bỏ
                </Button>
                <Button 
                  type="submit" 
                  isLoading={loading} 
                  variant="primary"
                  leftIcon={<span className="material-icons-round">send</span>}
                  style={{ borderRadius: 'var(--radius-full)' }}
                >
                  Gửi Lời Mời
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 4. TOOLBAR & FILTER GROUP */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <span className={`material-icons-round ${styles.searchIcon}`}>search</span>
          <input 
            type="text" 
            className={styles.searchInput} 
            placeholder="Tìm theo tên thành viên hoặc email..."
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
            className={`${styles.filterPill} ${filterRole === 'all' ? styles.filterPillActive : ''}`}
            onClick={() => setFilterRole('all')}
          >
            Tất cả <span className={styles.filterPillCount}>{totalMembersCount + invitationsCount}</span>
          </button>
          <button
            type="button"
            className={`${styles.filterPill} ${filterRole === 'admins' ? styles.filterPillActive : ''}`}
            onClick={() => setFilterRole('admins')}
          >
            Quản trị viên <span className={styles.filterPillCount}>{adminCount}</span>
          </button>
          <button
            type="button"
            className={`${styles.filterPill} ${filterRole === 'coaches' ? styles.filterPillActive : ''}`}
            onClick={() => setFilterRole('coaches')}
          >
            Huấn luyện viên <span className={styles.filterPillCount}>{coachCount}</span>
          </button>
          <button
            type="button"
            className={`${styles.filterPill} ${filterRole === 'invitations' ? styles.filterPillActive : ''}`}
            onClick={() => setFilterRole('invitations')}
          >
            Lời mời chờ <span className={styles.filterPillCount}>{invitationsCount}</span>
          </button>
        </div>
      </div>

      {/* 5. MEMBERS & INVITATIONS LIST */}
      {filteredMembers.length === 0 && filteredInvitations.length === 0 ? (
        <EmptyState 
          title="Không tìm thấy thành viên" 
          description={searchTerm ? `Không có thành viên nào khớp với từ khóa "${searchTerm}".` : "Chưa có thành viên nào trong danh sách."} 
          icon="groups"
          action={searchTerm ? (
            <Button variant="outline" size="sm" onClick={() => setSearchTerm('')}>
              Xóa tìm kiếm
            </Button>
          ) : undefined}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Active Members */}
          {filteredMembers.map((m: any) => {
            const memberName = m.profiles?.name || 'Thành viên';
            const memberEmail = m.profiles?.email || 'Chưa cập nhật email';
            const initialLetter = memberName[0]?.toUpperCase() || 'U';
            const isSelf = m.id === currentUserId;
            const isOwner = m.role === 'owner';

            return (
              <div 
                key={m.id} 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 20px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-xl)',
                  gap: '16px',
                  flexWrap: 'wrap',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Left: Avatar + Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '220px' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: isOwner ? 'rgba(255, 107, 53, 0.12)' : 'var(--primary-light)',
                    color: isOwner ? 'var(--accent-energy)' : 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '1rem',
                    flexShrink: 0
                  }}>
                    {initialLetter}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-main)' }}>
                        {memberName}
                      </span>
                      {isSelf && (
                        <Badge variant="info">Bạn</Badge>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {memberEmail}
                    </div>
                  </div>
                </div>

                {/* Center: Role + Status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <RoleBadge role={m.role} />
                  <Badge variant="success">Hoạt động</Badge>
                </div>

                {/* Right: Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isAdminOrOwner && !isSelf && !(currentUserRole === 'admin' && isOwner) && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenRoleModal(m)}
                        disabled={loading}
                        leftIcon={<span className="material-icons-round" style={{ fontSize: '15px' }}>edit</span>}
                        style={{ borderRadius: 'var(--radius-full)' }}
                      >
                        Đổi vai trò
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(m.id)}
                        disabled={loading}
                        leftIcon={<span className="material-icons-round" style={{ fontSize: '15px', color: 'var(--danger)' }}>delete</span>}
                        style={{ color: 'var(--danger)', borderRadius: 'var(--radius-full)' }}
                      >
                        Xóa
                      </Button>
                    </>
                  )}
                  {isSelf && (
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      Tài khoản của bạn
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Pending Invitations */}
          {filteredInvitations.map((inv: any) => (
            <div 
              key={inv.id} 
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                background: 'var(--surface-hover)',
                border: '1px dashed var(--border-light)',
                borderRadius: 'var(--radius-xl)',
                gap: '16px',
                flexWrap: 'wrap'
              }}
            >
              {/* Left: Email + Note */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '220px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: 'rgba(255, 179, 0, 0.12)',
                  color: 'var(--warning)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <span className="material-icons-round" style={{ fontSize: '20px' }}>mail_outline</span>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-main)' }}>
                    {inv.email}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Đã gửi lời mời • Chờ người dùng kích hoạt
                  </div>
                </div>
              </div>

              {/* Center: Role + Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <RoleBadge role={inv.role} />
                <Badge variant="warning">Chờ chấp thuận</Badge>
              </div>

              {/* Right: Actions */}
              <div>
                {isAdminOrOwner && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevoke(inv.id)}
                    disabled={loading}
                    leftIcon={<span className="material-icons-round" style={{ fontSize: '15px' }}>cancel</span>}
                    style={{ color: 'var(--danger)', borderRadius: 'var(--radius-full)' }}
                  >
                    Thu hồi lời mời
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL THAY ĐỔI VAI TRÒ */}
      {selectedMember && (
        <ChangeRoleModal
          isOpen={isRoleModalOpen}
          onClose={() => setIsRoleModalOpen(false)}
          currentRole={selectedMember.role}
          memberName={selectedMember.name}
          onSave={handleRoleSave}
          isLoading={roleChangeLoading}
        />
      )}
    </div>
  );
}
