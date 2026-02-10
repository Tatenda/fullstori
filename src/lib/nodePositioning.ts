import type { NetworkNode } from './types';

/**
 * Calculate smart position for a new node based on related nodes
 */
export function calculateSmartPosition(
  relatedNodes: NetworkNode[],
  _allNodes: NetworkNode[],
  viewport?: { x: number; y: number; zoom: number }
): { x: number; y: number } {
  // If no related nodes, position at center of viewport or graph center
  if (relatedNodes.length === 0) {
    if (viewport) {
      // Position at viewport center (accounting for zoom)
      return {
        x: -viewport.x / viewport.zoom + (window.innerWidth / 2) / viewport.zoom,
        y: -viewport.y / viewport.zoom + (window.innerHeight / 2) / viewport.zoom,
      };
    }
    return { x: 0, y: 0 };
  }

  // If only one related node, position offset from it
  if (relatedNodes.length === 1) {
    const relatedNode = relatedNodes[0];
    const offset = 300;
    // Position to the right and slightly below
    return {
      x: relatedNode.position.x + offset,
      y: relatedNode.position.y + offset * 0.5,
    };
  }

  // If 2+ related nodes, position at center of their bounding box
  const positions = relatedNodes.map(n => n.position);
  const minX = Math.min(...positions.map(p => p.x));
  const maxX = Math.max(...positions.map(p => p.x));
  const minY = Math.min(...positions.map(p => p.y));
  const maxY = Math.max(...positions.map(p => p.y));

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  // Add some offset to avoid overlapping with existing nodes
  const offset = 250;
  return {
    x: centerX + offset,
    y: centerY + offset,
  };
}

/**
 * Check if a position conflicts with existing nodes
 */
export function hasPositionConflict(
  position: { x: number; y: number },
  allNodes: NetworkNode[],
  minDistance: number = 200
): boolean {
  return allNodes.some(node => {
    const dx = node.position.x - position.x;
    const dy = node.position.y - position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < minDistance;
  });
}

/**
 * Find a non-conflicting position near the desired position
 */
export function findNonConflictingPosition(
  desiredPosition: { x: number; y: number },
  allNodes: NetworkNode[],
  maxAttempts: number = 10
): { x: number; y: number } {
  let position = { ...desiredPosition };
  let attempts = 0;
  const step = 150;

  while (hasPositionConflict(position, allNodes) && attempts < maxAttempts) {
    // Try positions in a spiral pattern
    const angle = (attempts * 45) * (Math.PI / 180);
    const radius = step * (1 + Math.floor(attempts / 8));
    position = {
      x: desiredPosition.x + radius * Math.cos(angle),
      y: desiredPosition.y + radius * Math.sin(angle),
    };
    attempts++;
  }

  return position;
}
