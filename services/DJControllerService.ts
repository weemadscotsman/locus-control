/**
 * DJ Controller Service - Auto-Detecting Hardware Integration for All Hercules DJ Controllers
 * Automatically identifies model and configures mappings accordingly
 */

// Hercules Controller Database with auto-detection profiles
export interface ControllerProfile {
    id: string;
    name: string;
    vendorId: string;
    productIds: string[];
    midiNamePatterns: string[];
    channels: number;
    hasJogWheels: boolean;
    hasVUMeters: boolean;
    hasRGBPads: boolean;
    midiMappings: MIDIMappingConfig;
    ledConfig: LEDConfig;
}

interface MIDIMappingConfig {
    // Deck A
    deckAVolume: number;
    deckAGain: number;
    deckAHigh: number;
    deckAMid: number;
    deckALow: number;
    deckACue: number;
    deckAPlay: number;
    deckASync: number;
    deckALoad: number;
    deckAJogTouch: number;
    deckAJogTurn: number;
    deckAPitch: number;
    
    // Deck B
    deckBVolume: number;
    deckBGain: number;
    deckBHigh: number;
    deckBMid: number;
    deckBLow: number;
    deckBCue: number;
    deckBPlay: number;
    deckBSync: number;
    deckBLoad: number;
    deckBJogTouch: number;
    deckBJogTurn: number;
    deckBPitch: number;
    
    // Master
    crossfader: number;
    masterVolume: number;
    cueMix: number;
    cueMaster: number;
    
    // Effects
    fx1Knob: number;
    fx2Knob: number;
    fx3Knob: number;
    fxSelect: number;
    fxOn: number;
    
    // Browser/Navigation
    browseKnob: number;
    browseButton: number;
    backButton: number;
    
    // Pads (if available)
    pads?: number[];
}

interface LEDConfig {
    noteOffset: number;
    rgbSupport: boolean;
    vuMeterNotes?: number[];
}

