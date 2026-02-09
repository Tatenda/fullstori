import React from 'react';
import clsx from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4 md:p-5',
  lg: 'p-6 md:p-8',
};

export const Card: React.FC<CardProps> = ({ 
  children, 
  className,
  hover = false,
  onClick,
  padding = 'md'
}) => {
  return (
    <div
      onClick={onClick}
      className={clsx(
        "bg-background border border-border rounded-xl shadow-sm",
        paddingClasses[padding],
        hover && "hover:shadow-lg smooth-transition cursor-pointer",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
};
