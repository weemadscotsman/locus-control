
import { AudioSource, FxState, VisualData } from '../types';

export class AudioEngine {
    public context: AudioContext;
    public masterBus: GainNode;
    public monitorBus: GainNode;
    public masterAnalyser: AnalyserNode;
    public compressor: DynamicsCompressorNode;
    public destNode: MediaStreamAudioDestinationNode;
    
    // FX Nodes
    private filter: BiquadFilterNode;
    private distortion: WaveShaperNode;
    private delay: DelayNode;
    private delayFeedback: GainNode;
    private delayWet: GainNode;
    private delayDry: GainNode;

    public sources: Map<number, AudioSource> = new Map();
    public visualData: VisualData;
    
    // Reactive Callback for UI Sync
    public onStateChange?: () => void;

    private _masterVolume: number = 1.0;
    private _crossfader: number = 0;

    // INJECT VISUAL DATA FOR SINGLE SOURCE OF TRUTH
    constructor(sharedVisualData: VisualData) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.context = new AudioCtx({ latencyHint: 'interactive' });
        
        // --- HARDENING: Auto-Resume Context ---
        const handleUserGesture = () => {
            if (this.context.state === 'suspended') {
                this.context.resume().then(() => {
                    console.log("[AudioEngine] Context Resumed via Gesture");
                }).catch(e => console.warn("Resume failed", e));
            }
        };
        window.addEventListener('click', handleUserGesture, { once: true });
        window.addEventListener('keydown', handleUserGesture, { once: true });

        // Link to shared memory
        this.visualData = sharedVisualData;

        // --- GRAPH SETUP ---
        this.masterBus = this.context.createGain();
        this.monitorBus = this.context.createGain();
        this.destNode = this.context.createMediaStreamDestination();
        this.masterAnalyser = this.context.createAnalyser();
        
        // FX Initialization
        this.filter = this.context.createBiquadFilter();
        this.compressor = this.context.createDynamicsCompressor();
        this.distortion = this.context.createWaveShaper();
        this.delay = this.context.createDelay(2.0);
        this.delayFeedback = this.context.createGain();
        this.delayWet = this.context.createGain();
        this.delayDry = this.context.createGain();

        // Node Configuration
        // Fixed FFT size ensures buffer length stability (2048 = 1024 frequency bins)
        this.masterAnalyser.fftSize = 2048;
        this.masterAnalyser.smoothingTimeConstant = 0.8;
        
        // Pre-allocate buffer if needed (though Context usually does it)
        if (this.visualData.raw.length !== this.masterAnalyser.frequencyBinCount) {
             this.visualData.raw = new Uint8Array(this.masterAnalyser.frequencyBinCount);
        }
        
        this.filter.type = 'lowpass';
        this.filter.frequency.value = 20000; 
        
        this.compressor.threshold.value = -12; 
        this.compressor.ratio.value = 12;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.25;

        this.distortion.curve = new Float32Array(2); // Flat by default
        this.distortion.oversample = '2x';

        this.delayWet.gain.value = 0;
        this.delayDry.gain.value = 1;

        // --- WIRING CHAIN ---
        // Master Bus -> Distortion -> Filter -> Delay Split -> Compressor -> Output
        
        this.masterBus.connect(this.distortion);
        this.distortion.connect(this.filter);
        
        // Delay Chain
        this.filter.connect(this.delayDry);
        this.filter.connect(this.delay);
        
        this.delay.connect(this.delayFeedback);
        this.delayFeedback.connect(this.delay); // Feedback Loop
        this.delay.connect(this.delayWet);

        // Rejoin
        this.delayDry.connect(this.compressor);
        this.delayWet.connect(this.compressor);
        
        // Final Output
        this.compressor.connect(this.masterAnalyser);
        this.masterAnalyser.connect(this.destNode);
        
