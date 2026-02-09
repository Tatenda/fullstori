"use client";

import AddEventDialog from '@/components/AddEventDialog';
import { DAGHeader } from '@/components/DAGHeader';
import EditEventDialog from '@/components/EditEventDialog';
import { EditRootLabelsDialog } from '@/components/EditRootLabelsDialog';
import EventTimeline from '@/components/EventTimeline';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { calculateSmartPosition, findNonConflictingPosition } from '@/lib/nodePositioning';
import { type Event, type EventType, type NetworkNode, type RoleCategory } from '@/lib/types';
import { Clock, Filter, PlusCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface TimelineViewProps {
  dagId: string;
  onViewChange: (view: 'graph' | 'timeline') => void;
}

export default function TimelineView({ dagId, onViewChange }: TimelineViewProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [dagName, setDagName] = useState<string>('');
  const [dagStats, setDagStats] = useState({ nodes: 0, edges: 0, events: 0 });
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isEditEventOpen, setIsEditEventOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [allNodes, setAllNodes] = useState<NetworkNode[]>([]);
  const [rootLabels, setRootLabels] = useState<{ top?: string; bottom?: string; left?: string; right?: string }>({});
  const [isEditRootLabelsOpen, setIsEditRootLabelsOpen] = useState(false);

  const fetchEvents = async () => {
    if (!dagId) return;
    try {
      const res = await fetch(`/api/events?dagId=${dagId}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error("Failed to fetch events:", error);
    }
  };

  const fetchNodes = async () => {
    if (!dagId) return;
    try {
      const res = await fetch(`/api/dag/${dagId}`);
      if (res.ok) {
        const data = await res.json();
        setAllNodes(data.nodes || []);
      }
    } catch (error) {
      console.error("Failed to fetch nodes:", error);
    }
  };

  useEffect(() => {
    if (dagId) {
      Promise.all([
        fetch(`/api/events?dagId=${dagId}`).then(res => res.json()),
        fetch('/api/event-types').then(res => res.json()),
        fetch(`/api/dag/${dagId}`).then(res => res.json()).catch(() => ({ dag: null })),
      ]).then(([eventsData, typesData, dagData]) => {
        setEvents(eventsData.events || []);
        setEventTypes(typesData.eventTypes || []);
        if (dagData.dag) {
          setDagName(dagData.dag.name);
          setDagStats({
            nodes: dagData.dag._count.nodes || 0,
            edges: dagData.dag._count.edges || 0,
            events: dagData.dag._count.events || 0,
          });
          setRootLabels({
            top: dagData.dag.rootLabelTop || undefined,
            bottom: dagData.dag.rootLabelBottom || undefined,
            left: dagData.dag.rootLabelLeft || undefined,
            right: dagData.dag.rootLabelRight || undefined,
          });
        }
      }).catch(err => {
        console.error("Failed to load timeline data", err);
        toast.error("Failed to load timeline data");
      }).finally(() => {
        setIsLoading(false);
      });
      
      // Fetch nodes for event creation
      fetchNodes();
    }
  }, [dagId]);

  // Refresh events and nodes when dialog closes
  useEffect(() => {
    if (!isAddEventOpen && dagId) {
      fetchEvents();
      fetchNodes(); // Refresh nodes list
    }
  }, [isAddEventOpen, dagId]);

  const filteredEvents = filterType === 'all' 
    ? events 
    : events.filter(e => e.eventType.id === filterType);

  const selectedEventType = eventTypes.find(t => t.id === filterType);

  // Create node from entity (for event-based node creation)
  const createNodeFromEntity = async (
    entityId: string,
    relatedNodeIds?: string[]
  ): Promise<NetworkNode | null> => {
    try {
      // Fetch entity data directly by ID (works for newly created entities not yet in DAG)
      const entityRes = await fetch(`/api/entities/${entityId}`);
      if (!entityRes.ok) {
        throw new Error(`Failed to fetch entity: ${entityRes.statusText}`);
      }
      const entityData: { entity: { id: string; name: string; roleId: string; roleLink?: { name: string; category: RoleCategory } } } = await entityRes.json();
      
      if (!entityData || !entityData.entity) {
        throw new Error(`Entity ${entityId} not found`);
      }

      // Calculate smart position
      const relatedNodes = allNodes.filter(n => relatedNodeIds?.includes(n.id));
      const smartPos = calculateSmartPosition(relatedNodes, allNodes);
      const nodePosition = findNonConflictingPosition(smartPos, allNodes);

      // Get role category
      const roleCategory = entityData.entity.roleLink?.category || 'civilian';

      // Create new node
      const newNodeId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newNode: NetworkNode = {
        id: newNodeId,
        type: 'custom',
        position: nodePosition,
        data: {
          label: entityData.entity.name,
          roleId: entityData.entity.roleId,
          role: entityData.entity.roleLink?.name || 'Unknown',
          category: roleCategory,
          entityId: entityData.entity.id,
          onAddConnection: () => {}, // Placeholder
        }
      };

      // Fetch existing edges to preserve them
      const dagRes = await fetch(`/api/dag/${dagId}`);
      if (!dagRes.ok) {
        throw new Error("Failed to fetch DAG data");
      }
      const dagData = await dagRes.json();
      const existingEdges = (dagData.edges || []).map((e: any) => ({
        id: e.id,
        source: e.sourceId || e.source,
        target: e.targetId || e.target,
        label: e.label || undefined,
        sourceHandle: e.sourceHandle || undefined,
        targetHandle: e.targetHandle || undefined,
      }));

      // Add node to DAG via save API (preserve existing edges)
      const updatedNodes = [...allNodes, newNode];
      const saveRes = await fetch(`/api/dag/${dagId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodes: updatedNodes.map(n => ({
            id: n.id,
            type: n.type || 'custom',
            position: n.position,
            data: {
              entityId: n.data.entityId,
              category: n.data.category,
            }
          })),
          edges: existingEdges // Preserve all existing edges
        })
      });

      if (!saveRes.ok) {
        throw new Error("Failed to save node to DAG");
      }

      // Update local state
      setAllNodes(updatedNodes);
      
      return newNode;
    } catch (error) {
      console.error("Failed to create node from entity:", error);
      return null;
    }
  };

  const handleAddEvent = async (eventData: any) => {
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      });
      
      if (res.ok) {
        toast.success("Event created successfully");
        setIsAddEventOpen(false);
        fetchEvents(); // Refresh events
        // Refresh stats
        const dagRes = await fetch(`/api/dag/${dagId}`);
        if (dagRes.ok) {
          const dagData = await dagRes.json();
          if (dagData.dag) {
            setDagStats({
              nodes: dagData.dag._count?.nodes || 0,
              edges: dagData.dag._count?.edges || 0,
              events: dagData.dag._count?.events || 0,
            });
          }
        }
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

  const handleUpdateEvent = async (eventId: string, eventData: any) => {
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      });
      
      if (res.ok) {
        toast.success("Event updated successfully");
        setIsEditEventOpen(false);
        setSelectedEvent(null);
        fetchEvents(); // Refresh events
        // Refresh stats
        const dagRes = await fetch(`/api/dag/${dagId}`);
        if (dagRes.ok) {
          const dagData = await dagRes.json();
          if (dagData.dag) {
            setDagStats({
              nodes: dagData.dag._count?.nodes || 0,
              edges: dagData.dag._count?.edges || 0,
              events: dagData.dag._count?.events || 0,
            });
          }
        }
      } else {
        const error = await res.json();
        console.error("Failed to update event:", error);
        toast.error(error.error || "Failed to update event");
        throw new Error(error.error || "Failed to update event");
      }
    } catch (error) {
      console.error("Error updating event:", error);
      toast.error("Failed to update event");
      throw error;
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        toast.success("Event deleted successfully");
        setIsEditEventOpen(false);
        setSelectedEvent(null);
        fetchEvents(); // Refresh events
        // Refresh stats
        const dagRes = await fetch(`/api/dag/${dagId}`);
        if (dagRes.ok) {
          const dagData = await dagRes.json();
          if (dagData.dag) {
            setDagStats({
              nodes: dagData.dag._count?.nodes || 0,
              edges: dagData.dag._count?.edges || 0,
              events: dagData.dag._count?.events || 0,
            });
          }
        }
      } else {
        const error = await res.json();
        console.error("Failed to delete event:", error);
        toast.error(error.error || "Failed to delete event");
        throw new Error(error.error || "Failed to delete event");
      }
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Failed to delete event");
      throw error;
    }
  };

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setIsEditEventOpen(true);
  };

  const handleReorderEvent = async (eventId: string, direction: 'up' | 'down') => {
    if (!dagId) return;

    try {
      // Find the event and its current position
      const eventIndex = filteredEvents.findIndex(e => e.id === eventId);
      if (eventIndex === -1) return;

      const event = filteredEvents[eventIndex];
      const eventDate = new Date(event.date);

      // Get all events on the same day, sorted by current order
      const sameDayEvents = filteredEvents
        .filter(e => {
          const eDate = new Date(e.date);
          return eDate.getFullYear() === eventDate.getFullYear() &&
                 eDate.getMonth() === eventDate.getMonth() &&
                 eDate.getDate() === eventDate.getDate();
        })
        .sort((a, b) => {
          // Sort by sortOrder, then by createdAt as fallback
          if (a.sortOrder !== b.sortOrder) {
            return a.sortOrder - b.sortOrder;
          }
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        });

      // Find current position in same-day events
      const sameDayIndex = sameDayEvents.findIndex(e => e.id === eventId);
      if (sameDayIndex === -1) return;

      // Calculate new position
      let newIndex = sameDayIndex;
      if (direction === 'up' && sameDayIndex > 0) {
        newIndex = sameDayIndex - 1;
      } else if (direction === 'down' && sameDayIndex < sameDayEvents.length - 1) {
        newIndex = sameDayIndex + 1;
      } else {
        return; // Can't move in that direction
      }

      // Swap events
      const reorderedEvents = [...sameDayEvents];
      [reorderedEvents[sameDayIndex], reorderedEvents[newIndex]] = [reorderedEvents[newIndex], reorderedEvents[sameDayIndex]];

      // Send reorder request
      const res = await fetch('/api/events/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dagId,
          date: event.date,
          eventIds: reorderedEvents.map(e => e.id)
        })
      });

      if (res.ok) {
        toast.success('Event order updated');
        fetchEvents(); // Refresh events to get updated order
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to reorder event');
      }
    } catch (error) {
      console.error('Error reordering event:', error);
      toast.error('Failed to reorder event');
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden">
      {/* Shared Header */}
      <DAGHeader
        dagId={dagId}
        dagName={dagName}
        stats={dagStats}
        currentView="timeline"
        onViewChange={onViewChange}
        timelineProps={{
          filterType,
          onFilterChange: setFilterType,
          eventTypes: eventTypes.map(t => ({ id: t.id, name: t.name })),
        }}
      />

      {/* Timeline Content */}
      <div className="flex-1 overflow-hidden relative rounded-t-2xl md:rounded-t-3xl bg-background shadow-sm mx-2 md:mx-4 mt-20 md:mt-24 border border-border/50">
        <div className="h-full overflow-y-auto p-6 md:p-8">
          {(() => {
            if (isLoading) {
              return <LoadingState message="Loading timeline..." />;
            }
            if (filteredEvents.length === 0) {
              return (
                <EmptyState
                  icon={Clock}
                  title={filterType === 'all' ? "No events recorded yet" : `No ${selectedEventType?.name.toLowerCase() || 'filtered'} events`}
                  description={
                    filterType === 'all'
                      ? "Start logging events to build a chronological timeline of your investigation"
                      : `No events match the selected filter. Try selecting a different event type or view all events.`
                  }
                  action={
                    filterType === 'all' ? {
                      label: 'Add First Event',
                      onClick: () => setIsAddEventOpen(true),
                    } : {
                      label: 'View All Events',
                      onClick: () => setFilterType('all'),
                    }
                  }
                />
              );
            }
            return (
            <div>
              {/* Timeline Header Stats */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
                <div>
                  <h2 className="text-subheading text-foreground mb-1">
                    {filterType === 'all' ? 'All Events' : selectedEventType?.name || 'Filtered Events'}
                  </h2>
                  <p className="text-caption">
                    {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'} recorded
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Filter - Icon only */}
                  <div className="flex items-center gap-2">
                    <Filter size={16} className="text-muted-foreground" />
                    <select 
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="px-3 py-1.5 bg-muted/30 hover:bg-muted/50 border border-border/50 focus:border-primary/50 rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 smooth-transition cursor-pointer min-w-[160px]"
                    >
                      <option value="all">All Events</option>
                      {eventTypes.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsAddEventOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <PlusCircle size={16} />
                    Add Event
                  </Button>
                </div>
              </div>

              {/* Timeline */}
              <EventTimeline 
                events={filteredEvents} 
                onEventClick={handleEventClick}
                onReorder={handleReorderEvent}
                dagId={dagId}
              />
            </div>
            );
          })()}
        </div>
      </div>

      {/* Add Event Dialog */}
      {isAddEventOpen && (
        <AddEventDialog 
          isOpen={isAddEventOpen}
          onClose={() => setIsAddEventOpen(false)}
          onSubmit={handleAddEvent}
          currentNodeId={null} // No current node when opening from timeline
          allNodes={allNodes}
          dagId={dagId}
          onCreateNode={createNodeFromEntity}
          allowTargetNode={false} // Timeline view cannot create events between two nodes
        />
      )}

      {/* Edit Event Dialog */}
      {isEditEventOpen && selectedEvent && (
        <EditEventDialog 
          isOpen={isEditEventOpen}
          onClose={() => {
            setIsEditEventOpen(false);
            setSelectedEvent(null);
          }}
          onUpdate={handleUpdateEvent}
          onDelete={handleDeleteEvent}
          event={selectedEvent}
          allNodes={allNodes}
          dagId={dagId}
        />
      )}

      {/* Edit Root Labels Dialog */}
      <EditRootLabelsDialog
        isOpen={isEditRootLabelsOpen}
        onClose={() => setIsEditRootLabelsOpen(false)}
        dagId={dagId}
        dagName={dagName}
        currentLabels={rootLabels}
        onUpdate={async () => {
          // Reload DAG to get updated labels
          try {
            const dagRes = await fetch(`/api/dag/${dagId}`);
            if (dagRes.ok) {
              const dagData = await dagRes.json();
              if (dagData.dag) {
                setRootLabels({
                  top: dagData.dag.rootLabelTop || undefined,
                  bottom: dagData.dag.rootLabelBottom || undefined,
                  left: dagData.dag.rootLabelLeft || undefined,
                  right: dagData.dag.rootLabelRight || undefined,
                });
              }
            }
          } catch (error) {
            console.error("Failed to reload DAG:", error);
            toast.error("Failed to reload DAG data");
          }
        }}
      />
    </div>
  );
}