// Complete Hercules controller database
const HERCULES_PROFILES: ControllerProfile[] = [
    // DJControl Inpulse Series
    {
        id: 'inpulse-500',
        name: 'Hercules DJControl Inpulse 500',
        vendorId: '06f8',
        productIds: ['b910', 'b911'],
        midiNamePatterns: ['inpulse 500', 'djcontrol inpulse 500'],
        channels: 2,
        hasJogWheels: true,
        hasVUMeters: true,
        hasRGBPads: true,
        midiMappings: {
            deckAVolume: 1, deckAGain: 2, deckAHigh: 3, deckAMid: 4, deckALow: 5,
            deckACue: 11, deckAPlay: 12, deckASync: 13, deckALoad: 14,
            deckAJogTouch: 15, deckAJogTurn: 16, deckAPitch: 17,
            
            deckBVolume: 7, deckBGain: 8, deckBHigh: 9, deckBMid: 10, deckBLow: 11,
            deckBCue: 21, deckBPlay: 22, deckBSync: 23, deckBLoad: 24,
            deckBJogTouch: 25, deckBJogTurn: 26, deckBPitch: 27,
            
            crossfader: 28, masterVolume: 29, cueMix: 30, cueMaster: 31,
            fx1Knob: 32, fx2Knob: 33, fx3Knob: 34, fxSelect: 35, fxOn: 36,
            browseKnob: 37, browseButton: 38, backButton: 39,
            pads: [40, 41, 42, 43, 44, 45, 46, 47]
        },
        ledConfig: { noteOffset: 0, rgbSupport: true, vuMeterNotes: [1, 2, 3, 4, 5] }
    },
    {
        id: 'inpulse-300',
        name: 'Hercules DJControl Inpulse 300',
        vendorId: '06f8',
        productIds: ['b900', 'b901'],
        midiNamePatterns: ['inpulse 300', 'djcontrol inpulse 300'],
        channels: 2,
        hasJogWheels: true,
        hasVUMeters: false,
        hasRGBPads: true,
        midiMappings: {
            deckAVolume: 1, deckAGain: 2, deckAHigh: 3, deckAMid: 4, deckALow: 5,
            deckACue: 11, deckAPlay: 12, deckASync: 13, deckALoad: 14,
            deckAJogTouch: 15, deckAJogTurn: 16, deckAPitch: 17,
            
            deckBVolume: 7, deckBGain: 8, deckBHigh: 9, deckBMid: 10, deckBLow: 11,
            deckBCue: 21, deckBPlay: 22, deckBSync: 23, deckBLoad: 24,
            deckBJogTouch: 25, deckBJogTurn: 26, deckBPitch: 27,
            
            crossfader: 28, masterVolume: 29, cueMix: 30, cueMaster: 31,
            fx1Knob: 32, fx2Knob: 33, fx3Knob: 34, fxSelect: 35, fxOn: 36,
            browseKnob: 37, browseButton: 38, backButton: 39,
            pads: [40, 41, 42, 43, 44, 45, 46, 47]
        },
        ledConfig: { noteOffset: 0, rgbSupport: true }
    },
    {
        id: 'inpulse-200',
        name: 'Hercules DJControl Inpulse 200',
        vendorId: '06f8',
        productIds: ['b100', 'b101'],
        midiNamePatterns: ['inpulse 200', 'djcontrol inpulse 200'],
        channels: 2,
        hasJogWheels: true,
        hasVUMeters: false,
        hasRGBPads: false,
        midiMappings: {
            deckAVolume: 1, deckAGain: 2, deckAHigh: 3, deckAMid: 4, deckALow: 5,
            deckACue: 11, deckAPlay: 12, deckASync: 13, deckALoad: 14,
            deckAJogTouch: 15, deckAJogTurn: 16, deckAPitch: 17,
            
            deckBVolume: 7, deckBGain: 8, deckBHigh: 9, deckBMid: 10, deckBLow: 11,
            deckBCue: 21, deckBPlay: 22, deckBSync: 23, deckBLoad: 24,
            deckBJogTouch: 25, deckBJogTurn: 26, deckBPitch: 27,
            
            crossfader: 28, masterVolume: 29, cueMix: 30, cueMaster: 31,
            fx1Knob: 32, fx2Knob: 33, fx3Knob: 34, fxSelect: 35, fxOn: 36,
            browseKnob: 37, browseButton: 38, backButton: 39
        },
        ledConfig: { noteOffset: 0, rgbSupport: false }
    },
    // DJControl Starlight
    {
        id: 'starlight',
        name: 'Hercules DJControl Starlight',
        vendorId: '06f8',
        productIds: ['b900'],
        midiNamePatterns: ['starlight', 'djcontrol starlight'],
        channels: 2,
        hasJogWheels: true,
        hasVUMeters: false,
        hasRGBPads: false,
        midiMappings: {
            deckAVolume: 1, deckAGain: 2, deckAHigh: 3, deckAMid: 4, deckALow: 5,
            deckACue: 11, deckAPlay: 12, deckASync: 13, deckALoad: 14,
            deckAJogTouch: 15, deckAJogTurn: 16,
            
            deckBVolume: 7, deckBGain: 8, deckBHigh: 9, deckBMid: 10, deckBLow: 11,
            deckBCue: 21, deckBPlay: 22, deckBSync: 23, deckBLoad: 24,
            deckBJogTouch: 25, deckBJogTurn: 26,
            
            crossfader: 28, masterVolume: 29,
            fx1Knob: 32, fx2Knob: 33
        },
        ledConfig: { noteOffset: 0, rgbSupport: false }
    },
    // DJControl Compact
    {
        id: 'compact',
        name: 'Hercules DJControl Compact',
        vendorId: '06f8',
        productIds: ['b500'],
        midiNamePatterns: ['compact', 'djcontrol compact'],
        channels: 2,
        hasJogWheels: false,
        hasVUMeters: false,
        hasRGBPads: false,
        midiMappings: {
            deckAVolume: 1, deckAGain: 2, deckAHigh: 3, deckAMid: 4, deckALow: 5,
            deckACue: 11, deckAPlay: 12, deckASync: 13, deckALoad: 14,
            
            deckBVolume: 7, deckBGain: 8, deckBHigh: 9, deckBMid: 10, deckBLow: 11,
            deckBCue: 21, deckBPlay: 22, deckBSync: 23, deckBLoad: 24,
            
            crossfader: 28, masterVolume: 29,
            fx1Knob: 32
        },
        ledConfig: { noteOffset: 0, rgbSupport: false }
    },
    // DJControl Air Series
    {
        id: 'air',
        name: 'Hercules DJControl Air',
        vendorId: '06f8',
        productIds: ['b400'],
        midiNamePatterns: ['air', 'djcontrol air'],
        channels: 2,
        hasJogWheels: true,
        hasVUMeters: false,
        hasRGBPads: false,
        midiMappings: {
            deckAVolume: 1, deckAGain: 2, deckAHigh: 3, deckAMid: 4, deckALow: 5,
            deckACue: 11, deckAPlay: 12, deckASync: 13, deckALoad: 14,
            deckAJogTouch: 15, deckAJogTurn: 16, deckAPitch: 17,
            deckAAir: 18, // Air sensor
            
            deckBVolume: 7, deckBGain: 8, deckBHigh: 9, deckBMid: 10, deckBLow: 11,
            deckBCue: 21, deckBPlay: 22, deckBSync: 23, deckBLoad: 24,
            deckBJogTouch: 25, deckBJogTurn: 26, deckBPitch: 27,
            deckBAir: 28, // Air sensor
            
            crossfader: 29, masterVolume: 30, cueMix: 31,
            fx1Knob: 32, fx2Knob: 33
        },
        ledConfig: { noteOffset: 0, rgbSupport: false }
    },
    // DJControl Jogvision
    {
        id: 'jogvision',
        name: 'Hercules DJControl Jogvision',
        vendorId: '06f8',
        productIds: ['b800'],
        midiNamePatterns: ['jogvision', 'djcontrol jogvision'],
        channels: 2,
        hasJogWheels: true,
        hasVUMeters: true, // Has displays in jog wheels
        hasRGBPads: true,
        midiMappings: {
            deckAVolume: 1, deckAGain: 2, deckAHigh: 3, deckAMid: 4, deckALow: 5,
            deckACue: 11, deckAPlay: 12, deckASync: 13, deckALoad: 14,
            deckAJogTouch: 15, deckAJogTurn: 16, deckAPitch: 17,
            
            deckBVolume: 7, deckBGain: 8, deckBHigh: 9, deckBMid: 10, deckBLow: 11,
            deckBCue: 21, deckBPlay: 22, deckBSync: 23, deckBLoad: 24,
            deckBJogTouch: 25, deckBJogTurn: 26, deckBPitch: 27,
            
            crossfader: 28, masterVolume: 29, cueMix: 30, cueMaster: 31,
            fx1Knob: 32, fx2Knob: 33, fx3Knob: 34,
            browseKnob: 35, browseButton: 36
        },
        ledConfig: { noteOffset: 0, rgbSupport: true, vuMeterNotes: [1, 2] }
    },
    // Universal fallback for unknown Hercules controllers
    {
        id: 'hercules-generic',
        name: 'Hercules DJ Controller (Generic)',
        vendorId: '06f8',
        productIds: [],
        midiNamePatterns: ['hercules', 'djcontrol', 'dj control'],
        channels: 2,
        hasJogWheels: true,
        hasVUMeters: false,
        hasRGBPads: false,
        midiMappings: {
            deckAVolume: 1, deckAGain: 2, deckAHigh: 3, deckAMid: 4, deckALow: 5,
            deckACue: 11, deckAPlay: 12, deckASync: 13, deckALoad: 14,
            deckAJogTouch: 15, deckAJogTurn: 16, deckAPitch: 17,
            
            deckBVolume: 7, deckBGain: 8, deckBHigh: 9, deckBMid: 10, deckBLow: 11,
            deckBCue: 21, deckBPlay: 22, deckBSync: 23, deckBLoad: 24,
            deckBJogTouch: 25, deckBJogTurn: 26, deckBPitch: 27,
            
            crossfader: 28, masterVolume: 29, cueMix: 30, cueMaster: 31,
            fx1Knob: 32, fx2Knob: 33, fx3Knob: 34, fxSelect: 35, fxOn: 36
        },
        ledConfig: { noteOffset: 0, rgbSupport: false }
    }
];

