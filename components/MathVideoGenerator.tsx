
import React, { useRef, useEffect } from 'react';
import { useAudioSystem } from '../contexts/AudioContext';

interface MathVideoGeneratorProps {
  videoStream?: MediaStream | null;
  width?: number;
  height?: number;
}

export const MathVideoGenerator: React.FC<MathVideoGeneratorProps> = ({
  videoStream,
  width = 800,
  height = 600
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  
  // PERFORMANCE FIX: Use Ref instead of State for animation values
  const phaseRef = useRef<number>(0);
  
  const { visualData } = useAudioSystem();

  // Initialize video element if stream is provided
  useEffect(() => {
    const video = videoRef.current;
    if (videoStream && video) {
      video.srcObject = videoStream;
      video.play().catch(console.error);
    }
    return () => {
      if (video) video.srcObject = null;
    };
  }, [videoStream]);

  const drawPhase = (
    ctx: CanvasRenderingContext2D,
    time: number,
    bass: number,
    mid: number,
    high: number
  ) => {
    const { width: w, height: h } = ctx.canvas;
    
    if (w === 0 || h === 0) return;

    ctx.clearRect(0, 0, w, h);
    
    // Generate color based on audio
    const hue = (visualData.current.hue + time * 0.01) % 360;
    
    // Golden ratio
    const phi = 1.61803398875;
    const centerX = w / 2;
    const centerY = h / 2;
    const maxRadius = Math.min(w, h) / 2;
    
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(bass * 0.2);
    
    const drawPhiSpiral = (radius: number, depth: number) => {
      if (depth <= 0 || radius < 1) return;
      
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      
      const segmentHue = (hue + depth * 30) % 360;
      ctx.fillStyle = `hsla(${segmentHue}, 100%, ${50 + high * 50}%, ${0.3 + bass * 0.3})`;
      ctx.fill();
      
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + time * 0.001;
        const nextRadius = radius / phi;
        
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        ctx.lineTo(Math.cos(angle * phi) * nextRadius, Math.sin(angle * phi) * nextRadius);
        
        const lineHue = (hue + i * 45) % 360;
        ctx.strokeStyle = `hsla(${lineHue}, 100%, ${60 + mid * 40}%, 0.8)`;
        ctx.lineWidth = 2 + high * 3;
        ctx.stroke();
      }
      drawPhiSpiral(radius / phi, depth - 1);
    };
    
    drawPhiSpiral(maxRadius * (0.5 + bass * 0.5), 8);
    
    // Video overlay
    if (videoRef.current && videoRef.current.readyState >= 2) {
      ctx.save();
      const warp = Math.sin(time * 0.002) * mid * 0.5;
      
      ctx.beginPath();
      for (let i = 0; i < Math.PI * 2; i += Math.PI / 12) {
        const x = Math.cos(i + warp) * (maxRadius * 0.6);
        const y = Math.sin(i * phi) * (maxRadius * 0.6);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.clip();
      
      ctx.drawImage(videoRef.current, -maxRadius, -maxRadius, maxRadius * 2, maxRadius * 2);
      ctx.restore();
    }
    
    // Particles
    const particleCount = Math.floor(high * 50);
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + time * 0.001;
      const distance = (maxRadius * 0.8) * (0.5 + Math.sin(time * 0.001 + i) * 0.5);
      
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * distance, Math.sin(angle * phi) * distance, 2 + bass * 5, 0, Math.PI * 2);
      
      const particleHue = (hue + i * 10) % 360;
      ctx.fillStyle = `hsla(${particleHue}, 100%, ${70 + mid * 30}%, 0.7)`;
      ctx.fill();
    }
    
    ctx.restore();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let active = true;

    const animate = (time: number) => {
      if (!active) return;
      
      // Safety check for wild delta times if tab was backgrounded
      const deltaTime = time - lastTimeRef.current;
      lastTimeRef.current = time;
      
      try {
        // Update Ref instead of State -> No Re-render
        phaseRef.current = (phaseRef.current + deltaTime * 0.001) % (Math.PI * 2);
        
        const { bass, mid, high } = visualData.current;
        drawPhase(ctx, time, bass, mid, high);
      } catch (error) {
        // Silent catch to prevent crash loops
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      active = false;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [videoStream]);

  return (
    <div className="relative w-full h-full bg-black">
      <canvas ref={canvasRef} width={width} height={height} className="w-full h-full object-cover" />
      <video ref={videoRef} className="hidden" autoPlay muted playsInline />
      <div className="absolute bottom-2 right-2 text-xs text-yellow-300 font-mono bg-black/50 backdrop-blur px-2 py-1 rounded border border-yellow-500/30">
        MATH ENGINE: ACTIVE
      </div>
    </div>
  );
};
