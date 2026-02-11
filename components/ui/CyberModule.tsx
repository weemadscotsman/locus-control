
import React from 'react';

interface CyberModuleProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  hero?: boolean; // If true, gets special highlighting
  onClose?: () => void;
}

export const CyberModule: React.FC<CyberModuleProps> = ({ title, children, className = '', icon, hero = false, onClose }) => {
  return (
    <div className={`
      relative flex flex-col bg-[#050505]/80 backdrop-blur-md border transition-all duration-500 h-full w-full overflow-hidden
      ${hero ? 'border-cyan-500/50 shadow-[0_0_20px_rgba(0,243,255,0.1)]' : 'border-cyan-900/40 hover:border-cyan-700/60'}
      ${className}
    `}>
      {/* Module Header / Drag Handle */}
      <div className={`
        drag-handle cursor-grab active:cursor-grabbing
        flex items-center justify-between px-3 py-1.5 border-b shrink-0 transition-colors duration-300 select-none
        ${hero ? 'bg-gradient-to-r from-cyan-900/40 via-cyan-900/10 to-transparent border-cyan-500/30' : 'bg-cyan-900/10 border-cyan-900/20'}
      `}>
        <div className="flex items-center gap-2 pointer-events-none">
           {icon && <span className={`${hero ? 'text-yellow-400 drop-shadow-[0_0_5px_rgba(252,238,10,0.8)]' : 'text-yellow-600'}`}>{icon}</span>}
           {!icon && <div className={`w-1.5 h-1.5 rotate-45 ${hero ? 'bg-cyan-400 shadow-[0_0_5px_#0ff]' : 'bg-cyan-700'}`} />}
           <h3 className={`text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] ${hero ? 'text-yellow-300' : 'text-yellow-500'}`}>
             {title}
           </h3>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 opacity-50 pointer-events-none">
                <div className="w-1 h-1 bg-current rounded-full" />
                <div className="w-6 h-[1px] bg-current" />
            </div>
            {onClose && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onClose(); }} 
                    className="text-gray-500 hover:text-red-500 transition-colors p-1"
                >
                    ✕
                </button>
            )}
        </div>
      </div>

      {/* Module Content */}
      <div className="flex-1 relative p-2 min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto custom-scrollbar">
            {children}
        </div>
        
        {/* Corner Accents */}
        <div className={`absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 pointer-events-none transition-all ${hero ? 'border-cyan-400' : 'border-cyan-800'}`} />
        <div className={`absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 pointer-events-none transition-all ${hero ? 'border-cyan-400' : 'border-cyan-800'}`} />
      </div>
      
      {/* Scanline overlay for active modules */}
      {hero && (
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.05)_50%),linear-gradient(90deg,rgba(0,255,255,0.02),rgba(0,200,255,0.01),rgba(0,255,255,0.02))] z-0 bg-[length:100%_2px,3px_100%] opacity-10 animate-pulse" />
      )}
    </div>
  );
};
