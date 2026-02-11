import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { AudioEngine } from '../services/AudioEngine';
import { AudioSource, FxState, VisualData } from '../types';
import { permissionManager } from '../services/PermissionManager';

interface AudioContextType {
    audioContext: AudioContext | null;
    masterAnalyser: AnalyserNode | null;
    visualData: React.MutableRefObject<VisualData>;
    sources: AudioSource[];
    availableDevices: { value: string, label: string }[];
    addSource: (slotId: number, deviceId: string) => Promise<void>;
    removeSource: (id: number) => void;
    setMute: (id: number, muted: boolean) => void;
    setSolo: (id: number, solo: boolean) => void;
    setMonitoring: (id: number, monitoring: boolean) => void;
    updateVolume: (id: number, val: number) => void;
    refreshDevices: () => Promise<void>;
    error: string | null;
    setError: (err: string | null) => void;
    masterVolume: number;
    setMasterVolume: (val: number) => void;
    isRecording: boolean;
    startRecording: () => void;
    stopRecording: () => void;
    resumeAudio: () => Promise<void>;
    crossfader: number;
    setCrossfader: (val: number) => void;
    assignCrossfadeGroup: (id: number, group: 'A' | 'B' | 'C') => void;
    compressor: DynamicsCompressorNode | null;
    updateCompressor: (threshold: number, ratio: number) => void;
    monitorEnabled: boolean;
    toggleMonitor: () => void;
    fxState: FxState;
    updateFx: (params: Partial<FxState>) => void;
}

const AudioSystemContext = createContext<AudioContextType | undefined>(undefined);

