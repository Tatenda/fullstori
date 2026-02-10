import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST: Create a new event
export async function POST(_request: Request) {
  try {
    const body = await _request.json();
    const { 
      title, 
      description, 
      date, 
      seriesDay,
      tagIds,
      sourceDagId,
      customTypeName, 
      sourceNodeId,
      targetNodeId,
      participantNodeIds,
      createEdge,
      dagId 
    } = body;
    let eventTypeId = body.eventTypeId; 

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Event title is required" }, { status: 400 });
    }

    // Date is optional if seriesDay is provided, or if event is from another DAG
    if (!date && !seriesDay && !sourceDagId) {
      return NextResponse.json({ error: "Event date or series day is required" }, { status: 400 });
    }

    if (!eventTypeId && !customTypeName) {
      return NextResponse.json({ error: "Event type is required" }, { status: 400 });
    }

    if (!dagId) {
      return NextResponse.json({ error: "DAG ID is required" }, { status: 400 });
    }

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
    if (customTypeName && !eventTypeId) {
        // Check if exists first to avoid dupes
        let existingType = await prisma.eventType.findUnique({ where: { name: customTypeName }});
        if (!existingType) {
            existingType = await prisma.eventType.create({
                data: {
                    name: customTypeName.trim(),
                    icon: 'HelpCircle', // Default icon
                    color: '#6366f1' // Default Indigo
                }
            });
        }
        eventTypeId = existingType.id;
    }

    // Parse and validate date (optional)
    let eventDate: Date | null = null;
    if (date) {
      eventDate = new Date(date);
      if (isNaN(eventDate.getTime())) {
        return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
      }
    }

    // Calculate sortOrder: find max sortOrder for events on the same date or series day, then add 1
    let newSortOrder = 0;
    if (eventDate) {
      const sameDayEvents = await prisma.event.findMany({
        where: {
          dagId,
          date: {
            gte: new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate()),
            lt: new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate() + 1)
          }
        },
        select: { sortOrder: true },
        orderBy: { sortOrder: 'desc' },
        take: 1
      });
      const maxSortOrder = sameDayEvents.length > 0 ? sameDayEvents[0].sortOrder : -1;
      newSortOrder = maxSortOrder + 1;
    } else if (seriesDay !== undefined && seriesDay !== null) {
      const sameSeriesDayEvents = await prisma.event.findMany({
        where: {
          dagId,
          seriesDay
        },
        select: { sortOrder: true },
        orderBy: { sortOrder: 'desc' },
        take: 1
      });
      const maxSortOrder = sameSeriesDayEvents.length > 0 ? sameSeriesDayEvents[0].sortOrder : -1;
      newSortOrder = maxSortOrder + 1;
    }

    // Create event with node relationships
    const eventData: any = {
      title: title.trim(),
      description: description?.trim() || null,
      date: eventDate,
      seriesDay: seriesDay !== undefined && seriesDay !== null ? parseInt(String(seriesDay)) : null,
      sortOrder: newSortOrder,
      eventTypeId,
      dagId,
      sourceDagId: sourceDagId || null,
      sourceNodeId: sourceNodeId || null,
      targetNodeId: targetNodeId || null,
    };

    // Add participant nodes if provided
    if (participantNodeIds && Array.isArray(participantNodeIds) && participantNodeIds.length > 0) {
      const validParticipantIds = participantNodeIds.filter((id: string) => id && id.trim().length > 0);
      if (validParticipantIds.length > 0) {
        eventData.participantNodes = {
          connect: validParticipantIds.map((id: string) => ({ id }))
        };
      }
    }

    // Add tags if provided
    if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
      const validTagIds = tagIds.filter((id: string) => id && id.trim().length > 0);
      if (validTagIds.length > 0) {
        eventData.tags = {
          connect: validTagIds.map((id: string) => ({ id }))
        };
      }
    }

    // Create event - try with tags include, fallback without if it fails
    let event;
    try {
      event = await prisma.event.create({
        data: eventData,
        include: {
          eventType: true,
          tags: {
            select: {
              id: true,
              name: true,
              color: true
            }
          },
        sourceDag: {
          select: {
            id: true,
            name: true
          }
        },
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
    } catch (tagsError: any) {
      // If tags relation fails, create without tags include
      console.warn("Tags relation not available when creating event, creating without tags:", tagsError.message);
      event = await prisma.event.create({
        data: eventData,
        include: {
          eventType: true,
          sourceDag: {
            select: {
              id: true,
              name: true
            }
          },
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
      // Add empty tags array
      event = { ...event, tags: [] };
    }

    // Optionally create edge if source and target are provided and createEdge is true
    let createdEdge = null;
    if (createEdge && sourceNodeId && targetNodeId) {
      // Check if edge already exists
      const existingEdge = await prisma.dAGEdge.findFirst({
        where: {
          dagId,
          sourceId: sourceNodeId,
          targetId: targetNodeId
        }
      });

      if (!existingEdge) {
        // Create edge with event title as label
        createdEdge = await prisma.dAGEdge.create({
          data: {
            dagId,
            sourceId: sourceNodeId,
            targetId: targetNodeId,
            label: title.trim(),
            createdFromEventId: event.id
          }
        });

        // Update event to reference the created edge
        await prisma.event.update({
          where: { id: event.id },
          data: { createdEdgeId: createdEdge.id }
        });
      }
    }

    return NextResponse.json({ event, createdEdge });
  } catch (error) {
    console.error("Failed to create event:", error);
    return NextResponse.json({ error: "Failed to create event", details: String(error) }, { status: 500 });
  }
}

// GET: Fetch all events (optional default list)
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const dagId = searchParams.get('dagId');
        const nodeId = searchParams.get('nodeId'); // Optional filter by node

        if (!dagId) {
             return NextResponse.json({ error: "DAG ID required" }, { status: 400 });
        }

        const where: any = { dagId };
        if (nodeId) {
            // Find events where this node is source, target, or participant
            where.OR = [
                { sourceNodeId: nodeId },
                { targetNodeId: nodeId },
                { participantNodes: { some: { id: nodeId } } }
            ];
        }

        // First, try to fetch events with tags
        let events;
        try {
            events = await prisma.event.findMany({
                where,
                include: {
                    eventType: true,
                    tags: {
                        select: {
                            id: true,
                            name: true,
                            color: true
                        }
                    },
                    sourceDag: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
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
                },
                orderBy: [
                    { date: 'desc' },      // Primary: newest dates first (nulls automatically last with desc)
                    { seriesDay: 'asc' },  // Secondary: series day ascending (nulls automatically first with asc, but we want them last)
                    { sortOrder: 'asc' },  // Tertiary: custom order for same-day events (lower numbers first)
                    { createdAt: 'asc' }   // Quaternary: fallback to creation time if sortOrder is same
                ]
            });
        } catch (tagsError: any) {
            // If tags relation fails, fetch without tags and add empty array
            console.warn("Tags relation not available, fetching events without tags:", tagsError.message);
            events = await prisma.event.findMany({
                where,
                include: {
                    eventType: true,
                    sourceDag: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
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
                },
                orderBy: [
                    { date: 'desc' },
                    { seriesDay: 'asc' },
                    { sortOrder: 'asc' },
                    { createdAt: 'asc' }
                ]
            });
            // Add empty tags array to each event
            events = events.map(event => ({ ...event, tags: [] }));
        }

        return NextResponse.json({ events });
    } catch (error) {
        console.error("Failed to fetch events:", error);
        return NextResponse.json({ error: "Failed to fetch events", details: String(error) }, { status: 500 });
    }
}
