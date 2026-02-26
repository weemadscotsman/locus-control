
import React, { useEffect, useRef } from 'react';
import { useAudioSystem } from '../contexts/AudioContext';
import { usePerformance } from '../contexts/PerformanceContext';

interface Particle {
    x: number;
    y: number;
    z: number;
    baseSize: number;
    color: string;
}

export const ReactiveBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { visualData } = useAudioSystem(); 
    const { quality, isPageVisible } = usePerformance();
    
    const frameRef = useRef<number>(0);
    const timeRef = useRef<number>(0);
    const rotationRef = useRef<number>(0);
    const roadHistoryRef = useRef<number[]>(new Array(60).fill(0)); 
    
    // Particle System Refs
    const particlesRef = useRef<Particle[]>([]);
    const particlePoolSize = quality === 'HIGH' ? 200 : quality === 'MEDIUM' ? 100 : 40;

    // FPS Throttling
    const lastDrawTimeRef = useRef<number>(0);
    const targetFps = quality === 'LOW' ? 30 : 60;
    const interval = 1000 / targetFps;

    // Initialize Particles
    useEffect(() => {
        particlesRef.current = Array.from({ length: particlePoolSize }).map(() => ({
            x: (Math.random() - 0.5) * 2000,
            y: (Math.random() - 0.5) * 2000,
            z: Math.random() * 2000, // Depth
            baseSize: Math.random() * 2 + 1,
            color: `hsla(${Math.random() * 360}, 100%, 70%, 1)`
        }));
    }, [particlePoolSize]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: false }); // No alpha for background canvas = performance
        if (!ctx) return;

        const win = canvas.ownerDocument.defaultView || window;
        const resize = () => {
            canvas.width = win.innerWidth;
            canvas.height = win.innerHeight;
        };
        win.addEventListener('resize', resize);
        resize();

        const draw = (timestamp: number) => {
            frameRef.current = requestAnimationFrame(draw);
            
            if (!isPageVisible) return;
            if (timestamp - lastDrawTimeRef.current < interval) return;
            lastDrawTimeRef.current = timestamp;

            const w = canvas.width;
            const h = canvas.height;
            const cx = w / 2;
            const cy = h / 2; // Center / Horizon

            const { bass, mid, high, hue: globalHue, raw } = visualData.current;
            
            // --- PHYSICS & TIME ---
            // Bass drives the speed of the universe
            const speed = 5 + (bass * 80); 
            timeRef.current += speed * 0.0005;
            rotationRef.current += 0.005 + (high * 0.02);

            // Update Road History (for terrain generation)
            roadHistoryRef.current.pop();
            roadHistoryRef.current.unshift(bass);

            // --- RENDER START ---
            
            // 1. VOID BACKGROUND
            ctx.fillStyle = '#050505';
            ctx.fillRect(0, 0, w, h);

            // 2. 3D POINT CLOUD (WARP FIELD)
            if (quality !== 'LOW') {
                const fov = 300;
                particlesRef.current.forEach(p => {
                    p.z += speed;
                    if (p.z > 2000) {
                        p.z = 1; 
                        p.x = (Math.random() - 0.5) * 2000;
                        p.y = (Math.random() - 0.5) * 2000;
                    }

                    const scale = fov / p.z;
                    const x2d = cx + p.x * scale;
                    const y2d = cy + p.y * scale;

                    if (x2d >= 0 && x2d <= w && y2d >= 0 && y2d <= h) {
                        const size = p.baseSize * scale * (1 + bass * 2);
                        const alpha = Math.min(1, (2000 - p.z) / 1000); 
                        
                        ctx.fillStyle = p.color;
                        ctx.globalAlpha = alpha;
                        ctx.beginPath();
                        ctx.arc(x2d, y2d, size, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.globalAlpha = 1.0;
                    }
                });
            }

            // 3. INFINITY TUNNEL (4-WAY MIRRORED)
            // Draws the "road" grid rotated 4 times to create a full tunnel
            ctx.save();
            ctx.translate(cx, cy);

            const maxDim = Math.max(w, h); // Draw far enough to cover corners
            
            for(let q = 0; q < 4; q++) {
                ctx.rotate(Math.PI / 2); // 90 deg rotation per quadrant

                const vLines = 8;
                const hLines = 24;
                const loop = (timeRef.current * 8) % 1; // 0-1 movement

                // A. Radiating Lines (Perspective)
                ctx.beginPath();
                for(let i = -vLines; i <= vLines; i++) {
                    if (Math.abs(i) < 2) continue; // Gap in center for Sun
                    const xEnd = (i / vLines) * (maxDim * 0.8); 
                    ctx.moveTo(0, 0);
                    ctx.lineTo(xEnd, maxDim);
                }
                ctx.strokeStyle = `hsla(${globalHue}, 100%, 50%, 0.1)`;
                ctx.lineWidth = 1;
                ctx.stroke();

                // B. Transverse Lines (Reactive Terrain)
                for(let i = 0; i < hLines; i++) {
                    // Exponential Z depth for perspective spacing
                    const z = Math.pow((i + loop) / hLines, 1.8); 
                    if (z < 0.05) continue; // Too close to center

                    const y = z * (maxDim * 0.7); // Distance from center
                    const widthAtY = y * 3.5; // Spread width
                    
                    const left = -widthAtY / 2;
                    const right = widthAtY / 2;

                    // Get audio history for this depth slice
                    const histIdx = Math.floor((1 - z) * (roadHistoryRef.current.length - 1));
                    const power = roadHistoryRef.current[histIdx] || 0;

                    ctx.beginPath();
                    // Pulse brightness with audio
                    ctx.strokeStyle = `hsla(${globalHue}, 100%, ${60 + (power * 40)}%, ${z * 1.5})`;
                    ctx.lineWidth = 2 + (power * 3);

                    if (quality === 'LOW') {
                         ctx.moveTo(left, y);
                         ctx.lineTo(right, y);
                    } else {
                         // JAGGED SPIKE GENERATION
                         const segs = 32;
                         const segW = widthAtY / segs;
                         ctx.moveTo(left, y);
                         
                         for(let s=0; s<=segs; s++) {
                             const x = left + (s * segW);
                             const normX = (s / segs) - 0.5; // -0.5 to 0.5
                             
                             let yOff = 0;
                             // Apply spikes to outer walls
                             if (Math.abs(normX) > 0.2) {
                                  // Reactivity: Bass = Amplitude, Highs = Jitter
                                  const spikeAmp = power * (maxDim * 0.15) * z; 
                                  const jitter = high * 20; 
                                  // Deterministic noise based on position + random jitter
                                  const noise = Math.sin(x * 0.1 + timeRef.current) * Math.cos(s * 10) + (Math.random() - 0.5);
                                  
                                  yOff = (spikeAmp + jitter) * noise;
                             }
                             ctx.lineTo(x, y + yOff);
                         }
                    }
                    ctx.stroke();
                }
            }
            ctx.restore();

            // 4. THE SOLAR REACTOR (Center Sun)
            // Drawn AFTER grid to cover the singularity
            const sunRadius = Math.min(w, h) * 0.12 + (bass * 30);
            
            const sunGrad = ctx.createLinearGradient(0, cy - sunRadius, 0, cy + sunRadius);
            sunGrad.addColorStop(0, `hsla(${globalHue}, 100%, 60%, 1)`);
            sunGrad.addColorStop(0.5, `hsla(${(globalHue + 40) % 360}, 100%, 50%, 1)`);
            sunGrad.addColorStop(1, `hsla(${globalHue}, 100%, 30%, 1)`);

            ctx.save();
            ctx.shadowBlur = quality === 'HIGH' ? 60 : 20;
            ctx.shadowColor = `hsla(${globalHue}, 100%, 50%, 0.8)`;
            
            ctx.fillStyle = sunGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, sunRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Retro Blinds
            ctx.fillStyle = '#050505';
            const blindCount = 8;
            for(let i=0; i<blindCount; i++) {
                const y = cy + (i * (sunRadius/3)) - (sunRadius/4);
                const hBlind = 2 + (i * 2); 
                if (y < cy + sunRadius) {
                    ctx.fillRect(cx - sunRadius, y, sunRadius * 2, hBlind);
                }
            }

            // 5. RADIAL AUDIO SPIKES (The Corona)
            const radius = sunRadius + 5;
            const points = 64;
            const step = Math.floor(raw.length / points);
            
            ctx.beginPath();
            for (let i = 0; i < points; i++) {
                const val = raw[i * step] || 0;
                const normVal = (val / 255);
                const spikeLen = normVal * (Math.min(w, h) * 0.25); 

                const angle = (i / points) * Math.PI * 2 - (Math.PI / 2); 
                const x1 = cx + Math.cos(angle) * radius;
                const y1 = cy + Math.sin(angle) * radius;
                const x2 = cx + Math.cos(angle) * (radius + spikeLen);
                const y2 = cy + Math.sin(angle) * (radius + spikeLen);

                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
            }
            
            ctx.lineCap = 'round';
            ctx.lineWidth = 3;
            ctx.strokeStyle = `hsla(${globalHue}, 100%, 70%, 0.8)`;
            ctx.stroke();

            // 6. ORBITING DATA RING
            const ringRadius = sunRadius * 1.8 + (mid * 30);
            ctx.beginPath();
            ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
            
            ctx.strokeStyle = `hsla(${(globalHue + 180) % 360}, 100%, 50%, 0.5)`;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 15]); 
            
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(rotationRef.current);
            ctx.translate(-cx, -cy);
            ctx.stroke();
            ctx.restore();
            ctx.setLineDash([]); 

            // 7. CENTER SCANLINE
            if (quality === 'HIGH') {
                ctx.fillStyle = `hsla(${globalHue}, 100%, 80%, 0.1)`;
                ctx.fillRect(cx - 1, 0, 2, h); // Full vertical scanline
            }
        };

        frameRef.current = requestAnimationFrame(draw);

        return () => {
            win.removeEventListener('resize', resize);
            cancelAnimationFrame(frameRef.current);
        };
    }, [quality, isPageVisible]);

    return <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none w-full h-full" />;
};
