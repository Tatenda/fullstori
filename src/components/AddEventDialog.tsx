import { createEntity } from '@/lib/api';
import { EventType, NetworkNode, RoleCategory } from '@/lib/types';
import { ArrowLeft, ArrowRight, Calendar, ChevronDown, Save, UserPlus, Users, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface EventFormData {
  title: string;
  description?: string;
  date: string;
  eventTypeId?: string;
  customTypeName?: string;
  sourceNodeId?: string;
  targetNodeId?: string;
  participantNodeIds?: string[];
  createEdge?: boolean;
  dagId: string;
}

interface AddEventDialogProps {
  isOpen: boolean; 
  onClose: () => void;
  onSubmit: (data: EventFormData) => Promise<void>;
  currentNodeId?: string | null; // The node we are adding an event FROM (optional)
  allNodes: NetworkNode[]; // All nodes in the DAG for selection
  dagId: string;
  onCreateNode?: (entityId: string, relatedNodeIds?: string[]) => Promise<NetworkNode | null>; // Optional function to create nodes from entities
  allowTargetNode?: boolean; // If false, hide target node selection (for timeline view)
}

const AddEventDialog: React.FC<AddEventDialogProps> = ({ isOpen, onClose, onSubmit, currentNodeId, allNodes, dagId, onCreateNode, allowTargetNode = true }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedEventTypeId, setSelectedEventTypeId] = useState('');
  const [isCustomType, setIsCustomType] = useState(false);
  const [customTypeName, setCustomTypeName] = useState('');
  
  // Node selection
  const [sourceNodeId, setSourceNodeId] = useState<string>(currentNodeId || '');
  const [targetNodeId, setTargetNodeId] = useState<string>('');
  const [participantNodeIds, setParticipantNodeIds] = useState<string[]>([]);
  
  // New target node creation
  const [isCreatingNewTarget, setIsCreatingNewTarget] = useState(false);
  const [newTargetName, setNewTargetName] = useState('');
  const [newTargetRoleId, setNewTargetRoleId] = useState('');
  const [newTargetEntityType, setNewTargetEntityType] = useState<"human" | "company" | "organization">("human");
  const [newTargetDescription, setNewTargetDescription] = useState('');
  const [rolesByCategory, setRolesByCategory] = useState<Record<string, Array<{ id: string; name: string; category: RoleCategory }>>>({});
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nodeSearchQuery, setNodeSearchQuery] = useState('');

  useEffect(() => {
    async function fetchEventTypes() {
      try {
        const res = await fetch('/api/event-types');
        if (res.ok) {
            const data = await res.json();
            setEventTypes(data.eventTypes);
            if (data.eventTypes.length > 0) {
                // Default to first or "Other"
                setSelectedEventTypeId(data.eventTypes[0].id);
            }
        }
      } catch (e) {
        console.error("Failed to load event types", e);
      } finally {
        setIsLoadingTypes(false);
      }
    }
    if (isOpen) {
        fetchEventTypes();
    }
  }, [isOpen]);

  // Fetch roles when creating new target node
  useEffect(() => {
    async function fetchRoles() {
      if (!isCreatingNewTarget) return;
      setIsLoadingRoles(true);
      try {
        const res = await fetch('/api/roles');
        if (res.ok) {
          const data = await res.json();
          setRolesByCategory(data.rolesByCategory);
          // Set default role (first role from 'civilian' category, or first available)
          const civilianRoles = data.rolesByCategory['civilian'] || [];
          const firstCategory = Object.keys(data.rolesByCategory)[0];
          if (civilianRoles.length > 0) {
            setNewTargetRoleId(civilianRoles[0].id);
          } else if (firstCategory && data.rolesByCategory[firstCategory].length > 0) {
            setNewTargetRoleId(data.rolesByCategory[firstCategory][0].id);
          }
        }
      } catch (e) {
        console.error("Failed to load roles", e);
      } finally {
        setIsLoadingRoles(false);
      }
    }
    fetchRoles();
  }, [isCreatingNewTarget]);

  // Reset logic
  useEffect(() => {
    if (isOpen) {
        setSourceNodeId(currentNodeId || '');
        setTargetNodeId('');
        setParticipantNodeIds([]);
        setTitle('');
        setDescription('');
        setDate(new Date().toISOString().split('T')[0]);
        setIsCustomType(false);
        setCustomTypeName('');
        setNodeSearchQuery('');
        setIsCreatingNewTarget(false);
        setNewTargetName('');
        setNewTargetDescription('');
        setNewTargetEntityType('human');
        if (eventTypes.length > 0) {
            setSelectedEventTypeId(eventTypes[0].id);
        }
    }
  }, [isOpen, currentNodeId, eventTypes]);

  if (!isOpen) return null;

  const handleCreateNewTargetNode = async (): Promise<NetworkNode | null> => {
    // Validation
    if (!newTargetName.trim()) {
      toast.error("Please enter a name for the target node");
      return null;
    }
    
    if (!newTargetRoleId) {
      toast.error("Please select a role for the target node");
      return null;
    }

    if (!onCreateNode) {
      toast.error("Cannot create node: createNode function not available");
      return null;
    }

    try {
      // Create entity
      const newEntity = await createEntity({
        name: newTargetName.trim(),
        roleId: newTargetRoleId,
        entityType: newTargetEntityType,
        description: newTargetDescription.trim() || undefined,
      });

      // Create node from entity
      const relatedNodeIds = sourceNodeId ? [sourceNodeId] : undefined;
      const newNode = await onCreateNode(newEntity.id, relatedNodeIds);

      if (newNode) {
        // Set the new node as target
        setTargetNodeId(newNode.id);
        setIsCreatingNewTarget(false);
        setNewTargetName('');
        setNewTargetDescription('');
        setNewTargetRoleId('');
        setNewTargetEntityType('human');
        toast.success(`Created node: ${newEntity.name}`);
        return newNode;
      } else {
        toast.error("Failed to create node on graph");
        return null;
      }
    } catch (error) {
      console.error("Failed to create target node:", error);
      toast.error("Failed to create target node. Please try again.");
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!title.trim()) {
      toast.error("Please enter an event title");
      return;
    }
    
    // Validation based on allowTargetNode
    if (allowTargetNode) {
      // Graph view: can have source, target, or participants
      if (!sourceNodeId && !targetNodeId && participantNodeIds.length === 0) {
        toast.error("Please select at least one node for this event");
        return;
      }
    } else {
      // Timeline view: can only have source or participants (no target)
      if (!sourceNodeId && participantNodeIds.length === 0) {
        toast.error("Please select a source node or add participants for this event");
        return;
      }
      // Ensure target is not set when not allowed
      if (targetNodeId || isCreatingNewTarget) {
        toast.error("Timeline events cannot link to a target node. Use source node or participants only.");
        return;
      }
    }
    
    if (!isCustomType && !selectedEventTypeId) {
      toast.error("Please select an event type");
      return;
    }
    
    if (isCustomType && !customTypeName.trim()) {
      toast.error("Please enter a custom event type name");
      return;
    }

    // If creating new target, create it first (only if target nodes are allowed)
    let finalTargetNodeId = targetNodeId;
    if (allowTargetNode && isCreatingNewTarget) {
      const newNode = await handleCreateNewTargetNode();
      // If node creation failed, don't submit
      if (!newNode) {
        return;
      }
      // Use the returned node ID directly
      finalTargetNodeId = newNode.id;
    }
    
    setIsSubmitting(true);
    try {
        await onSubmit({
            title: title.trim(),
            description: description.trim() || undefined,
            date,
            eventTypeId: isCustomType ? undefined : selectedEventTypeId,
            customTypeName: isCustomType ? customTypeName.trim() : undefined,
            sourceNodeId: sourceNodeId || undefined,
            targetNodeId: finalTargetNodeId || undefined,
            participantNodeIds: participantNodeIds.length > 0 ? participantNodeIds : undefined,
            createEdge: allowTargetNode && sourceNodeId && finalTargetNodeId ? true : undefined,
            dagId
        });
        onClose();
    } catch (error) {
        console.error("Failed to submit event:", error);
        toast.error("Failed to create event. Please try again.");
    } finally {
        setIsSubmitting(false);
    }
  };

  // Filter nodes based on search
  const filteredNodes = allNodes.filter(node => 
    node.data.label.toLowerCase().includes(nodeSearchQuery.toLowerCase())
  );

  const participantNodes = allNodes.filter(n => participantNodeIds.includes(n.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
            <div>
                <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                    <Calendar size={20} className="text-indigo-600"/>
                    Log New Event
                </h2>
                <p className="text-xs text-zinc-500">
                  {currentNodeId ? (
                    <>Recording event from selected node</>
                  ) : (
                    <>Log new event</>
                  )}
                </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full text-zinc-400 hover:text-zinc-600 transition-colors">
                <X size={20} />
            </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
            
            {/* Title */}
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Event Title</label>
                <input 
                    required
                    type="text" 
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Arrested in Pretoria"
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* Date */}
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Date</label>
                    <input 
                        required
                        type="date" 
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer"
                    />
                </div>


                {/* Event Type */}
                <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Type</label>
                        {!isCustomType && (
                            <button 
                                type="button"
                                onClick={() => {
                                    setIsCustomType(true);
                                    setCustomTypeName('');
                                    setSelectedEventTypeId('');
                                }}
                                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded transition-colors"
                            >
                                + New Type
                            </button>
                        )}
                    </div>
                    <div className="relative">
                        {!isCustomType ? (
                            <>
                                <select
                                    value={selectedEventTypeId}
                                    onChange={e => setSelectedEventTypeId(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer appearance-none"
                                >
                                    {isLoadingTypes && <option>Loading...</option>}
                                    {eventTypes.map(type => (
                                        <option key={type.id} value={type.id}>{type.name}</option>
                                    ))}
                                </select>
                                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                            </>
                        ) : (
                            <div className="relative">
                                <input 
                                    type="text" 
                                    value={customTypeName}
                                    onChange={e => setCustomTypeName(e.target.value)}
                                    placeholder="Enter new event type..."
                                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all pr-20"
                                    autoFocus
                                />
                                <button 
                                    type="button"
                                    onClick={() => {
                                        setIsCustomType(false);
                                        if (eventTypes.length > 0) setSelectedEventTypeId(eventTypes[0].id);
                                    }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-indigo-600 hover:text-indigo-700 px-2 py-1 rounded hover:bg-indigo-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Details</label>
                <textarea 
                    rows={3}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Add context or notes..."
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
                />
            </div>

            {/* Node Relationships */}
            <div className="space-y-4">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide flex items-center gap-1.5">
                    <Users size={14} />
                    Link Nodes
                </label>

                {/* Source Node */}
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                        <ArrowRight size={12} className="text-indigo-600" />
                        From (Source)
                    </label>
                    <select
                        value={sourceNodeId}
                        onChange={(e) => {
                            setSourceNodeId(e.target.value);
                        }}
                        className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer"
                    >
                        <option value="">Select source node...</option>
                        {allNodes.map(node => (
                            <option key={node.id} value={node.id}>
                                {node.data.label} {node.type === 'root' ? '(Root)' : ''}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Target Node - Only show if allowTargetNode is true */}
                {allowTargetNode && (
                    <>
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                                    <ArrowLeft size={12} className="text-red-600" />
                                    To (Target) <span className="text-zinc-400 font-normal">(Optional)</span>
                                </label>
                                {!isCreatingNewTarget && onCreateNode && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsCreatingNewTarget(true);
                                            setTargetNodeId('');
                                        }}
                                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded transition-colors flex items-center gap-1"
                                    >
                                        <UserPlus size={12} />
                                        Create New
                                    </button>
                                )}
                                {isCreatingNewTarget && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsCreatingNewTarget(false);
                                            setNewTargetName('');
                                            setNewTargetDescription('');
                                            setNewTargetRoleId('');
                                        }}
                                        className="text-[10px] font-bold text-zinc-600 hover:text-zinc-700 bg-zinc-50 hover:bg-zinc-100 px-2 py-1 rounded transition-colors"
                                    >
                                        Select Existing
                                    </button>
                                )}
                            </div>
                            
                            {!isCreatingNewTarget ? (
                                <select
                                    value={targetNodeId}
                                    onChange={(e) => {
                                        setTargetNodeId(e.target.value);
                                    }}
                                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer"
                                >
                                    <option value="">Select target node...</option>
                                    {allNodes
                                        .filter(node => node.id !== sourceNodeId)
                                        .map(node => (
                                            <option key={node.id} value={node.id}>
                                                {node.data.label} {node.type === 'root' ? '(Root)' : ''}
                                            </option>
                                        ))}
                                </select>
                            ) : (
                                <div className="space-y-3 p-4 bg-indigo-50/30 border border-indigo-200 rounded-xl">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-zinc-700">Name *</label>
                                        <input
                                            type="text"
                                            value={newTargetName}
                                            onChange={(e) => setNewTargetName(e.target.value)}
                                            placeholder="Enter name..."
                                            className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                            autoFocus
                                        />
                                    </div>
                                    
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-zinc-700">Role *</label>
                                        {isLoadingRoles ? (
                                            <div className="px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-500 text-sm">Loading roles...</div>
                                        ) : (
                                            <select
                                                value={newTargetRoleId}
                                                onChange={(e) => setNewTargetRoleId(e.target.value)}
                                                className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer"
                                            >
                                                <option value="">Select role...</option>
                                                {Object.entries(rolesByCategory).map(([category, roles]) => (
                                                    <optgroup key={category} label={category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ')}>
                                                        {roles.map(role => (
                                                            <option key={role.id} value={role.id}>{role.name}</option>
                                                        ))}
                                                    </optgroup>
                                                ))}
                                            </select>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-zinc-700">Type</label>
                                        <select
                                            value={newTargetEntityType}
                                            onChange={(e) => setNewTargetEntityType(e.target.value as "human" | "company" | "organization")}
                                            className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer"
                                        >
                                            <option value="human">Human</option>
                                            <option value="company">Company</option>
                                            <option value="organization">Organization</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-zinc-700">Description</label>
                                        <textarea
                                            value={newTargetDescription}
                                            onChange={(e) => setNewTargetDescription(e.target.value)}
                                            placeholder="Optional description..."
                                            rows={2}
                                            className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Create Edge Checkbox - Show when both source and target exist, always checked and disabled */}
                        {sourceNodeId && targetNodeId && (
                            <div className="flex items-center gap-2 p-3 bg-indigo-50/50 border border-indigo-200 rounded-xl">
                                <input
                                    type="checkbox"
                                    id="createEdge"
                                    checked={true}
                                    disabled={true}
                                    readOnly
                                    className="w-4 h-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 cursor-not-allowed opacity-75"
                                />
                                <label htmlFor="createEdge" className="text-sm text-zinc-700 cursor-default">
                                    Create edge between source and target nodes
                                </label>
                            </div>
                        )}
                    </>
                )}

                {/* Additional Participants */}
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-700">
                        Additional Participants <span className="text-zinc-400 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            value={nodeSearchQuery}
                            onChange={(e) => setNodeSearchQuery(e.target.value)}
                            placeholder="Search nodes to add as participants..."
                            className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm placeholder:text-zinc-400"
                        />
                        {/* Search Results */}
                        {nodeSearchQuery.length >= 1 && filteredNodes.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-zinc-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                                {filteredNodes
                                    .filter(node => 
                                        node.id !== sourceNodeId && 
                                        node.id !== targetNodeId && 
                                        !participantNodeIds.includes(node.id)
                                    )
                                    .map((node) => (
                                        <button
                                            key={node.id}
                                            type="button"
                                            onClick={() => {
                                                setParticipantNodeIds(prev => [...prev, node.id]);
                                                setNodeSearchQuery('');
                                            }}
                                            className="w-full px-4 py-2.5 text-left hover:bg-zinc-50 transition-colors"
                                        >
                                            <div className="font-semibold text-zinc-900">{node.data.label}</div>
                                            <div className="text-xs text-zinc-500">{node.data.role || 'No role'}</div>
                                        </button>
                                    ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Selected Participants List */}
                {participantNodes.length > 0 && (
                    <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 max-h-32 overflow-y-auto">
                        <div className="text-xs font-semibold text-zinc-700 mb-2">Participants:</div>
                        {participantNodes.map(node => (
                            <div key={node.id} className="flex items-center justify-between p-2 hover:bg-zinc-100 rounded-lg mb-1">
                                <span className="text-sm text-zinc-700 font-medium">{node.data.label}</span>
                                <button
                                    type="button"
                                    onClick={() => setParticipantNodeIds(prev => prev.filter(id => id !== node.id))}
                                    className="text-xs text-red-600 hover:text-red-700"
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50/50 flex justify-end gap-3">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-zinc-500 hover:bg-zinc-200/50 transition-colors">
                Cancel
            </button>
            <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isSubmitting ? (
                    <span>Saving...</span>
                ) : (
                    <>
                        <Save size={16} />
                        Save Event
                    </>
                )}
            </button>
        </div>

      </div>
    </div>
  );
};

export default AddEventDialog;
