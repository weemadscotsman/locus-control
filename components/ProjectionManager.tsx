import React, { useState } from 'react';
import { CyberModule } from './ui/CyberModule';
import { CyberSelect, CyberButton, CyberSlider, CyberCard } from './ui/CyberControls';
import { ReactiveBackground } from './ReactiveBackground';
import { MathVideoGenerator } from './MathVideoGenerator';
import { aiLayer } from '../services/geminiService';
import { AIConfig } from '../types';
import { useHardware } from '../contexts/HardwareContext';
import { useTheme } from '../contexts/ThemeContext';
import { generateTestPattern } from '../utils/projectionUtils';

export const ProjectionManager: React.FC<{ aiConfig: AIConfig }> = ({ aiConfig }) => {
  const { 
      projectionSurfaces: surfaces, setSurfaces, 
      globalSource, setGlobalSource, 
      screenStream, setScreenStream,
      visionStream, setVisionStream
  } = useHardware();

  const { mode } = useTheme();

  const [selectedSurface, setSelectedSurface] = useState<string>('wall-1');
  const [visionError, setVisionError] = useState<string | null>(null);

  const handleLaunchWindow = (id: string) => {
    const s = surfaces.find(surf => surf.id === id);
    if (!s) return;

    if (s.windowHandle && !s.windowHandle.closed) {
        s.windowHandle.focus();
        return;
    }

    // --- PROJECTION KERNEL V2 ---
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>EchoHouse Viewport: ${s.name}</title>
            <style>
                body { margin: 0; padding: 0; background: #000; overflow: hidden; font-family: monospace; }
                
                #geometry-container { 
                    position: absolute; 
                    top: 0; left: 0; width: 100vw; height: 100vh;
                    transform-origin: center center; 
                    will-change: transform;
                    transition: transform 0.05s linear; 
                    overflow: hidden;
                    background: #000;
                }

                canvas { display: block; width: 100%; height: 100%; }

                .ui-overlay { 
                    position: absolute; bottom: 20px; right: 20px; 
                    color: #00ff41; font-size: 12px; font-weight: bold;
                    z-index: 99; pointer-events: none; 
                    text-shadow: 0 0 5px #00ff41;
                    letter-spacing: 2px;
                }
                
                #fs-btn {
                    position: absolute; top: 20px; right: 20px; 
                    z-index: 100; 
                    background: rgba(0,0,0,0.5); 
                    border: 1px solid #00ff41; 
                    color: #00ff41; 
                    font-family: monospace; 
                    padding: 5px 10px; 
                    cursor: pointer; 
                    opacity: 0.3; 
                    font-size: 10px;
                    transition: opacity 0.3s;
                }
                #fs-btn:hover { opacity: 1.0; background: rgba(0, 255, 65, 0.1); }
            </style>
        </head>
        <body>
            <div id="geometry-container">
                <canvas id="canvas"></canvas>
            </div>
            <button id="fs-btn">[TOGGLE FULLSCREEN]</button>
            <div class="ui-overlay">
                ${s.name.toUpperCase()} <span id="status">:: SYNC SEARCH</span>
            </div>

            <script>
                const canvas = document.getElementById('canvas');
                const ctx = canvas.getContext('2d', { alpha: false }); 
                const container = document.getElementById('geometry-container');
                const statusEl = document.getElementById('status');
                const fsBtn = document.getElementById('fs-btn');

                fsBtn.onclick = () => {
                    if (!document.fullscreenElement) {
                        document.documentElement.requestFullscreen().catch(e => console.log(e));
                    } else {
                        document.exitFullscreen();
                    }
                };

                let audio = { bass: 0, mid: 0, high: 0, trigger: 0 };
                let visuals = { hue: 0 };
                let lastFrameTime = 0;
                let frameCount = 0;

                const stars = Array.from({ length: 150 }, () => ({
                    x: (Math.random() - 0.5) * 2000,
                    y: (Math.random() - 0.5) * 2000,
                    z: Math.random() * 2000
                }));

                function resize() {
                    canvas.width = window.innerWidth;
                    canvas.height = window.innerHeight;
                }
                window.addEventListener('resize', resize);
                resize();

                window.addEventListener('message', (e) => {
                    if (e.data.type === 'SYNC_FRAME') {
                        const payload = e.data.payload;
                        audio = payload.audio;
                        visuals = payload.visuals;
                        
                        const s = payload.settings;
                        const shake = (audio.trigger * 0.02); 
                        
                        const transform = \`
                            translate3d(\${s.positionX}px, \${s.positionY}px, 0) 
                            scale3d(\${s.scaleX + shake}, \${s.scaleY + shake}, 1) 
                            rotateX(\${s.rotateX}deg) 
                            rotateY(\${s.rotateY}deg) 
                            perspective(\${s.perspective}px)
                        \`;
                        
                        container.style.transform = transform;
                        
                        if (frameCount % 30 === 0) {
                            statusEl.innerText = \`:: ONLINE [\${Math.round(audio.trigger * 100)}%]\`;
                            statusEl.style.opacity = 0.5 + (audio.trigger * 0.5);
                        }
                    }
                });

                function draw(time) {
                    requestAnimationFrame(draw);

                    const w = canvas.width;
                    const h = canvas.height;
                    const cx = w / 2;
                    const cy = h / 2;

                    ctx.fillStyle = \`rgba(0, 0, 0, \${0.2 + (audio.high * 0.1)})\`;
                    ctx.fillRect(0, 0, w, h);

                    const coreSize = (Math.min(w,h) * 0.1) + (audio.bass * 100);
                    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreSize);
                    grad.addColorStop(0, \`hsla(\${visuals.hue}, 100%, 80%, 1)\`);
                    grad.addColorStop(0.5, \`hsla(\${visuals.hue}, 100%, 50%, 0.5)\`);
                    grad.addColorStop(1, 'transparent');
                    
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(cx, cy, coreSize, 0, Math.PI*2);
                    ctx.fill();

                    ctx.fillStyle = '#fff';
                    const speed = 2 + (audio.bass * 50);
                    
                    stars.forEach(star => {
                        star.z -= speed;
                        if (star.z <= 0) {
                            star.z = 2000;
                            star.x = (Math.random() - 0.5) * 2000;
                            star.y = (Math.random() - 0.5) * 2000;
                        }

                        const scale = 300 / star.z;
                        const x = cx + star.x * scale;
                        const y = cy + star.y * scale;

                        if (x > 0 && x < w && y > 0 && y < h) {
                            const size = Math.max(0.5, (3 * scale) + (audio.mid * 5));
                            const alpha = Math.min(1, scale * 2);
                            
                            ctx.beginPath();
                            ctx.fillStyle = \`hsla(\${visuals.hue + (star.z * 0.1)}, 100%, 70%, \${alpha})\`;
                            ctx.arc(x, y, size, 0, Math.PI*2);
                            ctx.fill();
                        }
                    });

                    if (audio.mid > 0.1) {
                        ctx.strokeStyle = \`hsla(\${visuals.hue + 180}, 100%, 50%, \${audio.mid * 0.5})\`;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        const gridSpacing = 50 + (audio.bass * 20);
                        
                        for(let i=-5; i<=5; i++) {
                            const xOffset = i * w * 0.2;
                            ctx.moveTo(cx, cy);
                            ctx.lineTo(cx + xOffset + (Math.sin(time * 0.001) * 100), h);
                            ctx.moveTo(cx, cy);
                            ctx.lineTo(cx + xOffset - (Math.sin(time * 0.001) * 100), 0);
                        }
                        ctx.stroke();
                    }

                    frameCount++;
                }
                requestAnimationFrame(draw);
            </script>
        </body>
        </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, `locus-${id}`, 'width=1280,height=720,menubar=no,status=no,toolbar=no,scrollbars=no');

    if (!win) { alert("Popup Blocked. Please allow popups for EchoHouse."); return; }
    
    setTimeout(() => URL.revokeObjectURL(url), 5000);

    setSurfaces(prev => prev.map(item => item.id === id ? { ...item, windowHandle: win } : item));
  };

  const handleCaptureScreen = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      setScreenStream(stream);
      setGlobalSource('screen');
      stream.getVideoTracks()[0].onended = () => setGlobalSource('visuals');
    } catch (e) { console.warn("Screen share cancel."); }
  };

  const currentSurface = surfaces.find(s => s.id === selectedSurface);
  
  const sourceOptions = [
      { value: 'visuals', label: 'DEFAULT AMBIANCE' },
      { value: 'screen', label: 'HDMI / SCREEN MIRROR' }
  ];
  
  if (mode === 'playground') {
      sourceOptions.push({ value: 'math', label: '🧮 MATH ENGINE' });
  }

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto custom-scrollbar p-1">
        
        {/* Source Control */}
        <CyberCard title="Video Matrix">
            <div className="grid grid-cols-1 gap-2">
                 <CyberSelect label="Master Feed" value={globalSource} onChange={(v) => setGlobalSource(v as any)} options={sourceOptions} />
                 <div className="flex gap-2">
                    <CyberButton size="sm" onClick={handleCaptureScreen} className="flex-1">CAPTURE SCREEN</CyberButton>
                 </div>
            </div>
        </CyberCard>

        {/* Surface Selection */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
            {surfaces.map(s => (
                <button key={s.id} onClick={() => setSelectedSurface(s.id)} className={`px-3 py-1 text-[10px] border transition-all rounded whitespace-nowrap ${selectedSurface === s.id ? 'bg-locus-accent text-white border-locus-accent' : 'border-locus-border text-gray-500 hover:border-gray-500'}`}>
                    {s.name} {s.windowHandle && !s.windowHandle.closed && '●'}
                </button>
            ))}
            <button 
                onClick={() => setSurfaces([...surfaces, { 
                    id: `wall-${surfaces.length+1}`, 
                    name: `WALL ${surfaces.length+1}`, 
                    source: 'visuals', 
                    windowHandle: null, 
                    settings: { 
                        scaleX: 1, scaleY: 1, rotateX: 0, rotateY: 0, positionX: 0, positionY: 0, perspective: 1000, skewX: 0, skewY: 0,
                        audioBinding: { source: 'MASTER', gain: 1.0, band: 'bass' }
                    } 
                }])} 
                className="px-2 border border-dashed border-locus-border text-gray-500 text-xs hover:text-white"
            >
                +
            </button>
        </div>

        {currentSurface && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                
                {/* Topology Controls */}
                <CyberCard title={`Topology: ${currentSurface.name}`}>
                    <div className="space-y-4">
                         <div className="flex gap-2">
                            <CyberButton size="sm" onClick={() => handleLaunchWindow(currentSurface.id)} className="flex-1">
                                {currentSurface.windowHandle && !currentSurface.windowHandle.closed ? '📺 RE-FOCUS' : '🚀 LAUNCH PROJECTOR'}
                            </CyberButton>
                            <CyberButton size="sm" variant="danger" onClick={() => setSurfaces(surfaces.filter(s => s.id !== currentSurface.id))} disabled={surfaces.length <= 1}>X</CyberButton>
                        </div>

                        <div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                            {/* NEW: AUDIO BINDING CONTROL */}
                            <div className="text-[10px] text-locus-accent font-bold border-b border-locus-border mb-1">AUDIO REACTIVE BINDING</div>
                            <div className="grid grid-cols-2 gap-2">
                                <CyberSelect 
                                    label="Trigger Source"
                                    value={currentSurface.settings.audioBinding.source}
                                    options={[
                                        { value: 'MASTER', label: 'MASTER MIX' },
                                        { value: 'GROUP_A', label: 'BUS A (DRUMS/RHYTHM)' },
                                        { value: 'GROUP_B', label: 'BUS B (SYNTH/FX)' }
                                    ]}
                                    onChange={(v) => setSurfaces(surfaces.map(s => s.id === currentSurface.id ? {...s, settings: {...s.settings, audioBinding: {...s.settings.audioBinding, source: v}}} : s))}
                                />
                                <CyberSelect 
                                    label="Freq Band"
                                    value={currentSurface.settings.audioBinding.band}
                                    options={[
                                        { value: 'bass', label: 'LOW (KICK)' },
                                        { value: 'mid', label: 'MID (SNARE/VOX)' },
                                        { value: 'high', label: 'HIGH (HATS)' }
                                    ]}
                                    onChange={(v) => setSurfaces(surfaces.map(s => s.id === currentSurface.id ? {...s, settings: {...s.settings, audioBinding: {...s.settings.audioBinding, band: v}}} : s))}
                                />
                            </div>
                            <CyberSlider 
                                label="Reactivity Gain" 
                                value={currentSurface.settings.audioBinding.gain} 
                                min={0} max={3.0} step={0.1} 
                                onChange={(v) => setSurfaces(surfaces.map(s => s.id === currentSurface.id ? {...s, settings: {...s.settings, audioBinding: {...s.settings.audioBinding, gain: v}}} : s))} 
                            />

                            <div className="text-[10px] text-locus-accent font-bold border-b border-locus-border mt-3 mb-1">GEOMETRY</div>
                            <CyberSlider label="Scale X" value={currentSurface.settings.scaleX} min={0.1} max={3} step={0.01} onChange={(v) => setSurfaces(surfaces.map(s => s.id === currentSurface.id ? {...s, settings: {...s.settings, scaleX: v}} : s))} />
                            <CyberSlider label="Scale Y" value={currentSurface.settings.scaleY} min={0.1} max={3} step={0.01} onChange={(v) => setSurfaces(surfaces.map(s => s.id === currentSurface.id ? {...s, settings: {...s.settings, scaleY: v}} : s))} />
                            
                            <div className="text-[10px] text-locus-accent font-bold border-b border-locus-border mt-3 mb-1">KEYSTONE / PERSPECTIVE</div>
                            <CyberSlider label="Perspective (Depth)" value={currentSurface.settings.perspective} min={100} max={2000} step={10} onChange={(v) => setSurfaces(surfaces.map(s => s.id === currentSurface.id ? {...s, settings: {...s.settings, perspective: v}} : s))} />
                            <CyberSlider label="Tilt X (Keystone V)" value={currentSurface.settings.rotateX} min={-90} max={90} step={0.5} onChange={(v) => setSurfaces(surfaces.map(s => s.id === currentSurface.id ? {...s, settings: {...s.settings, rotateX: v}} : s))} />
                            <CyberSlider label="Pan Y (Keystone H)" value={currentSurface.settings.rotateY} min={-90} max={90} step={0.5} onChange={(v) => setSurfaces(surfaces.map(s => s.id === currentSurface.id ? {...s, settings: {...s.settings, rotateY: v}} : s))} />
                            
                            <div className="text-[10px] text-locus-accent font-bold border-b border-locus-border mt-3 mb-1">ALIGNMENT</div>
                            <CyberSlider label="Pos X" value={currentSurface.settings.positionX} min={-500} max={500} step={1} onChange={(v) => setSurfaces(surfaces.map(s => s.id === currentSurface.id ? {...s, settings: {...s.settings, positionX: v}} : s))} />
                            <CyberSlider label="Pos Y" value={currentSurface.settings.positionY} min={-500} max={500} step={1} onChange={(v) => setSurfaces(surfaces.map(s => s.id === currentSurface.id ? {...s, settings: {...s.settings, positionY: v}} : s))} />
                        </div>
                    </div>
                </CyberCard>

                {/* Preview / Sensor */}
                <div className="flex flex-col gap-2">
                    <div className="relative aspect-video bg-black border border-locus-border rounded overflow-hidden group">
                        <div className="absolute top-2 left-2 z-10 text-[9px] text-white font-mono bg-black/60 px-1">LOCAL PREVIEW</div>
                        <div style={{
                            width: '100%', height: '100%', 
                            transformOrigin: 'center',
                            transform: `scale(0.5) perspective(${currentSurface.settings.perspective}px) rotateX(${currentSurface.settings.rotateX}deg) rotateY(${currentSurface.settings.rotateY}deg) scale(${currentSurface.settings.scaleX}, ${currentSurface.settings.scaleY}) translate(${currentSurface.settings.positionX}px, ${currentSurface.settings.positionY}px)`
                        }}>
                             {globalSource === 'visuals' && <ReactiveBackground />}
                             {globalSource === 'math' && <MathVideoGenerator />}
                             {globalSource === 'screen' && screenStream && <video autoPlay muted playsInline ref={el => { if(el) el.srcObject = screenStream; }} className="w-full h-full object-contain" />}
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};