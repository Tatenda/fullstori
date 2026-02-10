import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NetworkNode } from "@/lib/types";

// GET /api/dag/[id] - Fetch DAG
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Params are now Promises in Next 15+ (backwards compatible in 14 via await types but safe pattern)
) {
  const { id } = await params;

  try {
    let dag = await prisma.dAG.findUnique({
      where: { id },
      include: {
        nodes: { 
          include: { 
            entity: {
              include: {
                roleLink: true // Role is on entity, not node
              }
            }
          } 
        },
        edges: {
          include: {
            relationshipLink: true, // Include relationship type data
          }
        },
        _count: {
          select: {
            nodes: true,
            edges: true,
            events: true,
          },
        },
      }
    });

    // MVP: Auto-create seed DAG if not found
    if (!dag) {
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

      // Create entity for root node first
      const rootEntity = await prisma.entity.create({
        data: {
          name: `Investigation ${id.slice(-6)}`,
          roleId: rootRole.id,
          description: null,
          entityType: "organization",
        },
      });

      dag = await prisma.dAG.create({
        data: {
          id, 
          name: `Investigation ${id.slice(-6)}`,
          description: null,
          nodes: {
            create: {
              entityId: rootEntity.id, // Required: link to entity
              x: 0,
              y: 0,
              type: "root"
            }
          }
        },
        include: {
          nodes: { 
            include: { 
              entity: {
                include: {
              roleLink: true
            } 
              }
            } 
          },
          edges: {
            include: {
              relationshipLink: true, // Include relationship type data
            }
          },
          _count: {
            select: {
              nodes: true,
              edges: true,
              events: true,
            },
          },
        }
      });
    }

    // Ensure root node exists - if DAG has no nodes or no root node, create one
    if (!dag.nodes || dag.nodes.length === 0 || !dag.nodes.some(n => n.type === 'root')) {
      console.log("⚠️ DAG missing root node, creating one...");
      // Get or create the Root role
      let rootRole = await prisma.role.findFirst({ where: { name: "Root" } });
      if (!rootRole) {
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
          name: dag.name,
          roleId: rootRole.id,
          description: dag.description || null,
          entityType: "organization", // Root nodes typically represent investigations/organizations
        },
      });

      // Create root node linked to entity
      const rootNode = await prisma.dAGNode.create({
        data: {
          dagId: dag.id,
          entityId: rootEntity.id, // Required: link to entity
          x: 0,
          y: 0,
          type: "root",
        },
        include: {
          entity: {
            include: {
              roleLink: true
            }
          },
        },
      });

      dag.nodes.push(rootNode);
      console.log("✅ Root node and entity created:", rootNode.id, rootEntity.id);
      
      // Reload DAG with _count after creating root node
      dag = await prisma.dAG.findUnique({
        where: { id: dag.id },
        include: {
          nodes: { 
            include: { 
              entity: {
                include: {
                  roleLink: true
                }
              }
            } 
          },
          edges: {
            include: {
              relationshipLink: true, // Include relationship type data
            }
          },
          _count: {
            select: {
              nodes: true,
              edges: true,
              events: true,
            },
          },
        }
      });
      
      if (!dag) {
        throw new Error("Failed to reload DAG after creating root node");
      }
    }

    // Transform to Frontend Format - Entity is single source of truth
    const nodes: NetworkNode[] = dag.nodes.map(node => {
      if (!node.entity) {
        throw new Error(`Node ${node.id} is missing required entity`);
      }
      
      // Determine node type based on entity role, not stored type
      // Only root nodes should be 'root', and only actual evidence leaders should be 'evidenceLeader'
      let nodeType: string = 'custom';
      if (node.type === 'root') {
        nodeType = 'root'; // Preserve root nodes
      } else {
        // Check if entity's role name indicates it's an evidence leader
        const roleName = node.entity.roleLink?.name?.toLowerCase() || '';
        if (roleName.includes('evidence leader') || roleName.includes('evidenceleader')) {
          nodeType = 'evidenceLeader';
        } else {
          // All other nodes should be 'custom', regardless of what's stored in DB
          nodeType = 'custom';
        }
      }
      
      // Add direction labels for root nodes
      const directionLabels = nodeType === 'root' && (
        dag.rootLabelTop || dag.rootLabelBottom || dag.rootLabelLeft || dag.rootLabelRight
      ) ? {
        top: dag.rootLabelTop || undefined,
        bottom: dag.rootLabelBottom || undefined,
        left: dag.rootLabelLeft || undefined,
        right: dag.rootLabelRight || undefined,
      } : undefined;
      
      return {
      id: node.id,
      type: nodeType,
      position: { x: node.x, y: node.y },
      data: {
          label: node.entity.name, // From entity
          roleId: node.entity.roleId, // From entity
          role: node.entity.roleLink.name, // From entity's role
          category: (node.category || node.entity.roleLink.category) as any, // Override or from entity's role
          description: node.entity.description || undefined, // From entity
          avatar: node.entity.avatar || undefined, // From entity
          entityId: node.entityId, // Required
          directionLabels: directionLabels // Root node directional labels
      }
      };
    });

    const edges = dag.edges.map(edge => {
        // Use relationshipLink.name if relationshipTypeId exists, otherwise use label
        const edgeLabel = edge.relationshipLink?.name || edge.label || undefined;
        
        return {
            id: edge.id,
            source: edge.sourceId,
            target: edge.targetId,
            label: edgeLabel,
            relationshipTypeId: edge.relationshipTypeId || undefined,
            sourceHandle: edge.sourceHandle || undefined,
            targetHandle: edge.targetHandle || undefined,
            style: { stroke: '#cbd5e1', strokeWidth: 2 },
            labelStyle: { fill: '#64748b', fontWeight: 700, fontSize: 11 },
            labelBgStyle: { fill: '#f8fafc', rx: 6, ry: 6 },
            markerEnd: {
                type: 'arrowclosed',
                color: '#cbd5e1',
                width: 20,
                height: 20,
            },
        };
    });

    return NextResponse.json({ nodes, edges, dag });
  } catch (error) {
    console.error("API Error fetching DAG:", error);
    return NextResponse.json({ error: "Failed to fetch DAG", details: String(error) }, { status: 500 });
  }
}

