import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Fetch all tags
export async function GET(_request: NextRequest) {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({ tags });
  } catch (error) {
    console.error("Failed to fetch tags:", error);
    return NextResponse.json({ error: "Failed to fetch tags", details: String(error) }, { status: 500 });
  }
}

// POST: Create a new tag
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, color } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Tag name is required" }, { status: 400 });
    }

    // Check if tag already exists
    const existingTag = await prisma.tag.findUnique({
      where: { name: name.trim() }
    });

    if (existingTag) {
      return NextResponse.json({ error: "Tag with this name already exists" }, { status: 400 });
    }

    const tag = await prisma.tag.create({
      data: {
        name: name.trim(),
        color: color?.trim() || null
      }
    });

    return NextResponse.json({ tag });
  } catch (error) {
    console.error("Failed to create tag:", error);
    return NextResponse.json({ error: "Failed to create tag", details: String(error) }, { status: 500 });
  }
}
