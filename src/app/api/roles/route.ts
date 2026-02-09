import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateRoleSchema = z.object({
  name: z.string().min(1, "Role name is required"),
  category: z.enum(["official", "law_enforcement", "political", "business", "witness", "suspect", "victim", "civilian"]),
});

// GET /api/roles - Fetch all roles (system and custom)
export async function GET(_request: NextRequest) {
  try {
    const roles = await prisma.role.findMany({
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });

    // Group roles by category for easier consumption
    const rolesByCategory = roles.reduce((acc, role) => {
      if (!acc[role.category]) {
        acc[role.category] = [];
      }
      acc[role.category].push(role);
      return acc;
    }, {} as Record<string, typeof roles>);

    return NextResponse.json({
      roles,
      rolesByCategory
    });
  } catch (error) {
    console.error("API Error fetching roles:", error);
    return NextResponse.json({ error: "Failed to fetch roles" }, { status: 500 });
  }
}

// POST /api/roles - Create a new role (custom role)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validData = CreateRoleSchema.parse(body);

    // Check if role already exists
    const existingRole = await prisma.role.findUnique({
      where: { name: validData.name }
    });

    if (existingRole) {
      // Return existing role instead of creating duplicate
      return NextResponse.json({
        id: existingRole.id,
        name: existingRole.name,
        category: existingRole.category,
        isSystem: existingRole.isSystem
      });
    }

    // Create new custom role
    const role = await prisma.role.create({
      data: {
        name: validData.name.trim(),
        category: validData.category,
        isSystem: false, // Custom roles are not system roles
      }
    });

    return NextResponse.json({
      id: role.id,
      name: role.name,
      category: role.category,
      isSystem: role.isSystem
    });
  } catch (error) {
    console.error("Create role error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create role", details: String(error) }, { status: 500 });
  }
}
