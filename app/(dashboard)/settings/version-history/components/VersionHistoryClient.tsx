"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { useDashboardContext } from "@/app/(dashboard)/DashboardProvider";
import VersionDetailModal from "./VersionDetailModal";
import RestoreConfirmation from "./RestoreConfirmation";

import { getBusinessDate, formatBusinessDateVN, formatBusinessTime, getBusinessDateString } from '@/utils/date';
import { PageHeader } from '@/app/components/ui/PageHeader';

// Removed local formatters in favor of imported business timezone ones
export default function VersionHistoryClient() {
  const { context, userData } = useDashboardContext();
  const queryClient = useQueryClient();
  const supabase = createClient();
  const orgId = context?.organization?.id;
  const role = context?.membership?.role || userData?.role;
  const isAdminOrOwner = role === 'admin' || role === 'owner';

  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [versionToRestore, setVersionToRestore] = useState<any>(null);

  // Fetch Version History
  const { data: versions, isLoading, isError, refetch } = useQuery({
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
        .limit(50);
        
      if (error) throw error;
      return data;
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
      queryClient.invalidateQueries(); // Refresh everything
      setVersionToRestore(null);
      setSelectedVersionId(null);
      // We could add a toast here in a real app
      alert("Đã khôi phục dữ liệu thành công!");
    },
    onError: (err: any) => {
      console.error("Restore failed:", err);
      alert(`Lỗi: ${err.message || 'Không thể khôi phục dữ liệu'}`);
    }
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{ textAlign: 'center', padding: '48px', color: 'var(--danger)' }}>
        Không thể tải lịch sử phiên bản.
        <br />
        <button className="btn btn-outline" style={{ marginTop: '16px' }} onClick={() => refetch()}>Thử lại</button>
      </div>
    );
  }

  if (!versions || versions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '64px 24px', background: 'var(--surface)', borderRadius: '12px', border: '1px dashed var(--border-light)' }}>
        <span className="material-icons-round" style={{ fontSize: '48px', color: 'var(--text-muted)', marginBottom: '16px' }}>history</span>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>Chưa có lịch sử phiên bản</h3>
        <p style={{ color: 'var(--text-secondary)' }}>Các thay đổi dữ liệu của tổ chức sẽ xuất hiện tại đây.</p>
      </div>
    );
  }

  const groupedVersions: Record<string, any[]> = {};
  versions.forEach(v => {
    // v.created_at is TIMESTAMPTZ, so we convert it to the business timezone date string
    // for grouping. A simple way is to parse it into business Date and extract YYYY-MM-DD.
    // wait, getBusinessDate() trick doesn't work for arbitrary strings.
    // Let's use formatBusinessDateVN and split.
    const displayDate = formatBusinessDateVN(v.created_at); // DD/MM/YYYY
    const [dd, mm, yyyy] = displayDate.split('/');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    
    if (!groupedVersions[dateStr]) groupedVersions[dateStr] = [];
    groupedVersions[dateStr].push(v);
  });

  const getDisplayDate = (dateStr: string) => {
    const today = getBusinessDateString();
    const yesterdayDate = getBusinessDate();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }); // YYYY-MM-DD
    
    if (dateStr === today) return "Hôm nay";
    if (dateStr === yesterday) return "Hôm qua";
    // dateStr is YYYY-MM-DD, convert to DD/MM/YYYY
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="version-history-container">
      <style dangerouslySetInnerHTML={{__html: `
        .timeline-item {
          display: flex;
          gap: 16px;
          position: relative;
          cursor: pointer;
          border-radius: 8px;
          padding: 12px;
          margin-left: -12px;
          transition: background 0.2s;
        }
        .timeline-item:hover {
          background: var(--surface-hover);
        }
        .timeline-line {
          position: absolute;
          left: 21.5px; /* 12px padding + 9.5px center of 19px dot */
          top: 36px;
          bottom: -12px;
          width: 2px;
          background: var(--border-light);
          z-index: 0;
        }
        .timeline-item:last-child .timeline-line {
          display: none;
        }
        .timeline-dot {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 4px solid var(--surface);
          background: var(--text-muted);
          position: relative;
          z-index: 1;
          margin-top: 4px;
        }
        .timeline-dot.current {
          background: var(--primary);
          box-shadow: 0 0 0 2px var(--primary-light);
        }
        .date-header {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-main);
          margin: 24px 0 16px 0;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--border-light);
        }
      `}} />

      {Object.entries(groupedVersions).map(([dateStr, dayVersions], groupIndex) => (
        <div key={dateStr}>
          <div className="date-header">{getDisplayDate(dateStr)}</div>
          
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {dayVersions.map((version, idx) => {
              const isCurrent = groupIndex === 0 && idx === 0;
              const profile = Array.isArray(version.profiles) ? version.profiles[0] : version.profiles;
              
              return (
                <div 
                  key={version.id} 
                  className="timeline-item"
                  onClick={() => setSelectedVersionId(version.id)}
                >
                  <div className="timeline-dot-container" style={{ position: 'relative' }}>
                    <div className={`timeline-dot ${isCurrent ? 'current' : ''}`}></div>
                    {/* Line connecting to next item */}
                    {!(groupIndex === Object.keys(groupedVersions).length - 1 && idx === dayVersions.length - 1) && (
                      <div className="timeline-line"></div>
                    )}
                  </div>
                  
                  <div style={{ flex: 1, paddingBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>
                          {formatBusinessTime(version.created_at)} — {profile?.name || 'Hệ thống'}
                        </span>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', background: 'var(--surface)', border: '1px solid var(--border-light)', padding: '2px 8px', borderRadius: '12px' }}>
                        #{version.version_number}
                      </span>
                    </div>
                    
                    <div style={{ fontSize: '14px', color: 'var(--text-main)' }}>
                      {version.summary}
                    </div>
                    
                    {isCurrent && (
                      <div style={{ marginTop: '8px', display: 'inline-block', padding: '2px 8px', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                        Phiên bản hiện tại
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

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