interface MIDIEvent {
    type: 'cc' | 'noteon' | 'noteoff' | 'pitchbend';
    channel: number;
    controller: number;
    value: number;
}

type ControlCallback = (value: number, channel?: number) => void;

export class DJControllerService {
    private midiAccess: MIDIAccess | null = null;
    private input: MIDIInput | null = null;
    private output: MIDIOutput | null = null;
    private isConnected = false;
    private callbacks = new Map<string, ControlCallback[]>();
    private ledState = new Map<number, { on: boolean; color?: [number, number, number] }>();
    private currentProfile: ControllerProfile | null = null;
    private jogWheelState = { deckA: 64, deckB: 64 };
    private lastJogUpdate = { deckA: 0, deckB: 0 };

    async initialize(): Promise<boolean> {
        try {
            if (!('requestMIDIAccess' in navigator)) {
                console.warn('[DJController] Web MIDI API not supported');
                return false;
            }

            this.midiAccess = await navigator.requestMIDIAccess({ sysex: true });
            
            // Auto-detect controller
            const detected = this.autoDetectController();
            
            if (!detected) {
                // Listen for connections if not immediately found
                this.midiAccess.onstatechange = (e) => {
                    if (e.port.state === 'connected') {
                        this.autoDetectController();
                    }
                };
                return false;
            }

            return this.isConnected;
        } catch (error) {
            console.error('[DJController] Initialization failed:', error);
            return false;
        }
    }

