/**
 * Migration script to convert existing events from entity-based to node-based
 * 
 * This script:
 * 1. Finds all existing events
 * 2. For each event, finds nodes in the DAG that match the linked entities
 * 3. Updates events to link to nodes instead of entities
 * 4. If an event has exactly 2 entities, sets sourceNodeId and targetNodeId
 * 5. If an event has more than 2 entities, adds them as participantNodes
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateEvents() {
  console.log('Starting event migration from entities to nodes...');

  try {
    // Get all events - entities relationship is already removed from schema
    // We need to query the old join table directly using raw SQL
    const eventsWithEntities = await prisma.$queryRaw<Array<{
      eventId: string;
      entityId: string;
      dagId: string;
    }>>`
      SELECT eventId, entityId, dagId 
      FROM _EntityToEvent 
      JOIN Event ON _EntityToEvent.eventId = Event.id
    `;

    // Group by event ID
    const eventsMap = new Map<string, { dagId: string; entityIds: string[] }>();
    for (const row of eventsWithEntities) {
      if (!eventsMap.has(row.eventId)) {
        eventsMap.set(row.eventId, { dagId: row.dagId, entityIds: [] });
      }
      eventsMap.get(row.eventId)!.entityIds.push(row.entityId);
    }

    // Get all events
    const events = await prisma.event.findMany({
      include: {
        dag: {
          include: {
            nodes: {
              include: {
                entity: true,
              },
            },
          },
        },
      },
    });

    console.log(`Found ${events.length} events to migrate`);

    let migrated = 0;
    let skipped = 0;

    for (const event of events) {
      const eventData = eventsMap.get(event.id);
      if (!eventData || eventData.entityIds.length === 0) {
        console.log(`Skipping event ${event.id} - no entities linked`);
        skipped++;
        continue;
      }

      // Find nodes in the DAG that match the linked entities
      const matchingNodes = event.dag.nodes.filter((node) =>
        eventData.entityIds.includes(node.entityId)
      );

      if (matchingNodes.length === 0) {
        console.log(
          `Skipping event ${event.id} - no matching nodes found in DAG ${event.dagId}`
        );
        skipped++;
        continue;
      }

      // Update event based on number of nodes
      if (matchingNodes.length === 1) {
        // Single node - set as source
        await prisma.event.update({
          where: { id: event.id },
          data: {
            sourceNodeId: matchingNodes[0].id,
          },
        });
        console.log(`Migrated event ${event.id}: 1 node (source)`);
        migrated++;
      } else if (matchingNodes.length === 2) {
        // Two nodes - set as source and target
        await prisma.event.update({
          where: { id: event.id },
          data: {
            sourceNodeId: matchingNodes[0].id,
            targetNodeId: matchingNodes[1].id,
          },
        });
        console.log(
          `Migrated event ${event.id}: 2 nodes (source + target)`
        );
        migrated++;
      } else {
        // Multiple nodes - set first as source, rest as participants
        await prisma.event.update({
          where: { id: event.id },
          data: {
            sourceNodeId: matchingNodes[0].id,
            targetNodeId: matchingNodes.length >= 2 ? matchingNodes[1].id : null,
            participantNodes: {
              connect: matchingNodes.slice(2).map((node) => ({ id: node.id })),
            },
          },
        });
        console.log(
          `Migrated event ${event.id}: ${matchingNodes.length} nodes (source + target + ${matchingNodes.length - 2} participants)`
        );
        migrated++;
      }
    }

    console.log(`\nMigration complete!`);
    console.log(`- Migrated: ${migrated}`);
    console.log(`- Skipped: ${skipped}`);
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateEvents()
  .then(() => {
    console.log('Migration script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });
