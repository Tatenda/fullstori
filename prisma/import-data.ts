/**
 * Import script to load data from JSON export into PostgreSQL database
 * 
 * Prerequisites:
 * 1. Update schema.prisma to use PostgreSQL provider
 * 2. Set DATABASE_URL to your PostgreSQL connection string
 * 3. Run: npx prisma db push (or npx prisma migrate dev)
 * 4. Run: npx tsx prisma/import-data.ts
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function importData() {
  console.log("Starting data import...");

  // Read export file
  const exportPath = path.join(process.cwd(), "prisma", "data-export.json");
  
  if (!fs.existsSync(exportPath)) {
    console.error(`❌ Export file not found: ${exportPath}`);
    console.error("Please run the export script first: npx tsx prisma/export-data.ts");
    process.exit(1);
  }

  const exportData = JSON.parse(fs.readFileSync(exportPath, "utf-8"));
  console.log(`📦 Importing data exported at: ${exportData.exportedAt}\n`);

  try {
    // Import in dependency order
    console.log("Importing roles...");
    for (const role of exportData.roles) {
      await prisma.role.upsert({
        where: { id: role.id },
        update: role,
        create: role,
      });
    }
    console.log(`✅ Imported ${exportData.roles.length} roles`);

    console.log("Importing relationship types...");
    for (const rt of exportData.relationshipTypes) {
      await prisma.relationshipType.upsert({
        where: { id: rt.id },
        update: rt,
        create: rt,
      });
    }
    console.log(`✅ Imported ${exportData.relationshipTypes.length} relationship types`);

    console.log("Importing event types...");
    for (const et of exportData.eventTypes) {
      await prisma.eventType.upsert({
        where: { id: et.id },
        update: et,
        create: et,
      });
    }
    console.log(`✅ Imported ${exportData.eventTypes.length} event types`);

    console.log("Importing entities...");
    for (const entity of exportData.entities) {
      await prisma.entity.upsert({
        where: { id: entity.id },
        update: entity,
        create: entity,
      });
    }
    console.log(`✅ Imported ${exportData.entities.length} entities`);

    console.log("Importing DAGs...");
    for (const dag of exportData.dags) {
      await prisma.dAG.upsert({
        where: { id: dag.id },
        update: dag,
        create: dag,
      });
    }
    console.log(`✅ Imported ${exportData.dags.length} DAGs`);

    console.log("Importing DAG nodes...");
    for (const node of exportData.dagNodes) {
      await prisma.dAGNode.upsert({
        where: { id: node.id },
        update: node,
        create: node,
      });
    }
    console.log(`✅ Imported ${exportData.dagNodes.length} DAG nodes`);

    console.log("Importing DAG edges...");
    for (const edge of exportData.dagEdges) {
      await prisma.dAGEdge.upsert({
        where: { id: edge.id },
        update: edge,
        create: edge,
      });
    }
    console.log(`✅ Imported ${exportData.dagEdges.length} DAG edges`);

    console.log("Importing events...");
    for (const event of exportData.events) {
      const { participantNodeIds, ...eventData } = event;
      
      // First upsert the event without participant nodes
      await prisma.event.upsert({
        where: { id: event.id },
        update: eventData,
        create: eventData,
      });

      // Then connect participant nodes if any
      if (participantNodeIds && participantNodeIds.length > 0) {
        await prisma.event.update({
          where: { id: event.id },
          data: {
            participantNodes: {
              set: participantNodeIds.map((id: string) => ({ id })),
            },
          },
        });
      }
    }
    console.log(`✅ Imported ${exportData.events.length} events`);

    console.log("\n✅ Import complete!");
    console.log("\nSummary:");
    console.log(`  - Roles: ${exportData.roles.length}`);
    console.log(`  - Relationship Types: ${exportData.relationshipTypes.length}`);
    console.log(`  - Event Types: ${exportData.eventTypes.length}`);
    console.log(`  - Entities: ${exportData.entities.length}`);
    console.log(`  - DAGs: ${exportData.dags.length}`);
    console.log(`  - DAG Nodes: ${exportData.dagNodes.length}`);
    console.log(`  - DAG Edges: ${exportData.dagEdges.length}`);
    console.log(`  - Events: ${exportData.events.length}`);
  } catch (error) {
    console.error("❌ Error importing data:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

importData();
