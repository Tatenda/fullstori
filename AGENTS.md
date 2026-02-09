# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Madlanga is an interactive DAG (Directed Acyclic Graph) visualization tool for mapping relationships between entities. Built for investigative journalism contexts (commission inquiries, state capture investigations), it allows users to visually construct networks of people, organizations, and their connections.

## Commands

```bash
# Development (runs on port 3003)
npm run dev

# Build
npm run build

# Lint
npm run lint

# Database
npx prisma generate    # Generate Prisma client after schema changes
npx prisma db push     # Push schema changes to database
npx prisma studio      # Open database GUI
```

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript (strict mode)
- Prisma with SQLite (`dev.db`)
- React Flow for graph visualization
- Tailwind CSS v4 with `clsx` + `tailwind-merge`
- Zod for API validation

## Architecture

### Directory Structure

- `src/app/` - Next.js App Router pages and API routes
- `src/app/api/dag/[id]/` - DAG CRUD endpoints (GET fetches or creates, POST saves)
- `src/app/api/entities/` - Entity search and creation
- `src/components/` - React Flow custom nodes and UI dialogs
- `src/lib/` - Shared utilities
- `prisma/` - Database schema

### Data Model

The app models three core entities:
- **Entity** - A persistent person/organization with a role category
- **DAGNode** - A visual node in the graph, optionally linked to an Entity
- **DAGEdge** - A labeled connection between nodes

Role categories determine visual styling: `official`, `law_enforcement`, `political`, `witness`, `suspect`, `victim`, `business`, `civilian`

### Key Patterns

**Custom React Flow Nodes**: Three node types (`custom`, `root`, `evidenceLeader`) in `src/components/`. Each has directional handles (top/bottom/left/right) for edge routing.

**Role-based Styling**: `src/lib/roleUtils.tsx` maps roles to categories and provides consistent styling (colors, icons) across the app.

**API Structure**: Next.js 15+ pattern with async `params` in route handlers:
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // ...
}
```

**State Hydration**: Nodes loaded from the API need handler functions injected client-side (see `MadlangaNetwork.tsx` hydration pattern).

## Important Notes

- The dev server uses port **3003**, not the default 3000
- Database is local SQLite file (`dev.db`) - no migrations, just `db push`
- The `@/*` path alias maps to `./src/*`