    private autoDetectController(): boolean {
        if (!this.midiAccess) return false;

        let bestMatch: { input: MIDIInput; output: MIDIOutput | null; profile: ControllerProfile } | null = null;

        // Check all MIDI inputs for Hercules controllers
        this.midiAccess.inputs.forEach((input) => {
            const name = input.name.toLowerCase();
            const manufacturer = input.manufacturer?.toLowerCase() || '';
            
            // Try to match against known profiles
            for (const profile of HERCULES_PROFILES) {
                const matches = profile.midiNamePatterns.some(pattern => 
                    name.includes(pattern.toLowerCase()) || 
                    manufacturer.includes(pattern.toLowerCase())
                );
                
                if (matches) {
                    console.log(`[DJController] Detected: ${profile.name}`);
                    
                    // Find matching output
                    let matchingOutput: MIDIOutput | null = null;
                    this.midiAccess!.outputs.forEach((output) => {
                        if (output.name.toLowerCase().includes(profile.midiNamePatterns[0].split(' ')[0])) {
                            matchingOutput = output;
                        }
                    });
                    
                    // Prefer more specific matches over generic
                    if (!bestMatch || profile.id !== 'hercules-generic') {
                        bestMatch = { input, output: matchingOutput, profile };
                    }
                }
            }
        });

        if (bestMatch) {
            this.input = bestMatch.input;
            this.output = bestMatch.output;
            this.currentProfile = bestMatch.profile;
            this.input.onmidimessage = (e) => this.handleMIDIMessage(e);
            this.isConnected = true;
            
            console.log(`[DJController] Connected to ${bestMatch.profile.name}`);
            console.log(`[DJController] Features: ${[
                bestMatch.profile.hasJogWheels && 'Jog Wheels',
                bestMatch.profile.hasVUMeters && 'VU Meters',
                bestMatch.profile.hasRGBPads && 'RGB Pads'
            ].filter(Boolean).join(', ')}`);
            
            // Initialize LEDs
            this.initializeLEDs();
            
            return true;
        }

        return false;
    }

    private initializeLEDs(): void {
        if (!this.currentProfile || !this.output) return;
        
        // Clear all LEDs
        this.clearAllLEDs();
        
        // Set initial state
        this.syncAllLEDs();
    }

