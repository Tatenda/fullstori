/**
 * Import data from JSON file to the database
 * Usage: DATABASE_URL="your-production-db-url" tsx prisma/import-data.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface ImportData {
  roles: Array<{
    id: string;
    name: string;
    category: string;
    isSystem: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  entities: Array<{
    id: string;
    name: string;
    roleId: string;
    entityType: string;
    description: string | null;
    avatar: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  relationshipTypes: Array<{
    id: string;
    name: string;
    category: string;
    createdAt: string;
    updatedAt: string;
  }>;
  eventTypes: Array<{
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  dags: Array<{
    id: string;
    name: string;
    description: string | null;
    rootLabelTop: string | null;
    rootLabelBottom: string | null;
    rootLabelLeft: string | null;
    rootLabelRight: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  nodes: Array<{
    id: string;
    category: string | null;
    x: number;
    y: number;
    type: string | null;
    dagId: string;
    entityId: string;
  }>;
  edges: Array<{
    id: string;
    label: string | null;
    relationshipTypeId: string | null;
    sourceHandle: string | null;
    targetHandle: string | null;
    dagId: string;
    sourceId: string;
    targetId: string;
    createdFromEventId: string | null;
  }>;
  events: Array<{
    id: string;
    title: string;
    description: string | null;
    date: string;
    sortOrder: number;
    eventTypeId: string;
    dagId: string;
    sourceNodeId: string | null;
    targetNodeId: string | null;
    participantNodeIds: string[];
    createdEdgeId: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
}

async function importData() {
  try {
    const inputPath = path.join(process.cwd(), 'prisma', 'data-export.json');

    if (!fs.existsSync(inputPath)) {
      throw new Error(`Export file not found: ${inputPath}`);
    }

    console.log('📥 Importing data from:', inputPath);

    const data: ImportData = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

    console.log('\n🗑️  Clearing existing data...');
    // Delete in reverse dependency order
    await prisma.event.deleteMany();
    await prisma.dAGEdge.deleteMany();
    await prisma.dAGNode.deleteMany();
    await prisma.dAG.deleteMany();
    await prisma.entity.deleteMany();
    await prisma.role.deleteMany();
    await prisma.relationshipType.deleteMany();
    await prisma.eventType.deleteMany();

    console.log('✅ Existing data cleared\n');

    // Import in dependency order
    console.log('📦 Importing data...');

    // 1. Roles
    if (data.roles.length > 0) {
      await prisma.role.createMany({
        data: data.roles.map((r) => ({
          ...r,
          createdAt: new Date(r.createdAt),
          updatedAt: new Date(r.updatedAt),
        })),
        skipDuplicates: true,
      });
      console.log(`  ✓ Imported ${data.roles.length} roles`);
    }

    // 2. Relationship Types
    if (data.relationshipTypes.length > 0) {
      await prisma.relationshipType.createMany({
        data: data.relationshipTypes.map((rt) => ({
          ...rt,
          createdAt: new Date(rt.createdAt),
          updatedAt: new Date(rt.updatedAt),
        })),
        skipDuplicates: true,
      });
      console.log(`  ✓ Imported ${data.relationshipTypes.length} relationship types`);
    }

    // 3. Event Types
    if (data.eventTypes.length > 0) {
      await prisma.eventType.createMany({
        data: data.eventTypes.map((et) => ({
          ...et,
          createdAt: new Date(et.createdAt),
          updatedAt: new Date(et.updatedAt),
        })),
        skipDuplicates: true,
      });
      console.log(`  ✓ Imported ${data.eventTypes.length} event types`);
    }

    // 4. Entities
    if (data.entities.length > 0) {
      await prisma.entity.createMany({
        data: data.entities.map((e) => ({
          ...e,
          createdAt: new Date(e.createdAt),
          updatedAt: new Date(e.updatedAt),
        })),
        skipDuplicates: true,
      });
      console.log(`  ✓ Imported ${data.entities.length} entities`);
    }

    // 5. DAGs
    if (data.dags.length > 0) {
      await prisma.dAG.createMany({
        data: data.dags.map((d) => ({
          ...d,
          createdAt: new Date(d.createdAt),
          updatedAt: new Date(d.updatedAt),
        })),
        skipDuplicates: true,
      });
      console.log(`  ✓ Imported ${data.dags.length} DAGs`);
    }

    // 6. Nodes
    if (data.nodes.length > 0) {
      await prisma.dAGNode.createMany({
        data: data.nodes,
        skipDuplicates: true,
      });
      console.log(`  ✓ Imported ${data.nodes.length} nodes`);
    }

    // 7. Edges
    if (data.edges.length > 0) {
      await prisma.dAGEdge.createMany({
        data: data.edges,
        skipDuplicates: true,
      });
      console.log(`  ✓ Imported ${data.edges.length} edges`);
    }

    // 8. Events (with many-to-many relationships)
    if (data.events.length > 0) {
      for (const eventData of data.events) {
        const { participantNodeIds, ...eventFields } = eventData;
        await prisma.event.create({
          data: {
            ...eventFields,
            date: new Date(eventData.date),
            createdAt: new Date(eventData.createdAt),
            updatedAt: new Date(eventData.updatedAt),
            participantNodes: {
              connect: participantNodeIds.map((id) => ({ id })),
            },
          },
        });
      }
      console.log(`  ✓ Imported ${data.events.length} events`);
    }

    console.log('\n✅ Data imported successfully!');
    console.log('\nSummary:');
    console.log(`  - Roles: ${data.roles.length}`);
    console.log(`  - Entities: ${data.entities.length}`);
    console.log(`  - Relationship Types: ${data.relationshipTypes.length}`);
    console.log(`  - Event Types: ${data.eventTypes.length}`);
    console.log(`  - DAGs: ${data.dags.length}`);
    console.log(`  - Nodes: ${data.nodes.length}`);
    console.log(`  - Edges: ${data.edges.length}`);
    console.log(`  - Events: ${data.events.length}`);
  } catch (error) {
    console.error('❌ Error importing data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

importData();