        // Monitor Path
        this.compressor.connect(this.monitorBus);
        this.monitorBus.connect(this.context.destination);
    }

    // Helper for Distortion Curve
    private makeDistortionCurve(amount: number) {
        const k = typeof amount === 'number' ? amount : 50;
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        const deg = Math.PI / 180;
        for (let i = 0; i < n_samples; ++i) {
          const x = (i * 2) / n_samples - 1;
          curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
        }
        return curve;
    }

    public async resume() {
        if (this.context.state === 'suspended') {
            await this.context.resume();
        }
    }

    public async addSource(slotId: number, stream: MediaStream, type: 'screen' | 'mic'): Promise<AudioSource> {
        await this.resume();

        if (this.sources.has(slotId)) {
            this.removeSource(slotId);
        }
        
        // --- HARDENING: Track Cleanup ---
        stream.getTracks().forEach(track => {
            track.onended = () => {
                console.warn(`[AudioEngine] Source ${slotId} stream ended (unplugged/revoked). Cleaning up.`);
                this.removeSource(slotId);
                // Trigger UI update if callback exists
                if (this.onStateChange) this.onStateChange();
            };
        });

        const sourceNode = this.context.createMediaStreamSource(stream);
        const gainNode = this.context.createGain();
        const monitorGateNode = this.context.createGain();
        const analyserNode = this.context.createAnalyser();

        gainNode.gain.value = 0.8;
        analyserNode.fftSize = 256;
        monitorGateNode.gain.value = type === 'screen' ? 1.0 : 0.0; 

        sourceNode.connect(gainNode);
        gainNode.connect(analyserNode);
        gainNode.connect(this.masterBus);
        gainNode.connect(monitorGateNode);
        monitorGateNode.connect(this.monitorBus);

        const newSource: AudioSource = {
            id: slotId,
            label: type === 'screen' ? 'System Audio' : (stream.getAudioTracks()[0]?.label || 'Input'),
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
            crossfadeGroup: 'C'
        };

        this.sources.set(slotId, newSource);
        this.updateMix();
        return newSource;
    }

    public removeSource(id: number) {
        const source = this.sources.get(id);
        if (source) {
            try {
                source.gainNode.disconnect();
                source.sourceNode.disconnect();
                source.monitorGateNode.disconnect();
                source.stream.getTracks().forEach(t => t.stop());
            } catch(e) {
                console.warn("Error disconnecting node:", e);
            }
            this.sources.delete(id);
            delete this.visualData.peakLevels[id];
        }
    }

    public setSourceVolume(id: number, val: number) {
        const s = this.sources.get(id);
        if (s) {
            s.volume = val;
            this.updateMix();
        }
    }

    public toggleMute(id: number) {
        const s = this.sources.get(id);
        if (s) {
            s.muted = !s.muted;
            this.updateMix();
        }
    }

    public toggleSolo(id: number) {
        const s = this.sources.get(id);
        if (s) {
            s.solo = !s.solo;
            this.updateMix();
        }
    }

    public toggleMonitoring(id: number) {
        const s = this.sources.get(id);
        if (s) {
            s.monitoring = !s.monitoring;
            this.updateMix();
        }
    }

    public assignCrossfade(id: number, group: 'A' | 'B' | 'C') {
        const s = this.sources.get(id);
        if (s) {
            s.crossfadeGroup = group;
            this.updateMix();
        }
    }

    public setCrossfader(val: number) {
        this._crossfader = val;
        this.updateMix();
    }

    public setMasterVolume(val: number) {
        this._masterVolume = val;
        this.masterBus.gain.setTargetAtTime(val, this.context.currentTime, 0.05);
    }

    public setMonitorEnabled(enabled: boolean) {
        this.monitorBus.gain.setTargetAtTime(enabled ? 1.0 : 0.0, this.context.currentTime, 0.1);
    }

    public updateFx(state: FxState) {
        const t = this.context.currentTime;
        
        // Filter Updates
        this.filter.type = state.filterType;
        this.filter.frequency.setTargetAtTime(Math.max(20, state.filterFreq), t, 0.1);
        this.filter.Q.setTargetAtTime(state.filterRes, t, 0.1);

        // Delay Updates
        this.delay.delayTime.setTargetAtTime(state.delayTime, t, 0.1);
        this.delayFeedback.gain.setTargetAtTime(state.delayFeedback, t, 0.1);
        this.delayWet.gain.setTargetAtTime(state.delayWet, t, 0.1);
        
        // Distortion Updates
        if (state.distortionAmount > 0) {
            this.distortion.curve = this.makeDistortionCurve(state.distortionAmount);
        } else {
             // Reset to flat
             this.distortion.curve = null; 
        }
    }

    private updateMix() {
        const t = this.context.currentTime;
        const anySolo = Array.from(this.sources.values()).some(s => s.solo);

        this.sources.forEach(s => {
            let gain = s.volume;
            if (s.muted) gain = 0;
            if (anySolo && !s.solo) gain = 0;

            let cfFactor = 1;
            if (s.crossfadeGroup === 'A') {
                if (this._crossfader > 0) cfFactor = 1 - this._crossfader;
            } else if (s.crossfadeGroup === 'B') {
                if (this._crossfader < 0) cfFactor = 1 + this._crossfader;
            }
            gain *= cfFactor;

            s.gainNode.gain.setTargetAtTime(gain, t, 0.02);
            s.monitorGateNode.gain.setTargetAtTime(s.monitoring ? 1.0 : 0.0, t, 0.05);
        });
    }

    public processMetrics() {
        const bufferLen = this.masterAnalyser.frequencyBinCount;
        
        // --- DATA SAFETY CHECK ---
        // Ensure the shared buffer matches the analyser's expectation
        if (this.visualData.raw.length !== bufferLen) {
            // This generally shouldn't happen if fftSize is constant, but safe guard
            this.visualData.raw = new Uint8Array(bufferLen);
        }
        
        this.masterAnalyser.getByteFrequencyData(this.visualData.raw);

        let b = 0, m = 0, h = 0;
        const bassBins = Math.floor(bufferLen * 0.05);
        const midBins = Math.floor(bufferLen * 0.25);
        
        for(let i=0; i<bassBins; i++) b += this.visualData.raw[i];
        for(let i=bassBins; i<bassBins+midBins; i++) m += this.visualData.raw[i];
        for(let i=bassBins+midBins; i<bufferLen; i++) h += this.visualData.raw[i];

        // Normalize 0-1
        this.visualData.bass = (b / bassBins / 255);
        this.visualData.mid = (m / midBins / 255);
        this.visualData.high = (h / (bufferLen - bassBins - midBins) / 255);
        
        // Smooth Hue rotation
        const hueSpeed = 0.2 + (this.visualData.bass * 2);
        this.visualData.hue = (this.visualData.hue + hueSpeed) % 360;

        this.sources.forEach(s => {
             if (s.active && s.analyserNode) {
                const data = new Uint8Array(s.analyserNode.frequencyBinCount);
                s.analyserNode.getByteTimeDomainData(data);
                let sum = 0;
                for(let i = 0; i < data.length; i++) {
                    const v = (data[i] - 128) / 128;
                    sum += v * v;
                }
                const peak = Math.sqrt(sum / data.length) * 5;
                const prevPeak = this.visualData.peakLevels[s.id] || 0;
                this.visualData.peakLevels[s.id] = Math.max(peak, prevPeak * 0.9);
            }
        });
    }

    public destroy() {
        this.context.close();
        this.sources.forEach(s => {
            s.stream.getTracks().forEach(t => t.stop());
        });
    }
}
