import { getRoleCategory, getRoleIcon, getRoleStyle } from '@/lib/roleUtils';
import { NodeData } from '@/lib/types';
import clsx from 'clsx';
import { UserPlus } from 'lucide-react';
import { memo, useRef, useState } from 'react';
import { Handle, NodeProps, NodeToolbar, Position } from 'reactflow';

const CustomNode = ({ data, selected }: NodeProps<NodeData>) => {
  const { role, label, description, avatar, onAddConnection } = data;
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    // Delay hiding the toolbar to allow user to reach the button
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 300);
  };
  
  // 1. Determine Category and Styles
  const category = data.category || (role ? getRoleCategory(role) : 'civilian');
  const styles = getRoleStyle(category);
  const Icon = getRoleIcon(category, 14);

  return (
    <>
    {/* Right Toolbar */}
    <NodeToolbar isVisible={selected || isHovered} position={Position.Right} offset={10}>
        <button 
            onClick={() => onAddConnection?.('right')}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={clsx(
                "w-10 h-10 rounded-full shadow-xl flex items-center justify-center text-white hover:scale-110 transition-all",
                styles.solidBg
            )}
            title="Add to Right"
        >
            <UserPlus size={16} />
        </button>
    </NodeToolbar>

    {/* Left Toolbar */}
    <NodeToolbar isVisible={selected || isHovered} position={Position.Left} offset={10}>
        <button 
            onClick={() => onAddConnection?.('left')}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={clsx(
                "w-10 h-10 rounded-full shadow-xl flex items-center justify-center text-white hover:scale-110 transition-all",
                styles.solidBg
            )}
            title="Add to Left"
        >
            <UserPlus size={16} />
        </button>
    </NodeToolbar>

    {/* Bottom Toolbar */}
    <NodeToolbar isVisible={selected || isHovered} position={Position.Bottom} offset={10}>
        <button 
            onClick={() => onAddConnection?.('bottom')}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={clsx(
                "w-10 h-10 rounded-full shadow-xl flex items-center justify-center text-white hover:scale-110 transition-all",
                styles.solidBg
            )}
            title="Add Below"
        >
            <UserPlus size={16} />
        </button>
    </NodeToolbar>

    <div 
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={clsx(
            "w-64 bg-background rounded-xl shadow-sm smooth-transition group overflow-hidden border",
            selected 
                ? clsx(styles.border, "ring-2", styles.ring, "shadow-lg scale-[1.02] z-50")
                : "border-border/50 hover:border-border hover:shadow-md"
        )}
    >
      {/* Handles - More Prominent */}
      {/* Input: Top */}
      <Handle 
        type="target" 
        position={Position.Top} 
        id="top" 
        className={clsx(
          "!w-2.5 !h-2.5 border border-white shadow-sm transition-all",
          "hover:scale-110 hover:ring-1 hover:ring-current hover:shadow-md",
          "opacity-0 group-hover:opacity-100",
          styles.text
        )}
        style={{ backgroundColor: 'currentColor', cursor: 'grab' }}
      />
      
      {/* Side Handles */}
      <Handle 
        type="target" 
        position={Position.Right} 
        id="right" 
        className={clsx(
          "!w-2.5 !h-2.5 border border-white shadow-sm transition-all",
          "hover:scale-110 hover:ring-1 hover:ring-current hover:shadow-md",
          "opacity-0 group-hover:opacity-100",
          styles.text
        )}
        style={{ backgroundColor: 'currentColor', cursor: 'grab' }}
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        id="right" 
        className={clsx(
          "!w-2.5 !h-2.5 border border-white shadow-sm transition-all",
          "hover:scale-110 hover:ring-1 hover:ring-current hover:shadow-md",
          "opacity-0 group-hover:opacity-100",
          styles.text
        )}
        style={{ backgroundColor: 'currentColor', cursor: 'grab' }}
      />

      <Handle 
        type="target" 
        position={Position.Left} 
        id="left" 
        className={clsx(
          "!w-2.5 !h-2.5 border border-white shadow-sm transition-all",
          "hover:scale-110 hover:ring-1 hover:ring-current hover:shadow-md",
          "opacity-0 group-hover:opacity-100",
          styles.text
        )}
        style={{ backgroundColor: 'currentColor', cursor: 'grab' }}
      />
      <Handle 
        type="source" 
        position={Position.Left} 
        id="left" 
        className={clsx(
          "!w-2.5 !h-2.5 border border-white shadow-sm transition-all",
          "hover:scale-110 hover:ring-1 hover:ring-current hover:shadow-md",
          "opacity-0 group-hover:opacity-100",
          styles.text
        )}
        style={{ backgroundColor: 'currentColor', cursor: 'grab' }}
      />

      {/* Output: Bottom (Source) */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="bottom" 
        className={clsx(
          "!w-2.5 !h-2.5 border border-white shadow-sm transition-all",
          "hover:scale-110 hover:ring-1 hover:ring-current hover:shadow-md",
          "opacity-0 group-hover:opacity-100",
          styles.text
        )}
        style={{ backgroundColor: 'currentColor', cursor: 'grab' }}
      />
      {/* Input: Bottom (Target) - For receiving connections from root's top handle */}
      <Handle 
        type="target" 
        position={Position.Bottom} 
        id="bottom" 
        className={clsx(
          "!w-2.5 !h-2.5 border border-white shadow-sm transition-all",
          "hover:scale-110 hover:ring-1 hover:ring-current hover:shadow-md",
          "opacity-0 group-hover:opacity-100",
          styles.text
        )}
        style={{ backgroundColor: 'currentColor', cursor: 'grab' }}
      />

      {/* Color Strip */}
      <div className={clsx("h-1.5 w-full", styles.solidBg)} />

      <div className="p-4 flex gap-3">
        {/* Avatar / Icon - Enhanced */}
        <div className="shrink-0">
            <div className={clsx(
                "w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden border border-border/50 shadow-sm",
                styles.badgeBg, styles.badgeText
            )}>
                {avatar ? (
                    <img src={avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                    Icon
                )}
            </div>
        </div>

        {/* Text Content - Enhanced */}
        <div className="flex flex-col min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground truncate leading-tight mb-1.5">{label}</h3>
            
            <div className="flex items-center gap-1.5 mb-2">
                <span className={clsx(
                    "text-[10px] uppercase font-semibold px-2 py-0.5 rounded-md tracking-wide",
                    styles.badgeBg, styles.badgeText
                )}>
                    {role}
                </span>
            </div>

            <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">
                {description || "No description available."}
            </p>
        </div>
      </div>
    </div>
    </>
  );
};

export default memo(CustomNode);
