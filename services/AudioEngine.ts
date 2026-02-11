import { AudioSource, FxState, VisualData, SpectralBand } from '../types';

interface ExtendedAudioSource extends AudioSource {
    _connectedBus?: GainNode; // Optimization: Track active bus to prevent graph thrashing
}

/**
 * EchoHouse Audio Engine V7 (Graph-Optimized). 
 * Features smart-routing to prevent AudioNode disconnect/reconnect thrashing.
 */
export class AudioEngine {
    public context: AudioContext;
    
    // Buses
    public masterBus: GainNode;
    public busA: GainNode;
    public busB: GainNode;
    public monitorBus: GainNode;
    public destNode: MediaStreamAudioDestinationNode;
    
    // Analysis
    public masterAnalyser: AnalyserNode;
    public analyserA: AnalyserNode;
    public analyserB: AnalyserNode;
    public compressor: DynamicsCompressorNode;
    
    // FX Nodes
    private filter: BiquadFilterNode;
    private distortion: WaveShaperNode;
    private delay: DelayNode;
    private delayFeedback: GainNode;
    private delayWet: GainNode;
    private delayDry: GainNode;

    public sources: Map<number, ExtendedAudioSource> = new Map();
    public visualData: VisualData;
    
    public onStateChange?: () => void;

    private _masterVolume: number = 1.0;
    private _crossfader: number = 0;

    // --- MEMORY POOLS & BUFFERS ---
    private _tempArrayA: Uint8Array;
    private _tempArrayB: Uint8Array;
    private _rmsBuffer: Uint8Array;
    private readonly INV_255 = 1 / 255;
    private readonly INV_128 = 1 / 128;
    private readonly RMS_WEIGHT = 0.00390625; // 1/256

    constructor(sharedVisualData: VisualData) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.context = new AudioCtx({ 
            latencyHint: 'interactive',
            sampleRate: 48000 
        });
        
        const handleUserGesture = () => {
            if (this.context.state === 'suspended') {
                this.context.resume();
            }
        };
        window.addEventListener('mousedown', handleUserGesture, { once: true });
        window.addEventListener('keydown', handleUserGesture, { once: true });
        window.addEventListener('touchstart', handleUserGesture, { once: true });

        this.visualData = sharedVisualData;

        // Node Allocation
        this.masterBus = this.context.createGain();
        this.busA = this.context.createGain();
        this.busB = this.context.createGain();
        this.monitorBus = this.context.createGain();
        this.destNode = this.context.createMediaStreamDestination();
        this.masterAnalyser = this.context.createAnalyser();
        this.analyserA = this.context.createAnalyser();
        this.analyserB = this.context.createAnalyser();
        this.filter = this.context.createBiquadFilter();
        this.compressor = this.context.createDynamicsCompressor();
        this.distortion = this.context.createWaveShaper();
        this.delay = this.context.createDelay(4.0);
        this.delayFeedback = this.context.createGain();
        this.delayWet = this.context.createGain();
        this.delayDry = this.context.createGain();

        // Optimized FFT Sizes
        this.masterAnalyser.fftSize = 1024; 
        this.masterAnalyser.smoothingTimeConstant = 0.85;
        
        this.analyserA.fftSize = 256; 
        this.analyserB.fftSize = 256;

        this._tempArrayA = new Uint8Array(this.analyserA.frequencyBinCount);
        this._tempArrayB = new Uint8Array(this.analyserB.frequencyBinCount);
        this._rmsBuffer = new Uint8Array(256);
        
        // Initial FX State
        this.filter.type = 'lowpass';
        this.filter.frequency.value = 20000; 
        this.compressor.threshold.value = -20; 
        this.compressor.ratio.value = 12;
        this.delayWet.gain.value = 0;
        this.delayDry.gain.value = 1;

