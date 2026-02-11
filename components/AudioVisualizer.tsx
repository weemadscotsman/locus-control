import React, { useEffect, useRef, useState, memo } from 'react';
import { CyberSlider, CyberSelect, CyberButton } from './ui/CyberControls';
import { useAudioSystem } from '../contexts/AudioContext';
import { usePerformance } from '../contexts/PerformanceContext';
import { useDJController } from '../hooks/useDJController';

interface ChannelStripProps {
    id: number;
    volume: number;
    muted: boolean;
    solo: boolean;
    monitoring: boolean;
    crossfadeGroup: 'A' | 'B' | 'C';
    label: string;
    hasSource: boolean;
    availableDevices: { value: string, label: string }[];
    meterRef: (el: HTMLDivElement | null) => void;
    onAddInput: (id: number, deviceId: string) => void;
    onRemove: (id: number) => void;
    onToggleMute: (id: number) => void;
    onToggleSolo: (id: number) => void;
    onToggleMonitor: (id: number) => void;
    onVolume: (id: number, val: number) => void;
    onAssignCrossfade: (id: number, group: 'A' | 'B' | 'C') => void;
}

const ChannelStrip = memo(({ 
    id, volume, muted, solo, monitoring, crossfadeGroup, label, hasSource,
    availableDevices, meterRef,
    onAddInput, onRemove, onToggleMute, onToggleSolo, onToggleMonitor, onVolume, onAssignCrossfade
}: ChannelStripProps) => {
    
    return (
        <div 
            className="w-[100px] shrink-0 h-full flex flex-col bg-[#111] border border-cyan-900/20 rounded relative group hover:border-cyan-500/50 transition-all duration-300"
            data-channel-id={id}
        >
            <div className={`text-[9px] text-center font-bold py-1 border-b border-cyan-900/30 font-mono ${hasSource ? 'text-cyan-400 bg-cyan-900/10' : 'text-gray-700'}`}>
                CH_{String(id).padStart(2, '0')}
            </div>

            <div className="p-1 mb-1 relative z-20">
                {!hasSource ? (
                    <CyberSelect 
                        value="" 
                        onChange={(v) => v && onAddInput(id, v)} 
                        options={[{ value: '', label: 'ADD INPUT +' }, ...availableDevices]} 
                    />
                ) : (
                    <div className="text-[8px] text-center text-cyan-200 truncate px-1 cursor-help py-1 bg-cyan-900/10 rounded font-mono" title={label}>
                        {label.substring(0, 15)}
                    </div>
                )}
            </div>

            {hasSource && (
                <div className="flex flex-col gap-1 px-1 mb-2">
                    <div className="flex gap-[1px]">
                        <button type="button" onClick={() => onToggleMute(id)} className={`flex-1 text-[8px] py-1 border rounded font-bold transition-colors ${muted ? 'bg-red-500 text-black border-red-500' : 'bg-[#1a1a1a] text-gray-500 border-gray-800 hover:text-red-400'}`}>
                            M
                        </button>
                        <button type="button" onClick={() => onToggleSolo(id)} className={`flex-1 text-[8px] py-1 border rounded font-bold transition-colors ${solo ? 'bg-amber-400 text-black border-amber-400' : 'bg-[#1a1a1a] text-gray-500 border-gray-800 hover:text-amber-400'}`}>
                            S
                        </button>
                        <button 
                            type="button"
                            onClick={() => onToggleMonitor(id)} 
                            className={`flex-1 text-[8px] py-1 border rounded transition-all font-bold ${monitoring ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_10px_rgba(0,255,255,0.4)]' : 'bg-[#1a1a1a] text-gray-500 border-gray-800'}`}
                        >
                            CUE
                        </button>
                    </div>
                    <div className="flex justify-between text-[8px] bg-black border border-gray-800 rounded overflow-hidden font-mono">
                        <button type="button" onClick={() => onAssignCrossfade(id, 'A')} className={`flex-1 hover:bg-cyan-900/50 py-0.5 ${crossfadeGroup === 'A' ? 'bg-cyan-600 text-white font-bold' : 'text-gray-600'}`}>A</button>
                        <button type="button" onClick={() => onAssignCrossfade(id, 'C')} className={`flex-1 hover:bg-gray-800 py-0.5 ${crossfadeGroup === 'C' ? 'bg-gray-700 text-white' : 'text-gray-700'}`}>T</button>
                        <button type="button" onClick={() => onAssignCrossfade(id, 'B')} className={`flex-1 hover:bg-pink-900/50 py-0.5 ${crossfadeGroup === 'B' ? 'bg-pink-600 text-white font-bold' : 'text-gray-600'}`}>B</button>
                    </div>
                </div>
            )}

            <div className="flex-1 flex justify-center items-end px-2 pb-2 gap-2 min-h-0 relative z-10">
                {hasSource ? (
                    <>
                        <div className="h-full w-8 relative z-10 flex justify-center">
                            <CyberSlider 
                                vertical 
                                value={volume * 100} 
                                min={0} max={100} step={1} 
                                onChange={(v) => onVolume(id, v/100)} 
                            />
                        </div>
                        <div className="h-full w-3 bg-black rounded-sm overflow-hidden border border-gray-800 relative shadow-inner">
                            {/* GPU Optimized Meter (ScaleY) */}
                            <div 
                                ref={meterRef} 
                                className="w-full h-full bg-cyan-500 origin-bottom will-change-transform" 
                                style={{ transform: 'scaleY(0)' }} 
                            />
                        </div>
                    </>
                ) : (
                    <div className="h-full w-full border border-dashed border-gray-800 rounded flex items-center justify-center opacity-10">
                        <span className="rotate-[-90deg] text-[10px] font-mono tracking-widest">OFFLINE</span>
                    </div>
                )}
            </div>

            {hasSource && (
                <button type="button" onClick={() => onRemove(id)} className="absolute top-0 right-0 text-red-900/40 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    ✕
                </button>
            )}
        </div>
    );
});


