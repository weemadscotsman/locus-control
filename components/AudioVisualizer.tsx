
import React, { useEffect, useRef, useState, memo } from 'react';
import { CyberSlider, CyberSelect, CyberButton } from './ui/CyberControls';
import { useAudioSystem } from '../contexts/AudioContext';
import { usePerformance } from '../contexts/PerformanceContext';
import { AudioSource } from '../types';

// --- ISOLATED CHANNEL STRIP (MEMOIZED) ---
interface ChannelStripProps {
    id: number;
    source?: AudioSource;
    availableDevices: { value: string, label: string }[];
    onAddInput: (id: number, deviceId: string) => void;
    onRemove: (id: number) => void;
    onMute: (id: number) => void;
    onSolo: (id: number) => void;
    onMonitor: (id: number) => void;
    onVolume: (id: number, val: number) => void;
    onAssignCrossfade: (id: number, group: 'A' | 'B' | 'C') => void;
    peakLevel: number; 
}

const ChannelStrip = memo(({ 
    id, source, availableDevices, 
    onAddInput, onRemove, onMute, onSolo, onMonitor, onVolume, onAssignCrossfade
}: ChannelStripProps) => {
    
    return (
        <div 
            className="w-[100px] shrink-0 h-full flex flex-col bg-[#111] border border-cyan-900/20 rounded relative group hover:border-cyan-500/50 transition-colors"
            data-channel-id={id}
        >
            {/* Header */}
            <div className={`text-[9px] text-center font-bold py-1 border-b border-cyan-900/30 ${source ? 'text-cyan-400 bg-cyan-900/20' : 'text-gray-700'}`}>
                CH {id}
            </div>

            {/* Input Select */}
            <div className="p-1 mb-1 relative z-20">
                {!source ? (
                    <CyberSelect 
                        value="" 
                        onChange={(v) => v && onAddInput(id, v)} 
                        options={[{ value: '', label: 'ADD INPUT +' }, ...availableDevices]} 
                    />
                ) : (
                    <div className="text-[8px] text-center text-cyan-200 truncate px-1 cursor-help py-1 bg-cyan-900/10 rounded" title={source.label}>
                        {source.label.replace('Input', '').substring(0, 15)}
                    </div>
                )}
            </div>

            {/* Controls */}
            {source && (
                <div className="flex flex-col gap-1 px-1 mb-2">
                    <div className="flex gap-[1px]">
                        <button onClick={() => onMute(id)} className={`flex-1 text-[8px] py-1 border rounded ${source.muted ? 'bg-red-500 text-black border-red-500 font-bold' : 'bg-[#222] text-gray-400 border-gray-700 hover:text-red-400'}`}>
                            M
                        </button>
                        <button onClick={() => onSolo(id)} className={`flex-1 text-[8px] py-1 border rounded ${source.solo ? 'bg-yellow-400 text-black border-yellow-400 font-bold' : 'bg-[#222] text-gray-400 border-gray-700 hover:text-yellow-400'}`}>
                            S
                        </button>
                        <button 
                            onClick={() => onMonitor(id)} 
                            className={`flex-1 text-[8px] py-1 border rounded transition-all ${source.monitoring ? 'bg-cyan-500 text-black border-cyan-400 font-bold shadow-[0_0_5px_#0ff]' : 'bg-[#222] text-gray-500 border-gray-700'}`}
                            title="Headphone Cue"
                        >
                            🎧
                        </button>
                    </div>
                    <div className="flex justify-between text-[8px] bg-black border border-gray-800 rounded overflow-hidden">
                        <button onClick={() => onAssignCrossfade(id, 'A')} className={`flex-1 hover:bg-cyan-900/50 ${source.crossfadeGroup === 'A' ? 'bg-cyan-600 text-white font-bold' : 'text-gray-500'}`}>A</button>
                        <button onClick={() => onAssignCrossfade(id, 'C')} className={`flex-1 hover:bg-gray-800 ${source.crossfadeGroup === 'C' ? 'bg-gray-700 text-white' : 'text-gray-600'}`}>T</button>
                        <button onClick={() => onAssignCrossfade(id, 'B')} className={`flex-1 hover:bg-pink-900/50 ${source.crossfadeGroup === 'B' ? 'bg-pink-600 text-white font-bold' : 'text-gray-500'}`}>B</button>
                    </div>
                </div>
            )}

            {/* Fader Area */}
            <div className="flex-1 flex justify-center items-end px-2 pb-2 gap-2 min-h-0 relative z-10">
                {source ? (
                    <>
                        <div className="h-full w-8 relative z-10 flex justify-center">
                            <CyberSlider 
                                vertical 
                                value={source.volume * 100} 
                                min={0} max={100} step={1} 
                                onChange={(v) => onVolume(id, v/100)} 
                            />
                        </div>
                        {/* VU Meter Container */}
                        <div className="h-full w-3 bg-black rounded-sm overflow-hidden border border-gray-800 relative">
                            {/* DOM access via data attribute for performance */}
                            <div className="channel-meter-bar w-full absolute bottom-0 bg-cyan-500 transition-all duration-75" style={{ height: '0%' }} data-meter-id={id} />
                            <div className="absolute inset-0 flex flex-col justify-between py-1 opacity-30 pointer-events-none">
                                {[...Array(10)].map((_,i) => <div key={i} className="w-full h-[1px] bg-white" />)}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="h-full w-full border border-dashed border-gray-800 rounded flex items-center justify-center opacity-20">
                        <span className="rotate-[-90deg] text-[9px]">EMPTY</span>
                    </div>
                )}
            </div>

            {source && (
                <button onClick={() => onRemove(id)} className="absolute top-0 right-0 text-red-900 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    ✕
                </button>
            )}
        </div>
    );
});


