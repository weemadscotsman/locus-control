import React, { useState, useEffect } from 'react';
import { ReactiveBackground } from './ReactiveBackground';
import { usePerformance } from '../contexts/PerformanceContext';
import { useTheme } from '../contexts/ThemeContext';

interface LayoutProps {
  children: React.ReactNode;
  activeWidgets: Record<string, boolean>;
  activeModule?: string; // Added for Focus Mode feedback
  toggleWidget: (id: string) => void;
  viewMode: 'grid' | 'focus';
  setViewMode: (mode: 'grid' | 'focus') => void;
  onResetLayout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
    children, activeWidgets, activeModule, toggleWidget, 
    viewMode, setViewMode, onResetLayout 
}) => {
  const { quality } = usePerformance();
  const { mode, toggleMode } = useTheme();
  const [isKiosk, setIsKiosk] = useState(false);

  useEffect(() => {
    const handler = () => setIsKiosk(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleKiosk = () => {
      if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(e => console.error(e));
      } else {
          document.exitFullscreen().catch(e => console.error(e));
      }
  };

  const widgets = [
      { id: 'Scene_Manager', label: 'SCENES' }, // New Widget
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

            {/* Global Fullscreen Toggle */}
            <button 
                onClick={toggleKiosk}
                title={isKiosk ? "Exit Kiosk Mode" : "Enter Kiosk Mode"}
                className={`ml-2 w-7 h-7 flex items-center justify-center rounded border transition-colors ${isKiosk ? 'bg-locus-accent border-transparent text-white' : 'bg-transparent border-locus-border text-gray-400 hover:text-white'}`}
            >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {isKiosk ? (
                         <path d="M4.5 4.5H1.5V3H3V1.5H4.5V4.5ZM7.5 7.5H10.5V9H9V10.5H7.5V7.5ZM4.5 7.5H1.5V9H3V10.5H4.5V7.5ZM7.5 4.5H10.5V3H9V1.5H7.5V4.5Z" fill="currentColor"/>
                    ) : (
                         <path d="M1.5 4.5H0V1.5C0 0.67 0.67 0 1.5 0H4.5V1.5H1.5V4.5ZM10.5 4.5H12V1.5C12 0.67 11.33 0 10.5 0H7.5V1.5H10.5V4.5ZM1.5 7.5H0V10.5C0 11.33 0.67 12 1.5 12H4.5V10.5H1.5V7.5ZM10.5 7.5H12V10.5C12 11.33 11.33 12 10.5 12H7.5V10.5H10.5V7.5Z" fill="currentColor"/>
                    )}
                </svg>
            </button>
        </div>
        
        <nav className="flex gap-1 overflow-x-auto no-scrollbar flex-1 justify-end items-center pl-4">
            {widgets.map((w) => {
                // Determine Active State based on View Mode
                const isActive = viewMode === 'grid' 
                    ? activeWidgets[w.id] 
                    : activeModule === w.id;

                return (
                    <button
                        key={w.id}
                        onClick={() => toggleWidget(w.id)}
                        className={`px-3 py-2 text-[10px] md:text-xs font-bold transition-all duration-200 border whitespace-nowrap rounded flex items-center gap-2 shrink-0
                        ${isActive
                            ? 'bg-locus-bg text-locus-textLight border-locus-border' 
                            : 'text-gray-600 border-transparent hover:text-locus-text'
                        }`}
                    >
                        <div className={`w-1.5 h-1.5 rounded-sm ${isActive ? 'bg-locus-success' : 'bg-gray-700'}`} />
                        {w.label}
                    </button>
                );
            })}
        </nav>
      </header>

      {/* Main Content (Grid Container) */}
      <main className="flex-1 relative z-10 overflow-y-auto overflow-x-hidden custom-scrollbar bg-transparent">
        {children}
      </main>

      {/* Footer / Status Bar */}
      <footer className="h-6 shrink-0 border-t border-locus-border flex items-center px-4 text-[10px] text-locus-text bg-locus-panel z-20 justify-between font-mono">
        <div className="flex gap-4">
            <span className="flex items-center gap-2"><div className={`w-1.5 h-1.5 rounded-full ${isKiosk ? 'bg-locus-accent animate-pulse' : 'bg-locus-success'}`}></div> {isKiosk ? 'KIOSK MODE' : 'SYSTEM ONLINE'}</span>
            <span className="hidden md:inline text-gray-600">LOCUS CONTROL V1.5.0-{mode.toUpperCase()}</span>
        </div>
        <div className="text-locus-accent font-bold">
            {viewMode === 'grid' ? 'GRID VIEW ACTIVE' : `FOCUS: ${activeModule?.replace('_', ' ')}`}
        </div>
      </footer>
    </div>
  );
};
