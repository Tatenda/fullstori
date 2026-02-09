import React from 'react';
import clsx from 'clsx';

interface PageContainerProps {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl' | 'full';
  className?: string;
}

const maxWidthClasses = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  '2xl': 'max-w-screen-2xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full',
};

export const PageContainer: React.FC<PageContainerProps> = ({ 
  children, 
  maxWidth = '7xl',
  className 
}) => {
  return (
    <div className={clsx(
      "min-h-screen bg-background flex flex-col",
      className
    )}>
      <main className={clsx(
        "flex-1 w-full mx-auto px-4 md:px-6 py-6 md:py-8",
        maxWidthClasses[maxWidth]
      )}>
        {children}
      </main>
    </div>
  );
};
