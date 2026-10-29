"use client";

import { PageHeader } from "@/app/components/ui/PageHeader";
import styles from "@/app/styles/page-standard.module.css";

export default function VersionHistoryLoading() {
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
            TỔNG QUAN BIẾN ĐỘNG HỆ THỐNG
          </div>
        </div>
        <div className={styles.overviewGrid}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={styles.kpiItem} style={{ height: '94px', background: 'var(--surface-hover)' }} />
          ))}
        </div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {[1, 2, 3, 4].map(i => (
          <div 
            key={i} 
            className={styles.platformCard} 
            style={{ height: '88px', background: 'var(--surface)', opacity: 0.7 }} 
          />
        ))}
      </div>
    </div>
  );
}
