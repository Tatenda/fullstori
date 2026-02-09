"use client";

import React from 'react';
import Link from 'next/link';
import { Network, GitBranch, Calendar, FolderOpen, Settings } from 'lucide-react';
import clsx from 'clsx';
import { StatBadge } from './ui/StatBadge';
import { getRoleStyle } from '@/lib/roleUtils';
import { RoleCategory } from '@/lib/types';

interface DAGHeaderProps {
  dagId: string;
  dagName: string;
  stats: {
    nodes: number;
    edges: number;
    events: number;
  };
  currentView: 'graph' | 'timeline';
  onViewChange: (view: 'graph' | 'timeline') => void;
  rootLabels?: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
  onEditRootLabels?: () => void;
  
  // Graph-specific props
  graphProps?: {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    isFilterMenuOpen: boolean;
    onFilterToggle: () => void;
    hiddenCategoriesCount: number;
    hasUnsavedChanges: boolean;
    isSaving: boolean;
    isLoading: boolean;
    autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
    lastSaved: Date | null;
    onSave: () => void;
    filterCategories?: RoleCategory[];
    hiddenCategories?: Set<RoleCategory>;
    onToggleFilter?: (category: RoleCategory | null) => void;
  };
  
  // Timeline-specific props
  timelineProps?: {
    filterType: string;
    onFilterChange: (type: string) => void;
    eventTypes: Array<{ id: string; name: string }>;
  };
}

export const DAGHeader: React.FC<DAGHeaderProps> = ({
  dagId,
  dagName,
  stats,
  currentView,
  onViewChange,
  graphProps,
  timelineProps,
  rootLabels,
  onEditRootLabels,
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border/50 shadow-sm">
      <div className="max-w-[1920px] mx-auto">
        {/* Main Header - Clean & Minimal */}
        <div className="flex items-center justify-between h-16 md:h-18 px-4 md:px-6 gap-4">
          {/* Left: Brand + DAG Name (Compact) */}
          <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
            <Link
              href="/"
              className="flex items-center gap-2 group smooth-transition shrink-0"
              title="Home"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-lg blur-md group-hover:bg-primary/30 smooth-transition" />
                <div className="relative p-1.5 bg-primary/10 rounded-lg group-hover:bg-primary/20 smooth-transition">
                  <Network size={18} className="text-primary" />
                </div>
              </div>
              <span className="hidden lg:block text-sm font-black text-foreground leading-none">
                Madlanga<span className="text-primary">.</span>
              </span>
            </Link>
            
            {/* DAG Name - Clean & Prominent */}
            <div className="flex items-center gap-2 md:gap-3 pl-2 md:pl-4 border-l border-border min-w-0">
              <div className="p-1.5 bg-primary/10 rounded-lg shrink-0">
                <FolderOpen size={16} className="text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base md:text-lg font-bold text-foreground leading-none truncate">
                  {dagName || "Loading..."}
                </h1>
              </div>
            </div>
          </div>

          {/* Center: View Switcher - Minimal Toggle */}
          <div className="flex items-center shrink-0">
            <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-0.5 border border-border/50">
              <button
                onClick={() => onViewChange('graph')}
                className={clsx(
                  "px-3 py-1.5 rounded-md text-xs font-semibold smooth-transition whitespace-nowrap",
                  currentView === 'graph'
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Graph
              </button>
              <button
                onClick={() => onViewChange('timeline')}
                className={clsx(
                  "px-3 py-1.5 rounded-md text-xs font-semibold smooth-transition whitespace-nowrap",
                  currentView === 'timeline'
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Timeline
              </button>
            </div>
          </div>

          {/* Right: Settings Button */}
          <div className="flex items-center gap-2 shrink-0">
            {onEditRootLabels && (
              <button
                onClick={onEditRootLabels}
                className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground smooth-transition"
                title="Customize root node labels"
              >
                <Settings size={18} />
              </button>
            )}
          </div>
        </div>

      </div>
    </header>
  );
};
