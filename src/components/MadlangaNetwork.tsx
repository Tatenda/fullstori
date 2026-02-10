"use client";

import { AlertCircle, Check, CheckCircle2, ChevronDown, ChevronUp, Filter, Loader2, Save, Search } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import ReactFlow, {
    Background,
    type Connection,
    Controls,
    type Edge,
    MiniMap,
    type Node,
    type NodeChange,
    Panel,
    type ReactFlowInstance,
    useEdgesState,
    useNodesState
} from "reactflow";
import "reactflow/dist/style.css";
import { DAGHeader } from "./DAGHeader";

import { fetchDAG as getDAG, saveDAG } from "@/lib/api"; // Aliased fetchDAG to match existing code usage
import { AutoSave } from "@/lib/autoSave";
import { calculateSmartPosition, findNonConflictingPosition } from "@/lib/nodePositioning";
import { getRoleCategory, getRoleStyle } from "@/lib/roleUtils";
import { type Direction, type EntitySearchResult, type NetworkNode, type RoleCategory } from "@/lib/types";
import clsx from "clsx";
import Sidebar from "./Sidebar";

import AddNodeDialog, { type NewNodeData } from "./AddNodeDialog";
import ConnectNodesDialog from "./ConnectNodesDialog";
import CustomNode from "./CustomNode";
import EditEdgeDialog from './EditEdgeDialog';
import EditNodeDialog, { type EditedNodeData } from "./EditNodeDialog";
import { EditRootLabelsDialog } from './EditRootLabelsDialog';
import EvidenceLeaderNode from "./EvidenceLeaderNode";
import RootNode from "./RootNode";

interface MadlangaNetworkProps {
  dagId?: string; // Optional, defaults to "dag-main" for backward compatibility
  onViewChange?: (view: 'graph' | 'timeline') => void; // Callback to switch views
}