        // Graph Wiring
        this.busA.connect(this.analyserA).connect(this.masterBus);
        this.busB.connect(this.analyserB).connect(this.masterBus);
        this.masterBus.connect(this.distortion).connect(this.filter);
        this.filter.connect(this.delayDry).connect(this.compressor);
        this.filter.connect(this.delay).connect(this.delayFeedback).connect(this.delay);
        this.delay.connect(this.delayWet).connect(this.compressor);
        this.compressor.connect(this.masterAnalyser).connect(this.destNode);
        this.compressor.connect(this.monitorBus).connect(this.context.destination);
    }

    private makeDistortionCurve(amount: number) {
        const k = Math.max(0, amount);
        const n_samples = 256; 
        const curve = new Float32Array(n_samples);
        const deg = Math.PI / 180;
        for (let i = 0; i < n_samples; ++i) {
          const x = (i * 2) / n_samples - 1;
          curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
        }
        return curve;
    }

    public async resume() {
        if (this.context.state !== 'running') {
            await this.context.resume();
        }
    }

    public async addSource(slotId: number, stream: MediaStream, type: 'screen' | 'mic'): Promise<AudioSource> {
        await this.resume();
        if (this.sources.has(slotId)) this.removeSource(slotId);
        
        const sourceNode = this.context.createMediaStreamSource(stream);
        const gainNode = this.context.createGain();
        const monitorGateNode = this.context.createGain();
        const analyserNode = this.context.createAnalyser();

        gainNode.gain.value = 0.8;
        analyserNode.fftSize = 128;
        monitorGateNode.gain.value = type === 'screen' ? 1.0 : 0.0; 

        sourceNode.connect(gainNode).connect(analyserNode);
        gainNode.connect(monitorGateNode).connect(this.monitorBus);

        const newSource: ExtendedAudioSource = {
            id: slotId,
            label: type === 'screen' ? 'System Feed' : (stream.getAudioTracks()[0]?.label || 'Input'),
            stream,
            sourceNode,
            gainNode,
            analyserNode,
            monitorGateNode,
            active: true,
            volume: 0.8,
            muted: false,
            solo: false,
            monitoring: type === 'screen',
            type,
            crossfadeGroup: 'C',
            _connectedBus: undefined // Initial state
        };

        this.sources.set(slotId, newSource);
        this.updateMix();
        return newSource;
    }

    public removeSource(id: number) {
        const s = this.sources.get(id);
        if (s) {
            try {
                if (s._connectedBus) s.gainNode.disconnect(s._connectedBus);
                else s.gainNode.disconnect();
                
                s.sourceNode.disconnect();
                s.monitorGateNode.disconnect();
                s.stream.getTracks().forEach(t => t.stop());
            } catch (e) { console.warn("Disconnect error", e); }
            this.sources.delete(id);
        }
    }

    public setSourceVolume(id: number, val: number) {
        const s = this.sources.get(id);
        if (s) {
            const v = Math.min(2.0, Math.max(0, val));
            s.volume = v;
            // Trigger mix update to apply potential crossfader compensation
            this.updateMix(); 
        }
    }

    public setMute(id: number, muted: boolean) {
        const s = this.sources.get(id);
        if (s) { s.muted = muted; this.updateMix(); }
    }

    public setSolo(id: number, solo: boolean) {
        const s = this.sources.get(id);
        if (s) { s.solo = solo; this.updateMix(); }
    }

    public setMonitoring(id: number, monitoring: boolean) {
        const s = this.sources.get(id);
        if (s) { s.monitoring = monitoring; this.updateMix(); }
    }

    public setCrossfade(id: number, group: 'A' | 'B' | 'C') {
        const s = this.sources.get(id);
        if (s) { s.crossfadeGroup = group; this.updateMix(); }
    }

    public setCrossfader(val: number) {
        this._crossfader = Math.max(-1, Math.min(1, val));
        this.updateMix();
    }

    public setMasterVolume(val: number) {
        const v = Math.max(0, Math.min(2.0, val));
        this._masterVolume = v;
        this.masterBus.gain.setTargetAtTime(v, this.context.currentTime, 0.05);
    }

    public setMonitorEnabled(enabled: boolean) {
        this.monitorBus.gain.setTargetAtTime(enabled ? 1.0 : 0.0, this.context.currentTime, 0.1);
    }

    public updateFx(state: FxState) {
        const t = this.context.currentTime;
        this.filter.type = state.filterType;
        this.filter.frequency.setTargetAtTime(Math.min(20000, Math.max(20, state.filterFreq)), t, 0.05);
        this.filter.Q.setTargetAtTime(Math.min(20, Math.max(0, state.filterRes)), t, 0.05);

        this.delay.delayTime.setTargetAtTime(Math.min(4, Math.max(0, state.delayTime)), t, 0.05);
        this.delayFeedback.gain.setTargetAtTime(Math.min(0.95, Math.max(0, state.delayFeedback)), t, 0.05);
        this.delayWet.gain.setTargetAtTime(Math.min(1, Math.max(0, state.delayWet)), t, 0.05);
        
        if (state.distortionAmount > 0) {
            if (!this.distortion.curve || this.distortion.curve.length === 2) {
                 this.distortion.curve = this.makeDistortionCurve(state.distortionAmount);
            }
        } else {
             this.distortion.curve = null; 
        }
    }

    private updateMix() {
        const t = this.context.currentTime;
        const anySolo = Array.from(this.sources.values()).some(s => s.solo);

        this.sources.forEach(s => {
            let targetGain = s.volume;
            if (s.muted) targetGain = 0;
            if (anySolo && !s.solo) targetGain = 0;

            let targetBus: GainNode = this.masterBus;
            let crossfadeGain = 1.0;

            if (s.crossfadeGroup === 'A') {
                targetBus = this.busA;
                if (this._crossfader > 0) crossfadeGain = (1 - this._crossfader);
            } else if (s.crossfadeGroup === 'B') {
                targetBus = this.busB;
                if (this._crossfader < 0) crossfadeGain = (1 + this._crossfader);
            } else {
                targetBus = this.masterBus;
            }

            // Apply crossfader compensation to source gain
            targetGain *= crossfadeGain;

            // SMART ROUTING: Only disconnect if bus changed to avoid audio graph rebuild overhead
            if (s._connectedBus !== targetBus) {
                if (s._connectedBus) {
                    try { s.gainNode.disconnect(s._connectedBus); } catch(e) { s.gainNode.disconnect(); }
                } else {
                    // Safety disconnect all
                    try { s.gainNode.disconnect(); } catch(e) {}
                }
                
                s.gainNode.connect(targetBus);
                s._connectedBus = targetBus;
            }

            // Smooth Gain Ramping
            if (targetGain < 0.001) {
                 s.gainNode.gain.setTargetAtTime(0, t, 0.03);
            } else {
                 s.gainNode.gain.setTargetAtTime(targetGain, t, 0.03);
            }
            
            s.monitorGateNode.gain.setTargetAtTime(s.monitoring ? 1.0 : 0.0, t, 0.05);
        });
    }

    private updateBandEnergy(data: Uint8Array, target: SpectralBand) {
        const len = data.length;
        if (len === 0) {
            target.bass = 0; target.mid = 0; target.high = 0;
            return;
        }
        
        let b = 0, m = 0, h = 0;
        const bBins = Math.floor(len * 0.06); 
        const mBins = Math.floor(len * 0.35); 
        
        for(let i=0; i < bBins; i++) b += data[i];
        for(let i=bBins; i < bBins+mBins; i++) m += data[i];
        for(let i=bBins+mBins; i < len; i++) h += data[i];

        target.bass = (b / Math.max(1, bBins)) * this.INV_255;
        target.mid = (m / Math.max(1, mBins)) * this.INV_255;
        target.high = (h / Math.max(1, len - bBins - mBins)) * this.INV_255;
    }

    public processMetrics() {
        if (this.context.state !== 'running') return;
        
        // Master Analysis
        this.masterAnalyser.getByteFrequencyData(this.visualData.raw);
        
        let b = 0, m = 0, h = 0;
        const data = this.visualData.raw;
        const len = data.length;
        const bBins = Math.floor(len * 0.06);
        const mBins = Math.floor(len * 0.35);

        for(let i=0; i < bBins; i++) b += data[i];
        for(let i=bBins; i < bBins+mBins; i++) m += data[i];
        for(let i=bBins+mBins; i < len; i++) h += data[i];

        const bass = (b / Math.max(1, bBins)) * this.INV_255;
        this.visualData.bass = bass;
        this.visualData.mid = (m / Math.max(1, mBins)) * this.INV_255;
        this.visualData.high = (h / Math.max(1, len - bBins - mBins)) * this.INV_255;

        // Bus Analysis (Zero-GC)
        this.analyserA.getByteFrequencyData(this._tempArrayA);
        this.updateBandEnergy(this._tempArrayA, this.visualData.groupA);
        
        this.analyserB.getByteFrequencyData(this._tempArrayB);
        this.updateBandEnergy(this._tempArrayB, this.visualData.groupB);

        // Global Hue Sync
        this.visualData.hue = (this.visualData.hue + 0.15 + (bass * 2.5)) % 360;

        // Peak Level Metrics
        this.sources.forEach(s => {
             if (s.active && s.analyserNode) {
                s.analyserNode.getByteTimeDomainData(this._rmsBuffer);
                let acc = 0;
                // Unroll for performance
                for(let i = 0; i < 256; i+=4) {
                    const v1 = (this._rmsBuffer[i] - 128) * this.INV_128;
                    const v2 = (this._rmsBuffer[i+1] - 128) * this.INV_128;
                    const v3 = (this._rmsBuffer[i+2] - 128) * this.INV_128;
                    const v4 = (this._rmsBuffer[i+3] - 128) * this.INV_128;
                    acc += v1*v1 + v2*v2 + v3*v3 + v4*v4;
                }
                const peak = Math.sqrt(acc * this.RMS_WEIGHT) * 5.0;
                const prev = this.visualData.peakLevels[s.id] || 0;
                this.visualData.peakLevels[s.id] = Math.max(peak, prev * 0.90);
            }
        });
    }

    public destroy() {
        this.context.close().catch(() => {});
        this.sources.forEach(s => this.removeSource(s.id));
    }
}