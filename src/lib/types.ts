export type RoleCategory = "official" | "law_enforcement" | "political" | "witness" | "suspect" | "victim" | "civilian" | "business";

export type Role = string; // Broaden to allow specific titles like "Commissioner", "Hawk"

export type Direction = 'top' | 'bottom' | 'left' | 'right';

export interface NodeData {
  label: string;
  roleId: string; // ID reference to Role
  role?: string; // Role name for display (optional, derived from roleLink)
  description?: string;
  category?: RoleCategory; // Explicit override or derived from roleLink
  avatar?: string;
  onAddConnection?: (direction?: Direction) => void;
  onExplore?: () => void; // Callback to trigger zoom out from root
  entityId?: string; // Link to the underlying entity
  // Root node directional labels (optional, for root nodes only)
  directionLabels?: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
}

export interface EdgeData {
  label?: string;
}

export interface NetworkNode {
  id: string;
  position: { x: number; y: number };
  data: NodeData;
  type?: string; 
}

// DAG & Entity Types
export type EntityType = "human" | "company" | "organization";

export interface Entity {
  id: string;
  name: string;
  roleId: string; // Reference to Role
  roleLink?: { // Role data from relationship
    id: string;
    name: string;
    category: RoleCategory;
  };
  entityType?: EntityType; // "human" | "company" | "organization"
  description?: string;
  avatar?: string;
}

export interface DAG {
  id: string;
  name: string;
  entities: Set<string>; // Set of Entity IDs present in this DAG
  nodes: NetworkNode[];
  edges: any[]; 
  created_at: Date;
  updated_at: Date;
}

export interface EntitySearchResult {
  entity: Entity;
  inCurrentDAG: boolean;
}
export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
  label?: string;
}

export interface EventType {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

export interface Tag {
  id: string;
  name: string;
  color: string | null;
}

export interface Event {
  id: string;
  title: string;
  description: string | null;
  date: string | null; // ISO string from JSON, optional for events from other DAGs
  seriesDay: number | null; // Optional: day number in a series (e.g., "Day 1", "Day 56")
  sortOrder: number; // Custom order for events on the same day
  eventTypeId: string;
  eventType: EventType;
  dagId: string;
  sourceDagId?: string | null; // Optional: if event is from another DAG
  sourceDag?: {
    id: string;
    name: string;
  } | null;
  tags?: Tag[];
  // Node relationships
  sourceNodeId?: string | null;
  sourceNode?: {
    id: string;
    entity: Entity;
  } | null;
  targetNodeId?: string | null;
  targetNode?: {
    id: string;
    entity: Entity;
  } | null;
  participantNodes?: Array<{
    id: string;
    entity: Entity;
  }>;
  createdEdgeId?: string | null;
}