export const useAudioSystem = () => {
    const context = useContext(AudioSystemContext);
    if (!context) {
        throw new Error("useAudioSystem must be used within AudioProvider");
    }
    return context;
};

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const engineRef = useRef<AudioEngine | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    
    // UI State Sync
    const [sources, setSources] = useState<AudioSource[]>([]);
    const [masterVolume, setMasterVolumeState] = useState(1.0);
    const [monitorEnabled, setMonitorEnabledState] = useState(true);
    const [crossfader, setCrossfaderState] = useState(0);
    const [availableDevices, setAvailableDevices] = useState<{ value: string, label: string }[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);

    // FX State
    const [fxState, setFxState] = useState<FxState>({
        filterType: 'allpass',
        filterFreq: 20000,
        filterRes: 0,
        distortionAmount: 0,
        delayTime: 0.3,
        delayFeedback: 0.0,
        delayWet: 0.0
    });

    const visualDataRef = useRef<VisualData>({
        bass: 0, mid: 0, high: 0, hue: 0,
        raw: new Uint8Array(1024), 
        peakLevels: {},
        groupA: { bass: 0, mid: 0, high: 0 },
        groupB: { bass: 0, mid: 0, high: 0 }
    });

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const animationFrameRef = useRef<number>(0);

    // Stable Sync Callback
    const syncState = useCallback(() => {
        if (engineRef.current) {
            // Create a new array reference to trigger React update
            setSources(Array.from(engineRef.current.sources.values()));
        }
    }, []);

    useEffect(() => {
        if (!engineRef.current) {
            try {
                const engine = new AudioEngine(visualDataRef.current);
                engineRef.current = engine;
                engine.onStateChange = syncState;
                setIsInitialized(true);
                refreshDevices(); // Initial fetch

                const loop = () => {
                    if (engineRef.current) {
                        engineRef.current.processMetrics();
                    }
                    animationFrameRef.current = requestAnimationFrame(loop);
                };
                animationFrameRef.current = requestAnimationFrame(loop);

            } catch (e: any) {
                console.error("Audio Engine Init Failed", e);
                setError(e.message);
            }
        }

        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            if (engineRef.current) {
                engineRef.current.destroy();
                engineRef.current = null;
            }
        };
    }, [syncState]); // syncState is now stable

    // Wrap all methods in useCallback to stabilize the Context Value
    const refreshDevices = useCallback(async () => {
        try {
            const devices = await permissionManager.enumerateAudioDevices();
            setAvailableDevices([
                { value: 'screen', label: '🖥️ SYSTEM AUDIO / SCREEN' },
                { value: 'default', label: '🎤 DEFAULT MIC' },
                ...devices.map(d => ({ value: d.deviceId, label: `🎤 ${d.label || 'Input ' + d.deviceId.slice(0,5)}` }))
            ]);
        } catch (e: any) { 
            console.warn("Device refresh warning:", e); 
        }
    }, []);

    const addSource = useCallback(async (slotId: number, deviceId: string) => {
        if (!engineRef.current) return;
        try {
            let stream: MediaStream;
            if (deviceId === 'screen') {
                stream = await permissionManager.requestScreen();
            } else {
                stream = await permissionManager.requestMicrophone(deviceId === 'default' ? undefined : deviceId);
            }
            await engineRef.current.addSource(slotId, stream, deviceId === 'screen' ? 'screen' : 'mic');
            syncState();
        } catch (e: any) { 
            setError(`Input Failed: ${e.message}`); 
        }
    }, [syncState]);

    const removeSource = useCallback((id: number) => {
        engineRef.current?.removeSource(id);
        syncState();
    }, [syncState]);

    const updateVolume = useCallback((id: number, val: number) => {
        engineRef.current?.setSourceVolume(id, val);
        syncState();
    }, [syncState]);

    const setMute = useCallback((id: number, muted: boolean) => { engineRef.current?.setMute(id, muted); syncState(); }, [syncState]);
    const setSolo = useCallback((id: number, solo: boolean) => { engineRef.current?.setSolo(id, solo); syncState(); }, [syncState]);
    const setMonitoring = useCallback((id: number, monitoring: boolean) => { engineRef.current?.setMonitoring(id, monitoring); syncState(); }, [syncState]);
    const assignCrossfadeGroup = useCallback((id: number, g: 'A' | 'B' | 'C') => { engineRef.current?.setCrossfade(id, g); syncState(); }, [syncState]);

    const setMasterVolume = useCallback((val: number) => {
        engineRef.current?.setMasterVolume(val);
        setMasterVolumeState(val);
    }, []);

    const setCrossfader = useCallback((val: number) => {
        engineRef.current?.setCrossfader(val);
        setCrossfaderState(val);
    }, []);

    const toggleMonitor = useCallback(() => {
        // Functional update to avoid dependency on monitorEnabled
        setMonitorEnabledState(prev => {
            const newState = !prev;
            engineRef.current?.setMonitorEnabled(newState);
            return newState;
        });
    }, []);

    const updateFx = useCallback((params: Partial<FxState>) => {
        setFxState(prev => {
            const newState = { ...prev, ...params };
            engineRef.current?.updateFx(newState);
            return newState;
        });
    }, []);

    const updateCompressor = useCallback((threshold: number, ratio: number) => {
        if (engineRef.current) {
            const t = engineRef.current.context.currentTime;
            engineRef.current.compressor.threshold.setTargetAtTime(threshold, t, 0.1);
            engineRef.current.compressor.ratio.setTargetAtTime(ratio, t, 0.1);
        }
    }, []);

    const startRecording = useCallback(() => {
        if (!engineRef.current) return;
        chunksRef.current = [];
        try {
            const recorder = new MediaRecorder(engineRef.current.destNode.stream, { mimeType: 'audio/webm;codecs=opus' });
            recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `echohouse_rec_${Date.now()}.webm`;
                a.click();
            };
            recorder.start(1000);
            mediaRecorderRef.current = recorder;
            setIsRecording(true);
        } catch (e: any) { setError(e.message); }
    }, []);

    const stopRecording = useCallback(() => {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
    }, []);

    const resumeAudio = useCallback(async () => {
        await engineRef.current?.resume();
    }, []);

    return (
        <AudioSystemContext.Provider value={{
            audioContext: engineRef.current?.context || null,
            masterAnalyser: engineRef.current?.masterAnalyser || null,
            visualData: visualDataRef,
            sources, availableDevices, addSource, removeSource,
            setMute, setSolo, setMonitoring, updateVolume, refreshDevices,
            error, setError, masterVolume, setMasterVolume,
            isRecording, startRecording, stopRecording, resumeAudio,
            crossfader, setCrossfader, assignCrossfadeGroup,
            compressor: engineRef.current?.compressor || null, updateCompressor,
            monitorEnabled, toggleMonitor,
            fxState, updateFx
        }}>
            {children}
        </AudioSystemContext.Provider>
    );
};