export const AudioVisualizer = memo(() => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameId = useRef<number>(0);
  const meterMapRef = useRef<Map<number, HTMLDivElement>>(new Map());
  
  const { quality, isPageVisible } = usePerformance();
  const { 
      visualData, sources, availableDevices, addSource, 
      removeSource, setMute, setSolo, setMonitoring, updateVolume, error, 
      setError, masterVolume, setMasterVolume, isRecording, startRecording, stopRecording,
      crossfader, setCrossfader, assignCrossfadeGroup, updateCompressor,
      monitorEnabled, toggleMonitor, resumeAudio
  } = useAudioSystem();

  const [compThreshold, setCompThreshold] = useState(-20);
  const [compRatio, setCompRatio] = useState(12);
  
  // DJ Controller integration
  const djController = useDJController();

  useEffect(() => {
      updateCompressor(compThreshold, compRatio);
  }, [compThreshold, compRatio]);

  useEffect(() => {
    const updateLoop = () => {
        if (!isPageVisible) {
            animationFrameId.current = requestAnimationFrame(updateLoop);
            return;
        }
        
        // --- BYPASS REACT FOR CHANNEL METERS (ZERO-LATENCY) ---
        const peakLevels = visualData.current.peakLevels;
        meterMapRef.current.forEach((el, id) => {
            const level = peakLevels[id];
            if (el && level !== undefined) {
                const scale = Math.min(1.0, Math.max(0, level * 3.0)); // Amplify weak signals
                
                // Use Transform instead of Height to avoid Layout Reflows
                el.style.transform = `scaleY(${scale})`;
                
                // Color mapping
                if (scale > 0.92) el.style.backgroundColor = '#ef4444';
                else if (scale > 0.70) el.style.backgroundColor = '#f59e0b';
                else el.style.backgroundColor = '#06b6d4';
            }
        });

        // --- MASTER SPECTRUM RENDER ---
        if (canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d', { alpha: false });
            if (ctx) {
                const w = canvas.width;
                const h = canvas.height;
                const dataArray = visualData.current.raw;
                const bufferLength = dataArray.length;

                ctx.fillStyle = '#050505'; 
                ctx.fillRect(0, 0, w, h);
                
                if (quality !== 'LOW') {
                    ctx.strokeStyle = 'rgba(0, 243, 255, 0.03)';
                    ctx.beginPath();
                    for(let x=0; x<w; x+=100) { ctx.moveTo(x,0); ctx.lineTo(x,h); }
                    ctx.stroke();
                }

                const bars = quality === 'LOW' ? 24 : quality === 'MEDIUM' ? 48 : 80;
                const barWidth = w / bars;
                const step = Math.max(1, Math.floor(bufferLength / bars));

                for (let i = 0; i < bars; i++) {
                    let sum = 0;
                    const offset = i * step;
                    for(let j=0; j<step; j++) {
                        sum += dataArray[offset + j] || 0;
                    }
                    const val = (sum / step) * 0.00392156862; 
                    const barHeight = val * h;
                    const hue = 180 + (val * 80); 
                    
                    ctx.fillStyle = `hsla(${hue}, 100%, 50%, 0.8)`;
                    ctx.fillRect(i * barWidth, h - barHeight, barWidth - 1, barHeight);
                }
            }
        }
        animationFrameId.current = requestAnimationFrame(updateLoop);
    };
    
    animationFrameId.current = requestAnimationFrame(updateLoop);
    return () => cancelAnimationFrame(animationFrameId.current);
  }, [quality, isPageVisible]);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;
    const obs = new ResizeObserver(entries => {
        for (const entry of entries) {
            const { width, height } = entry.contentRect;
            if (width > 0 && height > 0 && canvasRef.current) {
                canvasRef.current.width = width;
                canvasRef.current.height = height;
            }
        }
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const channels = Array.from({ length: 24 }, (_, i) => i + 1);

  return (
    <div className="flex flex-col h-full gap-2 relative pointer-events-auto select-none">
        {/* Spectral Header */}
        <div className="h-1/3 min-h-[140px] relative flex flex-col border-b border-cyan-900/30 pb-2">
            <div ref={containerRef} className="flex-1 bg-black/50 border border-cyan-900/10 rounded overflow-hidden relative group">
                <canvas ref={canvasRef} className="block w-full h-full" />
                <div className="absolute top-2 left-2 text-[9px] text-cyan-500 font-mono tracking-[0.3em] bg-black/80 px-2 border border-cyan-500/20 py-0.5">
                    SIGNAL_AUTHORITY_V7
                </div>
                
                {/* DJ Controller Status */}
                <div className={`absolute top-2 right-2 text-[9px] font-mono px-2 border py-0.5 transition-colors ${
                    djController.isConnected 
                        ? 'text-green-400 border-green-500/30 bg-green-900/20' 
                        : 'text-gray-500 border-gray-700 bg-black/50'
                }`}>
                    {djController.isConnected ? (
                        <>
                            ● {djController.controllerName}
                            {djController.profile?.hasRGBPads && <span className="ml-1 text-purple-400">[RGB]</span>}
                            {djController.profile?.hasVUMeters && <span className="ml-1 text-cyan-400">[VU]</span>}
                            {djController.profile?.hasJogWheels && <span className="ml-1 text-amber-400">[JOG]</span>}
                        </>
                    ) : (
                        '○ NO CONTROLLER'
                    )}
                    {djController.lastInput && (
                        <span className="ml-2 text-amber-400">| {djController.lastInput}</span>
                    )}
                </div>
                {sources.length === 0 && (
                     <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50">
                         <button 
                            type="button"
                            onClick={() => resumeAudio()} 
                            className="px-8 py-2 bg-amber-600 text-white font-bold text-[10px] border-b-4 border-amber-800 hover:translate-y-0.5 active:translate-y-1 transition-all animate-pulse uppercase tracking-[0.3em] shadow-[0_0_30px_rgba(245,158,11,0.3)]"
                         >
                            Init System Clock
                         </button>
                     </div>
                 )}
                {error && (
                    <div className="absolute bottom-2 left-2 bg-red-950/90 text-red-200 text-[10px] p-2 border border-red-500/50 rounded flex items-center gap-3 z-50 font-mono">
                        <span className="animate-pulse">SYSTEM_FAULT: {error}</span>
                        <button type="button" onClick={() => setError(null)} className="hover:text-white bg-red-800/50 px-1 rounded">ACK</button>
                    </div>
                )}
            </div>
        </div>

        {/* Console Surface */}
        <div className="flex-1 flex min-h-0 bg-[#050505] relative">
            <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar flex gap-1 p-2 bg-[#080808]">
                {channels.map((id) => {
                    const s = sources.find(src => src.id === id);
                    return (
                        <ChannelStrip 
                            key={id} id={id} hasSource={!!s}
                            volume={s?.volume ?? 0.8}
                            muted={s?.muted ?? false}
                            solo={s?.solo ?? false}
                            monitoring={s?.monitoring ?? false}
                            crossfadeGroup={s?.crossfadeGroup ?? 'C'}
                            label={s?.label ?? ''}
                            availableDevices={availableDevices}
                            meterRef={(el) => { 
                                if (el) meterMapRef.current.set(id, el); 
                                else meterMapRef.current.delete(id);
                            }}
                            onAddInput={addSource} onRemove={removeSource}
                            onToggleMute={(i) => setMute(i, !s?.muted)} 
                            onToggleSolo={(i) => setSolo(i, !s?.solo)}
                            onToggleMonitor={(i) => setMonitoring(i, !s?.monitoring)} 
                            onVolume={updateVolume}
                            onAssignCrossfade={assignCrossfadeGroup}
                        />
                    );
                })}
            </div>

            {/* Master Console Section */}
            <div className="w-[140px] shrink-0 bg-[#0a0a0a] border-l border-cyan-900/20 flex flex-col p-3 gap-3 shadow-2xl z-30">
                <div className="text-[9px] text-center text-amber-500/80 font-bold uppercase tracking-[0.2em] border-b border-cyan-900/10 pb-1 font-mono">Master Bus</div>
                
                <div className="flex flex-col gap-1">
                     <div className="flex justify-between text-[8px] font-bold px-1 opacity-50 font-mono"><span className="text-cyan-400">BUS A</span><span className="text-pink-400">BUS B</span></div>
                     <div className="relative h-6 bg-black border border-gray-800 rounded flex items-center px-1">
                        <CyberSlider value={crossfader * 100} min={-100} max={100} step={1} onChange={(v) => setCrossfader(v/100)} />
                     </div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center border border-gray-800 bg-[#111] rounded p-2 gap-2 shadow-inner">
                    <CyberSlider vertical value={masterVolume * 100} min={0} max={100} step={1} onChange={(v) => setMasterVolume(v/100)} />
                    <span className="text-[10px] text-cyan-500 font-mono font-bold tracking-widest uppercase">Gain</span>
                </div>

                <div className="flex flex-col gap-1">
                    <button type="button" onClick={toggleMonitor} className={`w-full py-1.5 text-[9px] font-bold border rounded transition-all font-mono ${monitorEnabled ? 'text-cyan-400 border-cyan-800 bg-cyan-900/10 shadow-[0_0_15px_rgba(0,255,255,0.05)]' : 'text-gray-700 border-gray-800'}`}>
                        CUE_MASTER
                    </button>
                    <button type="button" onClick={isRecording ? stopRecording : startRecording} className={`w-full py-1.5 text-[9px] font-bold border rounded transition-all font-mono ${isRecording ? 'bg-red-600 text-white animate-pulse border-red-400 shadow-[0_0_20px_rgba(255,0,0,0.2)]' : 'text-gray-500 border-gray-800 hover:border-red-900'}`}>
                        {isRecording ? 'STOP_REC' : '● REC_BUS'}
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
});