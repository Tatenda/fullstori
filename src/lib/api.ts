import { NetworkNode, EntitySearchResult, Entity } from "./types";

/**
 * Fetch a DAG by ID
 */
export async function fetchDAG(id: string) {
  const res = await fetch(`/api/dag/${id}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    console.error("Fetch DAG Error:", res.status, res.statusText, errorData);
    throw new Error(`Failed to fetch DAG: ${errorData.details || res.statusText}`);
  }
  return res.json();
}

/**
 * Save a DAG
 */
export async function saveDAG(id: string, nodes: NetworkNode[], edges: any[]) {
  const res = await fetch(`/api/dag/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nodes, edges }),
  });
  if (!res.ok) throw new Error("Failed to save DAG");
  return res.json();
}

/**
 * Search Entities
 */
export async function searchEntities(query: string, dagId?: string): Promise<EntitySearchResult[]> {
  const params = new URLSearchParams({ q: query });
  if (dagId) params.append("dagId", dagId);

  const res = await fetch(`/api/entities?${params.toString()}`);
  if (!res.ok) return [];
  return res.json();
}

/**
 * Create Entity
 */
export async function createEntity(data: { name: string; roleId: string; entityType?: "human" | "company" | "organization"; description?: string }): Promise<Entity> {
  const res = await fetch("/api/entities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  
  if (!res.ok) throw new Error("Failed to create entity");
  return res.json();
}
