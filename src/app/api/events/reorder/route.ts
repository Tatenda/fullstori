import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST: Reorder events on the same day
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dagId, date, eventIds } = body;

    if (!dagId || !date || !Array.isArray(eventIds)) {
      return NextResponse.json({ error: "dagId, date, and eventIds array are required" }, { status: 400 });
    }

    // Parse date
    const eventDate = new Date(date);
    if (isNaN(eventDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    // Verify all events exist and are on the same date
    const events = await prisma.event.findMany({
      where: {
        id: { in: eventIds },
        dagId,
        date: {
          gte: new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate()),
          lt: new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate() + 1)
        }
      }
    });

    if (events.length !== eventIds.length) {
      return NextResponse.json({ error: "Some events not found or not on the specified date" }, { status: 400 });
    }

    // Update sortOrder for each event based on the order in eventIds array
    const updatePromises = eventIds.map((eventId: string, index: number) => {
      return prisma.event.update({
        where: { id: eventId },
        data: { sortOrder: index }
      });
    });

    await Promise.all(updatePromises);

    return NextResponse.json({ success: true, message: "Events reordered successfully" });
  } catch (error) {
    console.error("Failed to reorder events:", error);
    return NextResponse.json({ error: "Failed to reorder events", details: String(error) }, { status: 500 });
  }
}
