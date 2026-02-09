# Event Creation Paths & Outcomes

## Overview
Events can be created from two entry points in the application, each with different default behaviors and outcomes.

---

## Entry Point 1: Timeline View

### Location
- **Page**: `/dag/[id]?view=timeline`
- **Trigger**: Click "Add Event" button in timeline header

### Initial State
- ✅ **Source Node**: NOT pre-selected (empty)
- ✅ **Target Node**: Empty
- ✅ **Participants**: Empty
- ✅ **Event Type**: Defaults to first available event type
- ✅ **Date**: Defaults to today's date

### User Flow Options

#### Path 1A: Source Only Event
**User Actions:**
1. Select source node from dropdown
2. (Optional) Add participants
3. Fill event details (title, date, type, description)
4. Submit

**Outcomes:**
- ✅ Event created with `sourceNodeId` set
- ✅ Event appears in timeline
- ✅ Event linked to source node (visible in node sidebar)
- ❌ No edge created (no target node)
- ❌ No new nodes created

---

#### Path 1B: Source + Existing Target
**User Actions:**
1. Select source node from dropdown
2. Select existing target node from dropdown
3. (Optional) Check "Create edge" checkbox (auto-enabled if both selected)
4. (Optional) Add participants
5. Fill event details
6. Submit

**Outcomes:**
- ✅ Event created with `sourceNodeId` and `targetNodeId` set
- ✅ Event appears in timeline
- ✅ Event linked to both nodes
- ✅ **Edge created** (if checkbox checked) between source → target with event title as label
- ✅ Edge appears on graph view
- ❌ No new nodes created

---

#### Path 1C: Source + New Target (CREATE NEW NODE)
**User Actions:**
1. Select source node from dropdown
2. Click "Create New" button next to target field
3. Fill in new target form:
   - Name (required)
   - Role (required, defaults to first civilian role)
   - Entity Type (defaults to "human")
   - Description (optional)
4. Submit form (creates entity + node automatically)
5. New target is auto-selected
6. "Create edge" checkbox auto-enabled
7. Fill event details
8. Submit event

**Outcomes:**
- ✅ **New Entity created** in database
- ✅ **New Node created** on graph (positioned smartly near source)
- ✅ Event created with `sourceNodeId` and `targetNodeId` (new node)
- ✅ Event appears in timeline
- ✅ Event linked to both nodes
- ✅ **Edge created** (auto-enabled) between source → new target
- ✅ Edge appears on graph view
- ✅ New node visible on graph view

**Technical Details:**
- Entity created via `POST /api/entities`
- Node created via `createNodeFromEntity()` function
- Node positioned using `calculateSmartPosition()` relative to source
- Node saved to DAG via `POST /api/dag/[id]`

---

#### Path 1D: Target Only Event
**User Actions:**
1. Leave source empty
2. Select target node (existing or create new)
3. (Optional) Add participants
4. Fill event details
5. Submit

**Outcomes:**
- ✅ Event created with `targetNodeId` set (no source)
- ✅ Event appears in timeline
- ✅ Event linked to target node
- ❌ No edge created (no source node)
- ✅ New node created if "Create New" was used for target

---

#### Path 1E: Participants Only Event
**User Actions:**
1. Leave source and target empty
2. Add one or more participants
3. Fill event details
4. Submit

**Outcomes:**
- ✅ Event created with `participantNodeIds` array
- ✅ Event appears in timeline
- ✅ Event linked to all participant nodes
- ❌ No edge created
- ❌ No new nodes created

---

## Entry Point 2: Sidebar (Graph View)

### Location
- **Page**: `/dag/[id]` (graph view)
- **Trigger**: Click "Add Event" button in node sidebar (when a node is selected)

### Initial State
- ✅ **Source Node**: **PRE-SELECTED** (the selected node)
- ✅ **Target Node**: Empty
- ✅ **Participants**: Empty
- ✅ **Event Type**: Defaults to first available event type
- ✅ **Date**: Defaults to today's date

### User Flow Options

#### Path 2A: Source (Pre-filled) + Existing Target
**User Actions:**
1. Source node already selected (from sidebar)
2. Select existing target node from dropdown
3. "Create edge" checkbox auto-enabled
4. (Optional) Add participants
5. Fill event details
6. Submit

**Outcomes:**
- ✅ Event created with `sourceNodeId` (pre-filled) and `targetNodeId` set
- ✅ Event appears in timeline
- ✅ Event linked to both nodes
- ✅ **Edge created** (if checkbox checked) between source → target
- ✅ Edge appears on graph view
- ❌ No new nodes created

---

#### Path 2B: Source (Pre-filled) + New Target (CREATE NEW NODE)
**User Actions:**
1. Source node already selected (from sidebar)
2. Click "Create New" button next to target field
3. Fill in new target form (same as Path 1C)
4. Submit form (creates entity + node)
5. New target auto-selected, edge checkbox auto-enabled
6. Fill event details
7. Submit event

**Outcomes:**
- ✅ **New Entity created** in database
- ✅ **New Node created** on graph (positioned near pre-selected source)
- ✅ Event created with `sourceNodeId` (pre-filled) and `targetNodeId` (new)
- ✅ Event appears in timeline
- ✅ Event linked to both nodes
- ✅ **Edge created** (auto-enabled) between source → new target
- ✅ Edge appears on graph view
- ✅ New node visible on graph view

**Technical Details:**
- New node positioned relative to pre-selected source node
- Related node IDs passed to `createNodeFromEntity()` for smart positioning

---

#### Path 2C: Source (Pre-filled) Only
**User Actions:**
1. Source node already selected (from sidebar)
2. Leave target empty
3. (Optional) Add participants
4. Fill event details
5. Submit

