import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PUT: Update an existing tag
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, color } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Tag name is required" }, { status: 400 });
    }

    // Check if tag exists
    const existingTag = await prisma.tag.findUnique({
      where: { id }
    });

    if (!existingTag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    // Check if another tag with this name exists
    const nameConflict = await prisma.tag.findFirst({
      where: {
        name: name.trim(),
        id: { not: id }
      }
    });

    if (nameConflict) {
      return NextResponse.json({ error: "Tag with this name already exists" }, { status: 400 });
    }

    const updatedTag = await prisma.tag.update({
      where: { id },
      data: {
        name: name.trim(),
        color: color?.trim() || null
      }
    });

    return NextResponse.json({ tag: updatedTag });
  } catch (error) {
    console.error("Failed to update tag:", error);
    return NextResponse.json({ error: "Failed to update tag", details: String(error) }, { status: 500 });
  }
}

// DELETE: Delete a tag
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if tag exists
    const existingTag = await prisma.tag.findUnique({
      where: { id }
    });

    if (!existingTag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    await prisma.tag.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete tag:", error);
    return NextResponse.json({ error: "Failed to delete tag", details: String(error) }, { status: 500 });
  }
}
