import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { EntityType } from "@/lib/types";

const UpdateEntitySchema = z.object({
  name: z.string().min(2).optional(),
  roleId: z.string().optional(),
  description: z.string().optional().nullable(),
  entityType: z.enum(["human", "company", "organization"]).optional(),
});

// GET /api/entities/[id] - Get an entity by ID
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const entity = await prisma.entity.findUnique({
      where: { id },
      include: {
        roleLink: true
      }
    });

    if (!entity) {
      return NextResponse.json({ error: "Entity not found" }, { status: 404 });
    }

    return NextResponse.json({
      entity: {
        id: entity.id,
        name: entity.name,
        roleId: entity.roleId,
        roleLink: entity.roleLink,
        entityType: (entity.entityType || "human") as EntityType,
        description: entity.description || undefined,
        avatar: entity.avatar || undefined
      }
    });
  } catch (error) {
    console.error("Get entity error:", error);
    return NextResponse.json({ error: "Failed to fetch entity", details: String(error) }, { status: 500 });
  }
}

// PUT /api/entities/[id] - Update an entity
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validData = UpdateEntitySchema.parse(body);

    // Verify entity exists
    const existingEntity = await prisma.entity.findUnique({
      where: { id }
    });

    if (!existingEntity) {
      return NextResponse.json({ error: "Entity not found" }, { status: 404 });
    }

    // Verify role exists if roleId is being updated
    if (validData.roleId) {
      const role = await prisma.role.findUnique({
        where: { id: validData.roleId }
      });

      if (!role) {
        return NextResponse.json({ error: "Invalid role ID" }, { status: 400 });
      }
    }

    const updatedEntity = await prisma.entity.update({
      where: { id },
      data: {
        ...(validData.name && { name: validData.name }),
        ...(validData.roleId && { roleId: validData.roleId }),
        ...(validData.description !== undefined && { description: validData.description }),
        ...(validData.entityType && { entityType: validData.entityType }),
      },
      include: {
        roleLink: true
      }
    });

    return NextResponse.json({
      id: updatedEntity.id,
      name: updatedEntity.name,
      roleId: updatedEntity.roleId,
      roleLink: updatedEntity.roleLink,
      entityType: updatedEntity.entityType as EntityType,
      description: updatedEntity.description || undefined,
      avatar: updatedEntity.avatar || undefined
    });
  } catch (error) {
    console.error("Update entity error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update entity", details: String(error) }, { status: 500 });
  }
}
