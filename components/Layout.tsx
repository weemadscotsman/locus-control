
import React from 'react';
import { ReactiveBackground } from './ReactiveBackground';
import { usePerformance } from '../contexts/PerformanceContext';
import { useTheme } from '../contexts/ThemeContext';

interface LayoutProps {
  children: React.ReactNode;
  activeWidgets: Record<string, boolean>;
  toggleWidget: (id: string) => void;
  viewMode: 'grid' | 'focus';
  setViewMode: (mode: 'grid' | 'focus') => void;
  onResetLayout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
    children, activeWidgets, toggleWidget, 
    viewMode, setViewMode, onResetLayout 
}) => {
  const { quality } = usePerformance();
  const { mode, toggleMode } = useTheme();

  const widgets = [
      { id: 'Audio_Matrix', label: 'AUDIO MATRIX' },
      { id: 'Room_EQ', label: 'ROOM EQ' }, 
      { id: 'Network_Status', label: 'NET STATUS' },
      { id: 'Lighting_Link', label: 'LIGHT LINK' },
      { id: 'Projection_Map', label: 'PROJECTION' },
      { id: 'Node_Deployment', label: 'DEPLOYMENT' },
      { id: 'System_Log', label: 'EVENT LOG' },
  ];

  return (
    <div className={`h-[100dvh] w-screen flex flex-col relative overflow-hidden bg-locus-bg text-locus-text selection:bg-locus-accent selection:text-white transition-colors duration-500`}>
      
      {/* Playground Mode Background */}
      {mode === 'playground' && (
          <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
              <ReactiveBackground />
          </div>
      )}
      
      {/* Header / Dock */}
      <header className="h-14 shrink-0 border-b border-locus-border flex items-center justify-between px-2 md:px-6 bg-locus-panel z-30 gap-4 transition-colors duration-500">
        <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 flex items-center justify-center rounded shrink-0 bg-locus-border cursor-pointer hover:bg-locus-accent transition-colors group" onClick={onResetLayout} title="Reset Layout">
                <div className="w-4 h-4 bg-locus-textLight group-hover:bg-white rounded-sm"></div>
            </div>
            
            <div className="flex flex-col">
                <h1 className="hidden md:block text-lg font-bold tracking-tight text-white leading-none">
                    LOCUS <span className="text-locus-accent font-mono">CONTROL</span>
                </h1>
                <div 
                    onClick={toggleMode}
                    className="text-[9px] font-mono cursor-pointer hover:text-white flex items-center gap-1 select-none"
                >
                    <div className={`w-1.5 h-1.5 rounded-full ${mode === 'playground' ? 'bg-pink-500 animate-pulse' : 'bg-amber-500'}`}></div>
                    {mode === 'playground' ? 'PLAYGROUND MODE' : 'WORK MODE'}
                </div>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex bg-locus-bg rounded border border-locus-border p-0.5 ml-2">
                <button 
                    onClick={() => setViewMode('focus')}
                    className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${viewMode === 'focus' ? 'bg-locus-accent text-white' : 'text-locus-text hover:text-white'}`}
                >
                    TAB
                </button>
                <button 
                    onClick={() => setViewMode('grid')}
                    className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${viewMode === 'grid' ? 'bg-locus-accent text-white' : 'text-locus-text hover:text-white'}`}
                >
                    GRID
                </button>
            </div>
        </div>
        
        <nav className="flex gap-1 overflow-x-auto no-scrollbar flex-1 justify-end items-center pl-4">
            {widgets.map((w) => (
                <button
                    key={w.id}
                    onClick={() => toggleWidget(w.id)}
                    className={`px-3 py-2 text-[10px] md:text-xs font-bold transition-all duration-200 border whitespace-nowrap rounded flex items-center gap-2 shrink-0
                    ${activeWidgets[w.id]
                        ? 'bg-locus-bg text-locus-textLight border-locus-border' 
                        : 'text-gray-600 border-transparent hover:text-locus-text'
                    }`}
                >
                    <div className={`w-1.5 h-1.5 rounded-sm ${activeWidgets[w.id] ? 'bg-locus-success' : 'bg-gray-700'}`} />
                    {w.label}
                </button>
            ))}
        </nav>
      </header>

      {/* Main Content (Grid Container) */}
      <main className="flex-1 relative z-10 overflow-y-auto overflow-x-hidden custom-scrollbar bg-transparent">
        {children}
      </main>

      {/* Footer / Status Bar */}
      <footer className="h-6 shrink-0 border-t border-locus-border flex items-center px-4 text-[10px] text-locus-text bg-locus-panel z-20 justify-between font-mono">
        <div className="flex gap-4">
            <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-locus-success rounded-full"></div> SYSTEM ONLINE</span>
            <span className="hidden md:inline text-gray-600">LOCUS CONTROL V1.3.0-{mode.toUpperCase()}</span>
        </div>
        <div className="text-locus-accent font-bold">
            {viewMode === 'grid' ? 'EDIT MODE ACTIVE' : 'FOCUS VIEW'}
        </div>
      </footer>
    </div>
  );
};
