import { NodeData } from '@/lib/types';
import clsx from 'clsx';
import { Scale, UserPlus } from 'lucide-react';
import { memo, useRef, useState } from 'react';
import { Handle, NodeProps, NodeToolbar, Position } from 'reactflow';

const EvidenceLeaderNode = ({ data, selected }: NodeProps<NodeData>) => {
  const { label, description, avatar, onAddConnection } = data;
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 300);
  };

  return (
    <>
    <NodeToolbar isVisible={selected || isHovered} position={Position.Right} offset={10}>
        <button 
            onClick={() => onAddConnection?.()}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="w-10 h-10 rounded-full shadow-xl flex items-center justify-center text-white hover:scale-110 transition-all bg-amber-600"
            title="Add Connection"
        >
            <UserPlus size={16} />
        </button>
    </NodeToolbar>

    <div 
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={clsx(
            "w-72 bg-gradient-to-br from-amber-50 to-white rounded-xl shadow-md transition-all duration-300 group overflow-hidden border-2",
            selected 
                ? "border-amber-500 ring-2 ring-amber-500/30 shadow-xl scale-[1.02] z-50"
                : "border-amber-200 hover:border-amber-300 hover:shadow-lg"
        )}
    >
      {/* Handles - Named for directional routing - More Prominent */}
      <Handle 
        type="target" 
        position={Position.Top} 
        id="top" 
        className="!w-2.5 !h-2.5 !bg-amber-600 border border-white shadow-sm transition-all hover:scale-110 hover:ring-1 hover:ring-amber-400 hover:shadow-md opacity-0 group-hover:opacity-100" 
        style={{ cursor: 'grab' }}
      />
      
      <Handle 
        type="target" 
        position={Position.Right} 
        id="right" 
        className="!w-2.5 !h-2.5 !bg-amber-600 border border-white shadow-sm transition-all hover:scale-110 hover:ring-1 hover:ring-amber-400 hover:shadow-md opacity-0 group-hover:opacity-100" 
        style={{ cursor: 'grab' }}
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        id="right" 
        className="!w-2.5 !h-2.5 !bg-amber-600 border border-white shadow-sm transition-all hover:scale-110 hover:ring-1 hover:ring-amber-400 hover:shadow-md opacity-0 group-hover:opacity-100" 
        style={{ cursor: 'grab' }}
      />

      <Handle 
        type="target" 
        position={Position.Bottom} 
        id="bottom" 
        className="!w-2.5 !h-2.5 !bg-amber-600 border border-white shadow-sm transition-all hover:scale-110 hover:ring-1 hover:ring-amber-400 hover:shadow-md opacity-0 group-hover:opacity-100" 
        style={{ cursor: 'grab' }}
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="bottom" 
        className="!w-2.5 !h-2.5 !bg-amber-600 border border-white shadow-sm transition-all hover:scale-110 hover:ring-1 hover:ring-amber-400 hover:shadow-md opacity-0 group-hover:opacity-100" 
        style={{ cursor: 'grab' }}
      />

      <Handle 
        type="target" 
        position={Position.Left} 
        id="left" 
        className="!w-2.5 !h-2.5 !bg-amber-600 border border-white shadow-sm transition-all hover:scale-110 hover:ring-1 hover:ring-amber-400 hover:shadow-md opacity-0 group-hover:opacity-100" 
        style={{ cursor: 'grab' }}
      />
      <Handle 
        type="source" 
        position={Position.Left} 
        id="left" 
        className="!w-2.5 !h-2.5 !bg-amber-600 border border-white shadow-sm transition-all hover:scale-110 hover:ring-1 hover:ring-amber-400 hover:shadow-md opacity-0 group-hover:opacity-100" 
        style={{ cursor: 'grab' }}
      />

      {/* Header Bar */}
      <div className="bg-gradient-to-r from-amber-600 to-amber-500 h-1.5 w-full" />

      <div className="p-4 flex gap-3">
        {/* Icon */}
        <div className="shrink-0">
            <div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden border-2 border-amber-200 bg-amber-100">
                {avatar ? (
                    <img src={avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                    <Scale className="text-amber-700" size={24} />
                )}
            </div>
        </div>

        {/* Content */}
        <div className="flex flex-col min-w-0 flex-1">
            <h3 className="text-sm font-bold text-zinc-900 truncate leading-tight mb-1">{label}</h3>
            
            <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-[4px] tracking-wide bg-amber-100 text-amber-800 border border-amber-200">
                    Evidence Leader
                </span>
            </div>

            {description ? (
                <p className="text-[10px] text-zinc-600 leading-relaxed line-clamp-2">
                    {description}
                </p>
            ) : (
                <p className="text-[10px] text-zinc-400 italic">
                    No description available
                </p>
            )}
        </div>
      </div>

      {/* Legal Accent Bar */}
      <div className="h-1 w-full bg-gradient-to-r from-transparent via-amber-300 to-transparent opacity-50"></div>
    </div>
    </>
  );
};

export default memo(EvidenceLeaderNode);
