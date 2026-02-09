/**
 * Export script to dump all data from SQLite database to JSON
 * Run with: npx tsx prisma/export-data.ts
 */

import { PrismaClient, Prisma } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function exportData() {
  console.log("Starting data export...");

  try {
    // Export all tables in dependency order
    const roles = await prisma.role.findMany();
    console.log(`Exported ${roles.length} roles`);

    const relationshipTypes = await prisma.relationshipType.findMany();
    console.log(`Exported ${relationshipTypes.length} relationship types`);

    const eventTypes = await prisma.eventType.findMany();
    console.log(`Exported ${eventTypes.length} event types`);

    const entities = await prisma.entity.findMany();
    console.log(`Exported ${entities.length} entities`);

    const dags = await prisma.dAG.findMany();
    console.log(`Exported ${dags.length} DAGs`);

    const dagNodes = await prisma.dAGNode.findMany();
    console.log(`Exported ${dagNodes.length} DAG nodes`);

    const dagEdges = await prisma.dAGEdge.findMany();
    console.log(`Exported ${dagEdges.length} DAG edges`);

    const events = await prisma.event.findMany({
      include: {
        participantNodes: {
          select: { id: true },
        },
      },
    });
    console.log(`Exported ${events.length} events`);

    // Create export object
    // Type the event with participants using Awaited and ReturnType
    type EventWithParticipants = Awaited<
      ReturnType<typeof prisma.event.findMany<{
        include: { participantNodes: { select: { id: true } } };
      }>>
    >[number];

    const exportData = {
      exportedAt: new Date().toISOString(),
      roles,
      relationshipTypes,
      eventTypes,
      entities,
      dags,
      dagNodes,
      dagEdges,
      events: events.map((event: EventWithParticipants) => ({
        ...event,
        participantNodeIds: event.participantNodes.map((n) => n.id),
        participantNodes: undefined, // Remove the nested objects
      })),
    };

    // Write to file
    const exportPath = path.join(process.cwd(), "prisma", "data-export.json");
    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));

    console.log(`\n✅ Export complete! Data saved to: ${exportPath}`);
    console.log(`\nSummary:`);
    console.log(`  - Roles: ${roles.length}`);
    console.log(`  - Relationship Types: ${relationshipTypes.length}`);
    console.log(`  - Event Types: ${eventTypes.length}`);
    console.log(`  - Entities: ${entities.length}`);
    console.log(`  - DAGs: ${dags.length}`);
    console.log(`  - DAG Nodes: ${dagNodes.length}`);
    console.log(`  - DAG Edges: ${dagEdges.length}`);
    console.log(`  - Events: ${events.length}`);
  } catch (error) {
    console.error("Error exporting data:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

exportData();
