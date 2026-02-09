import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateEntitySchema = z.object({
  name: z.string().min(2),
  roleId: z.string(), // Changed from role and category
  entityType: z.enum(["human", "company", "organization"]).optional().default("human"),
  description: z.string().optional(),
});

// GET /api/entities?q=searchterm&dagId=xyz
// GET /api/entities?dagId=xyz (returns all entities in DAG)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");
  const dagId = searchParams.get("dagId");

  // If no query but dagId provided, return all entities in that DAG
  if (!query && dagId) {
    const dagNodes = await prisma.dAGNode.findMany({
      where: { dagId: dagId }, // entityId is now required, no need for { not: null }
      include: {
        entity: {
          include: {
            roleLink: true
          }
        }
      }
    });

    const entities = dagNodes
      .map(n => n.entity)
      .filter(Boolean)
      .map(entity => ({
        entity: {
          id: entity!.id,
          name: entity!.name,
          roleId: entity!.roleId,
          roleLink: entity!.roleLink,
          entityType: (entity!.entityType || "human") as "human" | "company" | "organization",
          description: entity!.description || undefined,
          avatar: entity!.avatar || undefined
        },
        inCurrentDAG: true
      }));

    return NextResponse.json(entities);
  }

  // Search mode (requires query)
  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  const entities = await prisma.entity.findMany({
    where: {
      name: { contains: query }
    },
    include: {
      roleLink: true // Include role data
    },
    take: 10
  });

  // Check DAG presence
  let dagEntityIds = new Set<string>();
  if (dagId) {
    const dagNodes = await prisma.dAGNode.findMany({
      where: { dagId: dagId }, // entityId is now required, no need for { not: null }
      select: { entityId: true }
    });
    dagEntityIds = new Set(dagNodes.map(n => n.entityId));
  }

  const results = entities.map(entity => ({
    entity: {
      id: entity.id,
      name: entity.name,
      roleId: entity.roleId,
      roleLink: entity.roleLink,
      entityType: (entity.entityType || "human") as "human" | "company" | "organization",
      description: entity.description || undefined,
      avatar: entity.avatar || undefined
    },
    inCurrentDAG: dagEntityIds.has(entity.id)
  }));

  return NextResponse.json(results);
}

// POST /api/entities
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validData = CreateEntitySchema.parse(body);

    // Verify role exists
    const role = await prisma.role.findUnique({
      where: { id: validData.roleId }
    });
    
    if (!role) {
      return NextResponse.json({ error: "Invalid role ID" }, { status: 400 });
    }

    const entity = await prisma.entity.create({
      data: {
        name: validData.name,
        roleId: validData.roleId,
        entityType: validData.entityType || "human",
        description: validData.description,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(validData.name)}&background=random`
      },
      include: {
        roleLink: true
      }
    });

    return NextResponse.json({
      id: entity.id,
      name: entity.name,
      roleId: entity.roleId,
      roleLink: entity.roleLink,
      entityType: (entity.entityType || "human") as "human" | "company" | "organization",
      description: entity.description || undefined,
      avatar: entity.avatar || undefined
    });
  } catch (error) {
    console.error("Create entity error:", error);
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }
}
