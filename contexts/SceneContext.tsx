import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAudioSystem } from './AudioContext';
import { useHardware } from './HardwareContext';
import { useNetwork } from './NetworkContext';
import { getStorageService } from '../services/StorageService';

export interface Scene {
    id: string;
    name: string;
    timestamp: number;
    data: {
        audio: {
            masterVolume: number;
            crossfader: number;
            sources: { id: number, volume: number, muted: boolean, solo: boolean, pan: number, group: string }[];
            fx: any;
        };
        projection: any[];
        hardware: {
            ledMode: string;
            ledBrightness: number;
        };
        network: any;
    };
}

interface SceneContextType {
    scenes: Scene[];
    isLoading: boolean;
    saveScene: (name: string) => Promise<void>;
    loadScene: (id: string) => Promise<void>;
    deleteScene: (id: string) => Promise<void>;
    exportScenes: () => Promise<void>;
    importScenes: (json: string) => Promise<void>;
    duplicateScene: (id: string) => Promise<void>;
}

const SceneContext = createContext<SceneContextType | undefined>(undefined);

export const useScene = () => {
    const context = useContext(SceneContext);
    if (!context) throw new Error("useScene must be used within SceneProvider");
    return context;
};

// UUID generation with fallback for HTTP contexts
const generateUUID = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for HTTP contexts
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
};

export const SceneProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [scenes, setScenes] = useState<Scene[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const { sources, masterVolume, crossfader, fxState, setMasterVolume, setCrossfader, updateVolume, setMute, setSolo, updateFx, assignCrossfadeGroup } = useAudioSystem();
    const { projectionSurfaces, setSurfaces, ledConfig, setLedConfig } = useHardware();
    const { config } = useNetwork();

    // Load scenes from storage on mount
    useEffect(() => {
        const loadScenes = async () => {
            try {
                setIsLoading(true);
                const storage = getStorageService();
                const data = await storage.load();
                if (data.scenes && Array.isArray(data.scenes)) {
                    setScenes(data.scenes);
                }
            } catch (error) {
                console.error("Failed to load scenes:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadScenes();
    }, []);

    // Persist scenes when they change
    useEffect(() => {
        if (isLoading) return;
        
        const saveScenes = async () => {
            try {
                const storage = getStorageService();
                await storage.save({ scenes });
            } catch (error) {
                console.error("Failed to save scenes:", error);
            }
        };

        // Debounced save
        const timer = setTimeout(saveScenes, 500);
        return () => clearTimeout(timer);
    }, [scenes, isLoading]);

    const saveScene = useCallback(async (name: string) => {
        if (!name.trim()) return;

        const newScene: Scene = {
            id: generateUUID(),
            name: name.trim(),
            timestamp: Date.now(),
            data: {
                audio: {
                    masterVolume,
                    crossfader,
                    sources: sources.map(s => ({ 
                        id: s.id, 
                        volume: s.volume, 
                        muted: s.muted, 
                        solo: s.solo, 
                        pan: 0, 
                        group: s.crossfadeGroup 
                    })),
                    fx: fxState
                },
                projection: projectionSurfaces,
                hardware: {
                    ledMode: ledConfig.mode,
                    ledBrightness: ledConfig.brightness
                },
                network: config
            }
        };

        setScenes(prev => [...prev, newScene]);
    }, [sources, masterVolume, crossfader, fxState, projectionSurfaces, ledConfig, config]);

    const loadScene = useCallback(async (id: string) => {
        const scene = scenes.find(s => s.id === id);
        if (!scene) {
            console.warn(`[SceneEngine] Scene ${id} not found`);
            return;
        }
        
        const d = scene.data;

        try {
            // Restore Audio - Using explicit state setters to avoid toggle errors
            setMasterVolume(d.audio.masterVolume);
            setCrossfader(d.audio.crossfader);
            updateFx(d.audio.fx);
            
            d.audio.sources.forEach(src => {
                updateVolume(src.id, src.volume);
                setMute(src.id, src.muted);
                setSolo(src.id, src.solo);
                assignCrossfadeGroup(src.id, src.group as any);
            });

            // Restore Projection
            // IMPORTANT: Window handles cannot be serialized. We must ensure they are nullified on load
            // so the system knows to prompt for re-launch.
            const safeSurfaces = d.projection.map(p => ({
                ...p,
                windowHandle: null // Force reset of window handle
            }));
            setSurfaces(safeSurfaces);

            // Restore Hardware
            setLedConfig(prev => ({ 
                ...prev, 
                mode: d.hardware.ledMode as any, 
                brightness: d.hardware.ledBrightness 
            }));

            console.info(`[SceneEngine] Snapshot Restored: ${scene.name}`);
        } catch (error) {
            console.error("[SceneEngine] Failed to load scene:", error);
        }
    }, [scenes, setMasterVolume, setCrossfader, updateFx, updateVolume, setMute, setSolo, assignCrossfadeGroup, setSurfaces, setLedConfig]);

    const deleteScene = useCallback(async (id: string) => {
        setScenes(prev => prev.filter(s => s.id !== id));
    }, []);

    const duplicateScene = useCallback(async (id: string) => {
        const scene = scenes.find(s => s.id === id);
        if (!scene) return;

        const duplicated: Scene = {
            ...scene,
            id: generateUUID(),
            name: `${scene.name} (Copy)`,
            timestamp: Date.now()
        };

        setScenes(prev => [...prev, duplicated]);
    }, [scenes]);

    const exportScenes = useCallback(async () => {
        try {
            const storage = getStorageService();
            const blob = await storage.export();
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `locus_scenes_${Date.now()}.json.encrypted`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Export failed:", error);
            // Fallback to plain JSON export
            const blob = new Blob([JSON.stringify(scenes, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `locus_scenes_${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }
    }, [scenes]);

    const importScenes = useCallback(async (json: string) => {
        try {
            const parsed = JSON.parse(json);
            if (Array.isArray(parsed)) {
                // Validate scene structure
                const validScenes = parsed.filter(s => 
                    s.id && s.name && s.data && s.timestamp
                );
                
                if (validScenes.length === 0) {
                    throw new Error("No valid scenes found in import");
                }

                setScenes(prev => {
                    // Merge with existing, avoiding duplicates by ID
                    const existingIds = new Set(prev.map(s => s.id));
                    const newScenes = validScenes.filter(s => !existingIds.has(s.id));
                    return [...prev, ...newScenes];
                });
                
                console.info(`[SceneEngine] Imported ${validScenes.length} scenes`);
            } else {
                throw new Error("Invalid import format: expected array");
            }
        } catch (error) {
            console.error("Import failed:", error);
            throw error;
        }
    }, []);

    return (
        <SceneContext.Provider value={{ 
            scenes, 
            isLoading,
            saveScene, 
            loadScene, 
            deleteScene, 
            exportScenes, 
            importScenes,
            duplicateScene
        }}>
            {children}
        </SceneContext.Provider>
    );
};
