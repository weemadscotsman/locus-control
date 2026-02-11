
import React from 'react';
import { useAudioSystem } from '../contexts/AudioContext';
import { CyberSlider, CyberButton, CyberSelect, CyberCard } from './ui/CyberControls';
import { useTheme } from '../contexts/ThemeContext';

export const EffectRack: React.FC = () => {
    const { fxState, updateFx } = useAudioSystem();
    const { mode } = useTheme();

    return (
        <div className="h-full flex flex-col gap-2 p-1 overflow-y-auto custom-scrollbar">
            
            {/* 1. ROOM CORRECTION EQ */}
            <div className="bg-locus-panel border border-locus-border rounded p-3 flex flex-col gap-2">
                <div className="flex justify-between items-center border-b border-locus-border pb-2">
                    <span className="text-locus-textLight font-bold text-xs tracking-wider">ROOM CORRECTION EQ</span>
                    <div className="text-[9px] text-locus-accent uppercase font-mono">{fxState.filterType.toUpperCase()}</div>
                </div>

                <div className="flex gap-1 mb-2">
                    <button 
                        onClick={() => updateFx({ filterType: 'lowpass' })}
                        className={`flex-1 text-[9px] py-1 border rounded transition-colors ${fxState.filterType === 'lowpass' ? 'bg-locus-accent text-white border-locus-accent' : 'text-gray-500 border-locus-border hover:text-white'}`}
                    >
                        LPF
                    </button>
                    <button 
                         onClick={() => updateFx({ filterType: 'highpass' })}
                         className={`flex-1 text-[9px] py-1 border rounded transition-colors ${fxState.filterType === 'highpass' ? 'bg-locus-accent text-white border-locus-accent' : 'text-gray-500 border-locus-border hover:text-white'}`}
                    >
                        HPF
                    </button>
                     <button 
                         onClick={() => updateFx({ filterType: 'allpass' })}
                         className={`flex-1 text-[9px] py-1 border rounded transition-colors ${fxState.filterType === 'allpass' ? 'bg-gray-700 text-white border-gray-600' : 'text-gray-500 border-locus-border hover:text-white'}`}
                    >
                        BYPASS
                    </button>
                </div>

                <div className="flex-1 flex gap-4 justify-center items-end pb-2">
                    <div className="h-full w-full flex flex-col gap-4">
                        <CyberSlider 
                            label="Cutoff"
                            value={fxState.filterFreq} 
                            min={20} max={20000} step={100}
                            unit="Hz"
                            onChange={(v) => updateFx({ filterFreq: v })} 
                        />
                         <CyberSlider 
                            label="Resonance"
                            value={fxState.filterRes} 
                            min={0} max={10} step={0.1}
                            onChange={(v) => updateFx({ filterRes: v })} 
                        />
                    </div>
                </div>
            </div>

            {/* 2. CREATIVE FX (PLAYGROUND MODE ONLY) */}
            {mode === 'playground' && (
                <div className="bg-locus-panel border border-locus-secondary rounded p-3 flex flex-col gap-2 relative overflow-hidden">
                     {/* Cyberpunk decoration */}
                     <div className="absolute top-0 right-0 p-1 text-[9px] text-locus-secondary opacity-50 font-mono">EXPERIMENTAL_FX</div>
                     
                     <CyberSlider 
                        label="Bitcrush / Distort"
                        value={fxState.distortionAmount}
                        min={0} max={100} step={1}
                        onChange={(v) => updateFx({ distortionAmount: v })}
                        className="mb-2"
                     />
                     
                     <div className="flex gap-2">
                         <CyberSlider 
                            label="Delay Time"
                            value={fxState.delayTime}
                            min={0} max={1.0} step={0.01} unit="s"
                            onChange={(v) => updateFx({ delayTime: v })}
                            vertical
                            className="h-24"
                         />
                         <CyberSlider 
                            label="Feedback"
                            value={fxState.delayFeedback}
                            min={0} max={0.9} step={0.01}
                            onChange={(v) => updateFx({ delayFeedback: v })}
                            vertical
                            className="h-24"
                         />
                         <CyberSlider 
                            label="Dry/Wet"
                            value={fxState.delayWet}
                            min={0} max={1} step={0.01}
                            onChange={(v) => updateFx({ delayWet: v })}
                            vertical
                            className="h-24"
                         />
                     </div>
                </div>
            )}

            {/* 3. DYNAMICS */}
            <div className="bg-locus-panel border border-locus-border rounded p-3 flex flex-col gap-2 opacity-50 pointer-events-none">
                <div className="flex justify-between items-center border-b border-locus-border pb-2">
                    <span className="text-gray-500 font-bold text-xs tracking-wider">LIMITER (SAFETY)</span>
                    <div className="w-2 h-2 rounded-full bg-locus-success"></div>
                </div>
                <div className="text-[10px] text-gray-600 font-mono text-center py-1">
                    -0.1dB CEILING ACTIVE
                </div>
            </div>

        </div>
    );
};
