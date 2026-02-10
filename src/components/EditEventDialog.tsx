import { type Event, type EventType, type NetworkNode } from '@/lib/types';
import { ArrowLeft, ArrowRight, Calendar, ChevronDown, Save, Trash2, Users, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface UpdateEventData {
  title: string;
  description?: string;
  date?: string;
  seriesDay?: number;
  tagIds?: string[];
  sourceDagId?: string;
  eventTypeId?: string;
  customTypeName?: string;
  sourceNodeId?: string;
  targetNodeId?: string;
  participantNodeIds?: string[];
  createEdge?: boolean;
}

interface EditEventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (eventId: string, data: UpdateEventData) => Promise<void>;
  onDelete?: (eventId: string) => Promise<void>;
  event: Event | null;
  allNodes: NetworkNode[];
  dagId: string;
}

const EditEventDialog: React.FC<EditEventDialogProps> = ({ 
  isOpen, 
  onClose, 
  onUpdate, 
  onDelete,
  event, 
  allNodes, 
  dagId: _dagId 
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [seriesDay, setSeriesDay] = useState<number | ''>('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [sourceDagId, setSourceDagId] = useState<string>('');
  const [selectedEventTypeId, setSelectedEventTypeId] = useState('');
  const [isCustomType, setIsCustomType] = useState(false);
  const [customTypeName, setCustomTypeName] = useState('');
  
  // Node selection
  const [sourceNodeId, setSourceNodeId] = useState<string>('');
  const [targetNodeId, setTargetNodeId] = useState<string>('');
  const [participantNodeIds, setParticipantNodeIds] = useState<string[]>([]);
  const [createEdge, setCreateEdge] = useState(false);
  
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [nodeSearchQuery, setNodeSearchQuery] = useState('');
  const [tags, setTags] = useState<Array<{ id: string; name: string; color: string | null }>>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [dags, setDags] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoadingDags, setIsLoadingDags] = useState(false);
  
  // Filter nodes based on search
  const filteredNodes = allNodes.filter((node: NetworkNode) => 
    node.data.label.toLowerCase().includes(nodeSearchQuery.toLowerCase())
  );

  const participantNodes = allNodes.filter((n: NetworkNode) => participantNodeIds.includes(n.id));

  // Load event data when dialog opens
  useEffect(() => {
    if (isOpen && event) {
      setTitle(event.title || '');
      setDescription(event.description || '');
      setDate(event.date ? new Date(event.date).toISOString().split('T')[0] : '');
      setSeriesDay(event.seriesDay || '');
      setSelectedTagIds(event.tags?.map(t => t.id) || []);
      setSourceDagId(event.sourceDagId || '');
      setSelectedEventTypeId(event.eventType?.id || '');
      setIsCustomType(false);
      setCustomTypeName('');
      setSourceNodeId(event.sourceNodeId || '');
      setTargetNodeId(event.targetNodeId || '');
      setParticipantNodeIds(event.participantNodes?.map(n => n.id) || []);
      setCreateEdge(false); // Don't auto-create edge on edit
      setNodeSearchQuery('');
    }
  }, [isOpen, event]);

  useEffect(() => {
    async function fetchEventTypes() {
      try {
        const res = await fetch('/api/event-types');
        if (res.ok) {
            const data = await res.json();
            setEventTypes(data.eventTypes);
        }
      } catch (e) {
        console.error("Failed to load event types", e);
      } finally {
        setIsLoadingTypes(false);
      }
    }
    async function fetchTags() {
      setIsLoadingTags(true);
      try {
        const res = await fetch('/api/tags');
        if (res.ok) {
          const data = await res.json();
          setTags(data.tags || []);
        }
      } catch (e) {
        console.error("Failed to load tags", e);
      } finally {
        setIsLoadingTags(false);
      }
    }
    async function fetchDags() {
      setIsLoadingDags(true);
      try {
        const res = await fetch('/api/dags');
        if (res.ok) {
          const data = await res.json();
          setDags((data.dags || []).filter((d: { id: string }) => d.id !== _dagId));
        }
      } catch (e) {
        console.error("Failed to load DAGs", e);
      } finally {
        setIsLoadingDags(false);
      }
    }
    if (isOpen) {
        fetchEventTypes();
        fetchTags();
        fetchDags();
    }
  }, [isOpen, _dagId]);


  if (!isOpen || !event) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error("Please enter an event title");
      return;
    }
    
    // At least one node must be selected
    if (!sourceNodeId && !targetNodeId && participantNodeIds.length === 0) {
      toast.error("Please select at least one node for this event");
      return;
    }
    
    if (!isCustomType && !selectedEventTypeId) {
      toast.error("Please select an event type");
      return;
    }
    
    if (isCustomType && !customTypeName.trim()) {
      toast.error("Please enter a custom event type name");
      return;
    }

    // Validate that at least date, seriesDay, or sourceDagId is provided
    if (!date && !seriesDay && !sourceDagId) {
      toast.error("Please provide a date, series day, or source DAG");
      return;
    }
    
    setIsSubmitting(true);
    try {
        await onUpdate(event.id, {
            title: title.trim(),
            description: description.trim() || undefined,
            date: date || undefined,
            seriesDay: seriesDay !== '' ? Number(seriesDay) : undefined,
            tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
            sourceDagId: sourceDagId || undefined,
            eventTypeId: isCustomType ? undefined : selectedEventTypeId,
            customTypeName: isCustomType ? customTypeName.trim() : undefined,
            sourceNodeId: sourceNodeId || undefined,
            targetNodeId: targetNodeId || undefined,
            participantNodeIds: participantNodeIds.length > 0 ? participantNodeIds : undefined,
            createEdge: createEdge && sourceNodeId && targetNodeId ? true : undefined,
        });
        onClose();
    } catch (error) {
        console.error("Failed to update event:", error);
        toast.error("Failed to update event. Please try again.");
    } finally {
        setIsSubmitting(false);
    }
  };


  const handleDelete = async () => {
    if (!onDelete) return;
    if (!confirm(`Are you sure you want to delete "${event.title}"? This action cannot be undone.`)) {
      return;
    }
    
    setIsDeleting(true);
    try {
      await onDelete(event.id);
      onClose();
    } catch (error) {
      console.error("Failed to delete event:", error);
      toast.error("Failed to delete event. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
            <div>
                <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                    <Calendar size={20} className="text-indigo-600"/>
                    Edit Event
                </h2>
                <p className="text-xs text-zinc-500">
                  Update event details
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
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
                        Date <span className="text-zinc-400 font-normal">(Optional)</span>
                    </label>
                    <input 
                        type="date" 
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer"
                    />
                </div>

                {/* Series Day */}
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
                        Series Day <span className="text-zinc-400 font-normal">(Optional)</span>
                    </label>
                    <input 
                        type="number" 
                        min="1"
                        value={seriesDay}
                        onChange={e => setSeriesDay(e.target.value === '' ? '' : parseInt(e.target.value) || '')}
                        placeholder="e.g. 56"
                        className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
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

            {/* Tags */}
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
                    Tags <span className="text-zinc-400 font-normal">(Optional)</span>
                </label>
                {isLoadingTags ? (
                    <div className="px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-500 text-sm">Loading tags...</div>
                ) : (
                    <div className="flex flex-wrap gap-2 p-3 bg-zinc-50 border border-zinc-200 rounded-xl min-h-[3rem]">
                        {tags.length === 0 ? (
                            <span className="text-sm text-zinc-400">No tags available. Create tags via API.</span>
                        ) : (
                            tags.map(tag => (
                                <button
                                    key={tag.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedTagIds(prev => 
                                            prev.includes(tag.id) 
                                                ? prev.filter(id => id !== tag.id)
                                                : [...prev, tag.id]
                                        );
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                        selectedTagIds.includes(tag.id)
                                            ? 'bg-indigo-600 text-white shadow-md'
                                            : 'bg-white text-zinc-700 border border-zinc-300 hover:bg-zinc-100'
                                    }`}
                                    style={selectedTagIds.includes(tag.id) && tag.color ? { backgroundColor: tag.color } : {}}
                                >
                                    {tag.name}
                                </button>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Source DAG */}
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
                    Source DAG <span className="text-zinc-400 font-normal">(Optional)</span>
                </label>
                {isLoadingDags ? (
                    <div className="px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-500 text-sm">Loading DAGs...</div>
                ) : (
                    <select
                        value={sourceDagId}
                        onChange={e => setSourceDagId(e.target.value)}
                        className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer"
                    >
                        <option value="">No source DAG (event is from this DAG)</option>
                        {dags.map(dag => (
                            <option key={dag.id} value={dag.id}>{dag.name}</option>
                        ))}
                    </select>
                )}
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
                        onChange={(e) => setSourceNodeId(e.target.value)}
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

                {/* Target Node */}
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                        <ArrowLeft size={12} className="text-red-600" />
                        To (Target) <span className="text-zinc-400 font-normal">(Optional)</span>
                    </label>
                    <select
                        value={targetNodeId}
                        onChange={(e) => {
                            setTargetNodeId(e.target.value);
                            // Auto-enable create edge if both source and target are selected
                            if (e.target.value && sourceNodeId) {
                                setCreateEdge(true);
                            }
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
                </div>

                {/* Create Edge Checkbox */}
                {sourceNodeId && targetNodeId && (
                    <div className="flex items-center gap-2 p-3 bg-indigo-50/50 border border-indigo-200 rounded-xl">
                        <input
                            type="checkbox"
                            id="createEdge"
                            checked={createEdge}
                            onChange={(e) => setCreateEdge(e.target.checked)}
                            className="w-4 h-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label htmlFor="createEdge" className="text-sm text-zinc-700 cursor-pointer">
                            Create edge between source and target nodes
                        </label>
                    </div>
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
        <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50/50 flex justify-between items-center">
            <div>
                {onDelete && (
                    <button 
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="px-4 py-2 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Trash2 size={16} />
                        {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                )}
            </div>
            <div className="flex gap-3">
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
                            Save Changes
                        </>
                    )}
                </button>
            </div>
        </div>

      </div>
    </div>
  );
};

export default EditEventDialog;