const MadlangaNetwork: React.FC<MadlangaNetworkProps> = ({ dagId: propDagId, onViewChange }) => {
    // Helper to determine edge styles based on relationship type
    const getEdgeStyle = (label: string = "") => {
        const lowerLabel = label.toLowerCase();
        
        if (lowerLabel.includes("tender") || lowerLabel.includes("payment") || lowerLabel.includes("kickback")) {
            return { 
                stroke: '#059669', // Emerald-600
                labelBg: '#ecfdf5', // Emerald-50
                labelText: '#047857' // Emerald-700
            };
        }
        if (lowerLabel.includes("testified") || lowerLabel.includes("against")) {
            return { 
                stroke: '#e11d48', // Rose-600
                labelBg: '#fff1f2', // Rose-50
                labelText: '#be123c' // Rose-700
            };
        }
        // Default / Structural
        return { 
            stroke: '#cbd5e1', // Slate-300
            labelBg: '#f8fafc', // Slate-50
            labelText: '#64748b' // Slate-500
        };
    };

  const nodeTypes = React.useMemo(() => ({ 
    custom: CustomNode, 
    root: RootNode,
    evidenceLeader: EvidenceLeaderNode
  }), []);
  
  // State for DAG Persistence
  const dagId = propDagId || "dag-main"; // Use prop or default
  const [dagName, setDagName] = useState<string>("");
  const [dagStats, setDagStats] = useState({ nodes: 0, edges: 0, events: 0 });
  const [rootLabels, setRootLabels] = useState<{ top?: string; bottom?: string; left?: string; right?: string }>({});
  const [isEditRootLabelsOpen, setIsEditRootLabelsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Initialize hooks with empty state first, then load
  const [nodes, setNodes, onNodesChangeBase] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // Custom onNodesChange handler that prevents root nodes from being moved
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    // Filter out position changes for root nodes
    const filteredChanges: NodeChange[] = [];
    
    for (const change of changes) {
      if (change.type === 'position') {
        // Check if this is a root node
        const node = nodes.find(n => n.id === change.id);
        if (node?.type === 'root') {
          // Reset root node position to (0, 0) and prevent the change
          setNodes((nds) => 
            nds.map((n) => 
              n.id === change.id && n.type === 'root' 
                ? { ...n, position: { x: 0, y: 0 } }
                : n
            )
          );
          // Don't apply this change - skip it
          continue;
        }
      }
      // Apply all other changes
      filteredChanges.push(change);
    }
    
    // Apply non-filtered changes
    if (filteredChanges.length > 0) {
      onNodesChangeBase(filteredChanges);
    }
  }, [nodes, setNodes, onNodesChangeBase]);
  
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [isAddNodeOpen, setIsAddNodeOpen] = useState(false);
  const [isEditNodeOpen, setIsEditNodeOpen] = useState(false);
  const [isEdgeConnectionOpen, setIsEdgeConnectionOpen] = useState(false);
  const [isConnectNodesOpen, setIsConnectNodesOpen] = useState(false);
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);
  const [currentDirection, setCurrentDirection] = useState<Direction | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [hiddenCategories, setHiddenCategories] = useState<Set<RoleCategory>>(new Set());
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(true); // Start minimized

  // ReactFlow Instance for Zoom control
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);

  // Auto-save instance
  const autoSaveRef = useRef<AutoSave | null>(null);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  // Keep refs in sync with state
  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [nodes, edges]);

  // Initial Zoom (Focus Root) - Only once on initial load
  const hasInitialZoomed = useRef(false);
  useEffect(() => {
    if (rfInstance && nodes.length > 0 && !isLoading && !hasInitialZoomed.current) {
       // Only zoom in initially if we just loaded
       const rootNode = nodes.find(n => n.type === 'root');
       if (rootNode) {
          // Assume 320x320 for Root Node (w-80 h-80)
          const x = rootNode.position.x + 160;
          const y = rootNode.position.y + 160;
          
          rfInstance.setCenter(x, y, { zoom: 1.4, duration: 800 });
          hasInitialZoomed.current = true; // Mark as done
       }
    }
  }, [rfInstance, isLoading, nodes]);

  const handleExplore = useCallback(() => {
    if (rfInstance) {
        // Zoom OUT to show all
        rfInstance.fitView({ padding: 0.1, duration: 1200, minZoom: 0.1, maxZoom: 1 });
    }
  }, [rfInstance]);

  // Load DAG on Mount
  useEffect(() => {
    const loadGraph = async () => {
      try {
        const { nodes: loadedNodes, edges: loadedEdges, dag } = await getDAG(dagId);
        
        // Inject handlers into loaded nodes (functions can't be serialized)
        // Root nodes are fixed at (0, 0) and non-draggable
        const hydratedNodes = loadedNodes.map((n: NetworkNode) => {
          const isRoot = n.type === 'root';
          return {
            ...n,
            // Root nodes are always at (0, 0)
            position: isRoot ? { x: 0, y: 0 } : n.position,
            // Root nodes are non-draggable
            draggable: !isRoot,
            data: {
               ...n.data,
               directionLabels: n.data.directionLabels, // Preserve direction labels
               onAddConnection: (dir: Direction) => {
                  setCurrentDirection(dir);
                  setIsAddNodeOpen(true);
               },
               onExplore: handleExplore // Inject the zoom-out handler
            }
          };
        });

        // Ensure all loaded edges have arrow markers and proper styling
        const hydratedEdges = loadedEdges.map((e: Edge) => {
          const edgeLabel = (e.label as string) || '';
          const style = getEdgeStyle(edgeLabel);
          return {
            ...e,
            style: { ...e.style, stroke: style.stroke },
            labelStyle: { ...e.labelStyle, fill: style.labelText },
            labelBgStyle: { ...e.labelBgStyle, fill: style.labelBg },
            markerEnd: e.markerEnd || {
              type: 'arrowclosed',
              color: style.stroke,
              width: 20,
              height: 20,
            },
          };
        });

        setNodes(hydratedNodes);
        setEdges(hydratedEdges);
        // Update refs immediately after loading
        nodesRef.current = hydratedNodes;
        edgesRef.current = hydratedEdges;
        setDagName(dag?.name || "Untitled Investigation");
        // Load root labels
        setRootLabels({
          top: dag?.rootLabelTop || undefined,
          bottom: dag?.rootLabelBottom || undefined,
          left: dag?.rootLabelLeft || undefined,
          right: dag?.rootLabelRight || undefined,
        });
        // Update stats - fetch event count
        try {
          const eventsRes = await fetch(`/api/events?dagId=${dagId}`);
          const eventsData = await eventsRes.json();
          setDagStats({
            nodes: loadedNodes.length,
            edges: loadedEdges.length,
            events: eventsData.events?.length || 0,
          });
        } catch {
          setDagStats({
            nodes: loadedNodes.length,
            edges: loadedEdges.length,
            events: 0,
          });
        }
        setHasUnsavedChanges(false);
        // Removed "Graph loaded successfully" toast - not needed
      } catch (error) {
        console.error("Failed to load DAG:", error);
        toast.error("Failed to load graph. Please refresh the page.", {
          icon: '❌',
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadGraph();
  }, [dagId, setNodes, setEdges, handleExplore]); // Runs only on mount/dagId change

  // Initialize auto-save (only when dagId changes)
  useEffect(() => {
    // Cancel existing auto-save
    if (autoSaveRef.current) {
      autoSaveRef.current.cancel();
    }

    autoSaveRef.current = new AutoSave({
      delay: 5000, // 5 second debounce
      enableLocalStorage: true,
      onSave: async () => {
        // Use refs to get the latest nodes/edges (not stale closure values)
        const currentNodes = nodesRef.current;
        const currentEdges = edgesRef.current;
        const rootNodes = currentNodes.filter(n => n.type === 'root');
        console.log('Auto-saving DAG with', currentNodes.length, 'nodes (including', rootNodes.length, 'root nodes) and', currentEdges.length, 'edges');
        await saveDAG(dagId, currentNodes, currentEdges);
      },
        onSaveStart: () => {
          setAutoSaveStatus('saving');
          setIsSaving(true);
        },
        onSaveSuccess: () => {
          setAutoSaveStatus('saved');
          setHasUnsavedChanges(false);
          setLastSaved(new Date());
          setIsSaving(false);
          // Removed auto-save success toast - too frequent and annoying
          // Status is shown in the save button instead
        },
        onSaveError: (error) => {
          setAutoSaveStatus('error');
          setIsSaving(false);
          console.error("Auto-save failed:", error);
          // Only show error toast if it's a critical failure
          // Most auto-save errors are non-critical (network issues, etc.)
          // User can manually save if needed
        },
    });

    return () => {
      autoSaveRef.current?.cancel();
    };
  }, [dagId]); // Re-initialize only when DAG changes

  // Track changes and trigger auto-save (only when not loading and there are actual changes)
  useEffect(() => {
    // Skip auto-save during initial load
    if (isLoading) return;
    
    // Skip if no nodes (empty graph)
    if (nodes.length === 0) return;
    
    // Skip if auto-save not initialized
    if (!autoSaveRef.current) {
      console.log('Auto-save not initialized yet');
      return;
    }
    
    // Only trigger auto-save if there are unsaved changes
    if (hasUnsavedChanges) {
      console.log('Triggering auto-save - hasUnsavedChanges:', hasUnsavedChanges, 'nodes:', nodes.length, 'edges:', edges.length);
      setAutoSaveStatus('idle');
      // Trigger auto-save with current state (refs will be used in onSave to get latest values)
      autoSaveRef.current.trigger({ nodes, edges, dagId });
    }
  }, [nodes, edges, isLoading, hasUnsavedChanges, dagId]);

  // Manual Save Handler (bypasses auto-save debounce)
  const handleSave = useCallback(async () => {
      // Cancel pending auto-save and save immediately
      if (autoSaveRef.current) {
        await autoSaveRef.current.saveImmediate();
      } else {
        // Fallback if auto-save not initialized
      setIsSaving(true);
      try {
          await saveDAG(dagId, nodes, edges);
            setHasUnsavedChanges(false);
            setLastSaved(new Date());
            toast.success("Saved", {
              duration: 2000,
            });
      } catch (error) {
          console.error("Failed to save:", error);
            toast.error("Failed to save graph. Please try again.", {
              icon: '❌',
            });
      } finally {
          setIsSaving(false);
        }
      }
  }, [dagId, nodes, edges]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Save: Cmd/Ctrl + S
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (!isSaving && !isLoading) {
          handleSave();
        }
      }
      // Escape: Close dialogs/sidebar
      if (e.key === 'Escape') {
        if (isAddNodeOpen) {
          setIsAddNodeOpen(false);
        } else if (isEditNodeOpen) {
          setIsEditNodeOpen(false);
        } else if (isEdgeConnectionOpen) {
          setIsEdgeConnectionOpen(false);
          setSelectedEdge(null);
        } else if (selectedNode) {
          setSelectedNode(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSaving, isLoading, isAddNodeOpen, isEditNodeOpen, isEdgeConnectionOpen, selectedNode, handleSave]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Filter nodes based on search and active filters
  const visibleNodes = nodes.filter((node) => {
    const matchesSearch = node.data.label.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Always show root
    if (node.type === 'root') return true;

    const category = getRoleCategory(node.data.role);
    const isVisibleRole = !hiddenCategories.has(category);
    return matchesSearch && isVisibleRole;
  });
  
  // Filter edges
  const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
  const visibleEdges = edges.filter(edge => 
    visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
  );

  const onConnect = useCallback(
    (params: Connection) => {
      // Validate root node connections
      const sourceNode = nodes.find(n => n.id === params.source);
      const targetNode = nodes.find(n => n.id === params.target);
      
      // Prevent root-to-root connections
      if (sourceNode?.type === 'root' && targetNode?.type === 'root') {
        toast.error("Root nodes cannot connect to other root nodes");
        return;
      }
      
      // Validate root node handle rules
      if (sourceNode?.type === 'root' && params.sourceHandle) {
        const rootHandleRules: Record<string, string> = {
          'top': 'bottom',    // Root top → Child bottom
          'right': 'left',    // Root right → Child left  
          'left': 'right',    // Root left → Child right
          'bottom': 'top'     // Root bottom → Child top
        };
        
        const expectedTargetHandle = rootHandleRules[params.sourceHandle];
        
        // If target handle is specified, validate it matches the rule
        if (params.targetHandle && params.targetHandle !== expectedTargetHandle) {
          toast.error(`Invalid connection: Root ${params.sourceHandle} handle must connect to ${expectedTargetHandle} handle`);
          return;
        }
        
        // Auto-correct: set the correct target handle
        params.targetHandle = expectedTargetHandle;
      }
      
      // Validate target node has the required handle
      if (params.targetHandle && targetNode) {
        // Check if target node can receive on this handle
        // This is handled by React Flow's handle system, but we validate for safety
        const validTargetHandles = ['top', 'bottom', 'left', 'right'];
        if (!validTargetHandles.includes(params.targetHandle)) {
          toast.error(`Invalid target handle: ${params.targetHandle}`);
          return;
        }
      }
      
      // Store pending connection and show dialog
      setPendingConnection(params);
      setIsConnectNodesOpen(true);
    },
    [nodes]
  );
  
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node as NetworkNode);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    setSelectedEdge(edge);
    setIsEdgeConnectionOpen(true);
  }, []);

  // Handle connection confirmation from dialog
  const handleConfirmConnection = useCallback(async (data: {
    relationship: string;
    relationshipTypeId?: string;
    createEvent: boolean;
    eventTitle?: string;
    eventDate?: string;
    eventDescription?: string;
    eventTypeId?: string;
    customTypeName?: string;
  }) => {
    if (!pendingConnection || !pendingConnection.source || !pendingConnection.target) return;

    try {
      // Apply edge styling based on relationship
      const style = getEdgeStyle(data.relationship);

      // Create the edge with the relationship label
      const newEdge = {
        id: `e-${pendingConnection.source}-${pendingConnection.target}`,
        source: pendingConnection.source,
        target: pendingConnection.target,
        sourceHandle: pendingConnection.sourceHandle || undefined,
        targetHandle: pendingConnection.targetHandle || undefined,
        label: data.relationship,
        style: { stroke: style.stroke, strokeWidth: 2 },
        labelStyle: { fill: style.labelText, fontWeight: 700, fontSize: 11 },
        labelBgStyle: { fill: style.labelBg, rx: 6, ry: 6 },
        markerEnd: {
          type: 'arrowclosed' as const,
          color: style.stroke,
          width: 20,
          height: 20,
        },
    } as Edge;

      // Add edge to state
      setEdges((eds) => {
        const updated = [...eds, newEdge];
        edgesRef.current = updated;
        setHasUnsavedChanges(true);
        return updated;
      });

      // Create event if requested
      if (data.createEvent && data.eventTitle) {
        try {
          const eventRes = await fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: data.eventTitle,
              description: data.eventDescription,
              date: data.eventDate || new Date().toISOString().split('T')[0],
              eventTypeId: data.eventTypeId,
              customTypeName: data.customTypeName,
              sourceNodeId: pendingConnection.source,
              targetNodeId: pendingConnection.target,
              createEdge: false, // Edge already created above
              dagId
            })
          });

          if (eventRes.ok) {
            toast.success('Connection and event created successfully');
          } else {
            const error = await eventRes.json();
            console.error('Failed to create event:', error);
            toast.error('Connection created, but failed to create event');
          }
        } catch (error) {
          console.error('Error creating event:', error);
          toast.error('Connection created, but failed to create event');
        }
      } else {
        toast.success('Connection created successfully');
      }

      // Close dialog and reset pending connection
      setIsConnectNodesOpen(false);
      setPendingConnection(null);
    } catch (error) {
      console.error('Error creating connection:', error);
      toast.error('Failed to create connection');
    }
  }, [pendingConnection, dagId, setEdges, getEdgeStyle]);

  const toggleFilter = (category: RoleCategory) => {
    setHiddenCategories(prev => {
        const newSet = new Set(prev);
        if (newSet.has(category)) {
            newSet.delete(category);
        } else {
            newSet.add(category);
        }
        return newSet;
    });
  };

  // New: Handle adding a node from the dialog
  const handleAddNode = async (data: NewNodeData) => {
    if (!selectedNode) {
      console.error('No selected node to connect from');
      return;
    }

    if (!data.name || !data.name.trim()) {
      console.error('Node name is required');
      return;
    }

    // Validate roleId exists before proceeding
    if (!data.roleId || !data.roleId.trim()) {
      toast.error("Invalid role ID. Please try adding the node again.");
      return;
    }

    // Fetch role data from the roleId
    let roleName = '';
    let roleCategory: RoleCategory = 'civilian';
    
    try {
      const res = await fetch('/api/roles');
      if (res.ok) {
        const rolesData: { roles: Array<{ id: string; name: string; category: string; isSystem: boolean }> } = await res.json();
        const allRoles = rolesData.roles;
        const selectedRole = allRoles.find((r) => r.id === data.roleId);
        if (selectedRole) {
          roleName = selectedRole.name;
          roleCategory = selectedRole.category as RoleCategory;
        } else {
          console.error('Role not found in database:', data.roleId);
          toast.error("Selected role not found. Please try adding the node again.");
          return;
        }
      } else {
        console.error('Failed to fetch roles:', res.status);
        toast.error("Could not verify role. Please try again.");
        return;
      }
    } catch (error) {
      console.error('Failed to fetch role data:', error);
      toast.error("Network error while fetching role data. Please try again.");
      return;
    }

    // Create or link entity
    let entityId = data.entityId;
    let avatar: string | undefined = undefined;

    // If no entityId provided, create a new entity using node details
    if (!entityId) {
      try {
        // Double-check if entity exists with same name (prevent duplicates)
        try {
          const searchRes = await fetch(`/api/entities?q=${encodeURIComponent(data.name.trim())}&dagId=${dagId}`);
          if (searchRes.ok) {
            const searchResults: EntitySearchResult[] = await searchRes.json();
            const exactMatch = searchResults.find((r) => 
              r.entity.name.toLowerCase().trim() === data.name.trim().toLowerCase()
            );
            if (exactMatch) {
              entityId = exactMatch.entity.id;
              avatar = exactMatch.entity.avatar;
              console.log('✅ Found existing entity, linking instead of creating:', entityId);
            }
          }
        } catch (searchError) {
          console.warn('Entity search failed, will create new entity:', searchError);
        }

        // If still no entityId, create new entity
        if (!entityId) {
          const createEntityRes = await fetch('/api/entities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: data.name.trim(),
              roleId: data.roleId,
              description: data.description || undefined,
              entityType: data.entityType || 'human'
            })
          });

          if (createEntityRes.ok) {
            const newEntity = await createEntityRes.json();
            entityId = newEntity.id;
            avatar = newEntity.avatar;
            console.log('✅ Created new entity for node:', entityId);
          } else {
            const error = await createEntityRes.json().catch(() => ({ error: 'Unknown error' }));
            console.error('Failed to create entity:', error);
            toast.error(`Failed to create entity: ${error.error || 'Unknown error'}`);
            // Don't proceed if entity creation fails - we need the entity
            return;
          }
        }
      } catch (error) {
        console.error('Error creating entity:', error);
        toast.error('Failed to create entity. Please check your connection and try again.');
        // Don't proceed if entity creation fails
        return;
      }
    } else {
      // If entityId provided, verify it exists and fetch its avatar
      try {
        const entityRes = await fetch(`/api/entities?q=${encodeURIComponent(data.name)}&dagId=${dagId}`);
        if (entityRes.ok) {
          const entities: EntitySearchResult[] = await entityRes.json();
          const entity = entities.find((e) => e.entity.id === entityId);
          if (entity) {
            avatar = entity.entity.avatar;
            console.log('✅ Verified existing entity:', entityId);
          } else {
            console.warn(`Entity ${entityId} not found in search results, will be validated on save`);
            // Entity might exist but not in this DAG, which is fine
          }
        } else {
          console.warn('Could not verify entity, proceeding anyway');
        }
      } catch (error) {
        console.error('Error fetching entity avatar:', error);
        // Non-critical, continue without avatar
        console.warn('Could not fetch entity details, proceeding with provided entityId');
      }
    }
    
    // Final validation: ensure we have entityId before creating node
    if (!entityId) {
      toast.error("Failed to create or link entity. Cannot create node.");
      return;
    }

    const newNodeId = `node-${Date.now()}`;
    
    const sourcePos = selectedNode.position;
    let newPos = { x: sourcePos.x, y: sourcePos.y };

    // Smart directional positioning
    if (currentDirection) {
      const offset = 300;
      switch (currentDirection) {
        case 'top':
          newPos = { x: sourcePos.x, y: sourcePos.y - offset };
          break;
        case 'bottom':
          newPos = { x: sourcePos.x, y: sourcePos.y + offset };
          break;
        case 'left':
          newPos = { x: sourcePos.x - offset, y: sourcePos.y };
          break;
        case 'right':
          newPos = { x: sourcePos.x + offset, y: sourcePos.y };
          break;
      }
    } else {
      // Fallback to random positioning
      const angle = Math.random() * 2 * Math.PI;
      const radius = 300;
      newPos = {
        x: sourcePos.x + radius * Math.cos(angle),
        y: sourcePos.y + radius * Math.sin(angle)
      };
    }

    const newNode: NetworkNode = {
        id: newNodeId,
        type: 'custom', // Always use 'custom' type - node type should be based on entity role, not connection direction
        position: newPos,
        data: {
            label: data.name.trim(),
            roleId: data.roleId || '',
            role: roleName || 'Unknown', // Role name for display
            category: roleCategory, // Derived from role
            description: data.description || undefined,
            entityId: entityId || undefined, // Link to created or existing entity
            avatar: avatar, // Avatar from entity
            onAddConnection: (dir) => {
              setCurrentDirection(dir);
              setIsAddNodeOpen(true);
            },
        }
    };

    console.log('Adding new node:', newNode);

    // Get edge styling based on relationship
    const edgeStyle = getEdgeStyle(data.relationship || 'Connected');

    const newEdge = {
        id: `e-${selectedNode.id}-${newNodeId}`,
        source: selectedNode.id,
        target: newNodeId,
        label: data.relationship || 'Connected',
        relationshipTypeId: data.relationshipTypeId, // Store relationship type ID for referential integrity
        style: { stroke: edgeStyle.stroke, strokeWidth: 2 },
        labelStyle: { fill: edgeStyle.labelText, fontWeight: 700, fontSize: 11 },
        labelBgStyle: { fill: edgeStyle.labelBg, rx: 6, ry: 6 },
        markerEnd: {
          type: 'arrowclosed' as const,
          color: edgeStyle.stroke,
          width: 20,
          height: 20,
        },
    } as Edge;

    // Set handles based on direction for proper connection points
    if (currentDirection) {
      newEdge.sourceHandle = currentDirection; // Connect from the directional handle
      
      // Root node connection rules: enforce strict handle mapping
      // Root top → Child bottom, Root right → Child left, Root left → Child right, Root bottom → Child top
      const rootHandleRules = {
        'top': 'bottom',    // Root top → Child bottom
        'right': 'left',    // Root right → Child left  
        'left': 'right',    // Root left → Child right
        'bottom': 'top'     // Root bottom → Child top
      };
      
      // If source is root node, use root-specific rules
      if (selectedNode.type === 'root') {
        newEdge.targetHandle = rootHandleRules[currentDirection];
        console.log(`Root node connection: ${currentDirection} → ${newEdge.targetHandle}`, {
          source: selectedNode.id,
          target: newNodeId,
          sourceHandle: newEdge.sourceHandle,
          targetHandle: newEdge.targetHandle
        });
      } else {
        // For non-root nodes, use standard opposite mapping
        const oppositeHandles = {
          'top': 'bottom',
          'bottom': 'top',
          'left': 'right',
          'right': 'left'
        };
        newEdge.targetHandle = oppositeHandles[currentDirection];
      }
    }
    
    // Apply specialized edge styling
    const style = getEdgeStyle(data.relationship);
    if (newEdge.style) {
      newEdge.style.stroke = style.stroke;
    }
    if (newEdge.labelStyle) {
      newEdge.labelStyle.fill = style.labelText;
    }
    if (newEdge.labelBgStyle) {
      newEdge.labelBgStyle.fill = style.labelBg;
    }
    // Update arrow color to match edge color
    if (newEdge.markerEnd && typeof newEdge.markerEnd === 'object') {
      newEdge.markerEnd.color = style.stroke;
    }

    console.log('Creating edge:', newEdge);

    setNodes((nds) => {
      const updated = [...nds, newNode];
      nodesRef.current = updated;
      console.log('Nodes updated, total:', updated.length);
      return updated;
    });
    setEdges((eds) => {
      const updated = [...eds, newEdge];
      edgesRef.current = updated;
      console.log('Edges updated, total:', updated.length, 'New edge:', newEdge);
      return updated;
    });
    
    // Mark as unsaved to trigger auto-save
    setHasUnsavedChanges(true);
    
    // Removed "Added to network" toast - auto-save will handle it
    // User can see the node appear in the graph
    
    // Close modal and reset direction
    setIsAddNodeOpen(false);
    setCurrentDirection(undefined);
  };

  // Handle editing a node - Updates the entity (single source of truth)
  const handleEditNode = async (data: EditedNodeData) => {
    // Find the node to get its entityId
    const nodeToEdit = nodes.find(n => n.id === data.id);
    if (!nodeToEdit || !nodeToEdit.data.entityId) {
      toast.error("Cannot edit node: missing entity link");
      return;
    }

    // Update the entity via API (single source of truth)
    try {
      const res = await fetch(`/api/entities/${nodeToEdit.data.entityId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          roleId: data.roleId,
          description: data.description || null,
        })
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || "Failed to update entity");
        return;
      }

      const updatedEntity = await res.json();

      // Update local node state to reflect entity changes
      setNodes((nds) => {
        const updated = nds.map(node => {
      if (node.id === data.id) {
        return {
          ...node,
              type: node.type, // Preserve node type
          data: {
            ...node.data,
                label: updatedEntity.name, // From entity
                role: updatedEntity.roleLink.name, // From entity's role
                roleId: updatedEntity.roleId, // From entity
                category: data.category, // Node-specific override
                description: updatedEntity.description, // From entity
                avatar: updatedEntity.avatar, // From entity
          }
        };
      }
      return node;
        });
        nodesRef.current = updated;
        return updated;
      });

    // 2. Update Edge Labels
    if (data.updatedEdges && data.updatedEdges.length > 0) {
        setEdges((eds) => {
          const updated = eds.map(edge => {
        const update = data.updatedEdges.find(u => u.id === edge.id);
        if (update) {
          const newStyle = getEdgeStyle(update.label);
          return {
            ...edge,
            label: update.label,
            style: { ...edge.style, stroke: newStyle.stroke },
            labelStyle: { ...edge.labelStyle, fill: newStyle.labelText },
            labelBgStyle: { ...edge.labelBgStyle, fill: newStyle.labelBg }
          };
        }
        return edge;
          });
          edgesRef.current = updated;
          return updated;
        });
    }

      // Mark changes as unsaved so position/type changes get saved
      setHasUnsavedChanges(true);
    setIsEditNodeOpen(false);
      toast.success("Entity updated successfully");
    } catch (error) {
      console.error("Error updating entity:", error);
      toast.error("Failed to update entity");
    }
  };

  // Handle deleting a node
  const handleDeleteNode = (nodeId: string) => {
    const nodeToDelete = nodes.find(n => n.id === nodeId);
    const nodeName = nodeToDelete?.data.label || 'Node';
    
    // 1. Remove Node
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));

    // 2. Remove Connected Edges
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));

    // 3. Reset Selection
    setIsEditNodeOpen(false);
    setSelectedNode(null);
    
    toast.success(`Deleted ${nodeName}`, {
      duration: 2000,
    });
  };

  // Create node from entity (for event-based node creation)
  const createNodeFromEntity = async (
    entityId: string,
    relatedEntityIds?: string[],
    position?: { x: number; y: number }
  ): Promise<NetworkNode | null> => {
    try {
      // Check if entity already has a node in this DAG
      const existingNode = nodes.find(n => n.data.entityId === entityId);
      if (existingNode) {
        console.log('Entity already has a node:', existingNode.id);
        return existingNode;
      }

      // Fetch entity data
      const entityRes = await fetch(`/api/entities?q=&dagId=${dagId}`);
      if (!entityRes.ok) {
        throw new Error('Failed to fetch entity data');
      }

      const entities: EntitySearchResult[] = await entityRes.json();
      const entityData = entities.find((e) => e.entity.id === entityId)?.entity;
      
      if (!entityData) {
        toast.error('Entity not found');
        return null;
      }

      // Calculate smart position
      let nodePosition: { x: number; y: number };
      
      if (position) {
        // Use provided position
        nodePosition = position;
      } else if (relatedEntityIds && relatedEntityIds.length > 0) {
        // Find related nodes
        const relatedNodes = nodes.filter(n => 
          relatedEntityIds.includes(n.data.entityId || '')
        );
        
        // Calculate position based on related nodes
        const smartPos = calculateSmartPosition(relatedNodes, nodes);
        nodePosition = findNonConflictingPosition(smartPos, nodes);
      } else {
        // Default: center of viewport
        const viewport = rfInstance?.getViewport();
        if (viewport) {
          const centerX = -viewport.x / viewport.zoom + (window.innerWidth / 2) / viewport.zoom;
          const centerY = -viewport.y / viewport.zoom + (window.innerHeight / 2) / viewport.zoom;
          nodePosition = findNonConflictingPosition({ x: centerX, y: centerY }, nodes);
        } else {
          nodePosition = findNonConflictingPosition({ x: 0, y: 0 }, nodes);
        }
      }

      // Get role category
      const roleCategory = getRoleCategory(entityData.roleLink?.name || '');

      // Create new node
      const newNodeId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newNode: NetworkNode = {
        id: newNodeId,
        type: 'custom',
        position: nodePosition,
        data: {
          label: entityData.name,
          roleId: entityData.roleId,
          role: entityData.roleLink?.name || 'Unknown',
          category: roleCategory,
          description: entityData.description || undefined,
          entityId: entityData.id,
          avatar: entityData.avatar || undefined,
          onAddConnection: (dir) => {
            setCurrentDirection(dir);
            setIsAddNodeOpen(true);
          },
        }
      };

      // Add node to graph
      setNodes((nds) => {
        const updated = [...nds, newNode];
        nodesRef.current = updated;
        return updated;
      });

      // Mark as unsaved
      setHasUnsavedChanges(true);

      return newNode;
    } catch (error) {
      console.error('Error creating node from entity:', error);
      toast.error('Failed to create node. Please try again.');
      return null;
    }
  };

  // Expose createNodeFromEntity to parent components via ref or context
  // For now, we'll pass it through props to Sidebar

  // Prepare incoming edges for the dialog
  const incomingEdges = selectedNode ? edges.filter(e => e.target === selectedNode.id).map(e => {
    const sourceNode = nodes.find(n => n.id === e.source);
    return {
      id: e.id,
      sourceLabel: sourceNode?.data.label || 'Unknown',
      label: e.label as string || ''
    };
  }) : [];



  
  
  // Effect to inject handlers into initial nodes on mount
  React.useEffect(() => {
      setNodes((nds) => nds.map(n => ({
          ...n,
          data: {
              ...n.data,
              onAddConnection: (dir?: Direction) => {
                setCurrentDirection(dir);
                setIsAddNodeOpen(true);
              }
          }
      })));
  }, [setNodes]);


  // Define the main categories to filter by
  const filterCategories: RoleCategory[] = ['official', 'law_enforcement', 'political', 'business', 'witness', 'suspect'];

  // Calculate stats
  const nodeCount = visibleNodes.length;
  const edgeCount = visibleEdges.length;

  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden">
       {/* Fixed Header */}
       <DAGHeader
         dagId={dagId}
         dagName={dagName}
         stats={{
           nodes: nodeCount,
           edges: edgeCount,
           events: dagStats.events,
         }}
         currentView="graph"
         onViewChange={onViewChange || (() => {})}
         rootLabels={rootLabels}
         onEditRootLabels={() => setIsEditRootLabelsOpen(true)}
         graphProps={{
          searchQuery,
          onSearchChange: setSearchQuery,
          isFilterMenuOpen,
          onFilterToggle: () => setIsFilterMenuOpen(!isFilterMenuOpen),
          hiddenCategoriesCount: hiddenCategories.size,
          hasUnsavedChanges,
          isSaving,
          isLoading,
          autoSaveStatus,
          lastSaved,
          onSave: handleSave,
          filterCategories,
          hiddenCategories,
          onToggleFilter: (cat: RoleCategory | null) => {
            if (cat === null) {
              setHiddenCategories(new Set());
            } else {
              toggleFilter(cat);
            }
          },
        }}
       />


       {/* 2. Main Content Area - Enhanced */}
       <div className="flex flex-1 overflow-hidden relative rounded-t-2xl md:rounded-t-3xl bg-background shadow-sm mx-2 md:mx-4 mt-20 md:mt-24 border border-border/50">
          
          <div className="flex-1 h-full relative">
            <ReactFlow
                nodes={visibleNodes}
                edges={visibleEdges}
                nodeTypes={nodeTypes}
                onInit={setRfInstance}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                onEdgeClick={onEdgeClick}
                className="bg-white"
                defaultEdgeOptions={{
                    type: 'smoothstep', // Clean, technical lines
                    animated: true,
                    style: { stroke: '#cbd5e1', strokeWidth: 1.5 }, // Slate-300
                    markerEnd: 'arrowclosed' as const,
                }}
            >
                <Background gap={40} size={1} color="#f1f5f9" />
                <Controls className="bg-background border border-border shadow-lg rounded-lg overflow-hidden m-4 text-muted-foreground fill-muted-foreground hover:text-foreground" showInteractive={false} />
                <MiniMap 
                nodeColor={(node) => {
                    const cat = getRoleCategory(node.data.role);
                    return getRoleStyle(cat).minmap;
                }}
                className="bg-muted/50 border border-border rounded-lg shadow-lg m-4" 
                maskColor="rgba(255, 255, 255, 0.8)"
                />
                {/* Search Bar - In Body */}
                <Panel position="top-left" className="mt-4 ml-4">
                  <div className="relative w-64 md:w-80 lg:w-96">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                 <input 
                     type="text" 
                      placeholder="Search nodes..." 
                      className="w-full pl-9 pr-3 py-2 bg-background/95 backdrop-blur-sm hover:bg-background focus:bg-background border border-border/50 focus:border-primary/50 rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 smooth-transition placeholder:text-muted-foreground shadow-lg"
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                 />
              </div>
                </Panel>
                
                {/* Save & Filter Container - Right Side, Side by Side */}
                <Panel position="top-right" className="mt-4 mr-4">
                  <div className="flex items-start gap-3">
                    {/* Filter Panel - Left */}
                    <div className="bg-background/95 backdrop-blur-sm rounded-xl shadow-lg border border-border/50 overflow-hidden w-56 shrink-0">
                  <button 
                        onClick={() => setIsFilterCollapsed(!isFilterCollapsed)}
                        className="flex items-center gap-2 w-full px-4 py-3 border-b border-border hover:bg-muted/50 smooth-transition"
                      >
                        <Filter size={16} className="text-muted-foreground shrink-0" />
                        <h3 className="text-sm font-semibold text-foreground flex-1 text-left">Filters</h3>
                      {hiddenCategories.size > 0 && (
                          <span className="flex items-center justify-center bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                              {hiddenCategories.size}
                          </span>
                      )}
                        {isFilterCollapsed ? (
                          <ChevronDown size={16} className="text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronUp size={16} className="text-muted-foreground shrink-0" />
                      )}
                  </button>
                      {!isFilterCollapsed && (
                        <div className="p-4 flex flex-col gap-2 max-h-64 overflow-y-auto">
                          {filterCategories.map((cat) => {
                              const isHidden = hiddenCategories.has(cat);
                              const label = cat.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

                              return (
                                  <button 
                                      key={cat} 
                                      onClick={() => toggleFilter(cat)}
                                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted smooth-transition text-left w-full"
                                  >
                                      <div className={clsx(
                                  "w-4 h-4 rounded border flex items-center justify-center smooth-transition shrink-0",
                                  isHidden ? "border-border bg-transparent" : "border-primary bg-primary"
                                      )}>
                                  {!isHidden && <Check size={10} className="text-primary-foreground" />}
                                      </div>
                                <span className={clsx("text-xs font-medium smooth-transition", isHidden ? "text-muted-foreground" : "text-foreground")}>
                                          {label}
                                      </span>
                                  </button>
                              );
                          })}
                          {hiddenCategories.size > 0 && (
                              <button 
                                  onClick={() => setHiddenCategories(new Set())}
                              className="mt-1 px-2 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 rounded-lg smooth-transition text-left"
                              >
                                  Reset All
                              </button>
                          )}
                      </div>
                  )}
              </div>

                    {/* Save Button - Right */}
                    <div className="bg-background/95 backdrop-blur-sm rounded-xl shadow-lg border border-border/50 overflow-hidden shrink-0">
                 <button 
                    onClick={handleSave}
                    disabled={isSaving || isLoading}
                        className={clsx(
                          "flex items-center gap-2 px-4 py-3 w-full smooth-transition font-semibold text-sm whitespace-nowrap h-[48px]",
                          hasUnsavedChanges
                            ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md disabled:opacity-50"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted disabled:opacity-50"
                        )}
                        title={hasUnsavedChanges ? "Save changes (Cmd/Ctrl+S)" : "All changes saved"}
                      >
                        {isSaving ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : autoSaveStatus === 'saved' && !hasUnsavedChanges ? (
                          <>
                            <CheckCircle2 size={16} className="text-success" />
                            <span>Saved</span>
                          </>
                        ) : hasUnsavedChanges ? (
                          <>
                            <AlertCircle size={16} />
                            <span>Save</span>
                          </>
                        ) : (
                          <>
                            <Save size={16} />
                            <span>Saved</span>
                          </>
                        )}
                 </button>
              </div>
          </div>
                </Panel>
            </ReactFlow>
          </div>

          {/* Sidebar */}
          {selectedNode && (
             <Sidebar 
                node={selectedNode} 
                onClose={() => setSelectedNode(null)} 
                onAddConnection={() => {
                  setCurrentDirection(undefined);
                  setIsAddNodeOpen(true);
                }}
                onEdit={() => setIsEditNodeOpen(true)}
                onDelete={handleDeleteNode}
                hasChildNodes={edges.filter(e => e.source === selectedNode.id).length > 0} // Check for outgoing edges (children)
                dagId={dagId}
                allNodes={nodes}
                createNodeFromEntity={createNodeFromEntity}
             />
          )}

          {/* Add Node Dialog */}
          <AddNodeDialog 
            isOpen={isAddNodeOpen}
            onClose={() => setIsAddNodeOpen(false)}
            onSubmit={handleAddNode}
            sourceNodeLabel={selectedNode?.data.label || "Selected Node"}
            direction={currentDirection}
            dagId={dagId}
          />

          {/* Edit Node Dialog */}
          {selectedNode && (
            <EditNodeDialog 
              isOpen={isEditNodeOpen}
              onClose={() => setIsEditNodeOpen(false)}
              onSubmit={handleEditNode}
              incomingEdges={incomingEdges}
              nodeData={{
                id: selectedNode.id,
                label: selectedNode.data.label,
                role: selectedNode.data.role || '',
                roleId: selectedNode.data.roleId || '', // Pass roleId with fallback
                description: selectedNode.data.description || ''
              }}
              initialCategory={selectedNode.data.category} // Pass existing category
            />
          )}

          {/* Connect Nodes Dialog */}
          {pendingConnection && pendingConnection.source && pendingConnection.target && (
            <ConnectNodesDialog
              isOpen={isConnectNodesOpen}
              onClose={() => {
                setIsConnectNodesOpen(false);
                setPendingConnection(null);
              }}
              sourceNodeId={pendingConnection.source}
              targetNodeId={pendingConnection.target}
              sourceNodeLabel={nodes.find(n => n.id === pendingConnection.source)?.data.label || 'Unknown'}
              targetNodeLabel={nodes.find(n => n.id === pendingConnection.target)?.data.label || 'Unknown'}
              sourceHandle={pendingConnection.sourceHandle || undefined}
              targetHandle={pendingConnection.targetHandle || undefined}
              onConfirm={handleConfirmConnection}
              dagId={dagId}
            />
          )}

          {/* Edge Connection Dialog */}
          {selectedEdge && (
            <EditEdgeDialog 
              isOpen={isEdgeConnectionOpen}
              onClose={() => {
                setIsEdgeConnectionOpen(false);
                setSelectedEdge(null);
              }}
              edgeLabel={selectedEdge.label as string || ''}
              onSave={(newLabel, relationshipTypeId) => {
                  setEdges((eds) => {
                      const updated = eds.map(e => {
                          if (e.id === selectedEdge.id) {
                              const newStyle = getEdgeStyle(newLabel);
                              const updatedEdge = {
                                  ...e,
                                  label: newLabel,
                                  relationshipTypeId: relationshipTypeId, // Store relationship type ID for referential integrity
                                  style: { ...e.style, stroke: newStyle.stroke },
                                  labelStyle: { ...e.labelStyle, fill: newStyle.labelText },
                                  labelBgStyle: { ...e.labelBgStyle, fill: newStyle.labelBg },
                                  markerEnd: e.markerEnd && typeof e.markerEnd === 'object' ? {
                                      ...e.markerEnd,
                                      color: newStyle.stroke
                                  } as typeof e.markerEnd : e.markerEnd
                              } as unknown as Edge;
                              return updatedEdge;
                          }
                          return e;
                      });
                      edgesRef.current = updated;
                      setHasUnsavedChanges(true);
                      return updated;
                  });
                  setIsEdgeConnectionOpen(false);
                  setSelectedEdge(null);
              }}
              onDelete={() => {
                  setEdges((eds) => {
                      const updated = eds.filter(e => e.id !== selectedEdge.id);
                      edgesRef.current = updated;
                      setHasUnsavedChanges(true);
                      return updated;
                  });
                  setIsEdgeConnectionOpen(false);
                  setSelectedEdge(null);
              }}
              onReverse={() => {
                  setEdges((eds) => {
                      const updated = eds.map(e => {
                          if (e.id === selectedEdge.id) {
                              // Swap source and target nodes
                              // Keep the handles the same so connection points don't move
                              // The arrow (markerEnd) will automatically point to the new target
                              const reversedEdge: Edge = {
                                  ...e,
                                  source: e.target,
                                  target: e.source,
                                  // Keep handles unchanged - same physical connection points
                                  sourceHandle: e.sourceHandle,
                                  targetHandle: e.targetHandle,
                                  // Ensure markerEnd is preserved and points to the new target
                                  markerEnd: e.markerEnd,
                                  // Remove markerStart if it exists (we only want arrow at target)
                                  markerStart: undefined,
                              };
                              return reversedEdge;
                          }
                          return e;
                      });
                      // Update refs with the updated edges
                      edgesRef.current = updated;
                      setHasUnsavedChanges(true);
                      
                      // Update selectedEdge to reflect the change
                      const reversedEdge = updated.find(e => e.id === selectedEdge.id);
                      if (reversedEdge) {
                          setSelectedEdge(reversedEdge);
                      }
                      
                      return updated;
                  });
                  toast.success('Relationship direction reversed');
              }}
            />
          )}

          {/* Edit Root Labels Dialog */}
          <EditRootLabelsDialog
            isOpen={isEditRootLabelsOpen}
            onClose={() => setIsEditRootLabelsOpen(false)}
            dagId={dagId}
            dagName={dagName}
            currentLabels={rootLabels}
            onUpdate={async () => {
              // Reload DAG to get updated labels
              try {
                const { dag } = await getDAG(dagId);
                setRootLabels({
                  top: dag?.rootLabelTop || undefined,
                  bottom: dag?.rootLabelBottom || undefined,
                  left: dag?.rootLabelLeft || undefined,
                  right: dag?.rootLabelRight || undefined,
                });
                // Reload nodes to update root node labels
                const { nodes: reloadedNodes } = await getDAG(dagId);
                const hydratedNodes = reloadedNodes.map((n: NetworkNode) => ({
                  ...n,
                  data: {
                    ...n.data,
                    directionLabels: n.data.directionLabels,
                    onAddConnection: (dir: Direction) => {
                      setCurrentDirection(dir);
                      setIsAddNodeOpen(true);
                    },
                    onExplore: handleExplore
                  }
                }));
                setNodes(hydratedNodes);
                nodesRef.current = hydratedNodes;
              } catch (error) {
                console.error("Failed to reload DAG:", error);
                toast.error("Failed to reload DAG data");
              }
            }}
          />
       </div>
    </div>
  );
};

export default MadlangaNetwork;
