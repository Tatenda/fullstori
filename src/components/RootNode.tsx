import { NodeData } from '@/lib/types';
import clsx from 'clsx';
import { Scale, UserPlus } from "lucide-react";
import { memo, useRef, useState } from 'react';
import { Handle, NodeProps, NodeToolbar, Position } from 'reactflow';

const RootNode = ({ data, selected }: NodeProps<NodeData>) => {
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Default labels (can be overridden by data.directionLabels)
  const defaultLabels = {
    top: 'Connect',
    bottom: 'Connect',
    left: 'Connect',
    right: 'Connect'
  };

  const labels = {
    top: data.directionLabels?.top || defaultLabels.top,
    bottom: data.directionLabels?.bottom || defaultLabels.bottom,
    left: data.directionLabels?.left || defaultLabels.left,
    right: data.directionLabels?.right || defaultLabels.right,
  };

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

  return (
    <>
    {/* Top Toolbar - Commission Staff */}
    <NodeToolbar isVisible={selected || isHovered} position={Position.Top} offset={25}>
        <button 
            onClick={() => data.onAddConnection?.('top')}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="group flex items-center gap-0 px-2 py-2 bg-purple-600 text-white rounded-full shadow-xl hover:bg-purple-700 hover:scale-105 transition-all font-bold text-xs overflow-hidden hover:gap-2 hover:px-3"
        >
            <UserPlus size={12} className="shrink-0" />
            <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-[100px] transition-all duration-300">{labels.top}</span>
        </button>
    </NodeToolbar>

    {/* Bottom Toolbar - Allegations Participants */}
    <NodeToolbar isVisible={selected || isHovered} position={Position.Bottom} offset={25}>
        <button 
            onClick={() => data.onAddConnection?.('bottom')}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="group flex items-center gap-0 px-2 py-2 bg-red-600 text-white rounded-full shadow-xl hover:bg-red-700 hover:scale-105 transition-all font-bold text-xs overflow-hidden hover:gap-2 hover:px-3"
        >
            <UserPlus size={12} className="shrink-0" />
            <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-[100px] transition-all duration-300">{labels.bottom}</span>
        </button>
    </NodeToolbar>

    {/* Left Toolbar - Evidence Leaders */}
    <NodeToolbar isVisible={selected || isHovered} position={Position.Left} offset={25}>
        <button 
            onClick={() => data.onAddConnection?.('left')}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="group flex items-center gap-0 px-2 py-2 bg-amber-600 text-white rounded-full shadow-xl hover:bg-amber-700 hover:scale-105 transition-all font-bold text-xs overflow-hidden hover:gap-2 hover:px-3"
        >
            <UserPlus size={12} className="shrink-0" />
            <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-[120px] transition-all duration-300">{labels.left}</span>
        </button>
    </NodeToolbar>

    {/* Right Toolbar - General */}
    <NodeToolbar isVisible={selected || isHovered} position={Position.Right} offset={25}>
        <button 
            onClick={() => data.onAddConnection?.('right')}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="group flex items-center gap-0 px-2 py-2 bg-indigo-600 text-white rounded-full shadow-xl hover:bg-indigo-700 hover:scale-105 transition-all font-bold text-xs overflow-hidden hover:gap-2 hover:px-3"
        >
            <UserPlus size={12} className="shrink-0" />
            <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-[100px] transition-all duration-300">{labels.right}</span>
        </button>
    </NodeToolbar>

    <div 
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={clsx(
            "w-80 h-80 rounded-full bg-zinc-900 shadow-2xl transition-all duration-500 flex items-center justify-center relative group",
            selected ? "ring-4 ring-indigo-500/30 scale-105" : "hover:scale-105"
        )}
    >
        {/* Decorative Rings */}
        <div className="absolute inset-0 rounded-full border border-white/10 animate-pulse-slow"></div>
        <div className="absolute -inset-4 rounded-full border border-indigo-500/20"></div>
        
        {/* Named Handles for 4 directions - Show on hover */}
        <Handle 
          type="source" 
          position={Position.Top} 
          id="top" 
          className="!w-2.5 !h-2.5 !bg-purple-600 border border-white shadow-sm transition-all hover:scale-110 hover:ring-1 hover:ring-purple-400 hover:shadow-md opacity-0 group-hover:opacity-100" 
          style={{ cursor: 'grab' }}
        />
        <Handle 
          type="source" 
          position={Position.Bottom} 
          id="bottom" 
          className="!w-2.5 !h-2.5 !bg-red-600 border border-white shadow-sm transition-all hover:scale-110 hover:ring-1 hover:ring-red-400 hover:shadow-md opacity-0 group-hover:opacity-100" 
          style={{ cursor: 'grab' }}
        />
        <Handle 
          type="source" 
          position={Position.Left} 
          id="left" 
          className="!w-2.5 !h-2.5 !bg-amber-600 border border-white shadow-sm transition-all hover:scale-110 hover:ring-1 hover:ring-amber-400 hover:shadow-md opacity-0 group-hover:opacity-100" 
          style={{ cursor: 'grab' }}
        />
        <Handle 
          type="source" 
          position={Position.Right} 
          id="right" 
          className="!w-2.5 !h-2.5 !bg-indigo-600 border border-white shadow-sm transition-all hover:scale-110 hover:ring-1 hover:ring-indigo-400 hover:shadow-md opacity-0 group-hover:opacity-100" 
          style={{ cursor: 'grab' }}
        />
        
        <div className="flex flex-col items-center text-center p-6 z-10">
            <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-900/50">
                <Scale className="text-white" size={40} />
            </div>
            
            <h1 className="text-2xl font-black text-white tracking-tight mb-2">
                {data.label || "Root Node"}
            </h1>
            
            {data.description && (
                <p className="text-zinc-400 text-xs font-medium uppercase tracking-widest max-w-[200px] mb-6">
                    {data.description}
                </p>
            )}

            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    data.onExplore?.();
                }}
                className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full text-xs font-bold backdrop-blur-sm border border-white/10 transition-all hover:scale-105 shadow-xl flex items-center gap-2 group-hover:bg-indigo-600 group-hover:border-indigo-500"
            >
                Explore Network
            </button>
        </div>

        {/* Glow Effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-transparent rounded-full pointer-events-none"></div>
    </div>
    </>
  );
};

export default memo(RootNode);
