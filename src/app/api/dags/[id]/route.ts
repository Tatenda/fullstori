import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/dags/[id] - Get DAG metadata
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const dag = await prisma.dAG.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            nodes: true,
            edges: true,
            events: true,
          },
        },
      },
    });

    if (!dag) {
      return NextResponse.json({ error: "DAG not found" }, { status: 404 });
    }

    return NextResponse.json({ dag });
  } catch (error) {
    console.error("API Error fetching DAG:", error);
    return NextResponse.json({ error: "Failed to fetch DAG", details: String(error) }, { status: 500 });
  }
}

// PATCH /api/dags/[id] - Update DAG metadata
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { name, description } = body;

  try {
    const dag = await prisma.dAG.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
      },
      select: {
        id: true,
        name: true,
        description: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ dag });
  } catch (error) {
    console.error("API Error updating DAG:", error);
    return NextResponse.json({ error: "Failed to update DAG", details: String(error) }, { status: 500 });
  }
}

// DELETE /api/dags/[id] - Delete DAG
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await prisma.dAG.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API Error deleting DAG:", error);
    return NextResponse.json({ error: "Failed to delete DAG", details: String(error) }, { status: 500 });
  }
}
