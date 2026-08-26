import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  primaryAction?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, primaryAction }) => {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: 'var(--space-1)' }}>
          {title}
        </h1>
        {description && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            {description}
          </p>
        )}
      </div>
      {primaryAction && (
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {primaryAction}
        </div>
      )}
    </div>
  );
};
