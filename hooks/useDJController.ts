import { useEffect, useRef, useState, useCallback } from 'react';
import { useAudioSystem } from '../contexts/AudioContext';
import { getDJControllerService, ControllerProfile } from '../services/DJControllerService';

export interface DJControllerState {
    isConnected: boolean;
    controllerName: string;
    lastInput: string;
    profile: ControllerProfile | null;
    supportedProfiles: string[];
}

export const useDJController = () => {
    const [state, setState] = useState<DJControllerState>({
        isConnected: false,
        controllerName: 'Not Connected',
        lastInput: '',
        profile: null,
        supportedProfiles: []
    });
    
    const controllerRef = useRef(getDJControllerService());
    const unsubscribeRef = useRef<(() => void)[]>([]);
    const vuMeterIntervalRef = useRef<number | null>(null);
    
    const {
        sources, addSource, removeSource, setMute, setSolo, setMonitoring,
        updateVolume, setMasterVolume, setCrossfader, toggleMonitor,
        visualData
    } = useAudioSystem();

    // Initialize controller with auto-detection
    useEffect(() => {
        const init = async () => {
            const controller = controllerRef.current;
            
            // Get list of supported profiles
            setState(prev => ({
                ...prev,
                supportedProfiles: controller.supportedProfiles
            }));
            
            const connected = await controller.initialize();
            
            setState(prev => ({
                ...prev,
                isConnected: connected,
                controllerName: controller.controllerName,
                profile: controller.profile
            }));
            
            if (connected) {
                setupMappings();
                startVUMeterSync();
            }
        };
        
        init();
        
        return () => {
            unsubscribeRef.current.forEach(unsub => unsub());
            unsubscribeRef.current = [];
            if (vuMeterIntervalRef.current) {
                clearInterval(vuMeterIntervalRef.current);
            }
        };
    }, []);

    // VU Meter sync for controllers with LED meters
    const startVUMeterSync = useCallback(() => {
        if (!controllerRef.current.profile?.hasVUMeters) return;

        vuMeterIntervalRef.current = window.setInterval(() => {
            const controller = controllerRef.current;
            const vData = visualData.current;
            
            // Send VU meter levels to controller
            controller.setVUMeter(0, vData.groupA ? 
                (vData.groupA.bass + vData.groupA.mid) / 2 : 
                vData.bass
            );
            controller.setVUMeter(1, vData.groupB ? 
                (vData.groupB.bass + vData.groupB.mid) / 2 : 
                vData.mid
            );
        }, 50); // 20fps update rate
    }, []);

    const setupMappings = useCallback(() => {
        const controller = controllerRef.current;
        const unsubs: (() => void)[] = [];

        // === DECK A CONTROLS ===
        
        // Volume fader
        unsubs.push(controller.onControl('deckAVolume', (value) => {
            const source = sources.find(s => s.id === 1);
            if (source) {
                updateVolume(1, value);
                setState(prev => ({ ...prev, lastInput: `CH1 Volume: ${Math.round(value * 100)}%` }));
            }
        }));

        // EQ knobs
        unsubs.push(controller.onControl('deckAHigh', (value) => {
            setState(prev => ({ ...prev, lastInput: `CH1 High: ${Math.round(value * 100)}%` }));
        }));
        unsubs.push(controller.onControl('deckAMid', (value) => {
            setState(prev => ({ ...prev, lastInput: `CH1 Mid: ${Math.round(value * 100)}%` }));
        }));
        unsubs.push(controller.onControl('deckALow', (value) => {
            setState(prev => ({ ...prev, lastInput: `CH1 Low: ${Math.round(value * 100)}%` }));
        }));

        // Gain
        unsubs.push(controller.onControl('deckAGain', (value) => {
            setState(prev => ({ ...prev, lastInput: `CH1 Gain: ${Math.round(value * 100)}%` }));
        }));

        // Cue button
        unsubs.push(controller.onControl('deckACue', () => {
            const source = sources.find(s => s.id === 1);
            if (source) {
                setMonitoring(1, !source.monitoring);
                controller.syncLED('deckACue', !source.monitoring);
                setState(prev => ({ ...prev, lastInput: 'CH1 CUE' }));
            }
        }));

        // Play button
        unsubs.push(controller.onControl('deckAPlay', () => {
            const source = sources.find(s => s.id === 1);
            if (source) {
                setMute(1, !source.muted);
                controller.syncLED('deckAPlay', !source.muted);
                setState(prev => ({ ...prev, lastInput: 'CH1 PLAY' }));
            }
        }));

        // Sync button
        unsubs.push(controller.onControl('deckASync', () => {
            setState(prev => ({ ...prev, lastInput: 'CH1 SYNC' }));
        }));

        // Load button
        unsubs.push(controller.onControl('deckALoad', () => {
            addSource(1, 'screen');
            setState(prev => ({ ...prev, lastInput: 'CH1 LOAD (Screen)' }));
        }));

        // Jog wheel (scratch/pitch bend)
        unsubs.push(controller.onControl('deckAJog', (value) => {
            if (Math.abs(value) > 0.1) {
                setState(prev => ({ ...prev, lastInput: `CH1 Jog: ${value > 0 ? '>>' : '<<'}` }));
            }
        }));

        // Pitch slider
        unsubs.push(controller.onControl('deckAPitch', (value) => {
            // Map 0-1 to -0.1 to +0.1 (10% pitch range)
            const pitch = (value - 0.5) * 0.2;
            setState(prev => ({ ...prev, lastInput: `CH1 Pitch: ${(pitch * 100).toFixed(1)}%` }));
        }));

        // === DECK B CONTROLS ===
        
        unsubs.push(controller.onControl('deckBVolume', (value) => {
            const source = sources.find(s => s.id === 2);
            if (source) {
                updateVolume(2, value);
                setState(prev => ({ ...prev, lastInput: `CH2 Volume: ${Math.round(value * 100)}%` }));
            }
        }));

        unsubs.push(controller.onControl('deckBHigh', (value) => {
            setState(prev => ({ ...prev, lastInput: `CH2 High: ${Math.round(value * 100)}%` }));
        }));
        unsubs.push(controller.onControl('deckBMid', (value) => {
            setState(prev => ({ ...prev, lastInput: `CH2 Mid: ${Math.round(value * 100)}%` }));
        }));
        unsubs.push(controller.onControl('deckBLow', (value) => {
            setState(prev => ({ ...prev, lastInput: `CH2 Low: ${Math.round(value * 100)}%` }));
        }));

        unsubs.push(controller.onControl('deckBGain', (value) => {
            setState(prev => ({ ...prev, lastInput: `CH2 Gain: ${Math.round(value * 100)}%` }));
        }));

        unsubs.push(controller.onControl('deckBCue', () => {
            const source = sources.find(s => s.id === 2);
            if (source) {
                setMonitoring(2, !source.monitoring);
                controller.syncLED('deckBCue', !source.monitoring);
                setState(prev => ({ ...prev, lastInput: 'CH2 CUE' }));
            }
        }));

        unsubs.push(controller.onControl('deckBPlay', () => {
            const source = sources.find(s => s.id === 2);
            if (source) {
                setMute(2, !source.muted);
                controller.syncLED('deckBPlay', !source.muted);
                setState(prev => ({ ...prev, lastInput: 'CH2 PLAY' }));
            }
        }));

        unsubs.push(controller.onControl('deckBSync', () => {
            setState(prev => ({ ...prev, lastInput: 'CH2 SYNC' }));
        }));

        unsubs.push(controller.onControl('deckBLoad', () => {
            addSource(2, 'default');
            setState(prev => ({ ...prev, lastInput: 'CH2 LOAD (Mic)' }));
        }));

        unsubs.push(controller.onControl('deckBJog', (value) => {
            if (Math.abs(value) > 0.1) {
                setState(prev => ({ ...prev, lastInput: `CH2 Jog: ${value > 0 ? '>>' : '<<'}` }));
            }
        }));

        unsubs.push(controller.onControl('deckBPitch', (value) => {
            const pitch = (value - 0.5) * 0.2;
            setState(prev => ({ ...prev, lastInput: `CH2 Pitch: ${(pitch * 100).toFixed(1)}%` }));
        }));

        // === MASTER SECTION ===
        
        unsubs.push(controller.onControl('crossfader', (value) => {
            const crossfaderValue = (value - 0.5) * 2;
            setCrossfader(crossfaderValue);
            setState(prev => ({ ...prev, lastInput: `Crossfader: ${Math.round(crossfaderValue * 100)}%` }));
        }));

        unsubs.push(controller.onControl('masterVolume', (value) => {
            setMasterVolume(value);
            setState(prev => ({ ...prev, lastInput: `Master: ${Math.round(value * 100)}%` }));
        }));

        unsubs.push(controller.onControl('cueMix', (value) => {
            setState(prev => ({ ...prev, lastInput: `Cue Mix: ${Math.round(value * 100)}%` }));
        }));

        unsubs.push(controller.onControl('cueMaster', () => {
            toggleMonitor();
            setState(prev => ({ ...prev, lastInput: 'CUE MASTER' }));
        }));

        // === EFFECTS SECTION ===
        
        unsubs.push(controller.onControl('fx1Knob', (value) => {
            setState(prev => ({ ...prev, lastInput: `FX1: ${Math.round(value * 100)}%` }));
        }));

        unsubs.push(controller.onControl('fx2Knob', (value) => {
            setState(prev => ({ ...prev, lastInput: `FX2: ${Math.round(value * 100)}%` }));
        }));

        unsubs.push(controller.onControl('fx3Knob', (value) => {
            setState(prev => ({ ...prev, lastInput: `FX3: ${Math.round(value * 100)}%` }));
        }));

        unsubs.push(controller.onControl('fxSelect', (value) => {
            setState(prev => ({ ...prev, lastInput: `FX Select: ${Math.round(value * 100)}%` }));
        }));

        unsubs.push(controller.onControl('fxOn', () => {
            setState(prev => ({ ...prev, lastInput: 'FX TOGGLE' }));
        }));

        // === PADS (if available) ===
        for (let i = 0; i < 8; i++) {
            unsubs.push(controller.onControl(`pad${i}`, (value) => {
                if (value > 0) {
                    setState(prev => ({ ...prev, lastInput: `PAD ${i + 1}` }));
                }
            }));
        }

        // === BROWSER/NAVIGATION ===
        unsubs.push(controller.onControl('browseKnob', (value) => {
            setState(prev => ({ ...prev, lastInput: `Browse: ${value > 0.5 ? '>' : '<'}` }));
        }));

        unsubs.push(controller.onControl('browseButton', () => {
            setState(prev => ({ ...prev, lastInput: 'BROWSE' }));
        }));

        unsubs.push(controller.onControl('backButton', () => {
            setState(prev => ({ ...prev, lastInput: 'BACK' }));
        }));

        unsubscribeRef.current = unsubs;
    }, [sources, addSource, removeSource, setMute, setSolo, setMonitoring, updateVolume, setMasterVolume, setCrossfader, toggleMonitor]);

    // Sync LED states when sources change
    useEffect(() => {
        if (!state.isConnected) return;
        
        const controller = controllerRef.current;
        
        sources.forEach(source => {
            if (source.id === 1) {
                controller.syncLED('deckACue', source.monitoring);
                controller.syncLED('deckAPlay', !source.muted);
            }
            if (source.id === 2) {
                controller.syncLED('deckBCue', source.monitoring);
                controller.syncLED('deckBPlay', !source.muted);
            }
        });
    }, [sources, state.isConnected]);

    return state;
};
