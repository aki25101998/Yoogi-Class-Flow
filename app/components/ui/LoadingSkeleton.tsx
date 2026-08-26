import React from 'react';

export const LoadingSkeleton = () => {
  return (
    <div style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>
      {/* Header Skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
        <div>
          <div style={{ height: '28px', width: '200px', backgroundColor: 'var(--surface-hover)', borderRadius: 'var(--radius-sm)', marginBottom: '8px' }}></div>
          <div style={{ height: '16px', width: '300px', backgroundColor: 'var(--surface-hover)', borderRadius: 'var(--radius-sm)' }}></div>
        </div>
        <div style={{ height: '40px', width: '120px', backgroundColor: 'var(--surface-hover)', borderRadius: 'var(--radius-md)' }}></div>
      </div>

      {/* Toolbar Skeleton */}
      <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <div style={{ height: '40px', width: '250px', backgroundColor: 'var(--surface-hover)', borderRadius: 'var(--radius-md)' }}></div>
        <div style={{ height: '40px', width: '150px', backgroundColor: 'var(--surface-hover)', borderRadius: 'var(--radius-md)' }}></div>
      </div>

      {/* Table Skeleton */}
      <div style={{ backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', overflow: 'hidden' }}>
        <div style={{ height: '48px', backgroundColor: 'var(--surface-hover)', borderBottom: '1px solid var(--border-light)' }}></div>
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{ height: '64px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', padding: '0 var(--space-4)' }}>
            <div style={{ height: '20px', width: '100%', backgroundColor: 'var(--surface-hover)', borderRadius: 'var(--radius-sm)', opacity: 0.7 - i * 0.1 }}></div>
          </div>
        ))}
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
      `}} />
    </div>
  );
};
