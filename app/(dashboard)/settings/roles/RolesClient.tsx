'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { OrganizationRole, OrganizationRoleDefinition } from '@/types/organization';
import { saveRoleAction, deleteRoleAction, resetRoleAction } from './actions';
import { EditRolePermissionsModal, PERMISSION_GROUPS } from './components/EditRolePermissionsModal';

// UI Components
import { PageHeader } from '@/app/components/ui/PageHeader';
import { SettingsNavTabs } from '../components/SettingsNavTabs';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { RoleBadge } from '@/app/components/ui/RoleBadge';
import { EmptyState } from '@/app/components/ui/EmptyState';
import styles from '@/app/styles/page-standard.module.css';

interface RolesClientProps {
  initialRoles: OrganizationRoleDefinition[];
  membersByRole: Record<string, number>;
  currentUserRole?: OrganizationRole;
}

const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap(g => g.permissions.map(p => p.key));

export default function RolesClient({
  initialRoles,
  membersByRole,
  currentUserRole
}: RolesClientProps) {
  const router = useRouter();
  const [roles, setRoles] = useState<OrganizationRoleDefinition[]>(initialRoles || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'system' | 'custom'>('all');

  // Modal State
  const [selectedRole, setSelectedRole] = useState<OrganizationRoleDefinition | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isAdminOrOwner = currentUserRole === 'admin' || currentUserRole === 'owner';

  // KPI Calculations
  const totalRolesCount = roles.length;
  const systemRolesCount = roles.filter(r => r.is_system).length;
  const customRolesCount = roles.filter(r => !r.is_system).length;
  
  const adminMembersCount = (membersByRole['owner'] || 0) + (membersByRole['admin'] || 0);
  const coachMembersCount = (membersByRole['head_coach'] || 0) + (membersByRole['assistant_coach'] || 0);

  // Filtered Roles
  const filteredRoles = useMemo(() => {
    return roles.filter(r => {
      if (filterType === 'system' && !r.is_system) return false;
      if (filterType === 'custom' && r.is_system) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return r.name.toLowerCase().includes(term) || (r.description || '').toLowerCase().includes(term);
      }
      return true;
    });
  }, [roles, filterType, searchTerm]);

  // Open modal for editing
  const handleEditRole = (role: OrganizationRoleDefinition) => {
    setSelectedRole(role);
    setIsModalOpen(true);
  };

  // Open modal for creating new custom role
  const handleCreateRole = () => {
    setSelectedRole(null);
    setIsModalOpen(true);
  };

  // Save role (create or edit)
  const handleSaveRole = async (data: {
    id?: string;
    name: string;
    code?: string;
    base_role: OrganizationRole;
    description?: string;
    permissions: string[];
  }) => {
    setIsLoading(true);
    const res = await saveRoleAction(data);
    setIsLoading(false);

    if (res.success) {
      setIsModalOpen(false);
      setSelectedRole(null);
      router.refresh();
    } else {
      alert(res.error || 'Lỗi khi lưu cấu hình vai trò.');
    }
  };

  // Delete custom role
  const handleDeleteRole = async (role: OrganizationRoleDefinition) => {
    const memberCount = role.member_count || 0;
    if (memberCount > 0) {
      alert(`Không thể xóa vai trò này vì đang có ${memberCount} thành viên được gán.`);
      return;
    }

    if (confirm(`Bạn có chắc muốn xóa vai trò "${role.name}"?`)) {
      setIsLoading(true);
      const res = await deleteRoleAction(role.id, role.code);
      setIsLoading(false);

      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || 'Lỗi khi xóa vai trò.');
      }
    }
  };

  // Reset system role permissions to default
  const handleResetRole = async (role: OrganizationRoleDefinition) => {
    if (confirm(`Bạn có chắc muốn khôi phục quyền mặc định cho vai trò "${role.name}"?`)) {
      setIsLoading(true);
      const res = await resetRoleAction(role.base_role);
      setIsLoading(false);

      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || 'Lỗi khi khôi phục quyền.');
      }
    }
  };

  // Get human label for permission
  const getPermissionLabel = (key: string) => {
    for (const group of PERMISSION_GROUPS) {
      const match = group.permissions.find(p => p.key === key);
      if (match) return match.label;
    }
    return key;
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* 1. PAGE HEADER */}
      <PageHeader 
        title="Vai trò & Phân quyền" 
        description="Quản lý danh sách vai trò và cấu hình quyền hạn nghiệp vụ cho từng chức danh trong tổ chức"
        primaryAction={
          isAdminOrOwner ? (
            <Button 
              variant="primary" 
              leftIcon={<span className="material-icons-round">add</span>}
              onClick={handleCreateRole}
              style={{ borderRadius: 'var(--radius-full)' }}
            >
              Thêm vai trò mới
            </Button>
          ) : undefined
        }
      />

      {/* 2. SUB-NAV TABS */}
      <SettingsNavTabs />

      {/* 3. OVERVIEW KPI CARDS (MATCHING YOOGI DESIGN SYSTEM) */}
      <div className={styles.overviewCard}>
        <div className={styles.overviewHeader}>
          <div className={styles.overviewTitle}>
            <span className="material-icons-round" style={{ fontSize: '18px', color: 'var(--primary)' }}>admin_panel_settings</span>
            TỔNG QUAN VAI TRÒ & PHÂN QUYỀN
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Cấu hình theo cơ cấu tổ chức trung tâm
          </div>
        </div>
        <div className={styles.overviewGrid}>
          {/* Card 1: Tổng vai trò */}
          <div className={`${styles.kpiItem} ${styles.kpiPrimary}`}>
            <div className={styles.kpiLabel}><div className={styles.kpiDot}></div> Tổng số vai trò</div>
            <div className={styles.kpiValue}>{totalRolesCount}</div>
            <div className={styles.kpiCaption}>
              <strong style={{ color: 'var(--primary)' }}>{systemRolesCount}</strong> mặc định • <strong style={{ color: 'var(--accent-energy)' }}>{customRolesCount}</strong> tùy biến
            </div>
            <span className={`material-icons-round ${styles.kpiWatermark}`} style={{ color: 'var(--primary)' }}>security</span>
          </div>

          {/* Card 2: Nhân sự quản trị */}
          <div className={`${styles.kpiItem} ${styles.kpiSuccess}`}>
            <div className={styles.kpiLabel}><div className={styles.kpiDot}></div> Nhân sự Quản trị</div>
            <div className={styles.kpiValue}>{adminMembersCount}</div>
            <div className={styles.kpiCaption}>Chủ trung tâm & Quản trị viên</div>
            <span className={`material-icons-round ${styles.kpiWatermark}`} style={{ color: 'var(--success)' }}>manage_accounts</span>
          </div>

          {/* Card 3: Đội ngũ chuyên môn */}
          <div className={`${styles.kpiItem} ${styles.kpiInfo}`}>
            <div className={styles.kpiLabel}><div className={styles.kpiDot}></div> Đội ngũ Chuyên môn</div>
            <div className={styles.kpiValue}>{coachMembersCount}</div>
            <div className={styles.kpiCaption}>HLV trưởng & HLV phụ</div>
            <span className={`material-icons-round ${styles.kpiWatermark}`} style={{ color: 'var(--info)' }}>sports_martial_arts</span>
          </div>

          {/* Card 4: Module chức năng */}
          <div className={`${styles.kpiItem} ${styles.kpiWarning}`}>
            <div className={styles.kpiLabel}><div className={styles.kpiDot}></div> Chức Năng Phân Quyền</div>
            <div className={styles.kpiValue}>{ALL_PERMISSION_KEYS.length}</div>
            <div className={styles.kpiCaption}>10 module chia 4 nhóm nghiệp vụ</div>
            <span className={`material-icons-round ${styles.kpiWatermark}`} style={{ color: 'var(--warning)' }}>checklist</span>
          </div>
        </div>
      </div>

      {/* 4. TOOLBAR & FILTER PILLS */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <span className={`material-icons-round ${styles.searchIcon}`}>search</span>
          <input 
            type="text" 
            className={styles.searchInput} 
            placeholder="Tìm theo tên vai trò hoặc mô tả..."
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
            className={`${styles.filterPill} ${filterType === 'all' ? styles.filterPillActive : ''}`}
            onClick={() => setFilterType('all')}
          >
            Tất cả <span className={styles.filterPillCount}>{totalRolesCount}</span>
          </button>
          <button 
            type="button" 
            className={`${styles.filterPill} ${filterType === 'system' ? styles.filterPillActive : ''}`}
            onClick={() => setFilterType('system')}
          >
            Hệ thống <span className={styles.filterPillCount}>{systemRolesCount}</span>
          </button>
          <button 
            type="button" 
            className={`${styles.filterPill} ${filterType === 'custom' ? styles.filterPillActive : ''}`}
            onClick={() => setFilterType('custom')}
          >
            Tùy biến <span className={styles.filterPillCount}>{customRolesCount}</span>
          </button>
        </div>
      </div>

      {/* 5. ROLES LIST */}
      {filteredRoles.length === 0 ? (
        <EmptyState
          icon="admin_panel_settings"
          title="Không tìm thấy vai trò phù hợp"
          description={searchTerm ? `Không có vai trò nào khớp với từ khóa "${searchTerm}"` : "Chưa có vai trò tùy chỉnh nào được tạo."}
          action={
            searchTerm ? (
              <Button variant="outline" onClick={() => setSearchTerm('')}>
                Xóa tìm kiếm
              </Button>
            ) : (
              <Button variant="primary" onClick={handleCreateRole}>
                + Thêm vai trò mới
              </Button>
            )
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredRoles.map((role) => {
            const isOwner = role.base_role === 'owner';
            const memberCount = role.member_count || 0;
            const validPerms = (role.permissions || []).filter(p => ALL_PERMISSION_KEYS.includes(p));
            const permCount = isOwner ? ALL_PERMISSION_KEYS.length : validPerms.length;
            const permPercentage = Math.min(100, Math.round((permCount / ALL_PERMISSION_KEYS.length) * 100));

            return (
              <div 
                key={role.id || role.code}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: 'var(--shadow-xs)'
                }}
              >
                {/* TOP ROW: Identity + Member Count + Actions */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  gap: '16px',
                  flexWrap: 'wrap'
                }}>
                  {/* Left: Avatar Icon + Title + Badges */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: 'var(--radius-lg)',
                      background: isOwner ? 'rgba(255, 107, 53, 0.12)' : 'var(--primary-light)',
                      color: isOwner ? 'var(--accent-energy)' : 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <span className="material-icons-round" style={{ fontSize: '22px' }}>
                        {isOwner ? 'stars' : role.base_role === 'admin' ? 'shield' : role.base_role === 'head_coach' ? 'sports_martial_arts' : 'person_outline'}
                      </span>
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>
                          {role.name}
                        </span>
                        
                        <RoleBadge role={role.base_role} />

                        {role.is_system ? (
                          <Badge variant="info">Mặc định</Badge>
                        ) : (
                          <Badge variant="warning">Tùy biến</Badge>
                        )}
                      </div>

                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {role.description || 'Chưa có mô tả chi tiết cho vai trò này.'}
                      </div>
                    </div>
                  </div>

                  {/* Right: Member count + Action Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 10px',
                      background: 'var(--surface-hover)',
                      borderRadius: 'var(--radius-full)',
                      border: '1px solid var(--border-light)',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: 'var(--text-main)',
                      whiteSpace: 'nowrap'
                    }}>
                      <span className="material-icons-round" style={{ fontSize: '16px', color: 'var(--primary)' }}>group</span>
                      {memberCount} thành viên
                    </div>

                    {isAdminOrOwner && !isOwner && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditRole(role)}
                        disabled={isLoading}
                        leftIcon={<span className="material-icons-round" style={{ fontSize: '15px' }}>tune</span>}
                        style={{ borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap' }}
                      >
                        Chỉnh sửa quyền
                      </Button>
                    )}

                    {isAdminOrOwner && role.is_system && !isOwner && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResetRole(role)}
                        disabled={isLoading}
                        title="Khôi phục quyền mặc định"
                        leftIcon={<span className="material-icons-round" style={{ fontSize: '15px' }}>restart_alt</span>}
                        style={{ borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap' }}
                      >
                        Đặt lại
                      </Button>
                    )}

                    {isAdminOrOwner && !role.is_system && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRole(role)}
                        disabled={isLoading || memberCount > 0}
                        title={memberCount > 0 ? "Không thể xóa vai trò đang có thành viên" : "Xóa vai trò"}
                        leftIcon={<span className="material-icons-round" style={{ fontSize: '15px', color: memberCount > 0 ? 'var(--text-muted)' : 'var(--danger)' }}>delete</span>}
                        style={{ color: memberCount > 0 ? 'var(--text-muted)' : 'var(--danger)', borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap' }}
                      >
                        Xóa
                      </Button>
                    )}
                  </div>
                </div>

                {/* BOTTOM ROW: Progress bar & Permissions Pill Cloud */}
                <div style={{
                  paddingTop: '10px',
                  borderTop: '1px solid var(--border-light)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <span>
                      Quyền hạn: <strong style={{ color: 'var(--primary)' }}>{permCount}</strong> / {ALL_PERMISSION_KEYS.length} chức năng
                    </span>
                    <span style={{ fontWeight: 600 }}>{permPercentage}% phạm vi</span>
                  </div>

                  {/* Progress Line */}
                  <div style={{ width: '100%', height: '4px', background: 'var(--surface-hover)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${permPercentage}%`,
                      height: '100%',
                      background: isOwner ? 'linear-gradient(90deg, var(--accent-energy), #ff8f00)' : 'linear-gradient(90deg, var(--primary), var(--primary-hover))',
                      borderRadius: '2px',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>

                  {/* Permission Pills */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                    {isOwner ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '3px 10px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: 'rgba(255, 107, 53, 0.1)',
                        color: 'var(--accent-energy)',
                        border: '1px solid rgba(255, 107, 53, 0.25)'
                      }}>
                        <span className="material-icons-round" style={{ fontSize: '14px' }}>verified</span>
                        Toàn quyền tuyệt đối trên tất cả các phân hệ của tổ chức
                      </span>
                    ) : validPerms.length === 0 ? (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Chưa được cấp quyền hạn nào.
                      </span>
                    ) : (
                      validPerms.map(permKey => (
                        <span 
                          key={permKey}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 10px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            background: 'var(--primary-light)',
                            color: 'var(--primary)',
                            border: '1px solid rgba(20, 184, 166, 0.25)'
                          }}
                        >
                          <span className="material-icons-round" style={{ fontSize: '13px' }}>check</span>
                          {getPermissionLabel(permKey)}
                        </span>
                      ))
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* 6. MODAL CHỈNH SỬA VAI TRÒ & MA TRẬN PHÂN QUYỀN */}
      <EditRolePermissionsModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRole(null);
        }}
        roleData={selectedRole}
        onSave={handleSaveRole}
        isLoading={isLoading}
      />
    </div>
  );
}