export const AudioVisualizer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameId = useRef<number>(0);
  
  const { quality, isPageVisible } = usePerformance();
  const { 
      visualData, sources, availableDevices, addSource, 
      removeSource, toggleMute, toggleSolo, toggleMonitoring, updateVolume, error, 
      setError, masterVolume, setMasterVolume, isRecording, startRecording, stopRecording,
      crossfader, setCrossfader, assignCrossfadeGroup, updateCompressor,
      monitorEnabled, toggleMonitor, resumeAudio
  } = useAudioSystem();

  const [compThreshold, setCompThreshold] = useState(-24);
  const [compRatio, setCompRatio] = useState(12);

  // FX Loop for Compressor updates
  useEffect(() => {
      updateCompressor(compThreshold, compRatio);
  }, [compThreshold, compRatio]);

  // Visual Loop (Canvas + Meters)
  useEffect(() => {
    const updateLoop = () => {
        animationFrameId.current = requestAnimationFrame(updateLoop);
        if (!isPageVisible) return;
        
        // 1. Bulk Update Meters via DOM (Bypasses React)
        const meters = document.getElementsByClassName('channel-meter-bar');
        for (let i = 0; i < meters.length; i++) {
            const el = meters[i] as HTMLDivElement;
            const id = parseInt(el.getAttribute('data-meter-id') || '0');
            if (id) {
                const peak = visualData.current.peakLevels[id] || 0;
                const height = Math.min(100, peak * 100 * 3);
                el.style.height = `${height}%`;
                el.style.backgroundColor = height > 90 ? '#ef4444' : height > 70 ? '#eab308' : '#06b6d4';
            }
        }

        // 2. Draw Master Spectrum
        if (canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d', { alpha: false });
            if (!ctx) return;

            const w = canvas.width;
            const h = canvas.height;
            const dataArray = visualData.current.raw;
            const bufferLength = dataArray.length;

            ctx.fillStyle = '#050505'; 
            ctx.fillRect(0, 0, w, h);
            
            // Grid
            if (quality !== 'LOW') {
                ctx.strokeStyle = 'rgba(0, 243, 255, 0.1)';
                ctx.beginPath();
                for(let x=0; x<w; x+=50) { ctx.moveTo(x,0); ctx.lineTo(x,h); }
                ctx.stroke();
            }

            // Spectrum Bars
            const bars = quality === 'LOW' ? 64 : 128;
            const barWidth = w / bars;
            
            // Safe step calculation to avoid infinite or zero loops
            const step = Math.max(1, Math.floor(bufferLength / bars));

            for (let i = 0; i < bars; i++) {
                let sum = 0;
                let count = 0;
                
                // Average the bin range for this bar
                for(let j=0; j<step; j++) {
                    const idx = i*step + j;
                    if (idx < bufferLength) {
                        sum += dataArray[idx];
                        count++;
                    }
                }
                
                const avg = count > 0 ? sum / count : 0;
                const val = avg / 255;
                const barHeight = val * h;
                
                const hue = 180 + (val * 60); 
                ctx.fillStyle = `hsla(${hue}, 100%, 50%, 0.8)`;
                ctx.fillRect(i * barWidth, h - barHeight, barWidth - 1, barHeight);
            }
        }
    };
    updateLoop();
    return () => cancelAnimationFrame(animationFrameId.current);
  }, [sources, quality, isPageVisible]);

  // Resize Handler
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
    <div className="flex flex-col h-full gap-2 relative" onClick={() => resumeAudio()}>
        {/* TOP: VISUALIZER */}
        <div className="h-1/3 min-h-[150px] relative flex flex-col border-b border-cyan-900/50 pb-2">
            <div ref={containerRef} className="flex-1 bg-black/40 border border-cyan-900/30 rounded overflow-hidden relative shadow-inner group">
                <canvas ref={canvasRef} className="block w-full h-full" />
                <div className="absolute top-2 left-2 text-[10px] text-cyan-500 font-mono tracking-widest bg-black/60 px-1 border border-cyan-500/20">
                    MASTER SPECTRUM
                </div>
                 {/* Explicit Resume Overlay if Context Suspended (detected via empty sources implicitly, but always good to have interaction area) */}
                 {sources.length === 0 && (
                     <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                         <div className="text-[10px] text-gray-600 font-mono animate-pulse">WAITING FOR SIGNAL...</div>
                     </div>
                 )}
                {error && <div className="absolute bottom-2 left-2 bg-red-900/80 text-white text-[10px] p-2 border border-red-500 rounded flex gap-2 z-50"><span>⚠ {error}</span><button onClick={() => setError(null)}>✕</button></div>}
            </div>
        </div>

        {/* BOTTOM: CONSOLE */}
        <div className="flex-1 flex min-h-0 bg-[#050505] relative">
            <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar flex gap-1 p-2 bg-[#080808]">
                {channels.map((id) => (
                    <ChannelStrip 
                        key={id}
                        id={id}
                        source={sources.find(s => s.id === id)} // Finds the stable object reference from AudioEngine
                        availableDevices={availableDevices}
                        onAddInput={addSource}
                        onRemove={removeSource}
                        onMute={toggleMute}
                        onSolo={toggleSolo}
                        onMonitor={toggleMonitoring}
                        onVolume={updateVolume}
                        onAssignCrossfade={assignCrossfadeGroup}
                        peakLevel={0} // Managed via DOM bypass
                    />
                ))}
            </div>

            {/* MASTER SECTION */}
            <div className="w-[140px] shrink-0 bg-[#0a0a0a] border-l border-cyan-900/50 flex flex-col p-2 gap-2 shadow-xl z-30">
                <div className="text-[10px] text-center text-yellow-500 font-bold uppercase tracking-widest border-b border-cyan-900/30 pb-1">Master</div>
                <div className="flex flex-col gap-1">
                     <div className="flex justify-between text-[9px] font-bold"><span className="text-cyan-400">A</span><span className="text-pink-400">B</span></div>
                     <div className="relative h-6 bg-black border border-gray-700 rounded flex items-center px-1">
                        <CyberSlider value={crossfader * 100} min={-100} max={100} step={1} onChange={(v) => setCrossfader(v/100)} />
                     </div>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center border border-gray-800 bg-[#111] rounded p-2 gap-2">
                    <CyberSlider vertical value={masterVolume * 100} min={0} max={100} step={1} onChange={(v) => setMasterVolume(v/100)} />
                    <span className="text-[9px] text-cyan-500 font-mono">MAIN OUT</span>
                </div>
                <div className="grid grid-cols-2 gap-1 bg-black/40 p-1 rounded border border-gray-800">
                     <div className="flex flex-col items-center">
                         <input type="range" min="-60" max="0" value={compThreshold} onChange={e => setCompThreshold(Number(e.target.value))} className="w-full h-1" />
                         <span className="text-[8px] text-gray-500">THR</span>
                     </div>
                     <div className="flex flex-col items-center">
                         <input type="range" min="1" max="20" value={compRatio} onChange={e => setCompRatio(Number(e.target.value))} className="w-full h-1" />
                         <span className="text-[8px] text-gray-500">RAT</span>
                     </div>
                </div>
                <button onClick={toggleMonitor} className={`w-full py-1 text-[9px] font-bold border rounded ${monitorEnabled ? 'text-cyan-400 border-cyan-800' : 'text-yellow-500 border-yellow-800 bg-yellow-900/10'}`}>
                    {monitorEnabled ? 'MONITOR ON' : 'MONITOR MUTED'}
                </button>
                <button onClick={isRecording ? stopRecording : startRecording} className={`w-full py-1 text-[9px] font-bold border rounded ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 border-gray-800'}`}>
                    {isRecording ? 'REC' : '● REC'}
                </button>
            </div>
        </div>
    </div>
  );
};
