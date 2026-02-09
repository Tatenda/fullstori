import React from 'react';
import { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div className={clsx(
      "text-center py-12 md:py-20",
      className
    )}>
      <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-muted rounded-2xl mb-4 md:mb-6">
        <Icon size={32} className="text-muted-foreground" />
      </div>
      <h2 className="text-subheading text-foreground mb-2">{title}</h2>
      <p className="text-body text-muted-foreground mb-6 max-w-md mx-auto">
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold shadow-md hover:shadow-lg smooth-transition"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
