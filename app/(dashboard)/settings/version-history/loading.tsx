"use client";

export default function VersionHistoryLoading() {
  return (
    <div className="page-container" style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: '32px' }}>
        <div style={{ height: '32px', width: '250px', background: 'var(--surface-hover)', borderRadius: '8px', marginBottom: '12px' }} className="skeleton-pulse"></div>
        <div style={{ height: '20px', width: '400px', background: 'var(--surface-hover)', borderRadius: '8px' }} className="skeleton-pulse"></div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ display: 'flex', gap: '16px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--surface-hover)', marginTop: '6px' }} className="skeleton-pulse"></div>
            <div style={{ flex: 1, paddingBottom: '24px', borderLeft: '2px solid var(--border-light)', paddingLeft: '24px', marginLeft: '-7px' }}>
              <div style={{ height: '20px', width: '150px', background: 'var(--surface-hover)', borderRadius: '4px', marginBottom: '8px' }} className="skeleton-pulse"></div>
              <div style={{ height: '60px', width: '100%', background: 'var(--surface-hover)', borderRadius: '8px' }} className="skeleton-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
