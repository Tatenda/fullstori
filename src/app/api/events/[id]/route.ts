import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PUT: Update an existing event
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { 
      title, 
      description, 
      date, 
      eventTypeId, 
      customTypeName, 
      sourceNodeId,
      targetNodeId,
      participantNodeIds,
      createEdge
    } = body;

    // Validate required fields
    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Event title is required" }, { status: 400 });
    }

    if (!date) {
      return NextResponse.json({ error: "Event date is required" }, { status: 400 });
    }

    if (!eventTypeId && !customTypeName) {
      return NextResponse.json({ error: "Event type is required" }, { status: 400 });
    }

    // Check if event exists
    const existingEvent = await prisma.event.findUnique({
      where: { id },
      include: { 
        eventType: true,
        dag: true
      }
    });

    if (!existingEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const dagId = existingEvent.dagId;

    // Validate at least one node is linked
    if (!sourceNodeId && !targetNodeId && (!participantNodeIds || participantNodeIds.length === 0)) {
      return NextResponse.json({ error: "At least one node must be linked to the event" }, { status: 400 });
    }

    // Validate nodes exist in the DAG
    if (sourceNodeId) {
      const sourceNode = await prisma.dAGNode.findFirst({
        where: { id: sourceNodeId, dagId }
      });
      if (!sourceNode) {
        return NextResponse.json({ error: "Source node not found in this DAG" }, { status: 400 });
      }
    }

    if (targetNodeId) {
      const targetNode = await prisma.dAGNode.findFirst({
        where: { id: targetNodeId, dagId }
      });
      if (!targetNode) {
        return NextResponse.json({ error: "Target node not found in this DAG" }, { status: 400 });
      }
    }

    // Handle Custom Type Creation
    let finalEventTypeId = eventTypeId;
    if (customTypeName && !eventTypeId) {
      // Check if exists first to avoid dupes
      let existingType = await prisma.eventType.findUnique({ where: { name: customTypeName } });
      if (!existingType) {
        existingType = await prisma.eventType.create({
          data: {
            name: customTypeName.trim(),
            icon: 'HelpCircle', // Default icon
            color: '#6366f1' // Default Indigo
          }
        });
      }
      finalEventTypeId = existingType.id;
    }

    // Parse and validate date
    const eventDate = new Date(date);
    if (isNaN(eventDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    // Update event with node relationships
    const updateData: any = {
      title: title.trim(),
      description: description?.trim() || null,
      date: eventDate,
      eventTypeId: finalEventTypeId,
      sourceNodeId: sourceNodeId || null,
      targetNodeId: targetNodeId || null,
    };

    // Update participant nodes
    if (participantNodeIds !== undefined) {
      if (Array.isArray(participantNodeIds) && participantNodeIds.length > 0) {
        const validParticipantIds = participantNodeIds.filter((id: string) => id && id.trim().length > 0);
        updateData.participantNodes = {
          set: validParticipantIds.map((id: string) => ({ id }))
        };
      } else {
        updateData.participantNodes = {
          set: []
        };
      }
    }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: updateData,
      include: {
        eventType: true,
        sourceNode: {
          include: {
            entity: {
              include: {
                roleLink: true
              }
            }
          }
        },
        targetNode: {
          include: {
            entity: {
              include: {
                roleLink: true
              }
            }
          }
        },
        participantNodes: {
          include: {
            entity: {
              include: {
                roleLink: true
              }
            }
          }
        }
      }
    });

    // Optionally create/update edge if source and target are provided and createEdge is true
    if (createEdge && sourceNodeId && targetNodeId) {
      // Check if edge already exists from this event
      if (existingEvent.createdEdgeId) {
        // Update existing edge
        await prisma.dAGEdge.update({
          where: { id: existingEvent.createdEdgeId },
          data: {
            label: title.trim()
          }
        });
      } else {
        // Check if edge already exists between these nodes
        const existingEdge = await prisma.dAGEdge.findFirst({
          where: {
            dagId,
            sourceId: sourceNodeId,
            targetId: targetNodeId
          }
        });

        if (!existingEdge) {
          // Create new edge
          const newEdge = await prisma.dAGEdge.create({
            data: {
              dagId,
              sourceId: sourceNodeId,
              targetId: targetNodeId,
              label: title.trim(),
              createdFromEventId: id
            }
          });

          // Update event to reference the created edge
          await prisma.event.update({
            where: { id },
            data: { createdEdgeId: newEdge.id }
          });
        }
      }
    }

    return NextResponse.json({ event: updatedEvent });
  } catch (error) {
    console.error("Failed to update event:", error);
    return NextResponse.json({ error: "Failed to update event", details: String(error) }, { status: 500 });
  }
}

// DELETE: Delete an event
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if event exists
    const existingEvent = await prisma.event.findUnique({
      where: { id }
    });

    if (!existingEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    await prisma.event.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete event:", error);
    return NextResponse.json({ error: "Failed to delete event", details: String(error) }, { status: 500 });
  }
}
