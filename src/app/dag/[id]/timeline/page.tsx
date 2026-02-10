"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Calendar, Filter, ArrowLeft, Clock } from 'lucide-react';
import EventTimeline from '@/components/EventTimeline';
import { Event, EventType } from '@/lib/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageContainer } from '@/components/ui/PageContainer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import toast from 'react-hot-toast';

export default function TimelinePage() {
  const params = useParams();
  const router = useRouter();
  const dagId = params?.id as string;

  const [events, setEvents] = useState<Event[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [dagName, setDagName] = useState<string>('');

  useEffect(() => {
    if (dagId) {
      Promise.all([
        fetch(`/api/events?dagId=${dagId}`).then(res => res.json()),
        fetch('/api/event-types').then(res => res.json()),
        fetch(`/api/dags/${dagId}`).then(res => res.json()).catch(() => ({ dag: null })),
      ]).then(([eventsData, typesData, dagData]) => {
        setEvents(eventsData.events || []);
        setEventTypes(typesData.eventTypes || []);
        if (dagData.dag) {
          setDagName(dagData.dag.name);
        }
      }).catch(err => {
        console.error("Failed to load timeline data", err);
        toast.error("Failed to load timeline data");
      }).finally(() => {
        setIsLoading(false);
      });
    }
  }, [dagId]);

  const filteredEvents = filterType === 'all' 
    ? events 
    : events.filter(e => e.eventType.id === filterType);

  const selectedEventType = eventTypes.find(t => t.id === filterType);

  return (
    <PageContainer>
      <PageHeader
        icon={Calendar}
        title={dagName || "Investigation Timeline"}
        subtitle="Chronological record of all logged events"
        action={
          <div className="flex items-center gap-3">
            {/* Filter */}
            <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-lg px-3 py-2">
              <Filter size={14} className="text-muted-foreground" />
              <select 
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-transparent text-sm font-medium text-foreground outline-none cursor-pointer appearance-none pr-6"
              >
                <option value="all">All Events</option>
                {eventTypes.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* Back Button */}
            <Button
              variant="outline"
              icon={ArrowLeft}
              iconPosition="left"
              onClick={() => router.push(`/dag/${dagId}`)}
              size="md"
            >
              Back to Graph
            </Button>
          </div>
        }
      />

      <div className="mt-6">
        {isLoading ? (
          <LoadingState message="Loading timeline..." />
        ) : filteredEvents.length === 0 ? (
          <Card padding="lg">
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
                  label: 'Go to Graph',
                  onClick: () => router.push(`/dag/${dagId}`),
                } : {
                  label: 'View All Events',
                  onClick: () => setFilterType('all'),
                }
              }
            />
          </Card>
        ) : (
          <Card padding="lg">
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
              {filterType !== 'all' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilterType('all')}
                >
                  Clear Filter
                </Button>
              )}
            </div>

            {/* Timeline */}
            <EventTimeline events={filteredEvents} />
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
