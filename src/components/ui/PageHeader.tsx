import React from 'react';
import { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ 
  title, 
  subtitle, 
  icon: Icon, 
  action,
  className 
}) => {
  return (
    <header className={clsx(
      "glass-effect border-b border-border px-4 md:px-6 py-4 md:py-5",
      className
    )}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 md:gap-4">
          {Icon && (
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon size={20} className="text-primary" />
            </div>
          )}
          <div>
            <h1 className="text-heading text-foreground leading-none">
              {title}
            </h1>
            {subtitle && (
              <p className="text-label mt-1.5">{subtitle}</p>
            )}
          </div>
        </div>
        {action && (
          <div className="shrink-0">
            {action}
          </div>
        )}
      </div>
    </header>
  );
};
