"use client";

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Network, FolderOpen, Menu, X, Plus } from 'lucide-react';
import clsx from 'clsx';
import Link from 'next/link';

interface GlobalHeaderProps {
  className?: string;
  onDAGsPageAction?: () => void;
}

export const GlobalHeader: React.FC<GlobalHeaderProps> = ({ className, onDAGsPageAction }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const isDAGPage = pathname?.startsWith('/dag/');
  const isDAGsPage = pathname === '/dags';

  // Hide global header on DAG pages (they have their own DAGHeader)
  if (isDAGPage) {
    return null;
  }

  return (
    <header 
      className={clsx(
        "fixed top-0 left-0 right-0 z-50 glass-effect border-b border-border/50 shadow-sm",
        "bg-background/95 backdrop-blur-lg",
        className
      )}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Left: Logo/Brand + Page Title (on DAGs page) */}
          <div className="flex items-center gap-4 md:gap-6">
            {/* Logo/Brand */}
            <Link 
              href="/" 
              className="flex items-center gap-3 group smooth-transition shrink-0"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-xl blur-xl group-hover:bg-primary/30 smooth-transition" />
                <div className="relative p-2 bg-primary/10 rounded-xl group-hover:bg-primary/20 smooth-transition">
                  <Network size={24} className="text-primary" />
                </div>
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-foreground leading-none">
                  Madlanga<span className="text-primary">.</span>
                </h1>
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Interactive Network
                </span>
              </div>
            </Link>

          </div>

          {/* Right: Navigation + Actions */}
          <div className="flex items-center gap-3">
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <Link
                href="/"
                className={clsx(
                  "px-4 py-2 rounded-lg text-sm font-semibold smooth-transition",
                  pathname === '/'
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                Home
              </Link>
              <Link
                href="/dags"
                className={clsx(
                  "px-4 py-2 rounded-lg text-sm font-semibold smooth-transition",
                  isDAGsPage
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                Investigations
              </Link>
            </nav>

            {/* Action Button on DAGs Page */}
            {isDAGsPage && onDAGsPageAction && (
              <button
                onClick={onDAGsPageAction}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold shadow-md hover:shadow-lg smooth-transition hover:bg-primary/90"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">New Investigation</span>
                <span className="sm:hidden">New</span>
              </button>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 smooth-transition"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>


        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden pb-4 border-t border-border/50 mt-2 pt-4 animate-in slide-in-from-top-2 duration-200">
            <nav className="flex flex-col gap-1">
              <Link
                href="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className={clsx(
                  "px-4 py-2.5 rounded-lg text-sm font-semibold smooth-transition",
                  pathname === '/'
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                Home
              </Link>
              <Link
                href="/dags"
                onClick={() => setIsMobileMenuOpen(false)}
                className={clsx(
                  "px-4 py-2.5 rounded-lg text-sm font-semibold smooth-transition",
                  isDAGsPage
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                Investigations
              </Link>
              {isDAGsPage && onDAGsPageAction && (
                <button
                  onClick={() => {
                    onDAGsPageAction();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground smooth-transition text-left"
                >
                  <Plus size={16} />
                  <span>New Investigation</span>
                </button>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};
