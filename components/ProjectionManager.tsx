
import React, { useState } from 'react';
import { CyberModule } from './ui/CyberModule';
import { CyberSelect, CyberButton, CyberSlider } from './ui/CyberControls';
import { ReactiveBackground } from './ReactiveBackground';
import { MathVideoGenerator } from './MathVideoGenerator';
import { aiLayer } from '../services/geminiService';
import { AIConfig } from '../types';
import { useHardware } from '../contexts/HardwareContext';
import { useTheme } from '../contexts/ThemeContext';

export interface ProjectionSurface {
  id: string;
  name: string;
  source: 'visuals' | 'screen' | 'external';
  windowHandle: Window | null;
  settings: {
    scaleX: number;
    scaleY: number;
    rotateX: number;
    rotateY: number;
    positionX: number;
    positionY: number;
    perspective: number;
  };
}

export const ProjectionManager: React.FC<{ aiConfig: AIConfig }> = ({ aiConfig }) => {
  const { 
      projectionSurfaces: surfaces, setSurfaces, 
      globalSource, setGlobalSource, 
      screenStream, setScreenStream,
      visionStream, setVisionStream
  } = useHardware();

  const { mode } = useTheme();

  const [selectedSurface, setSelectedSurface] = useState<string>('wall-1');
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [visionError, setVisionError] = useState<string | null>(null);

  const handleLaunchWindow = (id: string) => {
    const s = surfaces.find(surf => surf.id === id);
    if (!s) return;

    if (s.windowHandle && !s.windowHandle.closed) {
        s.windowHandle.focus();
        return;
    }

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Locus Viewport: ${s.name}</title>
            <style>
                body { margin: 0; padding: 0; background: black; overflow: hidden; font-family: monospace; }
                #render-target { position: absolute; width: 100%; height: 100%; transform-style: preserve-3d; transition: transform 0.1s ease-out; }
                .ui { position: absolute; bottom: 10px; right: 10px; color: #444; font-size: 10px; z-index: 99; pointer-events: none; border: 1px solid #333; padding: 2px 5px; }
            </style>
        </head>
        <body>
            <div id="render-target">
                <div id="portal-root" style="width:100%; height:100%"></div>
            </div>
            <div class="ui">${s.id}</div>
            <script>
                window.addEventListener('message', (e) => {
                    if (e.data.type === 'PROJECTION_UPDATE') {
                        const { settings } = e.data.payload;
                        const el = document.getElementById('render-target');
                        if (el) {
                            el.style.transform = \`translate(\${settings.positionX}px, \${settings.positionY}px) scale(\${settings.scaleX}, \${settings.scaleY}) rotateX(\${settings.rotateX}deg) rotateY(\${settings.rotateY}deg) perspective(\${settings.perspective}px)\`;
                        }
                    }
                });
            </script>
        </body>
        </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, `locus-${id}`, 'width=1280,height=720,menubar=no,status=no,toolbar=no');

    if (!win) { alert("Popup Blocked."); return; }
    
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

  const handleToggleVision = async () => {
      setVisionError(null);
      if (visionStream) {
          visionStream.getTracks().forEach(track => track.stop());
          setVisionStream(null);
          return;
      }
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          setVisionStream(stream);
      } catch (e: any) {
          setVisionError("CAMERA ACCESS DENIED");
      }
  };

  const handleAIAlign = async () => {
    if (!visionStream) { 
        setVisionError("SENSOR OFFLINE");
        return; 
    }
    
    setIsCalibrating(true);
    setVisionError(null);

    try {
        const track = visionStream.getVideoTracks()[0];
        const imageCapture = new (window as any).ImageCapture(track);
        let bitmap;
        try {
            bitmap = await imageCapture.grabFrame();
        } catch(e) {
             const vid = document.createElement('video');
             vid.srcObject = visionStream;
             await vid.play();
             bitmap = vid;
        }

        const canvas = document.createElement('canvas');
        canvas.width = 1280; canvas.height = 720;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.drawImage(bitmap, 0, 0, 1280, 720);
        
        const img = canvas.toDataURL('image/jpeg', 0.8);
        
        // --- USING THE NEW ADAPTER LAYER ---
        const result = await aiLayer.analyzeProjectionSurface(
            img, 
            parseInt(selectedSurface.split('-')[1]) || 1, 
            aiConfig
        );
        
        setSurfaces(prev => prev.map(s => s.id === selectedSurface ? { 
            ...s, 
            settings: { ...s.settings, rotateX: result.rotateX, rotateY: result.rotateY, scaleX: result.scaleX/100, scaleY: result.scaleY/100 }
        } : s));

        if (result.message.includes("ERROR")) {
            setVisionError(result.message);
        }

    } catch (e: any) { 
        console.error("AI Alignment Failed", e);
        setVisionError(`AI ERROR: ${e.message}`);
    }
    setIsCalibrating(false);
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
    <div className="flex flex-col gap-4">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-locus-border pb-4">
            <div className="space-y-2">
                <CyberSelect label="Master Video Source" value={globalSource} onChange={(v) => setGlobalSource(v as any)} options={sourceOptions} />
                <div className="flex gap-2">
                    <CyberButton size="sm" onClick={handleCaptureScreen} className="flex-1">Grab Screen</CyberButton>
                    <CyberButton size="sm" variant="outline" onClick={() => surfaces.forEach(s => handleLaunchWindow(s.id))}>Cast All</CyberButton>
                </div>
            </div>
            <div className="flex flex-col justify-center items-center bg-locus-bg border border-locus-border rounded p-2">
                <span className="text-[10px] text-gray-500 font-mono">CURRENT FEED</span>
                <span className="text-lg text-locus-textLight font-bold tracking-tighter uppercase">{globalSource === 'visuals' ? 'INTERNAL' : globalSource === 'math' ? 'GENERATIVE' : 'EXTERNAL'}</span>
            </div>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
            {surfaces.map(s => (
                <button key={s.id} onClick={() => setSelectedSurface(s.id)} className={`px-3 py-1 text-[10px] border transition-all rounded whitespace-nowrap ${selectedSurface === s.id ? 'bg-locus-accent text-white border-locus-accent' : 'border-locus-border text-gray-500 hover:border-gray-500'}`}>
                    {s.name} {s.windowHandle && !s.windowHandle.closed && '●'}
                </button>
            ))}
            <button onClick={() => setSurfaces([...surfaces, { id: `wall-${surfaces.length+1}`, name: `WALL ${surfaces.length+1}`, source: 'visuals', windowHandle: null, settings: { ...surfaces[0].settings } }])} className="px-2 border border-dashed border-locus-border text-gray-500 text-xs hover:text-white">+</button>
        </div>

        {currentSurface && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div className="flex gap-2">
                        <CyberButton size="sm" onClick={() => handleLaunchWindow(currentSurface.id)} className="flex-1">
                            {currentSurface.windowHandle && !currentSurface.windowHandle.closed ? '📺 FOCUS WINDOW' : '🚀 LAUNCH VIEWPORT'}
                        </CyberButton>
                        <CyberButton size="sm" variant="danger" onClick={() => setSurfaces(surfaces.filter(s => s.id !== currentSurface.id))} disabled={surfaces.length <= 1}>DELETE</CyberButton>
                    </div>

                    <div className="space-y-3">
                        <CyberSlider label="Scale X" value={currentSurface.settings.scaleX} min={0.1} max={3} step={0.01} onChange={(v) => setSurfaces(surfaces.map(s => s.id === currentSurface.id ? {...s, settings: {...s.settings, scaleX: v}} : s))} />
                        <CyberSlider label="Scale Y" value={currentSurface.settings.scaleY} min={0.1} max={3} step={0.01} onChange={(v) => setSurfaces(surfaces.map(s => s.id === currentSurface.id ? {...s, settings: {...s.settings, scaleY: v}} : s))} />
                        <CyberSlider label="Tilt X" value={currentSurface.settings.rotateX} min={-90} max={90} step={1} onChange={(v) => setSurfaces(surfaces.map(s => s.id === currentSurface.id ? {...s, settings: {...s.settings, rotateX: v}} : s))} />
                        <CyberSlider label="Pan Y" value={currentSurface.settings.rotateY} min={-90} max={90} step={1} onChange={(v) => setSurfaces(surfaces.map(s => s.id === currentSurface.id ? {...s, settings: {...s.settings, rotateY: v}} : s))} />
                        <CyberButton onClick={handleAIAlign} variant="primary" className="w-full" disabled={isCalibrating}>
                            {isCalibrating ? 'CALIBRATING...' : 'AUTO-ALIGN (AI)'}
                        </CyberButton>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <div className="relative aspect-video bg-black border border-locus-border rounded overflow-hidden group">
                        <div className="absolute top-2 left-2 z-10 text-[9px] text-white font-mono bg-black/60 px-1">PREVIEW</div>
                        <div style={{
                            width: '100%', height: '100%', 
                            transform: `perspective(${currentSurface.settings.perspective}px) rotateX(${currentSurface.settings.rotateX}deg) rotateY(${currentSurface.settings.rotateY}deg) scale(${currentSurface.settings.scaleX}, ${currentSurface.settings.scaleY}) translate(${currentSurface.settings.positionX}px, ${currentSurface.settings.positionY}px)`
                        }}>
                             {globalSource === 'visuals' && <ReactiveBackground />}
                             {globalSource === 'math' && <MathVideoGenerator />}
                             {globalSource === 'screen' && screenStream && <video autoPlay muted playsInline ref={el => { if(el) el.srcObject = screenStream; }} className="w-full h-full object-contain" />}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <CyberButton 
                            onClick={handleToggleVision} 
                            size="xs" 
                            variant={visionError ? 'danger' : visionStream ? 'primary' : 'outline'} 
                            className={`flex-1 ${visionStream ? 'bg-locus-accent/20' : ''}`}
                        >
                            {visionStream ? 'SENSOR FEED ACTIVE' : visionError ? 'SENSOR ERROR' : 'ACTIVATE SENSORS'}
                        </CyberButton>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