    private handleMIDIMessage(event: MIDIMessageEvent): void {
        const [status, data1, data2] = event.data;
        const channel = status & 0x0F;
        const messageType = status & 0xF0;

        let midiEvent: MIDIEvent | null = null;

        // CC Message (0xB0)
        if (messageType === 0xB0) {
            midiEvent = { type: 'cc', channel, controller: data1, value: data2 };
        }
        // Note On (0x90)
        else if (messageType === 0x90 && data2 > 0) {
            midiEvent = { type: 'noteon', channel, controller: data1, value: data2 };
        }
        // Note Off (0x80 or Note On with velocity 0)
        else if (messageType === 0x80 || (messageType === 0x90 && data2 === 0)) {
            midiEvent = { type: 'noteoff', channel, controller: data1, value: data2 };
        }
        // Pitch Bend (0xE0) - for jog wheels
        else if (messageType === 0xE0) {
            const value = (data2 << 7) | data1;
            midiEvent = { type: 'pitchbend', channel, controller: 0, value };
        }

        if (midiEvent) {
            this.processEvent(midiEvent);
        }
    }

    private processEvent(event: MIDIEvent): void {
        if (!this.currentProfile) return;

        const { type, controller, value, channel } = event;
        const mappings = this.currentProfile.midiMappings;

        // Map controller numbers to control names
        const controlMap = new Map<number, string>([
            [mappings.deckAVolume, 'deckAVolume'],
            [mappings.deckAGain, 'deckAGain'],
            [mappings.deckAHigh, 'deckAHigh'],
            [mappings.deckAMid, 'deckAMid'],
            [mappings.deckALow, 'deckALow'],
            [mappings.deckACue, 'deckACue'],
            [mappings.deckAPlay, 'deckAPlay'],
            [mappings.deckASync, 'deckASync'],
            [mappings.deckALoad, 'deckALoad'],
            [mappings.deckBVolume, 'deckBVolume'],
            [mappings.deckBGain, 'deckBGain'],
            [mappings.deckBHigh, 'deckBHigh'],
            [mappings.deckBMid, 'deckBMid'],
            [mappings.deckBLow, 'deckBLow'],
            [mappings.deckBCue, 'deckBCue'],
            [mappings.deckBPlay, 'deckBPlay'],
            [mappings.deckBSync, 'deckBSync'],
            [mappings.deckBLoad, 'deckBLoad'],
            [mappings.crossfader, 'crossfader'],
            [mappings.masterVolume, 'masterVolume'],
            [mappings.cueMix, 'cueMix'],
            [mappings.cueMaster, 'cueMaster'],
            [mappings.fx1Knob, 'fx1Knob'],
            [mappings.fx2Knob, 'fx2Knob'],
            [mappings.fx3Knob, 'fx3Knob'],
            [mappings.fxSelect, 'fxSelect'],
            [mappings.fxOn, 'fxOn'],
            [mappings.browseKnob, 'browseKnob'],
            [mappings.browseButton, 'browseButton'],
            [mappings.backButton, 'backButton'],
        ]);

        // Handle jog wheels specially
        if (type === 'pitchbend') {
            if (channel === 0) {
                this.handleJogWheel('deckA', value);
                return;
            } else if (channel === 1) {
                this.handleJogWheel('deckB', value);
                return;
            }
        }

        // Handle regular controls
        const controlName = controlMap.get(controller);
        if (controlName) {
            if (type === 'cc') {
                // Normalize value to 0-1
                const normalizedValue = value / 127;
                this.triggerCallback(controlName, normalizedValue);
            } else if (type === 'noteon') {
                this.triggerCallback(controlName, 1);
                
                // Toggle LED for buttons
                if (controlName.includes('Cue') || controlName.includes('Play') || controlName.includes('Sync')) {
                    const currentState = this.ledState.get(controller)?.on || false;
                    this.setLED(controller, !currentState);
                }
            }
        }

        // Handle pad presses
        if (mappings.pads && mappings.pads.includes(controller)) {
            const padIndex = mappings.pads.indexOf(controller);
            if (type === 'noteon') {
                this.triggerCallback(`pad${padIndex}`, value / 127);
                this.setLED(controller, true);
            } else if (type === 'noteoff') {
                this.setLED(controller, false);
            }
        }
    }

