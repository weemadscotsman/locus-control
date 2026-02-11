import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { ProjectionSurface } from '../types';

interface LedConfig {
    count: number;
    brightness: number;
    baudRate: number;
    mode: 'sync_bg' | 'vu_meter' | 'spectrum' | 'rave';
}

interface HardwareState {
  ledConfig: LedConfig;
  ledPort: any | null;
  projectionWindow: Window | null;
  projectionSurfaces: ProjectionSurface[];
  isLedConnected: boolean;
  isProjectionActive: boolean;
  ledError: string | null;
  
  // Media Streams for Projection
  globalSource: 'visuals' | 'screen' | 'math';
  screenStream: MediaStream | null;
  visionStream: MediaStream | null;
}

interface HardwareContextType extends HardwareState {
  setLedConfig: React.Dispatch<React.SetStateAction<LedConfig>>;
  connectLed: () => Promise<void>;
  disconnectLed: () => void;
  ledWriterRef: React.MutableRefObject<any>;
  ledConnectionRef: React.MutableRefObject<boolean>;
  
  openProjection: () => void;
  closeProjection: () => void;
  setSurfaces: React.Dispatch<React.SetStateAction<ProjectionSurface[]>>;
  updateSurfaces: (surfaces: ProjectionSurface[]) => void;
  sendLedCommand: (command: string) => Promise<void>;
  
  setGlobalSource: (s: 'visuals' | 'screen' | 'math') => void;
  setScreenStream: (s: MediaStream | null) => void;
  setVisionStream: (s: MediaStream | null) => void;
}

const HardwareContext = createContext<HardwareContextType | undefined>(undefined);

export const useHardware = () => {
  const context = useContext(HardwareContext);
  if (!context) {
    throw new Error('useHardware must be used within HardwareProvider');
  }
  return context;
};

