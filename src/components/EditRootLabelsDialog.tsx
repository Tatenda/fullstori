"use client";

import React, { useState, useEffect } from 'react';
import { X, Save, Settings } from 'lucide-react';
import toast from 'react-hot-toast';

interface EditRootLabelsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  dagId: string;
  dagName: string; // DAG name to display
  currentLabels: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
  onUpdate: () => void; // Callback to refresh the DAG data
}

export const EditRootLabelsDialog: React.FC<EditRootLabelsDialogProps> = ({
  isOpen,
  onClose,
  dagId,
  dagName,
  currentLabels,
  onUpdate,
}) => {
  const [labels, setLabels] = useState({
    top: currentLabels.top || '',
    bottom: currentLabels.bottom || '',
    left: currentLabels.left || '',
    right: currentLabels.right || '',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Update local state when currentLabels change or dialog opens
  useEffect(() => {
    if (isOpen) {
      setLabels({
        top: currentLabels.top || '',
        bottom: currentLabels.bottom || '',
        left: currentLabels.left || '',
        right: currentLabels.right || '',
      });
    }
  }, [currentLabels, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const res = await fetch(`/api/dag/${dagId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rootLabelTop: labels.top.trim() || null,
          rootLabelBottom: labels.bottom.trim() || null,
          rootLabelLeft: labels.left.trim() || null,
          rootLabelRight: labels.right.trim() || null,
        }),
      });

      if (res.ok) {
        toast.success('Root labels updated successfully');
        onUpdate(); // Refresh DAG data
        onClose();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to update root labels');
      }
    } catch (error) {
      console.error('Error updating root labels:', error);
      toast.error('Failed to update root labels. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Settings size={20} className="text-indigo-600" />
              <h2 className="text-lg font-bold text-zinc-900">Customize Root Node Labels</h2>
            </div>
            <p className="text-xs text-zinc-500 ml-7">
              Editing labels for <span className="font-semibold text-indigo-600">{dagName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 rounded-full text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-zinc-600 mb-4">
            Customize the labels shown on the root node's connection buttons. Leave empty to use default "Connect" label.
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide mb-1.5 block">
                Top Direction
              </label>
              <input
                type="text"
                value={labels.top}
                onChange={(e) => setLabels({ ...labels, top: e.target.value })}
                placeholder="Connect (default)"
                className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide mb-1.5 block">
                Bottom Direction
              </label>
              <input
                type="text"
                value={labels.bottom}
                onChange={(e) => setLabels({ ...labels, bottom: e.target.value })}
                placeholder="Connect (default)"
                className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide mb-1.5 block">
                Left Direction
              </label>
              <input
                type="text"
                value={labels.left}
                onChange={(e) => setLabels({ ...labels, left: e.target.value })}
                placeholder="Connect (default)"
                className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide mb-1.5 block">
                Right Direction
              </label>
              <input
                type="text"
                value={labels.right}
                onChange={(e) => setLabels({ ...labels, right: e.target.value })}
                placeholder="Connect (default)"
                className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-zinc-500 hover:bg-zinc-200/50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <span>Saving...</span>
            ) : (
              <>
                <Save size={16} />
                Save Labels
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