    private handleJogWheel(deck: 'deckA' | 'deckB', value: number): void {
        const now = Date.now();
        const lastUpdate = this.lastJogUpdate[deck];
        
        // Throttle jog wheel updates
        if (now - lastUpdate < 16) return; // ~60fps max
        this.lastJogUpdate[deck] = now;

        // Calculate relative movement from center (8192)
        const center = 8192;
        const delta = value - center;
        
        // Normalize to -1 to 1
        const normalizedDelta = Math.max(-1, Math.min(1, delta / 64));
        
        this.triggerCallback(`${deck}Jog`, normalizedDelta);
    }

    private triggerCallback(name: string, value: number, channel?: number): void {
        const callbacks = this.callbacks.get(name);
        if (callbacks) {
            callbacks.forEach(cb => cb(value, channel));
        }
    }

    // Public API
    onControl(control: string, callback: ControlCallback): () => void {
        if (!this.callbacks.has(control)) {
            this.callbacks.set(control, []);
        }
        this.callbacks.get(control)!.push(callback);

        return () => {
            const cbs = this.callbacks.get(control);
            if (cbs) {
                const idx = cbs.indexOf(callback);
                if (idx > -1) cbs.splice(idx, 1);
            }
        };
    }

    setLED(note: number, on: boolean, color?: [number, number, number]): void {
        this.ledState.set(note, { on, color });
        
        if (!this.output) return;

        try {
            if (this.currentProfile?.ledConfig.rgbSupport && color) {
                // RGB LED (for controllers that support it)
                const [r, g, b] = color;
                this.output.send([0x90, note, Math.max(r, g, b)]);
            } else {
                // Standard on/off LED
                const velocity = on ? 127 : 0;
                this.output.send([0x90, note, velocity]);
            }
        } catch (error) {
            console.warn('[DJController] Failed to set LED:', error);
        }
    }

    setVUMeter(channel: number, level: number): void {
        if (!this.currentProfile?.ledConfig.vuMeterNotes || !this.output) return;
        
        const vuNotes = this.currentProfile.ledConfig.vuMeterNotes;
        const note = vuNotes[channel];
        if (!note) return;

        // Map level (0-1) to LED segments
        const segments = Math.floor(level * 5); // 5 segments typical
        const velocity = segments * 25; // Scale to MIDI velocity
        
        try {
            this.output.send([0x90, note, Math.min(127, velocity)]);
        } catch (e) {
            // Ignore
        }
    }

    clearAllLEDs(): void {
        this.ledState.clear();
        if (!this.output) return;
        
        for (let note = 0; note < 128; note++) {
            try {
                this.output.send([0x90, note, 0]);
            } catch (e) {
                // Ignore errors
            }
        }
    }

    syncAllLEDs(): void {
        this.ledState.forEach((state, note) => {
            this.setLED(note, state.on, state.color);
        });
    }

    syncLED(control: string, state: boolean, color?: [number, number, number]): void {
        if (!this.currentProfile) return;
        
        const mappings = this.currentProfile.midiMappings;
        const controlToNote: Record<string, number> = {
            'deckACue': mappings.deckACue,
            'deckAPlay': mappings.deckAPlay,
            'deckASync': mappings.deckASync,
            'deckBCue': mappings.deckBCue,
            'deckBPlay': mappings.deckBPlay,
            'deckBSync': mappings.deckBSync,
            'cueMaster': mappings.cueMaster,
            'fxOn': mappings.fxOn,
        };

        const note = controlToNote[control];
        if (note !== undefined) {
            this.setLED(note, state, color);
        }
    }

    // Getters
    get isReady(): boolean {
        return this.isConnected;
    }

    get controllerName(): string {
        return this.currentProfile?.name || 'Not Connected';
    }

    get profile(): ControllerProfile | null {
        return this.currentProfile;
    }

    get supportedProfiles(): string[] {
        return HERCULES_PROFILES.map(p => p.name);
    }

    destroy(): void {
        this.clearAllLEDs();
        if (this.input) {
            this.input.onmidimessage = null;
        }
        this.isConnected = false;
        this.currentProfile = null;
    }
}

// Singleton
let controllerService: DJControllerService | null = null;

export const getDJControllerService = (): DJControllerService => {
    if (!controllerService) {
        controllerService = new DJControllerService();
    }
    return controllerService;
};

export const resetDJControllerService = (): void => {
    controllerService?.destroy();
    controllerService = null;
};