export const HardwareProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ledConfig, setLedConfig] = useState<LedConfig>({
        count: 60, brightness: 100, baudRate: 115200, mode: 'sync_bg'
  });
  
  const [state, setState] = useState<Omit<HardwareState, 'ledConfig'>>({
    ledPort: null,
    projectionWindow: null,
    projectionSurfaces: [
        {
            id: 'wall-1', name: 'MAIN WALL', source: 'visuals', windowHandle: null,
            settings: { 
                scaleX: 1, scaleY: 1, rotateX: 0, rotateY: 0, 
                positionX: 0, positionY: 0, perspective: 1000, skewX: 0, skewY: 0,
                audioBinding: { source: 'MASTER', gain: 1.0, band: 'bass' }
            }
        },
        {
            id: 'backdrop-1', name: 'BACKDROP', source: 'visuals', windowHandle: null,
            settings: { 
                scaleX: 1, scaleY: 1, rotateX: 0, rotateY: 0, 
                positionX: 0, positionY: 0, perspective: 1000, skewX: 0, skewY: 0,
                audioBinding: { source: 'MASTER', gain: 1.0, band: 'bass' }
            }
        }
    ],
    isLedConnected: false,
    isProjectionActive: false,
    ledError: null,
    globalSource: 'visuals',
    screenStream: null,
    visionStream: null
  });

  const ledWriterRef = useRef<any>(null);
  const ledConnectionRef = useRef<boolean>(false);
  const animationRef = useRef<number | null>(null);

  // Monitor Window State
  useEffect(() => {
    const checkInterval = setInterval(() => {
      if (state.projectionWindow && state.projectionWindow.closed) {
        setState(prev => ({ ...prev, projectionWindow: null, isProjectionActive: false }));
      }
    }, 1000);
    return () => clearInterval(checkInterval);
  }, [state.projectionWindow]);

  // --- HARDENING: SERIAL PORT DISCONNECT LISTENERS ---
  useEffect(() => {
      const handleDisconnect = (e: any) => {
          if (state.ledPort && e.target === state.ledPort) {
              console.warn("[Hardware] Serial Device physically disconnected.");
              disconnectLed(); // Safe disconnect
              setState(prev => ({ ...prev, ledError: "DEVICE UNPLUGGED" }));
          }
      };
      
      if ('serial' in navigator) {
          (navigator as any).serial.addEventListener('disconnect', handleDisconnect);
      }
      
      return () => {
          if ('serial' in navigator) {
              (navigator as any).serial.removeEventListener('disconnect', handleDisconnect);
          }
      };
  }, [state.ledPort]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (ledWriterRef.current) {
         try { ledWriterRef.current.releaseLock(); } catch(e) {}
         if (state.ledPort) state.ledPort.close().catch(console.error);
      }
    };
  }, []);

  const connectLed = useCallback(async () => {
    try {
      if (!('serial' in navigator)) throw new Error('Web Serial API not supported');

      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: ledConfig.baudRate });
      
      const writer = port.writable.getWriter();
      ledWriterRef.current = writer;
      ledConnectionRef.current = true;

      setState(prev => ({ ...prev, ledPort: port, isLedConnected: true, ledError: null }));

    } catch (error: any) {
      console.error('LED Connection failed:', error);
      setState(prev => ({ ...prev, isLedConnected: false, ledError: error.message }));
    }
  }, [ledConfig.baudRate]);

  const disconnectLed = useCallback(async () => {
    ledConnectionRef.current = false;
    
    if (ledWriterRef.current) {
        try {
            await ledWriterRef.current.close();
        } catch(e) { console.warn("Writer close warning", e); }
        ledWriterRef.current = null;
    }
    
    if (state.ledPort) {
        try {
            await state.ledPort.close();
        } catch(e) { console.warn("Port close warning", e); }
    }

    setState(prev => ({ ...prev, ledPort: null, isLedConnected: false }));
  }, [state.ledPort]);

  const openProjection = useCallback(() => {
    try {
      if (state.projectionWindow && !state.projectionWindow.closed) {
          state.projectionWindow.focus();
          return;
      }

      const features = `width=800,height=600,menubar=no,toolbar=no,location=no,status=no`;
      const projectionWindow = window.open('', 'EchoHouseProjection', features);
      
      if (projectionWindow) {
        const html = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>EchoHouse Projection Target</title>
              <style>
                body { margin: 0; padding: 0; background: black; overflow: hidden; display: flex; align-items: center; justify-content: center; }
                canvas { display: block; width: 100vw; height: 100vh; }
                .status { position: absolute; bottom: 10px; right: 10px; color: #00ff41; font-family: monospace; font-size: 10px; opacity: 0.5; }
              </style>
            </head>
            <body>
              <canvas id="projectionCanvas"></canvas>
              <div class="status">LINK ESTABLISHED</div>
              <script>
                const canvas = document.getElementById('projectionCanvas');
                const ctx = canvas.getContext('2d');
                
                function resize() {
                  canvas.width = window.innerWidth;
                  canvas.height = window.innerHeight;
                }
                window.addEventListener('resize', resize);
                resize();
                
                window.addEventListener('message', (event) => {
                  if (event.data.type === 'SYNC_FRAME') {
                    const { hue, bass } = event.data.payload;
                    ctx.fillStyle = 'rgba(0,0,0,0.2)';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    const cx = canvas.width / 2;
                    const cy = canvas.height / 2;
                    const r = (canvas.height * 0.3) + (bass * 200);
                    ctx.beginPath();
                    ctx.arc(cx, cy, r, 0, Math.PI * 2);
                    ctx.strokeStyle = \`hsl(\${hue}, 100%, 50%)\`;
                    ctx.lineWidth = 10 + (bass * 20);
                    ctx.stroke();
                    ctx.fillStyle = \`hsla(\${hue + 180}, 100%, 50%, \${bass * 0.5})\`;
                    ctx.fill();
                  }
                });
              </script>
            </body>
          </html>
        `;
        
        projectionWindow.document.open();
        projectionWindow.document.write(html);
        projectionWindow.document.close();
        
        setState(prev => ({ ...prev, projectionWindow, isProjectionActive: true }));
      }
    } catch (error) {
      console.error('Failed to open projection window:', error);
    }
  }, [state.projectionWindow]);

  const closeProjection = useCallback(() => {
    if (state.projectionWindow) state.projectionWindow.close();
    setState(prev => ({ ...prev, projectionWindow: null, isProjectionActive: false }));
  }, [state.projectionWindow]);

  const updateSurfaces = useCallback((surfaces: ProjectionSurface[]) => {
    setState(prev => ({ ...prev, projectionSurfaces: surfaces }));
  }, []);

  const setSurfaces = useCallback((value: React.SetStateAction<ProjectionSurface[]>) => {
      setState(prev => {
          const newVal = typeof value === 'function' ? value(prev.projectionSurfaces) : value;
          return { ...prev, projectionSurfaces: newVal };
      });
  }, []);

  const sendLedCommand = useCallback(async (command: string) => {
    if (ledWriterRef.current && ledConnectionRef.current) {
      try {
        await ledWriterRef.current.write(new TextEncoder().encode(command + '\n'));
      } catch (error) {
        console.error('LED command failed:', error);
      }
    }
  }, []);

  return (
    <HardwareContext.Provider
      value={{
        ledConfig, setLedConfig,
        ...state,
        connectLed, disconnectLed,
        ledWriterRef, ledConnectionRef,
        openProjection, closeProjection,
        setSurfaces, updateSurfaces,
        sendLedCommand,
        setGlobalSource: (s) => setState(p => ({ ...p, globalSource: s })),
        setScreenStream: (s) => setState(p => ({ ...p, screenStream: s })),
        setVisionStream: (s) => setState(p => ({ ...p, visionStream: s }))
      }}
    >
      {children}
    </HardwareContext.Provider>
  );
};