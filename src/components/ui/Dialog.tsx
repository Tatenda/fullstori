import React from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'md',
  className,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className={clsx(
          "bg-background rounded-2xl shadow-2xl w-full border border-border flex flex-col max-h-[90vh] overflow-hidden",
          maxWidthClasses[maxWidth],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground smooth-transition"
            title="Close (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-border bg-muted/20">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
