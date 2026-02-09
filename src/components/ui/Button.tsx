import React from 'react';
import clsx from 'clsx';
import { LucideIcon } from 'lucide-react';

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  children: React.ReactNode;
}

const variantClasses = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg',
  secondary: 'bg-muted text-muted-foreground hover:bg-muted/80',
  outline: 'bg-background border border-border hover:bg-muted',
  ghost: 'hover:bg-muted text-foreground',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  className,
  children,
  disabled,
  ...props
}) => {
  return (
    <button
      className={clsx(
        "font-semibold rounded-lg smooth-transition inline-flex items-center justify-center gap-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {Icon && iconPosition === 'left' && <Icon size={size === 'sm' ? 14 : size === 'md' ? 16 : 18} />}
      {children}
      {Icon && iconPosition === 'right' && <Icon size={size === 'sm' ? 14 : size === 'md' ? 16 : 18} />}
    </button>
  );
};
