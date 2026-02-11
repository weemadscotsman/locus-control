import React, { useEffect, useRef } from 'react';
import { useHardware } from '../contexts/HardwareContext';
import { useAudioSystem } from '../contexts/AudioContext';

const HardwareServices: React.FC = () => {
  const { projectionSurfaces, ledConfig, isLedConnected, ledWriterRef, ledConnectionRef } = useHardware(); 
  const { visualData, audioContext } = useAudioSystem();
  
  // Refs to hold latest state without triggering re-renders
  const surfacesRef = useRef(projectionSurfaces);
  const ledConfigRef = useRef(ledConfig);
  const ledConnectedRef = useRef(isLedConnected);
  const ledWriterRefLocal = useRef(ledWriterRef);
  const rafRef = useRef<number>(0);
  const lastLedSendRef = useRef<number>(0);

  // Sync Refs with State
  useEffect(() => {
    surfacesRef.current = projectionSurfaces;
  }, [projectionSurfaces]);

  useEffect(() => {
    ledConfigRef.current = ledConfig;
  }, [ledConfig]);

  useEffect(() => {
    ledConnectedRef.current = isLedConnected;
  }, [isLedConnected]);

  useEffect(() => {
    ledWriterRefLocal.current = ledWriterRef;
  }, [ledWriterRef]);

  // Background Projection & LED Sync Loop
  useEffect(() => {
    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      
      const currentTime = audioContext?.currentTime || performance.now() / 1000;
      const vData = visualData.current;
      const currentSurfaces = surfacesRef.current;
      const config = ledConfigRef.current;
      const ledConnected = ledConnectedRef.current;

      // === PROJECTION SYNC ===
      currentSurfaces.forEach(surface => {
        if (surface.windowHandle && !surface.windowHandle.closed) {
          const binding = surface.settings.audioBinding;
          
          let bandSource = vData;
          if (binding.source === 'GROUP_A' && vData.groupA) {
            bandSource = vData.groupA as any;
          } else if (binding.source === 'GROUP_B' && vData.groupB) {
            bandSource = vData.groupB as any;
          }

          let triggerLevel = 0;
          if (binding.band === 'bass') triggerLevel = bandSource.bass;
          else if (binding.band === 'mid') triggerLevel = bandSource.mid;
          else if (binding.band === 'high') triggerLevel = bandSource.high;
          else triggerLevel = (bandSource.bass + bandSource.mid + bandSource.high) / 3;

          surface.windowHandle.postMessage({
            type: 'SYNC_FRAME',
            payload: {
              time: currentTime,
              settings: surface.settings,
              audio: {
                trigger: triggerLevel * binding.gain,
                bass: bandSource.bass,
                mid: bandSource.mid,
                high: bandSource.high
              },
              visuals: { hue: vData.hue }
            }
          }, '*');
        }
      });

      // === LED/DMX SYNC (30fps max to prevent serial overflow) ===
      const now = performance.now();
      if (ledConnected && ledWriterRef.current && now - lastLedSendRef.current > 33) {
        lastLedSendRef.current = now;
        
        let ledData: Uint8Array;
        const count = config.count;
        const brightness = config.brightness / 100;
        
        switch (config.mode) {
          case 'vu_meter': {
            // VU meter - green to red based on master level
            const level = Math.min(1, (vData.bass + vData.mid) * 0.7);
            const pixelsToLight = Math.floor(count * level);
            ledData = new Uint8Array(count * 3);
            
            for (let i = 0; i < count; i++) {
              const idx = i * 3;
              if (i < pixelsToLight) {
                const ratio = i / count;
                // Green (0) -> Yellow (0.5) -> Red (1)
                ledData[idx] = Math.floor(255 * Math.min(1, ratio * 2) * brightness);     // R
                ledData[idx + 1] = Math.floor(255 * Math.max(0, 1 - ratio * 2) * brightness); // G
                ledData[idx + 2] = 0; // B
              }
            }
            break;
          }
          
          case 'spectrum': {
            // FFT spectrum display
            ledData = new Uint8Array(count * 3);
            const raw = vData.raw;
            const binsPerPixel = Math.floor(raw.length / count);
            
            for (let i = 0; i < count; i++) {
              const idx = i * 3;
              const binStart = i * binsPerPixel;
              let sum = 0;
              for (let j = 0; j < binsPerPixel; j++) {
                sum += raw[binStart + j] || 0;
              }
              const intensity = (sum / binsPerPixel / 255) * brightness;
              const hue = (i / count) * 360 + vData.hue;
              const rgb = hslToRgb(hue / 360, 1, intensity * 0.5);
              ledData[idx] = rgb[0];
              ledData[idx + 1] = rgb[1];
              ledData[idx + 2] = rgb[2];
            }
            break;
          }
          
          case 'rave': {
            // Strobe mode - intense flashes on beats
            const trigger = vData.bass > 0.6 ? 1 : 0;
            const strobe = trigger * brightness;
            ledData = new Uint8Array(count * 3);
            const hue = vData.hue;
            const rgb = hslToRgb(hue / 360, 1, strobe * 0.8);
            
            for (let i = 0; i < count; i++) {
              const idx = i * 3;
              ledData[idx] = rgb[0];
              ledData[idx + 1] = rgb[1];
              ledData[idx + 2] = rgb[2];
            }
            break;
          }
          
          case 'sync_bg':
          default: {
            // Ambiance match - smooth color following audio hue
            ledData = new Uint8Array(count * 3);
            const intensity = (vData.bass * 0.5 + vData.mid * 0.3 + vData.high * 0.2) * brightness;
            const hue = vData.hue;
            const rgb = hslToRgb(hue / 360, 0.8, intensity * 0.6);
            
            for (let i = 0; i < count; i++) {
              const idx = i * 3;
              // Add some variation across the strip
              const pixelIntensity = intensity * (0.8 + 0.2 * Math.sin(i * 0.5 + now * 0.01));
              ledData[idx] = Math.floor(rgb[0] * pixelIntensity / intensity || 0);
              ledData[idx + 1] = Math.floor(rgb[1] * pixelIntensity / intensity || 0);
              ledData[idx + 2] = Math.floor(rgb[2] * pixelIntensity / intensity || 0);
            }
            break;
          }
        }
        
        // Send LED data via Web Serial
        try {
          // Protocol: "LED:" followed by base64 encoded RGB data
          const base64 = btoa(String.fromCharCode(...ledData));
          const command = `LED:${base64}\n`;
          ledWriterRefLocal.current.current.write(new TextEncoder().encode(command));
        } catch (e) {
          // Serial write failed, ignore for performance
        }
      }
    };

    loop();
    return () => cancelAnimationFrame(rafRef.current);
  }, [visualData, audioContext]); // ledWriterRef is stable, don't include it

  return null;
};

// HSL to RGB conversion for LED colors
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

export default HardwareServices;
