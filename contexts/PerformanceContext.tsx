import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';

type QualityTier = 'HIGH' | 'MEDIUM' | 'LOW';

interface PerformanceMetrics {
    fps: number;
    droppedFrames: number;
    memoryUsedJS: number; // in MB
}

// Stable Context (Updates rarely)
interface PerformanceContextType {
    quality: QualityTier;
    isPageVisible: boolean;
    setManualQuality: (q: QualityTier | 'AUTO') => void;
    manualMode: boolean;
}

// Volatile Context (Updates every second)
interface MetricsContextType {
    metrics: PerformanceMetrics;
}

const PerformanceContext = createContext<PerformanceContextType | undefined>(undefined);
const MetricsContext = createContext<MetricsContextType | undefined>(undefined);

export const usePerformance = () => {
    const context = useContext(PerformanceContext);
    if (!context) throw new Error("usePerformance must be used within PerformanceProvider");
    return context;
};

export const useMetrics = () => {
    const context = useContext(MetricsContext);
    if (!context) throw new Error("useMetrics must be used within PerformanceProvider");
    return context;
};

export const PerformanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [metrics, setMetrics] = useState<PerformanceMetrics>({ fps: 60, droppedFrames: 0, memoryUsedJS: 0 });
    const [quality, setQuality] = useState<QualityTier>('HIGH');
    const [manualQuality, setManualQualityState] = useState<QualityTier | 'AUTO'>('AUTO');
    const [isPageVisible, setIsPageVisible] = useState(true);

    // Engine Refs
    const lastTimeRef = useRef<number>(performance.now());
    const frameCountRef = useRef<number>(0);
    const lowFpsCounterRef = useRef<number>(0); 
    const highFpsCounterRef = useRef<number>(0); 
    const animationFrameRef = useRef<number>(0);

    // --- Visibility Handling ---
    useEffect(() => {
        const handleVisChange = () => {
            const visible = !document.hidden;
            setIsPageVisible(visible);
            if (visible) {
                lastTimeRef.current = performance.now();
            }
        };
        document.addEventListener('visibilitychange', handleVisChange);
        return () => document.removeEventListener('visibilitychange', handleVisChange);
    }, []);

    // --- Performance Loop ---
    useEffect(() => {
        const measure = () => {
            animationFrameRef.current = requestAnimationFrame(measure);
            
            const now = performance.now();
            frameCountRef.current++;

            if (now - lastTimeRef.current >= 1000) {
                // 1 Second interval checks
                const currentFps = frameCountRef.current;
                
                // Memory Check (Chrome only)
                // @ts-ignore
                const mem = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) : 0;

                setMetrics({
                    fps: currentFps,
                    droppedFrames: Math.max(0, 60 - currentFps),
                    memoryUsedJS: mem
                });

                // AUTO QUALITY LOGIC
                if (manualQuality === 'AUTO' && isPageVisible) {
                    if (currentFps < 25) {
                        lowFpsCounterRef.current++;
                        highFpsCounterRef.current = 0;
                    } else if (currentFps > 55) {
                        highFpsCounterRef.current++;
                        lowFpsCounterRef.current = 0;
                    } else {
                        lowFpsCounterRef.current = 0;
                        highFpsCounterRef.current = 0;
                    }

                    // Downgrade Criteria
                    if (lowFpsCounterRef.current > 3) {
                        setQuality(prev => {
                            if (prev === 'HIGH') return 'MEDIUM';
                            if (prev === 'MEDIUM') return 'LOW';
                            return 'LOW';
                        });
                        lowFpsCounterRef.current = 0;
                    }

                    // Upgrade Criteria
                    if (highFpsCounterRef.current > 10) {
                        setQuality(prev => {
                            if (prev === 'LOW') return 'MEDIUM';
                            if (prev === 'MEDIUM') return 'HIGH';
                            return 'HIGH';
                        });
                        highFpsCounterRef.current = 0;
                    }
                }

                // Reset
                frameCountRef.current = 0;
                lastTimeRef.current = now;
            }
        };

        if (isPageVisible) {
            measure();
        } else {
            cancelAnimationFrame(animationFrameRef.current);
        }

        return () => cancelAnimationFrame(animationFrameRef.current);
    }, [isPageVisible, manualQuality]);

    const setManualQuality = useCallback((q: QualityTier | 'AUTO') => {
        setManualQualityState(q);
        if (q !== 'AUTO') setQuality(q);
    }, []);

    return (
        <PerformanceContext.Provider value={{
            quality,
            isPageVisible,
            setManualQuality,
            manualMode: manualQuality !== 'AUTO'
        }}>
            <MetricsContext.Provider value={{ metrics }}>
                {children}
            </MetricsContext.Provider>
        </PerformanceContext.Provider>
    );
};