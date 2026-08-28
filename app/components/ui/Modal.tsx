import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string; // For backward compatibility
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scrolling
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // If title is provided, use the legacy single-prop layout
  if (title) {
    return (
      <div className="modal-overlay">
        <div className="modal-container" role="dialog" aria-modal="true">
          <ModalHeader title={title} onClose={onClose} />
          <ModalBody>
            {children}
          </ModalBody>
        </div>
      </div>
    );
  }

  // Composite layout: caller provides <ModalHeader>, <ModalBody>, <ModalFooter>
  return (
    <div className="modal-overlay">
      <div className="modal-container" role="dialog" aria-modal="true">
        {children}
      </div>
    </div>
  );
}

interface ModalHeaderProps {
  title: string;
  onClose?: () => void;
}

export function ModalHeader({ title, onClose }: ModalHeaderProps) {
  return (
    <div className="modal-header">
      <h2>{title}</h2>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="modal-close-btn"
          aria-label="Close modal"
        >
          <span className="material-icons-round" style={{ fontSize: '20px' }}>close</span>
        </button>
      )}
    </div>
  );
}

interface ModalBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalBody({ children, className = '' }: ModalBodyProps) {
  return (
    <div className={`modal-body ${className}`}>
      {children}
    </div>
  );
}

interface ModalFooterProps {
  children: React.ReactNode;
}

export function ModalFooter({ children }: ModalFooterProps) {
  return (
    <div className="modal-footer">
      {children}
    </div>
  );
}
