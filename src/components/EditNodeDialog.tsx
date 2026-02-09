import { getRoleCategory, getRoleStyle } from '@/lib/roleUtils';
import { RoleCategory } from '@/lib/types';
import clsx from 'clsx';
import { Pencil, Save, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface IncomingEdgeInfo {
  id: string;
  sourceLabel: string;
  label: string;
}

interface EditNodeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EditedNodeData) => void;
  nodeData: {
    id: string;
    label: string;
    role: string;
    roleId?: string; // Optional because legacy nodes might not have it yet
    description?: string;
  };
  incomingEdges: IncomingEdgeInfo[];
  initialCategory?: RoleCategory;
}

export interface EditedNodeData {
  id: string;
  name: string;
  role: string;
  roleId: string; // Add roleId
  category: RoleCategory;
  description: string;
  updatedEdges: { id: string; label: string }[];
}

const categories: RoleCategory[] = ['official', 'law_enforcement', 'political', 'business', 'witness', 'suspect', 'victim', 'civilian'];


const EditNodeDialog: React.FC<EditNodeDialogProps> = ({ isOpen, onClose, onSubmit, nodeData, incomingEdges, initialCategory }) => {
  const [name, setName] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState(''); // Store roleId
  const [isCustomRole, setIsCustomRole] = useState(false);
  const [category, setCategory] = useState<RoleCategory>('civilian');
  const [description, setDescription] = useState('');
  
  // State for edge labels: { edgeId: newLabel }
  const [edgeLabels, setEdgeLabels] = useState<Record<string, string>>({});
  
  // API Data
  const [rolesByCategory, setRolesByCategory] = useState<Record<string, {id: string, name: string}[]>>({}); // Store full objects
  const [isLoading, setIsLoading] = useState(true);

  // Fetch roles
  useEffect(() => {
    async function fetchRoles() {
        try {
            const res = await fetch('/api/roles');
            if (res.ok) {
                const data = await res.json();
                // Store full role objects: { "official": [{id, name, category}, ...] }
                const apiData = data.rolesByCategory as Record<string, {id: string, name: string}[]>;
                setRolesByCategory(apiData);
            }
        } catch (e) {
            console.error("Failed to fetch roles", e);
        } finally {
            setIsLoading(false);
        }
    }
    fetchRoles();
  }, []);

  // Pre-fill form when dialog opens
  useEffect(() => {
    if (isOpen && nodeData) {
      setName(nodeData.label);
      setRoleTitle(nodeData.role);
      // We don't have roleId in nodeData prop explicitly defined in the interface above line 28, 
      // but it should be passed. We need to update the prop interface too if it's missing.
      // Checking prop interface... it is missing in line 18.
      // Assuming it's passed in `nodeData` even if not typed, or we need to find it by name if missing?
      // Actually, looking at MadlangaNetwork, it passes:
      // nodeData={{ id, label, role: data.role, description }}
      // It DOES NOT pass roleId! We need to fix that in MadlangaNetwork too.
      // For now, let's look up the ID if we can, or rely on the parent to pass it.
      // Better to fix parent to pass it.
      
      setDescription(nodeData.description || '');
      
      // ... (category logic)
      if (initialCategory) {
        if (initialCategory === 'civilian') {
            const suggested = getRoleCategory(nodeData.role);
            setCategory(suggested);
        } else {
            setCategory(initialCategory);
        }
      } else {
        setCategory(getRoleCategory(nodeData.role));
      }
      
      // We'll set isCustomRole to true initially, but if we find the role in our list later, we can switch?
      // Actually, better to just let it be custom unless we match an ID.
      setIsCustomRole(true); 
      
      // ... (edges logic)
      const initialEdges: Record<string, string> = {};
      incomingEdges.forEach(edge => {
        initialEdges[edge.id] = edge.label;
      });
      setEdgeLabels(initialEdges);
    }
  }, [isOpen, nodeData, incomingEdges, initialCategory]);

  // When roles are loaded and we have initial data, try to find the matching roleId
  useEffect(() => {
    if (isOpen && nodeData && !isLoading && Object.keys(rolesByCategory).length > 0) {
        let foundId = '';
        
        // Priority 1: Use explicit roleId from node data
        if (nodeData.roleId) {
            foundId = nodeData.roleId;
        } 
        // Priority 2: Find role by name if we don't have ID (legacy support / fallback)
        else {
            Object.entries(rolesByCategory).forEach(([cat, roles]) => {
                const match = roles.find(r => r.name === nodeData.role);
                if (match) {
                    foundId = match.id;
                }
            });
        }

        if (foundId) {
            setSelectedRoleId(foundId);
            setIsCustomRole(false);
        } else {
            setIsCustomRole(true);
            setSelectedRoleId('');
        }
    }
  }, [isOpen, nodeData, isLoading, rolesByCategory]); 

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If custom role, create it in the database first
    let finalRoleId = selectedRoleId;
    if (isCustomRole && selectedRoleId.trim()) {
      try {
        const createRoleRes = await fetch('/api/roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: selectedRoleId.trim(),
            category: category
          })
        });

        if (createRoleRes.ok) {
          const newRole = await createRoleRes.json();
          finalRoleId = newRole.id;
          console.log('✅ Created custom role:', newRole.name, 'with ID:', finalRoleId);
        } else {
          const error = await createRoleRes.json();
          toast.error(`Failed to create custom role: ${error.error || 'Unknown error'}`);
          return;
        }
      } catch (error) {
        console.error('Error creating custom role:', error);
        toast.error('Failed to create custom role. Please try again.');
        return;
      }
    }
    
    // Convert edge map to array
    const updatedEdges = Object.entries(edgeLabels).map(([id, label]) => ({ id, label }));

    onSubmit({
        id: nodeData.id,
        name,
        role: roleTitle || category, // Role name
        roleId: finalRoleId, // Use the created role ID (or existing role ID)
        category,
        description,
        updatedEdges
    });
    onClose();
  };

  const handleCategoryChange = (cat: RoleCategory) => {
    setCategory(cat);
    setRoleTitle('');
    setSelectedRoleId('');
    setIsCustomRole(false);
  };

  const handleRoleSelection = (id: string) => {
      if (id === 'custom') {
          setIsCustomRole(true);
          setSelectedRoleId('');
          setRoleTitle('');
      } else {
          setIsCustomRole(false);
          setSelectedRoleId(id);
          // Find name
          const roles = rolesByCategory[category] || [];
          const role = roles.find(r => r.id === id);
          if (role) {
              setRoleTitle(role.name);
          }
      }
  };
  
  const handleEdgeLabelChange = (id: string, value: string) => {
    setEdgeLabels(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const currentRoleSuggestions = rolesByCategory[category] || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
            <div>
                <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                    <Pencil size={20} className="text-indigo-600"/>
                    Edit Node Details
                </h2>
                <p className="text-xs text-zinc-500">Update information for <span className="font-bold text-indigo-600">{nodeData.label}</span></p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full text-zinc-400 hover:text-zinc-600 transition-colors">
                <X size={20} />
            </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
            
            {/* Name */}
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Name / Entity</label>
                <input 
                    required
                    type="text" 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Dudley Myburgh"
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                />
            </div>

            {/* Category Selection */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Category</label>
                <div className="grid grid-cols-2 gap-2">
                    {categories.map(cat => {
                        const style = getRoleStyle(cat);
                        const isSelected = category === cat;
                        return (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => handleCategoryChange(cat)}
                                className={clsx(
                                    "px-3 py-2 rounded-lg text-xs font-bold border transition-all text-left",
                                    isSelected 
                                        ? clsx(style.bg, style.text, style.border, "ring-1", style.ring) 
                                        : "bg-white border-zinc-100 text-zinc-500 hover:bg-zinc-50"
                                )}
                            >
                                {cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ')}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Role Title - Hybrid Dropdown */}
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Role Title</label>
                {!isCustomRole ? (
                    <select
                        value={selectedRoleId}
                        onChange={(e) => handleRoleSelection(e.target.value)}
                        className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                    >
                        <option value="">Select a role...</option>
                        {currentRoleSuggestions.map(role => (
                            <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                        <option value="custom">✏️ Custom...</option>
                    </select>
                ) : (
                    <div className="relative">
                        <input 
                            type="text" 
                            value={roleTitle}
                            onChange={e => setRoleTitle(e.target.value)}
                            placeholder="Type custom role..."
                            className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                            autoFocus
                        />
                        <button
                            type="button"
                            onClick={() => setIsCustomRole(false)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-indigo-600 hover:text-indigo-700 font-bold"
                        >
                            Back to list
                        </button>
                    </div>
                )}
            </div>

            {/* Relationships Section */}
            {incomingEdges.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-zinc-100">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide flex items-center gap-1">
                  Relationships (Parents)
                </label>
                <div className="bg-zinc-50 rounded-xl p-3 space-y-3 border border-zinc-200">
                  {incomingEdges.map(edge => (
                    <div key={edge.id} className="text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-zinc-700">{edge.sourceLabel}</span>
                        <span className="text-zinc-400 text-xs">connected via</span>
                      </div>
                      <input 
                          type="text" 
                          value={edgeLabels[edge.id] || ''}
                          onChange={e => handleEdgeLabelChange(edge.id, e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-zinc-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-xs font-medium"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Description</label>
                <textarea 
                    rows={3}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Brief context..."
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
                />
            </div>

        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50/50 flex justify-end gap-3">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-zinc-500 hover:bg-zinc-200/50 transition-colors">Cancel</button>
            <button 
                onClick={handleSubmit} 
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2"
            >
                <Save size={16} />
                Save Changes
            </button>
        </div>

      </div>
    </div>
  );
};

export default EditNodeDialog;
