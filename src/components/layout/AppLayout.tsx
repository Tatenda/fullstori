"use client";

import React from 'react';
import { GlobalHeader } from './GlobalHeader';
import clsx from 'clsx';

interface AppLayoutProps {
  children: React.ReactNode;
  /**
   * Whether to show the global header
   * @default true
   */
  showHeader?: boolean;
  /**
   * Whether the page has its own header (like DAG pages)
   * If true, adds padding-top to account for fixed header
   * @default false
   */
  hasCustomHeader?: boolean;
  /**
   * Additional className for the main content area
   */
  className?: string;
  /**
   * Action handler for DAGs page (e.g., create new investigation)
   */
  onDAGsPageAction?: () => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  showHeader = true,
  hasCustomHeader = false,
  className,
  onDAGsPageAction,
}) => {
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {showHeader && <GlobalHeader onDAGsPageAction={onDAGsPageAction} />}
      <main
        className={clsx(
          "flex-1 w-full",
          showHeader && !hasCustomHeader && "pt-16 md:pt-20",
          className
        )}
      >
        {children}
      </main>
    </div>
  );
};
