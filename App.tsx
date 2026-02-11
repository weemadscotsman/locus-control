import React, { useState, memo, useCallback, useRef, useEffect, useMemo } from 'react';
import * as RGL from "react-grid-layout";
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { AudioVisualizer } from './components/AudioVisualizer';
import { SystemTerminal } from './components/SystemTerminal';
import { ConfigGenerator } from './components/ConfigGenerator';
import { LedController } from './components/LedController';
import { ProjectionManager } from './components/ProjectionManager';
import { EffectRack } from './components/EffectRack';
import { SceneManager } from './components/SceneManager';
import { BootSequence } from './components/BootSequence';
import { LoginScreen } from './components/LoginScreen';
import HardwareServices from './components/HardwareServices';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { AudioProvider } from './contexts/AudioContext';
import { PerformanceProvider } from './contexts/PerformanceContext';
import { HardwareProvider } from './contexts/HardwareContext';
import { NetworkProvider } from './contexts/NetworkContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SceneProvider } from './contexts/SceneContext';

const getGridComponents = () => {
    const gridLib: any = RGL;
    const WidthProvider = gridLib.WidthProvider || gridLib.default?.WidthProvider;
    const Responsive = gridLib.Responsive || gridLib.default?.Responsive;
    
    if (!WidthProvider || !Responsive) {
        console.error("Critical: Grid Layout Module Resolution Failed", gridLib);
        return { ResponsiveGridLayout: null };
    }
    return { ResponsiveGridLayout: WidthProvider(Responsive) };
};

const { ResponsiveGridLayout } = getGridComponents();

const WidgetWrapper = memo(({ id, children }: { id: string, children: React.ReactNode }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Robust Fullscreen Toggle
    const toggleFullscreen = () => {
        if (!ref.current) return;
        
        // If THIS element is already fullscreen, exit.
        if (document.fullscreenElement === ref.current) {
            document.exitFullscreen().catch(console.error);
        } else {
            // Otherwise, request fullscreen for THIS element (even if parent is already fullscreen)
            ref.current.requestFullscreen().catch(err => {
                console.error("Fullscreen Request Failed:", err);
            });
        }
    };

    useEffect(() => {
        const handler = () => {
            setIsFullscreen(document.fullscreenElement === ref.current);
        };
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    return (
        <div 
            ref={ref} 
            className={`
                h-full w-full bg-locus-panel border border-locus-border flex flex-col relative group shadow-2xl overflow-hidden ring-1 ring-white/5 transition-all
                ${isFullscreen ? 'fixed inset-0 z-[9999]' : ''}
            `}
        >
            <div 
                className="h-8 bg-black/40 border-b border-locus-border flex items-center px-3 justify-between shrink-0 drag-handle cursor-move select-none active:bg-locus-accent/10 transition-colors z-20"
                onDoubleClick={toggleFullscreen}
            >
                <span className="text-[10px] font-bold text-locus-textLight uppercase tracking-[0.2em] flex items-center gap-2 font-mono">
                    <div className={`w-1.5 h-1.5 bg-locus-accent shadow-[0_0_8px_var(--color-accent)] rounded-sm ${isFullscreen ? 'animate-pulse' : ''}`}></div>
                    {id.replace(/_/g, ' ')}
                </span>
                
                <div className="flex gap-3 items-center">
                    {/* Fullscreen Toggle */}
                    <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFullscreen(); }}
                        className={`transition-colors p-1 rounded hover:bg-white/10 ${isFullscreen ? 'text-locus-accent' : 'text-gray-500 hover:text-white'}`}
                        title={isFullscreen ? "Restore View" : "Maximize Panel"}
                        onMouseDown={(e) => e.stopPropagation()} // Prevent drag
                    >
                         <div className="w-3 h-3 flex items-center justify-center relative">
                            {isFullscreen ? (
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M4 4H1V3H3V1H4V4Z" fill="currentColor"/>
                                    <path d="M6 6H9V7H7V9H6V6Z" fill="currentColor"/>
                                    <path d="M4 6H1V7H3V9H4V6Z" fill="currentColor"/>
                                    <path d="M6 4H9V3H7V1H6V4Z" fill="currentColor"/>
                                </svg>
                            ) : (
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1 3V1H3" stroke="currentColor" strokeWidth="1.5"/>
                                    <path d="M7 1H9V3" stroke="currentColor" strokeWidth="1.5"/>
                                    <path d="M9 7V9H7" stroke="currentColor" strokeWidth="1.5"/>
                                    <path d="M3 9H1V7" stroke="currentColor" strokeWidth="1.5"/>
                                </svg>
                            )}
                         </div>
                    </button>

                    {/* Window Controls Decoration */}
                    <div className="flex gap-1.5 opacity-30 group-hover:opacity-60 transition-opacity pointer-events-none">
                        <div className="w-1 h-1 bg-white rounded-full"></div>
                        <div className="w-1 h-1 bg-white rounded-full"></div>
                        <div className="w-1 h-1 bg-white rounded-full"></div>
                    </div>
                </div>
            </div>
            <div className="flex-1 overflow-hidden relative bg-[#080a0e] z-10">
                <ErrorBoundary name={id}>
                    {children}
                </ErrorBoundary>
            </div>
        </div>
    );
});

