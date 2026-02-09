import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/dags - List all DAGs
export async function GET(_request: NextRequest) {
  try {
    const dags = await prisma.dAG.findMany({
      orderBy: { updatedAt: 'desc' },
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

    return NextResponse.json({ dags });
  } catch (error) {
    console.error("API Error fetching DAGs:", error);
    return NextResponse.json({ error: "Failed to fetch DAGs", details: String(error) }, { status: 500 });
  }
}

// POST /api/dags - Create a new DAG
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: "DAG name is required" }, { status: 400 });
    }

    // Get or create the Root role for the initial node
    let rootRole = await prisma.role.findFirst({ where: { name: "Root" } });
    if (!rootRole) {
      // Auto-create Root role if it doesn't exist (defensive programming)
      rootRole = await prisma.role.create({
        data: {
          name: "Root",
          category: "official",
          isSystem: true,
        },
      });
    }

    // Create entity for root node
    const rootEntity = await prisma.entity.create({
      data: {
        name: name.trim(),
        roleId: rootRole.id,
        description: description?.trim() || null,
        entityType: "organization", // Root nodes typically represent investigations/organizations
      },
    });

    const dag = await prisma.dAG.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        nodes: {
          create: {
            entityId: rootEntity.id, // Required: link to entity
            x: 0,
            y: 0,
            type: "root",
          },
        },
      },
      include: {
        nodes: {
          include: {
            entity: {
              include: {
                roleLink: true
              }
            },
          },
        },
        _count: {
          select: {
            nodes: true,
            edges: true,
            events: true,
          },
        },
      },
    });

    // Verify root node was created
    if (!dag.nodes || dag.nodes.length === 0) {
      console.error("WARNING: Root node was not created for DAG:", dag.id);
    } else {
      console.log("✅ Root node and entity created successfully:", dag.nodes[0].id, rootEntity.id);
    }

    return NextResponse.json({ dag });
  } catch (error) {
    console.error("API Error creating DAG:", error);
    return NextResponse.json({ error: "Failed to create DAG", details: String(error) }, { status: 500 });
  }
}
