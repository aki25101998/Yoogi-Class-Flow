"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { useDashboardContext } from "@/app/(dashboard)/DashboardProvider";
import VersionDetailModal from "./VersionDetailModal";
import RestoreConfirmation from "./RestoreConfirmation";

import { getBusinessDate, formatBusinessDateVN, formatBusinessTime, getBusinessDateString } from "@/utils/date";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Badge";
import { EmptyState } from "@/app/components/ui/EmptyState";
import styles from "@/app/styles/page-standard.module.css";

function getActionBadge(actionType: string) {
  switch (actionType) {
    case 'CREATE':
      return <Badge variant="success">Tạo mới</Badge>;
    case 'UPDATE':
      return <Badge variant="info">Cập nhật</Badge>;
    case 'DELETE':
      return <Badge variant="danger">Đã xóa</Badge>;
    case 'RESTORE':
      return <Badge variant="warning">Khôi phục</Badge>;
    case 'SYSTEM':
      return <Badge variant="default">Hệ thống</Badge>;
    default:
      return <Badge variant="default">{actionType}</Badge>;
  }
}

export default function VersionHistoryClient() {
  const { context, userData } = useDashboardContext();
  const queryClient = useQueryClient();
  const supabase = createClient();
  const orgId = context?.organization?.id;
  const role = context?.membership?.role || userData?.role;
  const isAdminOrOwner = role === 'admin' || role === 'owner';

  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [versionToRestore, setVersionToRestore] = useState<any>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'SYSTEM'>('all');

  // Fetch Version History
  const { 
    data: versions = [], 
    isLoading, 
    isFetching,
    isError, 
    refetch 
  } = useQuery({
    queryKey: ['version_history', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      
      const { data, error } = await supabase
        .from('version_history')
        .select(`
          *,
          profiles:created_by (name, avatar_url)
        `)
        .eq('organization_id', orgId)
        .order('version_number', { ascending: false })
        .limit(100);
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId
  });

  // Restore Mutation
  const restoreMutation = useMutation({
    mutationFn: async (targetVersionNumber: number) => {
      if (!orgId) throw new Error("Missing organization ID");
      
      const { data, error } = await supabase.rpc('restore_organization_version', {
        p_org_id: orgId,
        p_target_version_number: targetVersionNumber
      });
      
      if (error) throw error;
      if (data && data.success === false) throw new Error(data.error || 'Lỗi không xác định khi khôi phục');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      setVersionToRestore(null);
      setSelectedVersionId(null);
      alert("Đã khôi phục dữ liệu thành công!");
    },
    onError: (err: any) => {
      console.error("Restore failed:", err);
      alert(`Lỗi: ${err.message || 'Không thể khôi phục dữ liệu'}`);
    }
  });

  // Action counts for Filter Pills
  const counts = useMemo(() => {
    return {
      all: versions.length,
      CREATE: versions.filter(v => v.action_type === 'CREATE').length,
      UPDATE: versions.filter(v => v.action_type === 'UPDATE').length,
      DELETE: versions.filter(v => v.action_type === 'DELETE').length,
      RESTORE: versions.filter(v => v.action_type === 'RESTORE').length,
      SYSTEM: versions.filter(v => v.action_type === 'SYSTEM').length,
    };
  }, [versions]);

  // Filtered versions
  const filteredVersions = useMemo(() => {
    return versions.filter((v: any) => {
      if (activeFilter !== 'all' && v.action_type !== activeFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const profile = Array.isArray(v.profiles) ? v.profiles[0] : v.profiles;
        const nameMatch = profile?.name?.toLowerCase().includes(query);
        const summaryMatch = v.summary?.toLowerCase().includes(query);
        const numberMatch = String(v.version_number).includes(query.replace('#', ''));
        if (!nameMatch && !summaryMatch && !numberMatch) {
          return false;
        }
      }
      return true;
    });
  }, [versions, activeFilter, searchTerm]);

  // Group filtered versions by date
  const groupedVersions = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    filteredVersions.forEach(v => {
      const displayDate = formatBusinessDateVN(v.created_at);
      const [dd, mm, yyyy] = displayDate.split('/');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      if (!grouped[dateStr]) grouped[dateStr] = [];
      grouped[dateStr].push(v);
    });
    return grouped;
  }, [filteredVersions]);

  const getDisplayDate = (dateStr: string) => {
    const today = getBusinessDateString();
    const yesterdayDate = getBusinessDate();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    
    if (dateStr === today) return "Hôm nay";
    if (dateStr === yesterday) return "Hôm qua";
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  // KPI Computations
  const totalVersions = versions.length;
  const currentVersion = versions.length > 0 ? versions[0].version_number : null;
  const latestVersion = versions.length > 0 ? versions[0] : null;
  const latestCreator = latestVersion ? (Array.isArray(latestVersion.profiles) ? latestVersion.profiles[0]?.name : latestVersion.profiles?.name) || 'Hệ thống' : 'Chưa có';
  const latestTime = latestVersion ? formatBusinessTime(latestVersion.created_at) : '--:--';
  const latestDate = latestVersion ? formatBusinessDateVN(latestVersion.created_at) : '';
  const restoreCount = Math.max(0, totalVersions - 1);

  if (isLoading) {
    return (
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <PageHeader 
          title="Lịch sử phiên bản" 
          description="Xem các thay đổi dữ liệu của tổ chức và khôi phục về trạng thái trước đó."
        />
        <div className={styles.overviewCard}>
          <div className={styles.overviewHeader}>
            <div className={styles.overviewTitle}>
              <span className="material-icons-round" style={{ fontSize: '18px', color: 'var(--primary)' }}>analytics</span>
              TỔNG QUAN PHIÊN BẢN HỆ THỐNG
            </div>
          </div>
          <div className={styles.overviewGrid}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={styles.kpiItem} style={{ height: '94px', background: 'var(--surface-hover)' }} />
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className={styles.platformCard} style={{ height: '88px', background: 'var(--surface)' }} />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <PageHeader 
          title="Lịch sử phiên bản" 
          description="Xem các thay đổi dữ liệu của tổ chức và khôi phục về trạng thái trước đó."
        />
        <EmptyState 
          icon="error_outline"
          title="Không thể tải lịch sử phiên bản"
          description="Đã có lỗi xảy ra trong quá trình truy vấn dữ liệu từ cơ sở dữ liệu."
          action={
            <Button variant="primary" onClick={() => refetch()} leftIcon={<span className="material-icons-round">refresh</span>}>
              Thử lại ngay
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* 1. PAGE HEADER (FULL WIDTH) */}
      <PageHeader 
        title="Lịch sử phiên bản" 
        description="Xem các thay đổi dữ liệu của tổ chức và khôi phục về trạng thái trước đó."
        primaryAction={
          <Button 
            variant="outline" 
            onClick={() => refetch()} 
            isLoading={isFetching}
            leftIcon={<span className="material-icons-round">refresh</span>}
          >
            Làm mới dữ liệu
          </Button>
        }
      />

      {/* 2. OVERVIEW KPI GRID (4 CÂN ĐỐI) */}
      <div className={styles.overviewCard}>
        <div className={styles.overviewHeader}>
          <div className={styles.overviewTitle}>
            <span className="material-icons-round" style={{ fontSize: '18px', color: 'var(--primary)' }}>analytics</span>
            TỔNG QUAN BIẾN ĐỘNG HỆ THỐNG
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Tự động sao lưu & bảo vệ toàn vẹn dữ liệu
          </div>
        </div>
        <div className={styles.overviewGrid}>
          {/* 1. Tổng phiên bản */}
          <div className={`${styles.kpiItem} ${styles.kpiPrimary}`}>
            <div className={styles.kpiLabel}><div className={styles.kpiDot}></div> Tổng phiên bản</div>
            <div className={styles.kpiValue}>{totalVersions}</div>
            <div className={styles.kpiCaption}>Bản ghi biến động đã lưu</div>
            <span className={`material-icons-round ${styles.kpiWatermark}`} style={{ color: 'var(--primary)' }}>history</span>
          </div>

          {/* 2. Phiên bản hiện tại */}
          <div className={`${styles.kpiItem} ${styles.kpiSuccess}`}>
            <div className={styles.kpiLabel}><div className={styles.kpiDot}></div> Phiên bản hiện tại</div>
            <div className={styles.kpiValue}>{currentVersion !== null ? `#${currentVersion}` : 'Chưa có'}</div>
            <div className={styles.kpiCaption}>Điểm mốc đang vận hành</div>
            <span className={`material-icons-round ${styles.kpiWatermark}`} style={{ color: 'var(--success)' }}>verified</span>
          </div>

          {/* 3. Thay đổi gần nhất */}
          <div className={`${styles.kpiItem} ${styles.kpiInfo}`}>
            <div className={styles.kpiLabel}><div className={styles.kpiDot}></div> Thay đổi gần nhất</div>
            <div className={styles.kpiValue} style={{ fontSize: '1.15rem' }}>{latestTime}</div>
            <div className={styles.kpiCaption}>
              {latestDate ? `${latestDate} • ${latestCreator}` : 'Chưa có biến động'}
            </div>
            <span className={`material-icons-round ${styles.kpiWatermark}`} style={{ color: 'var(--info)' }}>update</span>
          </div>

          {/* 4. Điểm khôi phục */}
          <div className={`${styles.kpiItem} ${styles.kpiWarning}`}>
            <div className={styles.kpiLabel}><div className={styles.kpiDot}></div> Điểm khôi phục</div>
            <div className={styles.kpiValue}>{restoreCount > 0 ? `${restoreCount} mốc` : (totalVersions > 0 ? '1 mốc' : '0')}</div>
            <div className={styles.kpiCaption}>Sẵn sàng hoàn tác an toàn</div>
            <span className={`material-icons-round ${styles.kpiWatermark}`} style={{ color: 'var(--warning)' }}>security</span>
          </div>
        </div>
      </div>

      {/* 3. EMPTY STATE OR LIST */}
      {versions.length === 0 ? (
        <EmptyState 
          icon="history"
          title="Chưa có lịch sử phiên bản"
          description="Hệ thống tự động ghi nhận các mốc sao lưu mỗi khi có thao tác thêm, sửa hoặc xóa dữ liệu (học viên, lịch dạy, điểm danh, tài chính...). Các phiên bản sẽ hiển thị tại đây để bạn có thể xem lại và khôi phục bất cứ lúc nào."
          action={
            <Button 
              variant="outline" 
              onClick={() => refetch()} 
              leftIcon={<span className="material-icons-round">refresh</span>}
            >
              Kiểm tra cập nhật
            </Button>
          }
        />
      ) : (
        <>
          {/* TOOLBAR SEARCH & FILTER */}
          <div className={styles.toolbar}>
            <div className={styles.searchWrapper}>
              <span className={`material-icons-round ${styles.searchIcon}`}>search</span>
              <input 
                type="text" 
                placeholder="Tìm theo nội dung, người tạo hoặc #phiên bản..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')} 
                  className={styles.searchClearBtn}
                  aria-label="Xóa tìm kiếm"
                >
                  <span className="material-icons-round" style={{ fontSize: '18px' }}>close</span>
                </button>
              )}
            </div>

            <div className={styles.filterGroup}>
              <button 
                className={`${styles.filterPill} ${activeFilter === 'all' ? styles.filterPillActive : ''}`}
                onClick={() => setActiveFilter('all')}
              >
                Tất cả <span className={styles.filterPillCount}>{counts.all}</span>
              </button>
              <button 
                className={`${styles.filterPill} ${activeFilter === 'CREATE' ? styles.filterPillActive : ''}`}
                onClick={() => setActiveFilter('CREATE')}
              >
                Tạo mới <span className={styles.filterPillCount}>{counts.CREATE}</span>
              </button>
              <button 
                className={`${styles.filterPill} ${activeFilter === 'UPDATE' ? styles.filterPillActive : ''}`}
                onClick={() => setActiveFilter('UPDATE')}
              >
                Cập nhật <span className={styles.filterPillCount}>{counts.UPDATE}</span>
              </button>
              <button 
                className={`${styles.filterPill} ${activeFilter === 'DELETE' ? styles.filterPillActive : ''}`}
                onClick={() => setActiveFilter('DELETE')}
              >
                Đã xóa <span className={styles.filterPillCount}>{counts.DELETE}</span>
              </button>
              {counts.RESTORE > 0 && (
                <button 
                  className={`${styles.filterPill} ${activeFilter === 'RESTORE' ? styles.filterPillActive : ''}`}
                  onClick={() => setActiveFilter('RESTORE')}
                >
                  Khôi phục <span className={styles.filterPillCount}>{counts.RESTORE}</span>
                </button>
              )}
              {counts.SYSTEM > 0 && (
                <button 
                  className={`${styles.filterPill} ${activeFilter === 'SYSTEM' ? styles.filterPillActive : ''}`}
                  onClick={() => setActiveFilter('SYSTEM')}
                >
                  Hệ thống <span className={styles.filterPillCount}>{counts.SYSTEM}</span>
                </button>
              )}
            </div>
          </div>

          {/* LIST BY DATE GROUPS */}
          {Object.keys(groupedVersions).length === 0 ? (
            <div style={{
              padding: '48px 24px',
              textAlign: 'center',
              background: 'var(--surface)',
              borderRadius: 'var(--radius-xl)',
              border: '1px dashed var(--border-light)'
            }}>
              <span className="material-icons-round" style={{ fontSize: '40px', color: 'var(--text-muted)', marginBottom: '12px' }}>filter_alt_off</span>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>Không tìm thấy phiên bản phù hợp</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '16px' }}>Thử thay đổi từ khóa tìm kiếm hoặc bỏ chọn bộ lọc trạng thái.</p>
              <Button variant="outline" size="sm" onClick={() => { setSearchTerm(''); setActiveFilter('all'); }}>
                Xóa bộ lọc
              </Button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              {Object.entries(groupedVersions).map(([dateStr, dayVersions], groupIndex) => (
                <div key={dateStr}>
                  {/* DATE SECTION HEADER */}
                  <div className={styles.sectionHeader}>
                    <div className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="material-icons-round" style={{ fontSize: '18px', color: 'var(--primary)' }}>event</span>
                      {getDisplayDate(dateStr)}
                    </div>
                    <div className={styles.sectionCount}>
                      {dayVersions.length} phiên bản
                    </div>
                  </div>

                  {/* CARDS LIST */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {dayVersions.map((version, idx) => {
                      const isCurrent = groupIndex === 0 && idx === 0 && activeFilter === 'all' && !searchTerm.trim() && version.id === versions[0]?.id;
                      const profile = Array.isArray(version.profiles) ? version.profiles[0] : version.profiles;
                      const creatorName = profile?.name || 'Hệ thống';
                      const initial = creatorName.trim().slice(0, 1).toUpperCase();

                      return (
                        <div 
                          key={version.id} 
                          className={styles.platformCard}
                          style={{
                            borderLeft: isCurrent ? '4px solid var(--primary)' : undefined,
                            boxShadow: isCurrent ? '0 0 0 1px var(--primary-light)' : undefined
                          }}
                        >
                          {/* 1. LEFT ZONE: Version Capsule + Creator Avatar + Info */}
                          <div className={styles.platformCardLeft}>
                            {/* Version Capsule */}
                            <div style={{
                              minWidth: '56px',
                              height: '48px',
                              borderRadius: 'var(--radius-lg)',
                              background: isCurrent ? 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)' : 'var(--surface-hover)',
                              color: isCurrent ? 'var(--text-on-primary)' : 'var(--text-main)',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.875rem',
                              border: isCurrent ? 'none' : '1px solid var(--border-light)',
                              boxShadow: isCurrent ? 'var(--shadow-teal-glow)' : 'none',
                              flexShrink: 0
                            }}>
                              <span style={{ fontSize: '0.65rem', opacity: isCurrent ? 0.9 : 0.6, lineHeight: 1 }}>PHIÊN BẢN</span>
                              <span style={{ fontSize: '1rem', lineHeight: 1.2 }}>#{version.version_number}</span>
                            </div>

                            {/* Creator Avatar */}
                            <div 
                              className={styles.entityAvatar}
                              style={{
                                width: '40px',
                                height: '40px',
                                fontSize: '0.95rem'
                              }}
                            >
                              {profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt="" className={styles.entityAvatarImg} />
                              ) : (
                                initial
                              )}
                            </div>

                            {/* Version Summary & Meta */}
                            <div className={styles.entityMain}>
                              <div className={styles.entityTitleRow}>
                                <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-main)' }}>
                                  {creatorName}
                                </span>
                                {getActionBadge(version.action_type)}
                                {isCurrent && (
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '2px 10px',
                                    background: 'var(--primary-light)',
                                    color: 'var(--primary)',
                                    borderRadius: 'var(--radius-full)',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    border: '1px solid rgba(20, 184, 166, 0.3)'
                                  }}>
                                    <span className="material-icons-round" style={{ fontSize: '14px' }}>check_circle</span>
                                    HIỆN TẠI
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.875rem', color: 'var(--text-main)', marginTop: '2px' }}>
                                {version.summary || 'Không có mô tả chi tiết'}
                              </div>
                            </div>
                          </div>

                          {/* 2. RIGHT ZONE: Time + Actions */}
                          <div className={styles.platformCardRight}>
                            {/* Timestamp */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                              <span className="material-icons-round" style={{ fontSize: '16px', color: 'var(--text-muted)' }}>schedule</span>
                              <span>{formatBusinessTime(version.created_at)} • {formatBusinessDateVN(version.created_at)}</span>
                            </div>

                            {/* Buttons */}
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedVersionId(version.id)}
                                leftIcon={<span className="material-icons-round" style={{ fontSize: '16px' }}>visibility</span>}
                              >
                                Chi tiết
                              </Button>

                              {isAdminOrOwner && !isCurrent && (
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => setVersionToRestore(version)}
                                  leftIcon={<span className="material-icons-round" style={{ fontSize: '16px' }}>restore</span>}
                                >
                                  Khôi phục
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {selectedVersionId && (
        <VersionDetailModal 
          version={versions.find(v => v.id === selectedVersionId)} 
          isCurrent={versions[0]?.id === selectedVersionId}
          isAdminOrOwner={isAdminOrOwner}
          onClose={() => setSelectedVersionId(null)}
          onRestoreRequest={(version: any) => {
            setSelectedVersionId(null);
            setVersionToRestore(version);
          }}
        />
      )}

      {/* Restore Confirmation Modal */}
      {versionToRestore && (
        <RestoreConfirmation 
          version={versionToRestore}
          isRestoring={restoreMutation.isPending}
          onConfirm={() => restoreMutation.mutate(versionToRestore.version_number)}
          onCancel={() => setVersionToRestore(null)}
        />
      )}
    </div>
  );
}
