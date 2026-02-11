
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
    const roadHistoryRef = useRef<number[]>(new Array(40).fill(0)); 
    
    const particlesRef = useRef<Particle[]>([]);
    
    // Tiered particle counts
    const particlePoolSize = quality === 'HIGH' ? 120 : quality === 'MEDIUM' ? 60 : 0;

    const lastDrawTimeRef = useRef<number>(0);
    // Optimized tick rates
    const targetFps = quality === 'LOW' ? 24 : quality === 'MEDIUM' ? 45 : 60;
    const interval = 1000 / targetFps;

    useEffect(() => {
        if (particlePoolSize > 0) {
            particlesRef.current = Array.from({ length: particlePoolSize }).map(() => ({
                x: (Math.random() - 0.5) * 2000,
                y: (Math.random() - 0.5) * 2000,
                z: Math.random() * 2000,
                baseSize: Math.random() * 1.5 + 0.5,
                color: `hsla(${Math.random() * 360}, 100%, 70%, 1)`
            }));
        } else {
            particlesRef.current = [];
        }
    }, [particlePoolSize]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
        if (!ctx) return;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resize);
        resize();

        const draw = (timestamp: number) => {
            frameRef.current = requestAnimationFrame(draw);
            
            if (!isPageVisible) return;
            if (timestamp - lastDrawTimeRef.current < interval) return;
            lastDrawTimeRef.current = timestamp;

            const w = canvas.width;
            const h = canvas.height;
            const cx = w * 0.5;
            const cy = h * 0.5;

            const { bass, mid, high, hue: globalHue } = visualData.current;
            
            // Dynamics
            const speed = 4 + (bass * 60); 
            timeRef.current += speed * 0.0005;

            roadHistoryRef.current.pop();
            roadHistoryRef.current.unshift(bass);

            // 1. VOID CLEAR
            ctx.fillStyle = '#050505';
            ctx.fillRect(0, 0, w, h);

            // 2. PARTICLE WARP (Skip on LOW)
            if (quality !== 'LOW' && particlesRef.current.length > 0) {
                const fov = 300;
                for(let i = 0; i < particlesRef.current.length; i++) {
                    const p = particlesRef.current[i];
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
                        const alpha = Math.max(0, (2000 - p.z) / 2000);
                        ctx.fillStyle = p.color;
                        ctx.globalAlpha = alpha;
                        ctx.fillRect(x2d, y2d, p.baseSize * scale * (1 + bass), p.baseSize * scale * (1 + bass));
                    }
                }
                ctx.globalAlpha = 1.0;
            }

            // 3. INFINITY TUNNEL
            ctx.save();
            ctx.translate(cx, cy);

            const maxDim = Math.max(w, h);
            
            for(let q = 0; q < 4; q++) {
                ctx.rotate(Math.PI / 2);

                const vLines = quality === 'LOW' ? 4 : 8;
                const hLines = quality === 'LOW' ? 12 : 24;
                const loop = (timeRef.current * 8) % 1;

                // Vertical Perspectives
                ctx.beginPath();
                ctx.strokeStyle = `hsla(${globalHue}, 100%, 50%, 0.08)`;
                ctx.lineWidth = 1;
                for(let i = -vLines; i <= vLines; i++) {
                    if (Math.abs(i) < 1) continue;
                    const xEnd = (i / vLines) * (maxDim * 0.8); 
                    ctx.moveTo(0, 0);
                    ctx.lineTo(xEnd, maxDim);
                }
                ctx.stroke();

                // Transverse Waves
                for(let i = 0; i < hLines; i++) {
                    const z = Math.pow((i + loop) / hLines, 2); 
                    if (z < 0.05) continue;

                    const y = z * (maxDim * 0.7);
                    const widthAtY = y * 4;
                    const left = -widthAtY / 2;
                    const right = widthAtY / 2;

                    const histIdx = Math.floor((1 - z) * (roadHistoryRef.current.length - 1));
                    const power = roadHistoryRef.current[histIdx] || 0;

                    ctx.beginPath();
                    ctx.strokeStyle = `hsla(${globalHue}, 100%, ${60 + (power * 40)}%, ${z})`;
                    ctx.lineWidth = 1 + (power * 4);

                    if (quality === 'LOW') {
                         ctx.moveTo(left, y);
                         ctx.lineTo(right, y);
                    } else {
                         const segs = 10;
                         const segW = widthAtY / segs;
                         ctx.moveTo(left, y);
                         
                         const spikeAmp = power * (maxDim * 0.1) * z; 
                         for(let s=0; s<=segs; s++) {
                             const x = left + (s * segW);
                             const normX = (s / segs) - 0.5;
                             let yOff = 0;
                             if (Math.abs(normX) > 0.15) {
                                  yOff = spikeAmp * Math.sin(x * 0.05 + timeRef.current * 10);
                             }
                             ctx.lineTo(x, y + yOff);
                         }
                    }
                    ctx.stroke();
                }
            }
            ctx.restore();

            // 4. THE SUN
            const sunRadius = Math.min(w, h) * 0.1 + (bass * 25);
            
            if (quality === 'HIGH') {
                ctx.save();
                ctx.shadowBlur = 30;
                ctx.shadowColor = `hsla(${globalHue}, 100%, 50%, 0.8)`;
            }
            
            const sunGrad = ctx.createLinearGradient(0, cy - sunRadius, 0, cy + sunRadius);
            sunGrad.addColorStop(0, `hsla(${globalHue}, 100%, 60%, 1)`);
            sunGrad.addColorStop(1, `hsla(${globalHue}, 100%, 30%, 1)`);
            
            ctx.fillStyle = sunGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, sunRadius, 0, Math.PI * 2);
            ctx.fill();

            if (quality === 'HIGH') ctx.restore();

            // Horizontal scan stripes over sun
            ctx.fillStyle = '#050505';
            for(let i=0; i<6; i++) {
                const y = cy + (i * (sunRadius/3)) - (sunRadius/4);
                if (y < cy + sunRadius) {
                    ctx.fillRect(cx - sunRadius, y, sunRadius * 2, 2 + i);
                }
            }
        };

        frameRef.current = requestAnimationFrame(draw);

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(frameRef.current);
        };
    }, [quality, isPageVisible]);

    return <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none w-full h-full" />;
};
