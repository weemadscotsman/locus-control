
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
    toggleMute: (id: number) => void;
    toggleSolo: (id: number) => void;
    toggleMonitoring: (id: number) => void;
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
        throw new Error("useAudioSystem must be used within an AudioProvider");
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

    // Visual Data Ref (Shared Source of Truth)
    // We initialize this ONCE. The Engine writes to it. The UI reads from it.
    const visualDataRef = useRef<VisualData>({
        bass: 0, mid: 0, high: 0, hue: 0,
        raw: new Uint8Array(1024), // Default size, engine might resize but will keep ref
        peakLevels: {}
    });

    // Recording Refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const animationFrameRef = useRef<number>(0);

    // --- STATE SYNC THROTTLING ---
    const pendingUpdate = useRef(false);
    const syncState = useCallback(() => {
        if (!pendingUpdate.current && engineRef.current) {
            pendingUpdate.current = true;
            requestAnimationFrame(() => {
                setSources(Array.from(engineRef.current!.sources.values()));
                pendingUpdate.current = false;
            });
        }
    }, []);

    // --- INITIALIZATION ---
    useEffect(() => {
        if (!engineRef.current) {
            try {
                // PASS REF DATA TO ENGINE FOR DIRECT MEMORY ACCESS
                const engine = new AudioEngine(visualDataRef.current);
                engineRef.current = engine;
                
                // --- HARDENING: Bind Self-Healing Callback ---
                engine.onStateChange = syncState;

                setIsInitialized(true);
                refreshDevices();

                // Start Analysis Loop
                const loop = () => {
                    engine.processMetrics();
                    animationFrameRef.current = requestAnimationFrame(loop);
                };
                loop();

            } catch (e: any) {
                console.error("Audio Engine Init Failed", e);
                setError(e.message);
            }
        }

        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            if (engineRef.current) engineRef.current.destroy();
        };
    }, [syncState]);

    // --- ACTIONS ---
    const refreshDevices = async () => {
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
    };

    const addSource = async (slotId: number, deviceId: string) => {
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
            refreshDevices();
        } catch (e: any) { 
            setError(`Input Failed: ${e.message}`); 
        }
    };

    const removeSource = (id: number) => {
        engineRef.current?.removeSource(id);
        syncState();
    };

    const updateVolume = (id: number, val: number) => {
        engineRef.current?.setSourceVolume(id, val);
        syncState();
    };

    const toggleMute = (id: number) => { engineRef.current?.toggleMute(id); syncState(); };
    const toggleSolo = (id: number) => { engineRef.current?.toggleSolo(id); syncState(); };
    const toggleMonitoring = (id: number) => { engineRef.current?.toggleMonitoring(id); syncState(); };
    const assignCrossfadeGroup = (id: number, g: 'A' | 'B' | 'C') => { engineRef.current?.assignCrossfade(id, g); syncState(); };

    const setMasterVolume = (val: number) => {
        engineRef.current?.setMasterVolume(val);
        setMasterVolumeState(val);
    };

    const setCrossfader = (val: number) => {
        engineRef.current?.setCrossfader(val);
        setCrossfaderState(val);
    };

    const toggleMonitor = () => {
        const newState = !monitorEnabled;
        engineRef.current?.setMonitorEnabled(newState);
        setMonitorEnabledState(newState);
    };

    const updateFx = (params: Partial<FxState>) => {
        const newState = { ...fxState, ...params };
        setFxState(newState);
        engineRef.current?.updateFx(newState);
    };

    const updateCompressor = (threshold: number, ratio: number) => {
        if (engineRef.current) {
            engineRef.current.compressor.threshold.setTargetAtTime(threshold, engineRef.current.context.currentTime, 0.1);
            engineRef.current.compressor.ratio.setTargetAtTime(ratio, engineRef.current.context.currentTime, 0.1);
        }
    };

    const startRecording = () => {
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
    };

    const stopRecording = () => {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
    };

    const resumeAudio = async () => {
        await engineRef.current?.resume();
    };

    return (
        <AudioSystemContext.Provider value={{
            audioContext: engineRef.current?.context || null,
            masterAnalyser: engineRef.current?.masterAnalyser || null,
            visualData: visualDataRef,
            sources, availableDevices, addSource, removeSource,
            toggleMute, toggleSolo, toggleMonitoring, updateVolume, refreshDevices,
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
