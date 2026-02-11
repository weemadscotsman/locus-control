
export interface ServerConfig {
  ip: string;
  port: number;
  rate: number;
  channels: number;
  chunk: number;
  delay: number;
  maxClients: number;
}

export interface AIConfig {
  provider: 'gemini' | 'ollama' | 'deepseek' | 'openai';
  geminiKey: string;
  deepseekKey: string;
  deepseekModel: string;
  openaiKey: string;
  openaiModel: string;
  ollamaUrl: string;
  ollamaChatModel: string;
  ollamaVisionModel: string;
}

export interface RoomProfile {
  id: string;
  name: string;
  config: ServerConfig;
  aiConfig: AIConfig;
}

export interface ClientNode {
  ip: string;
  status: 'connected' | 'disconnected' | 'warning';
  latency: number; // ms
  buffer: number; // %
}

export interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'warn' | 'error' | 'ai';
}

// --- AUDIO TYPES ---

export interface AudioSource {
    id: number;
    label: string;
    stream: MediaStream;
    sourceNode: MediaStreamAudioSourceNode;
    gainNode: GainNode; 
    monitorGateNode: GainNode; 
    analyserNode: AnalyserNode; 
    active: boolean;
    volume: number;
    muted: boolean;
    solo: boolean;
    monitoring: boolean; 
    type: 'screen' | 'mic';
    crossfadeGroup: 'A' | 'B' | 'C';
}

export interface SpectralBand {
    bass: number;
    mid: number;
    high: number;
}

export interface VisualData {
    // Master Mix Data
    bass: number; 
    mid: number;  
    high: number; 
    hue: number;  
    raw: Uint8Array; 
    peakLevels: Record<number, number>;
    
    // Discrete Bus Data (For Routing)
    groupA: SpectralBand;
    groupB: SpectralBand;
}

export interface FxState {
    filterType: 'lowpass' | 'highpass' | 'allpass';
    filterFreq: number;
    filterRes: number;
    distortionAmount: number;
    delayTime: number;
    delayFeedback: number;
    delayWet: number;
}

// --- PROJECTION TOPOLOGY ---

export interface AudioBinding {
    source: 'MASTER' | 'GROUP_A' | 'GROUP_B';
    gain: number; // 0-2 reactivity multiplier
    band: 'bass' | 'mid' | 'high' | 'all';
}

export interface ProjectionSurface {
  id: string;
  name: string;
  source: 'visuals' | 'screen' | 'external' | 'math';
  windowHandle: Window | null;
  settings: {
    // Geometry
    scaleX: number;
    scaleY: number;
    rotateX: number;
    rotateY: number;
    positionX: number;
    positionY: number;
    perspective: number;
    skewX: number;
    skewY: number;
    
    // Signal Routing
    audioBinding: AudioBinding;
  };
}

export interface SyncFrame {
    time: number; // AudioContext.currentTime (Absolute Truth)
    visuals: VisualData;
}