// Memoize sub-components for renderWidget usage
const MemoSystemTerminal = memo(SystemTerminal);
const MemoConfigGenerator = memo(ConfigGenerator);
const MemoEffectRack = memo(EffectRack);
const MemoLedController = memo(LedController);
const MemoProjectionManager = memo(ProjectionManager);
const MemoSceneManager = memo(SceneManager);

const LocusSystem = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'focus'>('grid');
  const [activeModule, setActiveModule] = useState('Network_Status');
  const [isDragging, setIsDragging] = useState(false);
  
  // High-Resolution Layout (48 Col x 8 RowHeight)
  const defaultLayout = [
    { i: 'Network_Status', x: 0, y: 0, w: 24, h: 18 },
    { i: 'Audio_Matrix', x: 24, y: 0, w: 24, h: 22 },
    { i: 'Scene_Manager', x: 0, y: 18, w: 12, h: 14 },
    { i: 'System_Log', x: 12, y: 18, w: 12, h: 14 },
    { i: 'Node_Deployment', x: 24, y: 22, w: 24, h: 18 },
    { i: 'Room_EQ', x: 0, y: 32, w: 12, h: 14 },
    { i: 'Lighting_Link', x: 12, y: 32, w: 12, h: 14 },
    { i: 'Projection_Map', x: 0, y: 46, w: 48, h: 24 }
  ];

  const [layout, setLayout] = useState(defaultLayout);
  const [visibleModules, setVisibleModules] = useState<Record<string, boolean>>({
      Network_Status: true, Audio_Matrix: true, System_Log: true, Node_Deployment: true,
      Room_EQ: true, Lighting_Link: true, Projection_Map: true, Scene_Manager: true
  });

  const renderWidget = useCallback((id: string) => {
      switch(id) {
          case 'Network_Status': return <Dashboard />;
          case 'Audio_Matrix': return <AudioVisualizer />;
          case 'System_Log': return <MemoSystemTerminal aiConfig={{ provider: 'gemini', geminiKey: '', deepseekKey: '', deepseekModel: '', openaiKey: '', openaiModel: '', ollamaUrl: '', ollamaChatModel: '', ollamaVisionModel: '' }} />;
          case 'Node_Deployment': return <MemoConfigGenerator aiConfig={{ provider: 'gemini', geminiKey: '', deepseekKey: '', deepseekModel: '', openaiKey: '', openaiModel: '', ollamaUrl: '', ollamaChatModel: '', ollamaVisionModel: '' }} setAiConfig={() => {}} />;
          case 'Room_EQ': return <MemoEffectRack />;
          case 'Lighting_Link': return <MemoLedController />;
          case 'Projection_Map': return <MemoProjectionManager aiConfig={{ provider: 'gemini', geminiKey: '', deepseekKey: '', deepseekModel: '', openaiKey: '', openaiModel: '', ollamaUrl: '', ollamaChatModel: '', ollamaVisionModel: '' }} />;
          case 'Scene_Manager': return <MemoSceneManager />;
          default: return null;
      }
  }, []);

  return (
    <Layout
        activeWidgets={visibleModules}
        activeModule={activeModule}
        toggleWidget={(id) => {
            if (viewMode === 'focus') {
                setActiveModule(id);
            } else {
                setVisibleModules(prev => ({...prev, [id]: !prev[id]}));
            }
        }}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onResetLayout={() => setLayout(defaultLayout)}
    >
        <HardwareServices />

        {viewMode === 'grid' && ResponsiveGridLayout ? (
            <ResponsiveGridLayout
                className={`layout ${isDragging ? 'dragging' : ''}`}
                layouts={{ lg: layout }}
                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                cols={{ lg: 48, md: 40, sm: 24, xs: 12, xxs: 6 }} 
                rowHeight={8} // Lower height = smoother snapping
                onLayoutChange={(curr, all) => setLayout(all.lg)}
                onDragStart={() => setIsDragging(true)}
                onDragStop={() => setIsDragging(false)}
                onResizeStart={() => setIsDragging(true)}
                onResizeStop={() => setIsDragging(false)}
                draggableHandle=".drag-handle"
                margin={[8, 8]}
                containerPadding={[8, 8]}
                isBounded={true}
                useCSSTransforms={true}
                compactType={null} 
                resizeHandles={['se', 's', 'e']}
            >
                {Object.keys(visibleModules).map(key => visibleModules[key] && (
                    <div key={key}>
                        <WidgetWrapper id={key}>{renderWidget(key)}</WidgetWrapper>
                    </div>
                ))}
            </ResponsiveGridLayout>
        ) : (
            <div className="h-full w-full p-4">
                 <WidgetWrapper id={activeModule}>{renderWidget(activeModule)}</WidgetWrapper>
            </div>
        )}
    </Layout>
  );
};

export default function App() {
  const [appState, setAppState] = useState<'BOOT' | 'LOGIN' | 'RUNNING'>('BOOT');

  return (
    <ThemeProvider>
        <PerformanceProvider>
        <AudioProvider>
            <HardwareProvider>
                <NetworkProvider>
                    <SceneProvider>
                        {appState === 'BOOT' && <BootSequence onComplete={() => setAppState('LOGIN')} />}
                        {appState === 'LOGIN' && <LoginScreen onLogin={() => setAppState('RUNNING')} />}
                        {appState === 'RUNNING' && <LocusSystem />}
                    </SceneProvider>
                </NetworkProvider>
            </HardwareProvider>
        </AudioProvider>
        </PerformanceProvider>
    </ThemeProvider>
  );
}