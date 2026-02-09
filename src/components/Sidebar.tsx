import React, { useState, useEffect } from 'react';
import { X, User, Briefcase, FileText, Landmark, UserPlus, Pencil, Trash2, PlusCircle } from "lucide-react";
import clsx from "clsx";
import { getRoleCategory, getRoleStyle, getRoleIcon } from "@/lib/roleUtils";
import { NetworkNode, Event, Entity } from "@/lib/types";
import EventTimeline from "./EventTimeline";
import AddEventDialog from "./AddEventDialog";
import toast from "react-hot-toast";

interface SidebarProps {
  node: NetworkNode | null;
  onClose: () => void;
  onAddConnection: () => void;
  onEdit: () => void;
  onDelete: (id: string) => void;
  hasChildNodes: boolean;
  dagId: string; // Required for events
  allNodes: NetworkNode[]; // All nodes in the DAG for event creation
  createNodeFromEntity?: (entityId: string, relatedEntityIds?: string[], position?: { x: number; y: number }) => Promise<NetworkNode | null>; // Optional function to create nodes from entities
}

const Sidebar: React.FC<SidebarProps> = ({ node, onClose, onAddConnection, onEdit, onDelete, hasChildNodes, dagId, allNodes, createNodeFromEntity }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);

  useEffect(() => {
    if (node?.id) {
        fetchEvents();
    } else {
        setEvents([]);
    }
  }, [node?.id, dagId]);

  const fetchEvents = async () => {
    if (!node?.id) return;
    setIsLoadingEvents(true);
    try {
        const res = await fetch(`/api/events?dagId=${dagId}&nodeId=${node.id}`);
        if (res.ok) {
            const data = await res.json();
            setEvents(data.events || []);
        } else {
            console.error("Failed to fetch events:", res.status);
        }
    } catch (error) {
        console.error("Failed to load events", error);
    } finally {
        setIsLoadingEvents(false);
    }
  };

  // Re-fetch events when dialog closes (in case new event was added)
  useEffect(() => {
    if (!isAddEventOpen && node?.id) {
        fetchEvents();
    }
  }, [isAddEventOpen]);

  if (!node) return null;

  const { label, role, description, avatar } = node.data;
  const category = getRoleCategory(role || '');
  const styles = getRoleStyle(category);
  const Icon = getRoleIcon(category, 36);
  const SmallIcon = getRoleIcon(category, 18);

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this node? This action cannot be undone.')) {
        onDelete(node.id);
        onClose();
    }
  };

  const handleAddEvent = async (eventData: any) => {
      try {
        // Ensure the current node is set as source if not already set
        // The AddEventDialog should have pre-filled this, but double-check
        if (!eventData.sourceNodeId && node.id) {
          eventData.sourceNodeId = node.id;
        }

        const res = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventData)
        });
        
        if (res.ok) {
          toast.success("Event created successfully");
          fetchEvents(); // Refresh timeline
        } else {
          const error = await res.json();
          console.error("Failed to create event:", error);
          toast.error(error.error || "Failed to create event");
        }
      } catch (error) {
        console.error("Error creating event:", error);
        toast.error("Failed to create event");
      }
  };


  return (
    <>
    {/* Enhanced Floating Card Container */}
    <div className="absolute top-4 bottom-4 right-4 w-96 glass-effect rounded-2xl shadow-xl z-20 flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-300 ease-out border border-border">
      
      {/* Header Actions */}
      <div className="absolute top-4 right-4 z-10">
        <button 
          onClick={onClose}
          className="p-2 bg-muted hover:bg-muted/80 rounded-lg text-muted-foreground hover:text-foreground smooth-transition"
          title="Close (Esc)"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Enhanced Profile Header */}
        <div className="px-6 pt-10 pb-6 flex flex-col items-center">
            <div className="relative mb-5 group">
                <div className={clsx(
                    "w-20 h-20 rounded-xl flex items-center justify-center smooth-transition group-hover:scale-105 shadow-md",
                    styles.bg, styles.text
                )}>
                    {avatar ? (
                        <img src={avatar} alt={label} className="w-full h-full rounded-xl object-cover" />
                    ) : (
                        Icon
                    )}
                </div>
            </div>
            
            <h3 className="text-heading text-center text-foreground leading-tight mb-2">{label}</h3>
            
            <div className={clsx("flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider", styles.badgeBg, styles.badgeText)}>
                {SmallIcon}
                <span>{role}</span>
            </div>
        </div>

        {/* Content Details - Enhanced */}
        <div className="px-6 pb-6 space-y-6">
            <div>
                <h4 className="text-label mb-3">
                    Overview
                </h4>
                {description ? (
                    <p className="text-body text-muted-foreground">
                    {description}
                </p>
                ) : (
                    <p className="text-sm text-muted-foreground italic">No description available</p>
                )}
            </div>
            
            {/* Recent Activity Section - Enhanced */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-label">Recent Activity</h4>
                    {/* Add Event Button - Always show, entity will be auto-created if needed */}
                    <button 
                        onClick={() => setIsAddEventOpen(true)}
                        className="p-1.5 hover:bg-primary/10 text-primary rounded-lg smooth-transition flex items-center gap-1.5 group"
                        title="Log new event"
                    >
                        <PlusCircle size={16} />
                        <span className="text-xs font-semibold">Log</span>
                    </button>
                </div>

                <div className="bg-muted/30 rounded-xl p-4 min-h-[100px] border border-border/50">
                    {isLoadingEvents ? (
                        <div className="space-y-3">
                            <div className="skeleton h-16 rounded-lg"></div>
                            <div className="skeleton h-16 rounded-lg"></div>
                        </div>
                    ) : events.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-20 text-center">
                            <p className="text-sm text-muted-foreground mb-2">No events recorded yet</p>
                            <button
                                onClick={() => setIsAddEventOpen(true)}
                                className="text-xs font-semibold text-primary hover:text-primary/80 smooth-transition"
                            >
                                Log first event →
                            </button>
                        </div>
                    ) : (
                        <EventTimeline 
                            events={events} 
                            compact 
                            currentEntityId={node.data.entityId} 
                        />
                    )}
                </div>
            </div>
        </div>
      </div>

      {/* Footer Actions - Enhanced */}
      <div className="p-5 border-t border-border bg-muted/20 space-y-3">
           <div className="grid grid-cols-2 gap-2.5">
               <button 
                  onClick={onEdit}
                  className="w-full py-2.5 bg-background hover:bg-muted text-foreground border border-border hover:border-primary/50 rounded-lg font-semibold smooth-transition flex items-center justify-center gap-2 group text-sm"
               >
                  <Pencil size={14} strokeWidth={2.5} className="text-muted-foreground group-hover:text-foreground smooth-transition" />
                  Edit
               </button>
               
               <button 
                  onClick={handleDelete}
                  disabled={hasChildNodes || node.type === 'root'}
                  title={hasChildNodes ? "Cannot delete node that is a parent to other nodes" : node.type === 'root' ? "Cannot delete root node" : "Delete Node"}
                  className="w-full py-2.5 bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 hover:border-destructive/40 rounded-lg font-semibold smooth-transition flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:border-border text-sm"
               >
                  <Trash2 size={14} strokeWidth={2.5} />
                  Delete
               </button>
           </div>
           
           <button 
              onClick={onAddConnection}
              className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold shadow-md hover:shadow-lg smooth-transition flex items-center justify-center gap-2 group text-sm"
           >
              <div className="bg-primary-foreground/20 p-1 rounded-full group-hover:scale-110 smooth-transition">
                  <UserPlus size={14} strokeWidth={3} />
              </div>
              Connect New Person
           </button>
      </div>
    </div>

    {/* Add Event Dialog */}
    {isAddEventOpen && (
    <AddEventDialog
        isOpen={isAddEventOpen}
        onClose={() => setIsAddEventOpen(false)}
        onSubmit={handleAddEvent}
          currentNodeId={node.id}
          allNodes={allNodes}
        dagId={dagId}
        onCreateNode={createNodeFromEntity}
        allowTargetNode={true} // Graph view allows target nodes
    />
    )}
    </>
  );
};

export default Sidebar;
