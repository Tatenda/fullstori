import { type Event } from '@/lib/types';
import clsx from 'clsx';
import { format, isSameDay } from 'date-fns';
import * as LucideIcons from 'lucide-react';
import { ChevronDown, ChevronUp, Clock, Edit } from 'lucide-react';
import React from 'react';

interface EventTimelineProps {
  events: Event[];
  compact?: boolean;
  currentEntityId?: string; // To highlight "other" participants
  onEventClick?: (event: Event) => void;
  onReorder?: (eventId: string, direction: 'up' | 'down') => void;
  dagId?: string;
}

const EventTimeline: React.FC<EventTimelineProps> = ({ events, compact = false, currentEntityId: _currentEntityId, onEventClick, onReorder, dagId: _dagId }) => {
  if (events.length === 0) {
    return (
      <div className="text-center p-6 bg-muted/20 rounded-xl border border-dashed border-border">
        <p className="text-sm text-muted-foreground">No events recorded yet.</p>
      </div>
    );
  }

  return (
    <div className={clsx("relative space-y-5", compact ? "pl-4" : "pl-8")}>
      {/* Vertical Line */}
      <div className="absolute top-2 bottom-2 left-[19px] w-0.5 bg-gradient-to-b from-border via-border to-transparent" />

      {events.map((event, index) => {
        // Check if there are other events on the same day
        const eventDate = new Date(event.date);
        const sameDayEvents = events.filter(e => isSameDay(new Date(e.date), eventDate));
        const canMoveUp = sameDayEvents.length > 1 && index > 0 && isSameDay(new Date(events[index - 1].date), eventDate);
        const canMoveDown = sameDayEvents.length > 1 && index < events.length - 1 && isSameDay(new Date(events[index + 1].date), eventDate);
        // Dynamic Icon
        const IconComponent = (LucideIcons as any)[event.eventType.icon || 'HelpCircle'] || LucideIcons.HelpCircle;
        const color = event.eventType.color || '#9ca3af';

        // Get node relationships
        const sourceNode = event.sourceNode;
        const targetNode = event.targetNode;
        const participantNodes = event.participantNodes || [];
        const hasDirectional = sourceNode && targetNode;
        const hasParticipants = participantNodes.length > 0;

        return (
          <div 
            key={event.id} 
            className="relative flex gap-4 group"
          >
            {/* Dot / Icon */}
            <div 
                className={clsx(
                    "relative z-10 flex items-center justify-center rounded-full shrink-0 border-4 border-white shadow-sm transition-transform group-hover:scale-110",
                    compact ? "w-10 h-10" : "w-12 h-12"
                )}
                style={{ backgroundColor: color }}
            >
                <IconComponent size={compact ? 16 : 20} className="text-white" />
            </div>

            {/* Content Card - Enhanced */}
            <div className={clsx(
                "flex-1 bg-background border border-border rounded-xl p-4 shadow-sm hover:shadow-md smooth-transition group relative",
                compact ? "p-3" : "p-5"
            )}>
                <div className="flex justify-between items-start mb-2">
                    <span 
                        className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: `${color}15`, color: color }}
                    >
                        {event.eventType.name}
                    </span>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                            <Clock size={12} />
                        {format(new Date(event.date), 'MMM d, yyyy')}
                    </span>
                        {/* Reorder buttons for same-day events */}
                        {onReorder && sameDayEvents.length > 1 && (
                            <div className="flex items-center gap-1 border-r border-border pr-2 mr-1">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onReorder(event.id, 'up');
                                    }}
                                    disabled={!canMoveUp}
                                    className={clsx(
                                        "p-1 rounded transition-colors",
                                        canMoveUp 
                                            ? "hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer" 
                                            : "text-muted-foreground/30 cursor-not-allowed"
                                    )}
                                    title="Move up"
                                >
                                    <ChevronUp size={14} />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onReorder(event.id, 'down');
                                    }}
                                    disabled={!canMoveDown}
                                    className={clsx(
                                        "p-1 rounded transition-colors",
                                        canMoveDown 
                                            ? "hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer" 
                                            : "text-muted-foreground/30 cursor-not-allowed"
                                    )}
                                    title="Move down"
                                >
                                    <ChevronDown size={14} />
                                </button>
                            </div>
                        )}
                        {onEventClick && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEventClick(event);
                                }}
                                className="p-1.5 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground"
                                title="Edit event"
                            >
                                <Edit size={14} />
                            </button>
                        )}
                    </div>
                </div>
                
                <h4 className={clsx("font-semibold text-foreground mb-2", compact ? "text-sm" : "text-base")}>
                    {event.title}
                </h4>
                
                {event.description && !compact && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2 leading-relaxed">{event.description}</p>
                )}

                {/* Node Relationships */}
                {(hasDirectional || hasParticipants || sourceNode || targetNode) && (
                    <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-border">
                        {/* Show target node if it exists (preferred over source) */}
                        {targetNode && (
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground font-medium">Links:</span>
                                <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-md">
                                    {targetNode.entity.name}
                                </span>
                            </div>
                        )}
                        
                        {/* Single Source Node (only if no target) */}
                        {sourceNode && !targetNode && !hasParticipants && (
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground font-medium">Links:</span>
                                <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-md">
                                    {sourceNode.entity.name}
                                </span>
                            </div>
                        )}

                        {/* Participants */}
                        {hasParticipants && (
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-xs text-muted-foreground font-medium">Links:</span>
                                {participantNodes.map(node => (
                                    <span key={node.id} className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-md">
                                        {node.entity.name}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default EventTimeline;
