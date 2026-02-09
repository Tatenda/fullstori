"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Network, GitBranch, Calendar, Trash2, ArrowRight, Loader2, FolderOpen, MoreVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { format } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatBadge } from '@/components/ui/StatBadge';

interface DAG {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    nodes: number;
    edges: number;
    events: number;
  };
}

export default function DAGsPage() {
  const router = useRouter();
  const [dags, setDags] = useState<DAG[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleteConfirm, setIsDeleteConfirm] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newDAGName, setNewDAGName] = useState('');
  const [newDAGDescription, setNewDAGDescription] = useState('');
  const [hoveredDAG, setHoveredDAG] = useState<string | null>(null);

  useEffect(() => {
    loadDAGs();
  }, []);

  const loadDAGs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/dags');
      if (res.ok) {
        const data = await res.json();
        console.log('Loaded DAGs from API:', data); // Debug log
        const dagList = Array.isArray(data.dags) ? data.dags : [];
        console.log('Setting DAGs state:', dagList); // Debug log
        setDags(dagList);
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error('Failed to load DAGs:', res.status, errorData);
        toast.error(`Failed to load investigations: ${errorData.error || res.statusText}`);
        setDags([]);
      }
    } catch (error) {
      console.error('Failed to load DAGs:', error);
      toast.error('Failed to load investigations');
      setDags([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDAG = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDAGName.trim()) {
      toast.error('Please enter a name for the investigation');
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch('/api/dags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newDAGName.trim(),
          description: newDAGDescription.trim() || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Created "${data.dag.name}"`);
        setIsCreateDialogOpen(false);
        setNewDAGName('');
        setNewDAGDescription('');
        await loadDAGs();
        router.push(`/dag/${data.dag.id}`);
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to create investigation');
      }
    } catch (error) {
      console.error('Failed to create DAG:', error);
      toast.error('Failed to create investigation');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteDAG = async (id: string) => {
    try {
      const res = await fetch(`/api/dags/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Investigation deleted');
        setIsDeleteConfirm(null);
        await loadDAGs();
      } else {
        toast.error('Failed to delete investigation');
      }
    } catch (error) {
      console.error('Failed to delete DAG:', error);
      toast.error('Failed to delete investigation');
    }
  };

  return (
    <AppLayout onDAGsPageAction={() => setIsCreateDialogOpen(true)}>
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="mt-6">
        {isLoading ? (
          <LoadingState message="Loading investigations..." />
        ) : !dags || dags.length === 0 ? (
          <EmptyState
            icon={Network}
            title="No investigations yet"
            description="Create your first investigation network to start mapping relationships and tracking events"
            action={{
              label: 'Create First Investigation',
              onClick: () => setIsCreateDialogOpen(true),
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {dags.map((dag) => (
              <Card
                key={dag.id}
                hover
                onClick={() => router.push(`/dag/${dag.id}`)}
                onMouseEnter={() => setHoveredDAG(dag.id)}
                onMouseLeave={() => setHoveredDAG(null)}
                className="group relative"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-foreground group-hover:text-primary smooth-transition truncate mb-1">
                      {dag.name}
                    </h3>
                    {dag.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {dag.description}
                      </p>
                    )}
                  </div>
                  
                  {/* Actions - Show on hover */}
                  <div className={clsx(
                    "flex items-center gap-1 ml-2 smooth-transition",
                    hoveredDAG === dag.id ? "opacity-100" : "opacity-0"
                  )}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dag/${dag.id}`);
                      }}
                      className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground smooth-transition"
                      title="Open"
                    >
                      <ArrowRight size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsDeleteConfirm(dag.id);
                      }}
                      className="p-1.5 hover:bg-destructive/10 rounded-lg text-destructive smooth-transition"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <StatBadge icon={Network} value={dag._count.nodes} label="nodes" />
                  <StatBadge icon={GitBranch} value={dag._count.edges} label="edges" />
                  {dag._count.events > 0 && (
                    <StatBadge icon={Calendar} value={dag._count.events} label="events" />
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-4 border-t border-border">
                  <Calendar size={12} />
                  <span>Updated {format(new Date(dag.updatedAt), 'MMM d, yyyy')}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create DAG Dialog */}
      <Dialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        title="Create New Investigation"
        subtitle="Start a new investigation network"
        maxWidth="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              type="button"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                const form = document.getElementById('create-dag-form') as HTMLFormElement;
                if (form) {
                  form.requestSubmit();
                }
              }}
              disabled={isCreating}
              icon={isCreating ? Loader2 : undefined}
              type="button"
            >
              {isCreating ? 'Creating...' : 'Create'}
            </Button>
          </div>
        }
      >
        <form id="create-dag-form" onSubmit={handleCreateDAG} className="space-y-4">
          <div>
            <label className="text-label mb-2 block">Investigation Name</label>
            <input
              type="text"
              value={newDAGName}
              onChange={(e) => setNewDAGName(e.target.value)}
              placeholder="e.g. State Capture Inquiry"
              className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none smooth-transition placeholder:text-muted-foreground"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="text-label mb-2 block">Description (optional)</label>
            <textarea
              value={newDAGDescription}
              onChange={(e) => setNewDAGDescription(e.target.value)}
              placeholder="Brief description of this investigation..."
              rows={3}
              className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none smooth-transition resize-none placeholder:text-muted-foreground"
            />
          </div>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        isOpen={!!isDeleteConfirm}
        onClose={() => setIsDeleteConfirm(null)}
        title="Delete Investigation?"
        subtitle="This action cannot be undone"
        maxWidth="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setIsDeleteConfirm(null)}
              type="button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => isDeleteConfirm && handleDeleteDAG(isDeleteConfirm)}
              type="button"
            >
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-body text-muted-foreground">
          This will permanently delete the investigation and all its data including nodes, edges, and events. This action cannot be undone.
        </p>
      </Dialog>
      </div>
    </AppLayout>
  );
}
