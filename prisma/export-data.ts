/**
 * Export all data from the database to a JSON file
 * Usage: DATABASE_URL="your-local-db-url" tsx prisma/export-data.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function exportData() {
  try {
    console.log('📦 Exporting data from database...');

    // Export in dependency order to maintain referential integrity
    const roles = await prisma.role.findMany();
    console.log(`  ✓ Exported ${roles.length} roles`);

    const entities = await prisma.entity.findMany({
      include: {
        roleLink: true,
      },
    });
    console.log(`  ✓ Exported ${entities.length} entities`);

    const relationshipTypes = await prisma.relationshipType.findMany();
    console.log(`  ✓ Exported ${relationshipTypes.length} relationship types`);

    const eventTypes = await prisma.eventType.findMany();
    console.log(`  ✓ Exported ${eventTypes.length} event types`);

    const dags = await prisma.dAG.findMany();
    console.log(`  ✓ Exported ${dags.length} DAGs`);

    const nodes = await prisma.dAGNode.findMany({
      include: {
        entity: true,
      },
    });
    console.log(`  ✓ Exported ${nodes.length} nodes`);

    const edges = await prisma.dAGEdge.findMany({
      include: {
        relationshipLink: true,
      },
    });
    console.log(`  ✓ Exported ${edges.length} edges`);

    const events = await prisma.event.findMany({
      include: {
        eventType: true,
        sourceNode: true,
        targetNode: true,
        participantNodes: {
          select: { id: true },
        },
        createdEdge: true,
      },
    });
    console.log(`  ✓ Exported ${events.length} events`);

    // Create export object
    const exportData = {
      roles,
      entities: entities.map((e) => ({
        ...e,
        roleLink: undefined, // Remove nested object
      })),
      relationshipTypes,
      eventTypes,
      dags,
      nodes: nodes.map((n) => ({
        ...n,
        entity: undefined, // Remove nested object
      })),
      edges: edges.map((e) => ({
        ...e,
        relationshipLink: undefined, // Remove nested object
      })),
      events: events.map((e) => ({
        ...e,
        eventType: undefined,
        sourceNode: undefined,
        targetNode: undefined,
        participantNodeIds: e.participantNodes.map((n) => n.id),
        participantNodes: undefined,
        createdEdge: undefined,
      })),
    };

    // Write to file
    const outputPath = path.join(process.cwd(), 'prisma', 'data-export.json');
    fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));

    console.log(`\n✅ Data exported successfully to: ${outputPath}`);
    console.log(`\nSummary:`);
    console.log(`  - Roles: ${roles.length}`);
    console.log(`  - Entities: ${entities.length}`);
    console.log(`  - Relationship Types: ${relationshipTypes.length}`);
    console.log(`  - Event Types: ${eventTypes.length}`);
    console.log(`  - DAGs: ${dags.length}`);
    console.log(`  - Nodes: ${nodes.length}`);
    console.log(`  - Edges: ${edges.length}`);
    console.log(`  - Events: ${events.length}`);
  } catch (error) {
    console.error('❌ Error exporting data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

exportData();
