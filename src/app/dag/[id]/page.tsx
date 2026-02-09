"use client";

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import MadlangaNetwork from '@/components/MadlangaNetwork';
import TimelineView from '@/components/TimelineView';

export default function DAGPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dagId = params?.id as string;
  
  // Get initial view from URL or default to 'graph'
  const initialView = searchParams.get('view') || 'graph';
  const [currentView, setCurrentView] = useState<'graph' | 'timeline'>(initialView as 'graph' | 'timeline');

  // Update view when URL changes
  useEffect(() => {
    const view = searchParams.get('view') || 'graph';
    // Use setTimeout to avoid synchronous setState in effect
    setTimeout(() => {
      setCurrentView(view as 'graph' | 'timeline');
    }, 0);
  }, [searchParams]);

  // Handle view change - update URL without navigation
  const handleViewChange = (view: 'graph' | 'timeline') => {
    setCurrentView(view);
    const newUrl = view === 'graph' 
      ? `/dag/${dagId}`
      : `/dag/${dagId}?view=timeline`;
    router.replace(newUrl, { scroll: false });
  };

  if (!dagId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Invalid DAG ID</p>
      </div>
    );
  }

  return (
    <>
      {currentView === 'graph' ? (
        <MadlangaNetwork dagId={dagId} onViewChange={handleViewChange} />
      ) : (
        <TimelineView dagId={dagId} onViewChange={handleViewChange} />
      )}
    </>
  );
}
