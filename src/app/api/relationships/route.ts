import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const relationships = await prisma.relationshipType.findMany({
      orderBy: {
        category: 'asc',
      },
    });

    // Group by category - return both name and id
    const relationshipsByCategory: Record<string, Array<{ id: string; name: string }>> = {};
    
    relationships.forEach(rel => {
      if (!relationshipsByCategory[rel.category]) {
        relationshipsByCategory[rel.category] = [];
      }
      relationshipsByCategory[rel.category].push({ id: rel.id, name: rel.name });
    });

    return NextResponse.json({ relationshipsByCategory });
  } catch (error) {
    console.error('Failed to fetch relationships:', error);
    return NextResponse.json({ error: 'Failed to fetch relationships' }, { status: 500 });
  }
}

// POST: Create a new relationship type
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, category } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Relationship name is required" }, { status: 400 });
    }

    if (!category || !category.trim()) {
      return NextResponse.json({ error: "Relationship category is required" }, { status: 400 });
    }

    // Check if relationship already exists
    const existing = await prisma.relationshipType.findUnique({
      where: { name: name.trim() }
    });

    if (existing) {
      // Return existing relationship
      return NextResponse.json({ relationship: existing });
    }

    // Create new relationship
    const relationship = await prisma.relationshipType.create({
      data: {
        name: name.trim(),
        category: category.trim()
      }
    });

    return NextResponse.json({ relationship });
  } catch (error) {
    console.error('Failed to create relationship:', error);
    return NextResponse.json({ error: 'Failed to create relationship', details: String(error) }, { status: 500 });
  }
}
