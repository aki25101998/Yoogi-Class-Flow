import React from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: string;
  action?: React.ReactNode;
  compact?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  title, 
  description, 
  icon = 'inbox', 
  action,
  compact = false
}) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: compact ? 'var(--space-6) var(--space-4)' : 'var(--space-12) var(--space-6)',
      textAlign: 'center',
      backgroundColor: 'var(--surface)',
      borderRadius: 'var(--radius-lg)',
      border: '1px dashed var(--border)',
    }}>
      <div style={{
        width: compact ? '48px' : '64px',
        height: compact ? '48px' : '64px',
        borderRadius: '50%',
        backgroundColor: 'var(--primary-light)',
        color: 'var(--primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: compact ? 'var(--space-2)' : 'var(--space-4)'
      }}>
        <span className="material-icons-round" style={{ fontSize: compact ? '24px' : '32px', opacity: compact ? 0.8 : 1 }}>{icon}</span>
      </div>
      <h3 style={{ fontSize: compact ? '1rem' : '1.25rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 'var(--space-2)' }}>
        {title}
      </h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: compact ? '0.8125rem' : '1rem', maxWidth: '400px', marginBottom: action ? 'var(--space-4)' : '0' }}>
        {description}
      </p>
      {action}
    </div>
  );
};