**Outcomes:**
- ✅ Event created with `sourceNodeId` (pre-filled) only
- ✅ Event appears in timeline
- ✅ Event linked to source node
- ❌ No edge created (no target)
- ❌ No new nodes created

---

#### Path 2D: Source (Pre-filled) + Participants
**User Actions:**
1. Source node already selected (from sidebar)
2. Leave target empty
3. Add one or more participants
4. Fill event details
5. Submit

**Outcomes:**
- ✅ Event created with `sourceNodeId` (pre-filled) and `participantNodeIds`
- ✅ Event appears in timeline
- ✅ Event linked to source + all participants
- ❌ No edge created
- ❌ No new nodes created

---

## Validation Rules

### Required Fields
- ✅ **Title**: Must not be empty
- ✅ **Date**: Must be provided
- ✅ **Event Type**: Must select existing type OR provide custom type name
- ✅ **At least one node**: Must have source, target, OR participants

### Optional Fields
- Description
- Custom event type name
- Edge creation (only if both source and target exist)

---

## Edge Creation Logic

### When Edges Are Created
- ✅ Only if `createEdge === true` AND both `sourceNodeId` and `targetNodeId` exist
- ✅ Edge label = event title
- ✅ Edge links source → target
- ✅ Edge references event via `createdFromEventId`
- ✅ Event references edge via `createdEdgeId`
- ❌ Edge NOT created if edge already exists between those nodes

### Edge Auto-Enable
- ✅ Auto-enabled when both source and target are selected
- ✅ Can be manually unchecked
- ✅ Only visible when both source and target exist

---

## Node Creation Logic (New Target)

### When New Nodes Are Created
- ✅ Only when user clicks "Create New" for target node
- ✅ Requires `onCreateNode` function to be available
- ✅ Creates entity first, then node

### Node Positioning
- ✅ Uses `calculateSmartPosition()` relative to source node (if exists)
- ✅ Uses `findNonConflictingPosition()` to avoid overlaps
- ✅ If no source, positions at viewport center or (0,0)

### Default Values for New Target
- **Name**: User input (required)
- **Role**: First civilian role (or first available role)
- **Entity Type**: "human"
- **Description**: Optional

---

## API Endpoints Used

### Event Creation
- `POST /api/events`
  - Creates event record
  - Links to nodes (source, target, participants)
  - Optionally creates edge
  - Returns event with full node/entity data

### Entity Creation
- `POST /api/entities`
  - Creates new entity
  - Requires: name, roleId
  - Optional: entityType, description

### Node Creation
- `POST /api/dag/[id]`
  - Saves node to DAG
  - Requires: entityId (links to entity)
  - Sets position, type, category

### Event Type Creation
- Auto-created if custom type name provided
- `POST /api/events` handles creation internally
- Checks for duplicates before creating

---

## Error Scenarios

### Validation Errors
- ❌ Missing title → Toast error, form not submitted
- ❌ Missing date → API returns 400 error
- ❌ Missing event type → Toast error, form not submitted
- ❌ No nodes linked → Toast error, form not submitted
- ❌ Source node not in DAG → API returns 400 error
- ❌ Target node not in DAG → API returns 400 error

### Creation Errors
- ❌ Entity creation fails → Toast error, node creation aborted
- ❌ Node creation fails → Toast error, event creation continues but target not set
- ❌ Event creation fails → Toast error, all changes rolled back
- ❌ Edge creation fails → Event still created, but no edge

---

## State Updates After Event Creation

### Timeline View
- ✅ Events list refreshed
- ✅ DAG stats updated (event count)
- ✅ Dialog closed
- ✅ Success toast shown

### Graph View (Sidebar)
- ✅ Events list refreshed in sidebar
- ✅ Dialog closed
- ✅ Success toast shown
- ✅ If new node created: Graph view should refresh to show new node (if user switches views)

---

## Summary Table

| Path | Source | Target | Participants | Edge Created? | New Node Created? | New Entity Created? |
|------|--------|--------|--------------|---------------|-------------------|---------------------|
| 1A   | Selected | None | Optional | ❌ | ❌ | ❌ |
| 1B   | Selected | Existing | Optional | ✅ (if checked) | ❌ | ❌ |
| 1C   | Selected | **New** | Optional | ✅ (auto) | ✅ | ✅ |
| 1D   | None | Selected/New | Optional | ❌ | ✅ (if new) | ✅ (if new) |
| 1E   | None | None | Required | ❌ | ❌ | ❌ |
| 2A   | Pre-filled | Existing | Optional | ✅ (if checked) | ❌ | ❌ |
| 2B   | Pre-filled | **New** | Optional | ✅ (auto) | ✅ | ✅ |
| 2C   | Pre-filled | None | Optional | ❌ | ❌ | ❌ |
| 2D   | Pre-filled | None | Required | ❌ | ❌ | ❌ |

---

## Key Differences: Timeline vs Sidebar

| Aspect | Timeline View | Sidebar (Graph View) |
|--------|---------------|---------------------|
| Source Node | Must select manually | Pre-filled from selected node |
| Context | No node context | Node-specific context |
| Node Creation | Available via "Create New" | Available via "Create New" |
| Edge Creation | Manual checkbox | Auto-enabled when both selected |
| Use Case | General event logging | Event from specific node |

---

## Notes

1. **Source node must always exist** - Cannot create new source node, only target
2. **New target creation** requires `onCreateNode` function (available in Timeline and Sidebar)
3. **Edge creation** is optional even when both source and target exist
4. **Participants** can be added to any event type
5. **Custom event types** are auto-created if name doesn't exist
6. **All events** require at least one node link (source, target, or participants)
