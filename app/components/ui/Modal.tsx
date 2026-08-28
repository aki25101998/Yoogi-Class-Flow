import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string; // For backward compatibility
  maxWidth?: string; // Allow customizing width
}

export function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }: ModalProps) {
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

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Optional: close on backdrop click (currently disabled to prevent accidental form loss)
    // if (e.target === e.currentTarget) { onClose(); }
  };

  // If title is provided, use the old layout for backward compatibility
  if (title) {
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
        onClick={handleBackdropClick}
      >
        <div 
          className={`bg-surface border border-light rounded-xl shadow-2xl w-full ${maxWidth} flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 max-h-[calc(100vh-32px)]`}
          role="dialog"
          aria-modal="true"
        >
          <ModalHeader title={title} onClose={onClose} />
          <ModalBody>
            {children}
          </ModalBody>
        </div>
      </div>
    );
  }

  // New composite layout
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div 
        className={`bg-surface border border-light rounded-xl shadow-2xl w-full ${maxWidth} flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 max-h-[calc(100vh-32px)]`}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
}

interface ModalHeaderProps {
  title: string;
  onClose?: () => void;
  className?: string;
}

export function ModalHeader({ title, onClose, className = '' }: ModalHeaderProps) {
  return (
    <div className={`flex justify-between items-center p-4 md:p-5 border-b border-border shrink-0 ${className}`}>
      <h2 className="text-lg md:text-xl font-semibold text-main">{title}</h2>
      {onClose && (
        <button 
          type="button"
          onClick={onClose}
          className="text-muted hover:text-main transition-colors p-1.5 rounded-md hover:bg-surface-hover"
          aria-label="Close modal"
        >
          <span className="material-icons-round text-xl">close</span>
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
    <div className={`p-4 md:p-5 overflow-y-auto flex-1 ${className}`}>
      {children}
    </div>
  );
}

interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalFooter({ children, className = '' }: ModalFooterProps) {
  return (
    <div className={`p-4 md:p-5 border-t border-border flex justify-end gap-3 shrink-0 bg-surface ${className}`}>
      {children}
    </div>
  );
}
