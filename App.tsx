
import React, { useState, useCallback, useEffect } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { PerformanceProvider } from './contexts/PerformanceContext';
import { HardwareProvider } from './contexts/HardwareContext';
import { AudioProvider } from './contexts/AudioContext';
import { NetworkProvider } from './contexts/NetworkContext';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { AudioVisualizer } from './components/AudioVisualizer';
import { EffectRack } from './components/EffectRack';
import { ProjectionManager } from './components/ProjectionManager';
import { SystemTerminal } from './components/SystemTerminal';
import { LedController } from './components/LedController';
import HardwareServices from './components/HardwareServices';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

const App: React.FC = () => {
    const [viewMode, setViewMode] = useState<'grid' | 'focus'>('grid');
    const [activeWidgets, setActiveWidgets] = useState<Record<string, boolean>>({
        'Audio_Matrix': true,
        'Room_EQ': false,
        'Network_Status': true,
        'Lighting_Link': false,
        'Projection_Map': true,
        'Node_Deployment': false,
        'System_Log': true
    });

    const toggleWidget = useCallback((id: string) => {
        setActiveWidgets(prev => ({ ...prev, [id]: !prev[id] }));
    }, []);

    const resetLayout = useCallback(() => {
        // In a real grid-layout system, this would reset localstorage keys
        console.log("Resetting Layout...");
    }, []);

    return (
        <ErrorBoundary>
            <ThemeProvider>
                <PerformanceProvider>
                    <HardwareProvider>
                        <AudioProvider>
                            <NetworkProvider>
                                <Layout 
                                    activeWidgets={activeWidgets} 
                                    toggleWidget={toggleWidget}
                                    viewMode={viewMode}
                                    setViewMode={setViewMode}
                                    onResetLayout={resetLayout}
                                >
                                    {/* HIDDEN LOGIC SERVICES */}
                                    <HardwareServices />

                                    <div className="p-4 space-y-4">
                                        {activeWidgets['Network_Status'] && <Dashboard />}
                                        
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                            {activeWidgets['Audio_Matrix'] && <AudioVisualizer />}
                                            {activeWidgets['Room_EQ'] && <EffectRack />}
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                            {activeWidgets['Projection_Map'] && <ProjectionManager />}
                                            {activeWidgets['Lighting_Link'] && <LedController />}
                                        </div>

                                        {activeWidgets['System_Log'] && <SystemTerminal />}
                                    </div>
                                </Layout>
                            </NetworkProvider>
                        </AudioProvider>
                    </HardwareProvider>
                </PerformanceProvider>
            </ThemeProvider>
        </ErrorBoundary>
    );
};

export default App;
