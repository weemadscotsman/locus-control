
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

// --- Pro Card Container ---
export const CyberCard: React.FC<{ children: React.ReactNode; title: string; className?: string }> = ({ children, title, className = '' }) => (
  <div className={`relative bg-[#161920] border border-locus-border p-3 group transition-all duration-300 hover:border-gray-600 ${className}`}>
    <div className="flex items-center justify-between border-b border-locus-border pb-2 mb-2">
        <h3 className="text-locus-textLight text-xs font-bold uppercase tracking-wider flex items-center gap-2">
            <span className="w-1 h-3 bg-locus-accent rounded-sm"></span>
            {title}
        </h3>
    </div>
    <div className="relative z-10 pointer-events-auto">
        {children}
    </div>
  </div>
);

// --- Pro Select Dropdown ---
interface CyberSelectProps {
    label?: string;
    value: string | number;
    options: { value: string | number; label: string }[];
    onChange: (value: any) => void;
    className?: string;
}

export const CyberSelect: React.FC<CyberSelectProps> = ({ label, value, options, onChange, className = '' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement>(null);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

    useEffect(() => {
        const updatePosition = () => {
            if (isOpen && containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setCoords({
                    top: rect.bottom + window.scrollY, 
                    left: rect.left,
                    width: rect.width
                });
            }
        };
        if (isOpen) {
            updatePosition();
            window.addEventListener('resize', updatePosition);
            window.addEventListener('scroll', updatePosition, true);
        }
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [isOpen]);

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsOpen(!isOpen);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
        }
        if (e.key === 'Escape') {
            setIsOpen(false);
            triggerRef.current?.focus();
        }
    };

    const selectedLabel = options.find(o => o.value === value)?.label || "Select...";
    const menuMinWidth = 220; 
    const menuWidth = Math.max(coords.width, menuMinWidth);

    return (
        <div className={`relative pointer-events-auto ${className}`} ref={containerRef}>
            {label && (
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1 block pl-1 flex justify-between">
                    <span>{label}</span>
                </label>
            )}
            <div 
                ref={triggerRef}
                onClick={handleToggle}
                onKeyDown={handleKeyDown}
                tabIndex={0}
                role="combobox"
                className={`
                    w-full bg-[#0f1115] border cursor-pointer px-2 py-1.5 flex justify-between items-center
                    transition-all duration-200 relative z-20 min-h-[28px] outline-none focus:ring-1 focus:ring-locus-accent
                    ${isOpen ? 'border-locus-accent text-white' : 'border-locus-border text-gray-400 hover:border-gray-500 hover:text-gray-200'}
                `}
            >
                <span className="text-[11px] font-medium truncate pr-1">
                    {selectedLabel}
                </span>
                <div className="shrink-0 w-2 h-2 border-r border-b border-gray-500 rotate-45 mb-1" />
            </div>

            {isOpen && createPortal(
                <div 
                    className="fixed inset-0 z-[9999]" 
                    onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} 
                >
                    <div 
                        className="absolute bg-[#161920] border border-locus-border max-h-60 overflow-y-auto custom-scrollbar shadow-2xl"
                        style={{
                            top: `${coords.top + 2}px`, 
                            left: `${coords.left}px`,
                            width: `${menuWidth}px`,
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                         {options.length === 0 ? (
                             <div className="p-3 text-[10px] text-gray-500 italic text-center">No Data</div>
                         ) : (
                             options.map((opt) => (
                                <div
                                    key={opt.value}
                                    onClick={() => {
                                        onChange(opt.value);
                                        setIsOpen(false);
                                        triggerRef.current?.focus();
                                    }}
                                    className={`
                                        px-3 py-2 text-[11px] cursor-pointer border-l-2 transition-all border-b border-[#2a2f3a]
                                        ${opt.value === value 
                                            ? 'bg-locus-accent text-white border-l-white font-bold' 
                                            : 'text-gray-400 border-l-transparent hover:bg-[#2a2f3a] hover:text-white hover:border-l-locus-accent'}
                                    `}
                                >
                                    {opt.label}
                                </div>
                            ))
                         )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

// --- Pro Range Slider ---
interface CyberRangeProps {
    label?: string;
    value: number;
    min: number;
    max: number;
    step: number;
    unit?: string;
    onChange: (val: number) => void;
    className?: string;
    vertical?: boolean;
}

export const CyberRange: React.FC<CyberRangeProps> = ({ label, value, min, max, step, unit = '', onChange, className = '', vertical = false }) => {
    const trackRef = useRef<HTMLDivElement>(null);
    const [localValue, setLocalValue] = useState(value);
    const [isDragging, setIsDragging] = useState(false);
    
    useEffect(() => {
        if (!isDragging) setLocalValue(value);
    }, [value, isDragging]);

    const calculateValue = useCallback((e: React.PointerEvent) => {
        if (!trackRef.current) return min;
        const rect = trackRef.current.getBoundingClientRect();
        let pct = 0;

        if (vertical) {
            const relativeY = rect.bottom - e.clientY;
            pct = relativeY / rect.height;
        } else {
            const relativeX = e.clientX - rect.left;
            pct = relativeX / rect.width;
        }

        pct = Math.min(1, Math.max(0, pct));
        let rawValue = min + (pct * (max - min));
        if (step > 0) rawValue = Math.round(rawValue / step) * step;
        return Math.min(max, Math.max(min, rawValue));
    }, [min, max, step, vertical]);

    const handlePointerDown = (e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        setIsDragging(true);
        const newValue = calculateValue(e);
        setLocalValue(newValue);
        onChange(newValue);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging) return;
        e.preventDefault();
        e.stopPropagation();
        const newValue = calculateValue(e);
        if (newValue !== localValue) {
            setLocalValue(newValue);
            onChange(newValue);
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!isDragging) return;
        setIsDragging(false);
        e.currentTarget.releasePointerCapture(e.pointerId);
        e.stopPropagation();
    };

    const displayValue = isDragging ? localValue : value;
    const percentage = Math.min(100, Math.max(0, ((displayValue - min) / (max - min)) * 100));

    if (vertical) {
        return (
             <div className={`h-full flex flex-col items-center pointer-events-auto ${className} select-none touch-none`}>
                <div 
                    ref={trackRef}
                    className="relative h-full w-12 flex justify-center group cursor-ns-resize touch-none py-2"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                >
                    <div className="relative h-full w-2 bg-[#0f1115] rounded-full overflow-hidden border border-locus-border">
                        <div 
                            className="absolute bottom-0 w-full transition-all duration-75 ease-out bg-locus-accent"
                            style={{ height: `${percentage}%` }}
                        />
                    </div>
                    
                    <div 
                        className="absolute w-8 h-4 bg-[#2a2f3a] border border-gray-500 rounded-sm z-20 pointer-events-none flex items-center justify-center shadow-md"
                        style={{ bottom: `calc(${percentage}% - 8px)` }} 
                    >
                        <div className="w-4 h-[1px] bg-white/50"></div>
                    </div>
                </div>
             </div>
        );
    }

    return (
        <div className={`w-full pointer-events-auto ${className} select-none touch-none`}>
            {label && (
                <div className="flex justify-between items-end mb-1 pointer-events-none">
                    <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider pl-1">{label}</label>
                    <span className="text-[10px] font-mono text-locus-accent bg-[#0f1115] px-1 rounded border border-locus-border">
                        {Math.round(displayValue)}{unit}
                    </span>
                </div>
            )}
            <div 
                ref={trackRef}
                className="relative h-6 w-full flex items-center group cursor-ew-resize touch-none"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
            >
                <div className="absolute w-full h-1.5 bg-[#0f1115] rounded-full overflow-hidden border border-locus-border">
                     <div 
                        className="absolute h-full bg-locus-accent rounded-l-full pointer-events-none transition-all duration-75 ease-out"
                        style={{ width: `${percentage}%` }}
                    />
                </div>
                
                <div 
                    className="absolute h-4 w-4 bg-[#2a2f3a] border border-gray-400 rounded-full z-10 pointer-events-none shadow-sm flex items-center justify-center"
                    style={{ left: `calc(${percentage}% - 8px)` }}
                />
            </div>
        </div>
    );
};

export const CyberSlider = CyberRange;

export const CyberInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, className = '', ...props }) => (
    <div className="mb-4 pointer-events-auto">
         <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1 block pl-1">
            {label}
        </label>
        <div className="relative group">
            <input 
                {...props}
                className={`w-full bg-[#0f1115] border border-locus-border text-gray-300 font-mono text-sm px-3 py-2 outline-none focus:border-locus-accent focus:text-white transition-all rounded-sm ${className}`}
            />
        </div>
    </div>
);

export const CyberButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'danger' | 'ghost' | 'outline', size?: 'sm' | 'md' | 'xs' }> = ({ children, variant = 'primary', size = 'md', className = '', ...props }) => {
    const baseStyles = "relative font-bold uppercase tracking-wide transition-all duration-100 flex items-center justify-center gap-2 group overflow-hidden whitespace-nowrap outline-none focus:ring-1 focus:ring-offset-1 focus:ring-offset-black active:translate-y-[1px] select-none rounded-sm pointer-events-auto";
    const sizes = { xs: "text-[10px] px-2 py-1 h-6", sm: "text-[11px] px-3 py-1.5 h-8", md: "text-xs px-4 py-2 h-9" };
    const variants = {
        primary: "bg-locus-accent text-white border border-transparent hover:bg-amber-600 focus:ring-locus-accent",
        danger: "bg-red-600 text-white border border-transparent hover:bg-red-700 focus:ring-red-500",
        ghost: "bg-transparent text-gray-500 hover:text-white hover:bg-[#2a2f3a]",
        outline: "bg-transparent text-gray-400 border border-locus-border hover:border-gray-400 hover:text-white"
    };
    return (
        <button type="button" className={`${baseStyles} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
             <span className="relative z-10 flex items-center gap-2">{children}</span>
        </button>
    );
};
