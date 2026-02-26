
export interface ServerConfig {
  ip: string;
  port: number;
  rate: number;
  channels: number;
  chunk: number;
  delay: number;
  maxClients: number;
}

export interface RoomProfile {
  id: string;
  name: string;
  config: ServerConfig;
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
  type: 'info' | 'warn' | 'error';
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

export interface VisualData {
  bass: number;
  mid: number;
  high: number;
  hue: number;
  raw: Uint8Array;
  peakLevels: Record<number, number>;
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