// POST /api/dag/[id] - Save DAG
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { nodes, edges } = body;

  try {
    // Validate input data first
    if (!Array.isArray(nodes)) {
      return NextResponse.json({ error: "Invalid nodes data" }, { status: 400 });
    }
    if (!Array.isArray(edges)) {
      return NextResponse.json({ error: "Invalid edges data" }, { status: 400 });
    }

    // Verify DAG exists before starting transaction
    const dagExists = await prisma.dAG.findUnique({
      where: { id },
      select: { id: true }
    });
    if (!dagExists) {
      return NextResponse.json({ error: "DAG not found" }, { status: 404 });
    }

    // Pre-validate all nodes before transaction
    for (const node of nodes) {
      if (!node || !node.id) {
        return NextResponse.json({ error: `Invalid node structure: missing id` }, { status: 400 });
      }
      if (!node.data?.entityId) {
        return NextResponse.json({ error: `Node ${node.id} is missing required entityId` }, { status: 400 });
      }
      if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
        return NextResponse.json({ error: `Node ${node.id} has invalid position data` }, { status: 400 });
      }
    }

    // Pre-validate all edges before transaction
    for (const edge of edges) {
      if (!edge || !edge.id) {
        return NextResponse.json({ error: `Invalid edge structure: missing id` }, { status: 400 });
      }
      if (!edge.source || !edge.target) {
        return NextResponse.json({ error: `Edge ${edge.id} is missing required source or target` }, { status: 400 });
      }
    }

    await prisma.$transaction(async (tx) => {
      // 1. Sync Nodes
      // Delete missing nodes (but never delete root nodes)
      const sentNodeIds = nodes.map((n: any) => n.id).filter((id: any) => id != null && typeof id === 'string');
      
      if (sentNodeIds.length > 0) {
        try {
          await tx.dAGNode.deleteMany({
            where: {
              dagId: id,
              id: { notIn: sentNodeIds },
              type: { not: "root" } // Never delete root nodes
            }
          });
        } catch (error) {
          console.error("Error deleting nodes:", error);
          throw error;
        }
      }

      // Upsert existing - Only save position/type, entity data is managed separately
      for (const node of nodes) {
        const entityId = node.data.entityId;

        // Verify entity exists before upserting node
        const entity = await tx.entity.findUnique({
          where: { id: entityId },
          include: {
            roleLink: true
          }
        });
        if (!entity) {
          throw new Error(`Entity ${entityId} not found for node ${node.id}`);
        }

        // Root nodes are always fixed at (0, 0)
        const isRootNode = node.type === 'root';
        const finalX = isRootNode ? 0 : node.position.x;
        const finalY = isRootNode ? 0 : node.position.y;

        // Determine node type based on entity role, not what's sent from frontend
        let nodeType: string | null = null;
        if (isRootNode) {
          nodeType = 'root'; // Preserve root nodes
        } else {
          // Check if entity's role name indicates it's an evidence leader
          const roleName = entity.roleLink?.name?.toLowerCase() || '';
          if (roleName.includes('evidence leader') || roleName.includes('evidenceleader')) {
            nodeType = 'evidenceLeader';
          } else {
            // All other nodes should be 'custom'
            nodeType = 'custom';
          }
        }

        await tx.dAGNode.upsert({
          where: { id: node.id },
          update: {
            x: finalX,
            y: finalY,
            category: node.data?.category || null, // Optional category override
            type: nodeType,
            // Note: entityId, label, roleId, description are NOT updated here
            // They come from the Entity (single source of truth)
          },
          create: {
            id: node.id,
            dagId: id,
            entityId: entityId, // Required
            x: finalX,
            y: finalY,
            category: node.data?.category || null,
            type: nodeType,
          }
        });
      }

      // 2. Sync Edges
      // Delete missing
      const sentEdgeIds = edges.map((e: any) => e.id).filter((id: any) => id != null);
      
      if (sentEdgeIds.length > 0) {
        await tx.dAGEdge.deleteMany({
          where: {
            dagId: id,
            id: { notIn: sentEdgeIds }
          }
        });
      }

      // Upsert existing
      for (const edge of edges) {
        // Validate edge structure
        if (!edge || !edge.id) {
          throw new Error(`Invalid edge structure: missing id`);
        }
        if (!edge.source || !edge.target) {
          throw new Error(`Edge ${edge.id} is missing required source or target`);
        }

        // If relationshipTypeId is provided, use it; otherwise use label for custom relationships
        const relationshipTypeId = edge.relationshipTypeId || null;
        const label = relationshipTypeId ? null : (edge.label || null); // Only use label if no relationshipTypeId
        
        await tx.dAGEdge.upsert({
          where: { id: edge.id },
          update: {
            relationshipTypeId,
            label,
            sourceHandle: edge.sourceHandle || null,
            targetHandle: edge.targetHandle || null
          },
          create: {
            id: edge.id,
            dagId: id,
            sourceId: edge.source,
            targetId: edge.target,
            relationshipTypeId,
            label,
            sourceHandle: edge.sourceHandle || null,
            targetHandle: edge.targetHandle || null
          }
        });
      }
    }, {
      timeout: 30000 // 30 second timeout
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("API Error saving DAG:", error);
    
    // Handle Prisma transaction errors specifically
    if (error?.code === 'P2028') {
      return NextResponse.json({ 
        error: "Transaction failed - the database operation was interrupted. Please try again.",
        details: error.message 
      }, { status: 500 });
    }
    
    // Handle Prisma validation errors
    if (error?.code && error.code.startsWith('P')) {
      return NextResponse.json({ 
        error: "Database error occurred",
        details: error.message,
        code: error.code
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      error: "Failed to save DAG", 
      details: error?.message || String(error) 
    }, { status: 500 });
  }
}

// PUT /api/dag/[id] - Update DAG metadata (including root labels)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { rootLabelTop, rootLabelBottom, rootLabelLeft, rootLabelRight, name, description } = body;

  try {
    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (rootLabelTop !== undefined) updateData.rootLabelTop = rootLabelTop || null;
    if (rootLabelBottom !== undefined) updateData.rootLabelBottom = rootLabelBottom || null;
    if (rootLabelLeft !== undefined) updateData.rootLabelLeft = rootLabelLeft || null;
    if (rootLabelRight !== undefined) updateData.rootLabelRight = rootLabelRight || null;

    const updatedDAG = await prisma.dAG.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        description: true,
        rootLabelTop: true,
        rootLabelBottom: true,
        rootLabelLeft: true,
        rootLabelRight: true,
      }
    });

    return NextResponse.json({ dag: updatedDAG });
  } catch (error) {
    console.error("API Error updating DAG:", error);
    return NextResponse.json({ error: "Failed to update DAG", details: String(error) }, { status: 500 });
  }
}
