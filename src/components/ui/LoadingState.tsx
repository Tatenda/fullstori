import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: { icon: 20, text: 'text-sm' },
  md: { icon: 32, text: 'text-base' },
  lg: { icon: 48, text: 'text-lg' },
};

export const LoadingState: React.FC<LoadingStateProps> = ({ 
  message = 'Loading...', 
  size = 'md',
  className 
}) => {
  const sizes = sizeClasses[size];
  
  return (
    <div className={`flex flex-col items-center justify-center py-12 md:py-20 ${className || ''}`}>
      <Loader2 size={sizes.icon} className="animate-spin text-primary mb-4" />
      <p className={`text-muted-foreground ${sizes.text}`}>{message}</p>
    </div>
  );
};
