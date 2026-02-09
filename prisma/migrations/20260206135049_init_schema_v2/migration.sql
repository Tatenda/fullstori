-- CreateTable
CREATE TABLE "Entity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "avatar" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DAG" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DAGNode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "description" TEXT,
    "x" REAL NOT NULL,
    "y" REAL NOT NULL,
    "type" TEXT,
    "dagId" TEXT NOT NULL,
    "entityId" TEXT,
    CONSTRAINT "DAGNode_dagId_fkey" FOREIGN KEY ("dagId") REFERENCES "DAG" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DAGNode_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DAGEdge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT,
    "sourceHandle" TEXT,
    "targetHandle" TEXT,
    "dagId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    CONSTRAINT "DAGEdge_dagId_fkey" FOREIGN KEY ("dagId") REFERENCES "DAG" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DAGEdge_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DAGNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DAGEdge_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "DAGNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
