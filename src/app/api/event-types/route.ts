import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const eventTypes = await prisma.eventType.findMany({
      orderBy: { name: 'asc' }
    });
    
    return NextResponse.json({ eventTypes });
  } catch (error) {
    console.error("Failed to fetch event types:", error);
    return NextResponse.json({ error: "Failed to load event types" }, { status: 500 });
  }
}
