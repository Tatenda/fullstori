import React from 'react';
import { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

interface StatBadgeProps {
  icon: LucideIcon;
  value: number | string;
  label: string;
  className?: string;
}

export const StatBadge: React.FC<StatBadgeProps> = ({
  icon: Icon,
  value,
  label,
  className,
}) => {
  return (
    <div className={clsx(
      "flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg",
      className
    )}>
      <Icon size={14} className="text-muted-foreground" />
      <span className="text-sm font-semibold text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
};
