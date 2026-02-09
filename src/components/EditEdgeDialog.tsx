import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Link, ArrowLeftRight } from 'lucide-react';
import clsx from 'clsx';

interface EditEdgeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  edgeLabel: string;
  onSave: (newLabel: string, relationshipTypeId?: string) => void;
  onDelete: () => void;
  onReverse?: () => void;
}

const EditEdgeDialog: React.FC<EditEdgeDialogProps> = ({ isOpen, onClose, edgeLabel, onSave, onDelete, onReverse }) => {
  const [label, setLabel] = useState(edgeLabel);
  const [relationshipTypeId, setRelationshipTypeId] = useState<string>('');
  const [relationshipsByCategory, setRelationshipsByCategory] = useState<Record<string, Array<{ id: string; name: string }>>>({});
  const [isLoadingRelationships, setIsLoadingRelationships] = useState(true);
  const [isCustomRelationship, setIsCustomRelationship] = useState(true);

  // Fetch relationships
  useEffect(() => {
    async function fetchRelationships() {
      try {
        const res = await fetch('/api/relationships');
        if (res.ok) {
           const data = await res.json();
           // Convert to new format if needed (backward compatibility)
           const converted: Record<string, Array<{ id: string; name: string }>> = {};
           Object.entries(data.relationshipsByCategory || {}).forEach(([category, rels]) => {
             converted[category] = Array.isArray(rels) && rels.length > 0 && typeof rels[0] === 'object' && 'id' in rels[0]
               ? rels as Array<{ id: string; name: string }>
               : (rels as string[]).map(name => ({ id: '', name })); // Fallback for old format
           });
           setRelationshipsByCategory(converted);
        }
      } catch (error) {
        console.error('Failed to fetch relationships:', error);
      } finally {
        setIsLoadingRelationships(false);
      }
    }
    if (isOpen) {
        fetchRelationships();
    }
  }, [isOpen]);

  useEffect(() => {
    setLabel(edgeLabel);
    // If the existing label is not in the list, set custom logic? 
    // For simplicity, default to custom mode if editing, or check if it exists in list.
    // Let's default to Custom mode for editing (showing existing text), but user can switch to list.
    setIsCustomRelationship(true);
  }, [edgeLabel, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If custom relationship, save it to the database
    if (isCustomRelationship && label.trim()) {
      try {
        // Determine category based on relationship content (simple heuristic)
        let relationshipCategory = 'General';
        const relLower = label.toLowerCase();
        if (relLower.includes('payment') || relLower.includes('tender') || relLower.includes('contract') || relLower.includes('financial') || relLower.includes('money')) {
          relationshipCategory = 'Financial';
        } else if (relLower.includes('testified') || relLower.includes('witness') || relLower.includes('statement')) {
          relationshipCategory = 'Legal';
        } else if (relLower.includes('meeting') || relLower.includes('discussion') || relLower.includes('conversation')) {
          relationshipCategory = 'Personal';
        } else if (relLower.includes('report') || relLower.includes('document') || relLower.includes('evidence')) {
          relationshipCategory = 'Documentary';
        }

        const createRelRes = await fetch('/api/relationships', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: label.trim(),
            category: relationshipCategory
          })
        });

        if (createRelRes.ok) {
          const newRel = await createRelRes.json();
          setRelationshipTypeId(newRel.relationship.id);
          console.log('✅ Created custom relationship:', newRel.relationship.name, 'with ID:', newRel.relationship.id);
        }
      } catch (error) {
        console.error('Error saving custom relationship:', error);
        // Non-critical - relationship will still be used as custom (no ID)
      }
    }
    
    onSave(label.trim(), relationshipTypeId || undefined);
    onClose();
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to remove this connection?')) {
      onDelete();
      onClose();
    }
  };

  const handleRelationshipSelection = (relIdOrCustom: string) => {
    if (relIdOrCustom === 'custom') {
      setIsCustomRelationship(true);
      setLabel('');
      setRelationshipTypeId('');
    } else {
      setIsCustomRelationship(false);
      // Find the relationship by ID to get its name
      let relName = '';
      for (const category of Object.values(relationshipsByCategory)) {
        const rel = category.find(r => r.id === relIdOrCustom);
        if (rel) {
          relName = rel.name;
          break;
        }
      }
      setLabel(relName);
      setRelationshipTypeId(relIdOrCustom);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
            <div>
                <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                    <Link size={20} className="text-zinc-400"/>
                    Edit Connection
                </h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full text-zinc-400 hover:text-zinc-600 transition-colors">
                <X size={20} />
            </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Relationship Label</label>
                {!isCustomRelationship ? (
                    <select
                        required
                        value={label}
                        onChange={(e) => handleRelationshipSelection(e.target.value)}
                        className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                    >
                        <option value="">Select relationship...</option>
                        {Object.entries(relationshipsByCategory).length > 0 ? (
                            Object.entries(relationshipsByCategory).map(([group, rels]) => (
                                <optgroup key={group} label={group}>
                                    {rels.map(rel => (
                                        <option key={rel.id || rel.name} value={rel.id || rel.name}>{rel.name}</option>
                                    ))}
                                </optgroup>
                            ))
                        ) : (
                             <option disabled>Loading relationships...</option>
                        )}
                        <option value="custom">✏️ Custom...</option>
                    </select>
                ) : (
                    <div className="relative">
                        <input 
                            required
                            type="text" 
                            value={label}
                            onChange={e => setLabel(e.target.value)}
                            placeholder="Type custom relationship..."
                            className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                            autoFocus
                        />
                         <button
                            type="button"
                            onClick={() => setIsCustomRelationship(false)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-indigo-600 hover:text-indigo-700 font-bold"
                        >
                            Choose from list
                        </button>
                    </div>
                )}
            </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50/50 flex justify-between gap-3">
            <div className="flex gap-2">
                <button 
                    type="button"
                    onClick={handleDelete}
                    className="px-4 py-2.5 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all flex items-center gap-2"
                >
                    <Trash2 size={16} />
                    Delete
                </button>
                {onReverse && (
                    <button 
                        type="button"
                        onClick={onReverse}
                        className="px-4 py-2.5 rounded-xl text-sm font-bold text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-all flex items-center gap-2"
                        title="Reverse the direction of this relationship"
                    >
                        <ArrowLeftRight size={16} />
                        Reverse
                    </button>
                )}
            </div>
            
            <div className="flex gap-2">
                <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-bold text-zinc-500 hover:bg-zinc-200/50 transition-colors">
                    Cancel
                </button>
                <button 
                    onClick={handleSubmit} 
                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2"
                >
                    <Save size={16} />
                    Save
                </button>
            </div>
        </div>

      </div>
    </div>
  );
};

export default EditEdgeDialog;
