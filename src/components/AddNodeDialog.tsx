import { searchEntities } from '@/lib/api';
import { getRoleStyle } from '@/lib/roleUtils';
import { type Direction, type EntitySearchResult, type RoleCategory } from '@/lib/types';
import clsx from 'clsx';
import { Check, Save, Search, UserPlus, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface AddNodeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: NewNodeData) => void;
  sourceNodeLabel: string;
  direction?: Direction;
  dagId?: string; // For entity search
}

export interface NewNodeData {
  name: string;
  roleId: string; // Changed to roleId
  entityType?: "human" | "company" | "organization"; // Entity type
  description: string;
  relationship: string;
  relationshipTypeId?: string; // Optional: Reference to RelationshipType (for referential integrity)
  entityId?: string; // Optional: link to existing entity
}

const categories: RoleCategory[] = ['official', 'law_enforcement', 'political', 'business', 'witness', 'suspect', 'victim', 'civilian'];

// Role from API
interface Role {
  id: string;
  name: string;
  category: string;
}


const AddNodeDialog: React.FC<AddNodeDialogProps> = ({ isOpen, onClose, onSubmit, sourceNodeLabel, direction, dagId }) => {
  const [rolesByCategory, setRolesByCategory] = useState<Record<string, Role[]>>({});
  const [relationshipsByCategory, setRelationshipsByCategory] = useState<Record<string, Array<{ id: string; name: string }>>>({});
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [isLoadingRelationships, setIsLoadingRelationships] = useState(true);
  
  // Smart defaults based on direction
  const getDefaultCategory = (): RoleCategory => {
    if (!direction) return 'civilian';
    switch (direction) {
      case 'top': return 'official'; // Commission staff
      case 'bottom': return 'witness'; // Participants in allegations
      case 'left': return 'official'; // Evidence Leaders (will be overridden)
      case 'right': return 'civilian';
      default: return 'civilian';
    }
  };

  const [name, setName] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState(''); 
  const [isCustomRole, setIsCustomRole] = useState(false);
  const [category, setCategory] = useState<RoleCategory>(getDefaultCategory());
  const [entityType, setEntityType] = useState<"human" | "company" | "organization">("human");
  const [description, setDescription] = useState('');
  const [relationship, setRelationship] = useState('');
  const [relationshipTypeId, setRelationshipTypeId] = useState<string>('');
  const [isCustomRelationship, setIsCustomRelationship] = useState(true);
  
  // Entity search state
  const [entitySearchQuery, setEntitySearchQuery] = useState('');
  const [entitySearchResults, setEntitySearchResults] = useState<EntitySearchResult[]>([]);
  const [isSearchingEntities, setIsSearchingEntities] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<EntitySearchResult | null>(null);
  const [showEntitySearch, setShowEntitySearch] = useState(false);
  
  // Fetch roles and relationships from API - only when dialog opens
  useEffect(() => {
    if (!isOpen) return;

    async function fetchData() {
      try {
        setIsLoadingRoles(true);
        setIsLoadingRelationships(true);
        
        const [rolesRes, relsRes] = await Promise.all([
          fetch('/api/roles'),
          fetch('/api/relationships')
        ]);

        if (rolesRes.ok) {
          const data = await rolesRes.json();
          setRolesByCategory(data.rolesByCategory || {});
        } else {
          console.error('Failed to fetch roles:', rolesRes.status);
        }
        
        if (relsRes.ok) {
          const data = await relsRes.json();
          setRelationshipsByCategory(data.relationshipsByCategory || {});
        } else {
          console.error('Failed to fetch relationships:', relsRes.status);
          toast.error('Failed to load relationships');
        }

      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast.error('Failed to load relationships');
      } finally {
        setIsLoadingRoles(false);
        setIsLoadingRelationships(false);
      }
    }
    fetchData();
  }, [isOpen]);

  // Update category when direction changes
  useEffect(() => {
    if (isOpen) {
      setCategory(getDefaultCategory());
      // Pre-fill for Evidence Leaders
      if (direction === 'left') {
        const advocateRole = rolesByCategory['official']?.find(r => r.name === 'Advocate');
        if (advocateRole) {
          setSelectedRoleId(advocateRole.id);
          setIsCustomRole(false);
        }
      }
      // Reset entity search
      setEntitySearchQuery('');
      setEntitySearchResults([]);
      setSelectedEntity(null);
      setShowEntitySearch(false);
    }
  }, [direction, isOpen, rolesByCategory]);

  // Debounced entity search
  useEffect(() => {
    if (entitySearchQuery.length < 2) {
      setEntitySearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearchingEntities(true);
      try {
        const results = await searchEntities(entitySearchQuery, dagId);
        setEntitySearchResults(results);
        setShowEntitySearch(true);
      } catch (error) {
        console.error('Entity search failed:', error);
      } finally {
        setIsSearchingEntities(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [entitySearchQuery, dagId]);

  // When entity is selected, pre-fill name and role
  useEffect(() => {
    if (selectedEntity) {
      setName(selectedEntity.entity.name);
      setSelectedRoleId(selectedEntity.entity.roleId);
      setEntityType(selectedEntity.entity.entityType || "human");
      setDescription(selectedEntity.entity.description || '');
      setCategory(selectedEntity.entity.roleLink?.category as RoleCategory || getDefaultCategory());
      setIsCustomRole(false);
      setShowEntitySearch(false);
    }
  }, [selectedEntity]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation: Ensure required fields are filled
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    
    if (!selectedRoleId || (isCustomRole && !selectedRoleId.trim())) {
      toast.error(isCustomRole ? "Please enter a custom role name" : "Please select a role");
      return;
    }
    
    if (!relationship.trim()) {
      toast.error("Please enter or select a relationship");
      return;
    }
    
    // If custom relationship, save it to the database and get its ID
    let finalRelationshipTypeId = relationshipTypeId;
    if (isCustomRelationship && relationship.trim()) {
      try {
        // Determine category based on relationship content (simple heuristic)
        let relationshipCategory = 'General';
        const relLower = relationship.toLowerCase();
        if (relLower.includes('payment') || relLower.includes('tender') || relLower.includes('contract') || relLower.includes('financial') || relLower.includes('money')) {
          relationshipCategory = 'Financial';
        } else if (relLower.includes('testified') || relLower.includes('witness') || relLower.includes('statement')) {
          relationshipCategory = 'Legal';
        } else if (relLower.includes('meeting') || relLower.includes('discussion') || relLower.includes('conversation')) {
          relationshipCategory = 'Personal';
        } else if (relLower.includes('report') || relLower.includes('document') || relLower.includes('evidence')) {
          relationshipCategory = 'Documentary';
        }

        const createRelRes = await fetch('/api/relationships', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: relationship.trim(),
            category: relationshipCategory
          })
        });

        if (createRelRes.ok) {
          const newRel = await createRelRes.json();
          finalRelationshipTypeId = newRel.relationship.id;
          console.log('✅ Created custom relationship:', newRel.relationship.name, 'with ID:', finalRelationshipTypeId);
          toast.success('Custom relationship saved for future use');
        } else {
          // Non-critical - relationship will still be used as custom (no ID)
          console.warn('Failed to save custom relationship, will use as custom label');
        }
      } catch (error) {
        console.error('Error saving custom relationship:', error);
        // Non-critical - relationship will still be used as custom (no ID)
      }
    }
    
    // If custom role, create it in the database first
    let finalRoleId = selectedRoleId;
    if (isCustomRole) {
      try {
        const createRoleRes = await fetch('/api/roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: selectedRoleId.trim(),
            category: category
          })
        });

        if (createRoleRes.ok) {
          const newRole = await createRoleRes.json();
          finalRoleId = newRole.id;
          console.log('✅ Created custom role:', newRole.name, 'with ID:', finalRoleId);
        } else {
          const error = await createRoleRes.json().catch(() => ({ error: 'Unknown error' }));
          toast.error(`Failed to create custom role: ${error.error || 'Unknown error'}`);
          return;
        }
      } catch (error) {
        console.error('Error creating custom role:', error);
        toast.error('Failed to create custom role. Please check your connection and try again.');
        return;
      }
    } else {
      // Validate that non-custom roleId exists
      if (!finalRoleId || !finalRoleId.trim()) {
        toast.error("Please select a valid role");
        return;
      }
      
      // Verify role exists in database
      try {
        const rolesRes = await fetch('/api/roles');
        if (rolesRes.ok) {
          const rolesData = await rolesRes.json();
          const roleExists = rolesData.roles.some((r: any) => r.id === finalRoleId);
          if (!roleExists) {
            toast.error("Selected role no longer exists. Please select a different role.");
            return;
          }
        }
      } catch (error) {
        console.error('Error validating role:', error);
        // Non-critical, continue but warn
        console.warn('Could not validate role, proceeding anyway');
      }
    }
    
    // If entity is selected, use its ID; otherwise search for existing or create new
    let entityId = selectedEntity?.entity.id;
    
    // If no entity selected but name matches an existing entity, try to find it
    if (!entityId && name.trim().length >= 2) {
      try {
        const results = await searchEntities(name.trim(), dagId);
        // Exact match (case-insensitive, trimmed)
        const exactMatch = results.find(r => 
          r.entity.name.toLowerCase().trim() === name.trim().toLowerCase()
        );
        if (exactMatch) {
          entityId = exactMatch.entity.id;
          console.log('✅ Found existing entity:', exactMatch.entity.name);
        }
      } catch (error) {
        console.error('Error searching for existing entity:', error);
        // Non-critical - will create new entity if not found
        toast.error('Could not search for existing entities. A new entity will be created.');
      }
    }
    
    // If entityId was provided, validate it exists
    if (entityId) {
      try {
        const verifyRes = await fetch(`/api/entities?q=${encodeURIComponent(name)}&dagId=${dagId}`);
        if (verifyRes.ok) {
          const entities = await verifyRes.json();
          const entityExists = entities.some((e: any) => e.entity.id === entityId);
          if (!entityExists) {
            console.warn(`Entity ${entityId} not found, will create new entity`);
            entityId = undefined; // Reset to create new entity
          }
        }
      } catch (error) {
        console.error('Error verifying entity:', error);
        // Non-critical, continue
      }
    }

    onSubmit({
      name,
      roleId: finalRoleId, // Use the created role ID (or existing role ID)
      entityType,
      description,
      relationship,
      relationshipTypeId: finalRelationshipTypeId || undefined, // Use saved relationship ID if available
      entityId, // Link to existing entity if found
    });
    
    // Reset form
    setName('');
    setSelectedRoleId('');
    setIsCustomRole(false);
    setEntityType("human");
    setDescription('');
    setRelationship('');
    setIsCustomRelationship(true);
    setEntitySearchQuery('');
    setEntitySearchResults([]);
    setSelectedEntity(null);
    setShowEntitySearch(false);
    onClose();
  };

  const handleCategoryChange = (cat: RoleCategory) => {
    setCategory(cat);
    setSelectedRoleId(''); // Reset role when category changes
    setIsCustomRole(false);
  };

  const handleRoleSelection = (roleId: string) => {
    if (roleId === 'custom') {
      setIsCustomRole(true);
      setSelectedRoleId('');
    } else {
      setIsCustomRole(false);
      setSelectedRoleId(roleId);
    }
  };

  const handleRelationshipSelection = (relIdOrCustom: string) => {
    if (relIdOrCustom === 'custom') {
      setIsCustomRelationship(true);
      setRelationship('');
      setRelationshipTypeId('');
    } else {
      setIsCustomRelationship(false);
      // Find the relationship by ID to get its name
      let relName = '';
      for (const category of Object.values(relationshipsByCategory)) {
        const rel = category.find(r => r.id === relIdOrCustom);
        if (rel) {
          relName = rel.name;
          break;
        }
      }
      setRelationship(relName);
      setRelationshipTypeId(relIdOrCustom);
    }
  };

  const currentRoleSuggestions = rolesByCategory[category] || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] border border-border">
        
        {/* Header - Enhanced */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20">
            <div>
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <UserPlus size={20} className="text-primary"/>
                    Add New Connection
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Connecting to <span className="font-semibold text-primary">{sourceNodeLabel}</span></p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground smooth-transition" title="Close (Esc)">
                <X size={18} />
            </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
            
            {/* Name / Entity Search */}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <label className="text-label">Name / Entity</label>
                    {selectedEntity && (
                        <span className="text-xs text-success font-semibold flex items-center gap-1">
                            <Check size={12} />
                            Linked to existing entity
                        </span>
                    )}
                </div>
                <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input 
                    required
                    type="text" 
                    value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            setEntitySearchQuery(e.target.value);
                            setSelectedEntity(null);
                        }}
                        placeholder="Type name to search existing entities..."
                        className="w-full pl-10 pr-4 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none smooth-transition placeholder:text-muted-foreground"
                    />
                    
                    {/* Entity Search Results */}
                    {showEntitySearch && entitySearchResults.length > 0 && !selectedEntity && (
                        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-xl max-h-48 overflow-y-auto">
                            {entitySearchResults.map((result) => (
                                <button
                                    key={result.entity.id}
                                    type="button"
                                    onClick={() => setSelectedEntity(result)}
                                    className={clsx(
                                        "w-full px-4 py-2.5 text-left hover:bg-muted smooth-transition flex items-center justify-between",
                                        result.inCurrentDAG && "bg-primary/5"
                                    )}
                                >
                                    <div>
                                        <div className="font-semibold text-foreground">{result.entity.name}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {result.entity.roleLink?.name || 'Unknown role'}
                                            {result.inCurrentDAG && ' • Already in this graph'}
                                        </div>
                                    </div>
                                    {result.inCurrentDAG && (
                                        <Check size={14} className="text-primary" />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                    
                    {isSearchingEntities && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    )}
                </div>
                {selectedEntity && (
                    <p className="text-xs text-muted-foreground">
                        Will link to existing entity: <span className="font-semibold">{selectedEntity.entity.name}</span>
                    </p>
                )}
            </div>

            {/* Entity Type Selection */}
            {!selectedEntity && (
                <div className="space-y-2">
                    <label className="text-label">Entity Type</label>
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            type="button"
                            onClick={() => setEntityType("human")}
                            className={clsx(
                                "px-3 py-2 rounded-lg text-xs font-semibold border smooth-transition",
                                entityType === "human"
                                    ? "bg-primary/10 text-primary border-primary ring-1 ring-primary/20"
                                    : "bg-background border-border text-muted-foreground hover:bg-muted/50"
                            )}
                        >
                            👤 Human
                        </button>
                        <button
                            type="button"
                            onClick={() => setEntityType("company")}
                            className={clsx(
                                "px-3 py-2 rounded-lg text-xs font-semibold border smooth-transition",
                                entityType === "company"
                                    ? "bg-primary/10 text-primary border-primary ring-1 ring-primary/20"
                                    : "bg-background border-border text-muted-foreground hover:bg-muted/50"
                            )}
                        >
                            🏢 Company
                        </button>
                        <button
                            type="button"
                            onClick={() => setEntityType("organization")}
                            className={clsx(
                                "px-3 py-2 rounded-lg text-xs font-semibold border smooth-transition",
                                entityType === "organization"
                                    ? "bg-primary/10 text-primary border-primary ring-1 ring-primary/20"
                                    : "bg-background border-border text-muted-foreground hover:bg-muted/50"
                            )}
                        >
                            🏛️ Organization
                        </button>
                    </div>
                </div>
            )}

            {/* Category Selection - Enhanced */}
            <div className="space-y-2">
                <label className="text-label">Category</label>
                <div className="grid grid-cols-2 gap-2">
                    {categories.map(cat => {
                        const style = getRoleStyle(cat);
                        const isSelected = category === cat;
                        return (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => handleCategoryChange(cat)}
                                className={clsx(
                                    "px-3 py-2 rounded-lg text-xs font-semibold border smooth-transition text-left",
                                    isSelected 
                                        ? clsx(style.bg, style.text, style.border, "ring-1", style.ring) 
                                        : "bg-background border-border text-muted-foreground hover:bg-muted/50"
                                )}
                            >
                                {cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ')}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Role Title - Hybrid Dropdown */}
            <div className="space-y-1.5">
                <label className="text-label">Role Title</label>
                {isLoadingRoles ? (
                  <div className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-muted-foreground text-sm">Loading roles...</div>
                ) : !isCustomRole ? (
                    <select
                        required
                        value={selectedRoleId}
                        onChange={(e) => handleRoleSelection(e.target.value)}
                        className={clsx(
                          "w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none smooth-transition appearance-none cursor-pointer",
                          !selectedRoleId && "border-destructive/50"
                        )}
                    >
                        <option value="">Select a role...</option>
                        {currentRoleSuggestions.map(role => (
                            <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                        <option value="custom">✏️ Custom...</option>
                    </select>
                ) : (
                    <div className="relative">
                        <input 
                            required
                            type="text" 
                            value={selectedRoleId}
                            onChange={e => setSelectedRoleId(e.target.value)}
                            placeholder="Type custom role name..."
                            className={clsx(
                              "w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none smooth-transition",
                              !selectedRoleId && "border-destructive/50"
                            )}
                            autoFocus
                        />
                        <button
                            type="button"
                            onClick={() => setIsCustomRole(false)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-indigo-600 hover:text-indigo-700 font-bold"
                        >
                            Back to list
                        </button>
                    </div>
                )}
            </div>

            {/* Relationship - Hybrid Dropdown */}
            <div className="space-y-1.5">
                <label className="text-label">Relationship to {sourceNodeLabel}</label>
                {!isCustomRelationship ? (
                    <select
                        required
                        value={relationshipTypeId || ''}
                        onChange={(e) => handleRelationshipSelection(e.target.value)}
                        className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none smooth-transition appearance-none cursor-pointer"
                    >
                        <option value="">Select relationship...</option>
                        {isLoadingRelationships ? (
                             <option disabled>Loading relationships...</option>
                        ) : Object.entries(relationshipsByCategory).length > 0 ? (
                            Object.entries(relationshipsByCategory).map(([group, rels]) => (
                                <optgroup key={group} label={group}>
                                    {rels.map(rel => (
                                        <option key={rel.id || rel.name} value={rel.id || rel.name}>{rel.name}</option>
                                    ))}
                                </optgroup>
                            ))
                        ) : (
                             <option disabled>No relationships available</option>
                        )}
                        <option value="custom">✏️ Custom...</option>
                    </select>
                ) : (
                    <div className="relative">
                        <input 
                            required
                            type="text" 
                            value={relationship}
                            onChange={e => setRelationship(e.target.value)}
                            placeholder="Type custom relationship..."
                            className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none smooth-transition"
                        />
                        <button
                            type="button"
                            onClick={() => setIsCustomRelationship(false)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-indigo-600 hover:text-indigo-700 font-bold"
                        >
                            Choose from list
                        </button>
                    </div>
                )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
                <label className="text-label">Description</label>
                <textarea 
                    rows={3}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Brief context..."
                    className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none smooth-transition resize-none placeholder:text-muted-foreground"
                />
            </div>

        </form>

        {/* Footer - Enhanced */}
        <div className="px-6 py-4 border-t border-border bg-muted/20 flex justify-end gap-3">
            <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-muted-foreground hover:bg-muted smooth-transition">Cancel</button>
            <button 
                onClick={handleSubmit} 
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg smooth-transition flex items-center gap-2"
            >
                <Save size={16} />
                Add to Graph
            </button>
        </div>

      </div>
    </div>
  );
};

export default AddNodeDialog;
