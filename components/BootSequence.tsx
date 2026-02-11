import React, { useEffect, useState, useRef } from 'react';

interface BootSequenceProps {
    onComplete: () => void;
}

const BOOT_LOGS = [
    "INITIALIZING ECHO_HOUSE KERNEL v2.0.0...",
    "MOUNTING AUDIO REAL-TIME ENGINE...",
    "CHECKING MEMORY INTEGRITY... OK",
    "LOADING DRIVERS (COREAUDIO/ASIO/UDP)...",
    "ESTABLISHING MESH HANDSHAKE...",
    "CALIBRATING VISUAL CORTEX...",
    "ALLOCATING DMA CHANNELS...",
    "SYNCING WITH MASTER CLOCK...",
    "VERIFYING PERMISSION MANIFEST...",
    "STARTING DAEMONS [ECHONET, VIS, AI]...",
    "SYSTEM READY."
];

export const BootSequence: React.FC<BootSequenceProps> = ({ onComplete }) => {
    const [lines, setLines] = useState<string[]>([]);
    const [progress, setProgress] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let lineIndex = 0;
        let charIndex = 0;
        let currentLine = "";
        
        const typeTimer = setInterval(() => {
            const targetLine = BOOT_LOGS[lineIndex];
            
            if (!targetLine) {
                clearInterval(typeTimer);
                setTimeout(onComplete, 500);
                return;
            }

            // Typing effect
            currentLine += targetLine[charIndex];
            
            setLines(prev => {
                const newLines = [...prev];
                if (charIndex === 0) newLines.push(currentLine);
                else newLines[newLines.length - 1] = currentLine;
                return newLines;
            });

            charIndex++;

            // Line finished
            if (charIndex >= targetLine.length) {
                lineIndex++;
                charIndex = 0;
                currentLine = "";
                setProgress(p => Math.min(100, p + (100 / BOOT_LOGS.length)));
            }
            
            if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }

        }, 15); // Fast typing speed

        return () => clearInterval(typeTimer);
    }, [onComplete]);

    return (
        <div className="fixed inset-0 bg-black z-[9999] flex flex-col justify-center items-center font-mono p-10 cursor-wait select-none">
            <div className="w-full max-w-2xl">
                <div className="border-b border-locus-accent/50 mb-4 pb-2 flex justify-between items-end">
                    <h1 className="text-xl text-locus-accent font-bold tracking-widest">ECHO_HOUSE<span className="text-white">_BOOT_LOADER</span></h1>
                    <span className="text-xs text-gray-500">MEM: 128TB OK</span>
                </div>
                
                <div ref={scrollRef} className="h-64 overflow-hidden text-xs md:text-sm text-gray-400 space-y-1 mb-6 font-bold">
                    {lines.map((line, i) => (
                        <div key={i} className="flex gap-2">
                            <span className="text-locus-secondary opacity-50">[{String(i).padStart(2, '0')}]</span>
                            <span className={i === lines.length - 1 ? "text-white animate-pulse" : ""}>{line}</span>
                        </div>
                    ))}
                </div>

                <div className="relative h-1 bg-gray-900 rounded-full overflow-hidden">
                    <div 
                        className="absolute top-0 left-0 h-full bg-locus-accent transition-all duration-100 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-gray-600 uppercase tracking-wider">
                    <span>Loading Assets</span>
                    <span>{Math.round(progress)}%</span>
                </div>
            </div>
        </div>
    );
};