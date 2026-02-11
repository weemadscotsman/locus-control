import React from 'react';
import { CyberSelect, CyberButton, CyberRange, CyberCard } from './ui/CyberControls';
import { useHardware } from '../contexts/HardwareContext';
import { useTheme } from '../contexts/ThemeContext';

export const LedController: React.FC = () => {
    const { 
        ledConfig, setLedConfig, 
        isLedConnected, connectLed, disconnectLed, ledError 
    } = useHardware();
    
    const { mode } = useTheme();

    const modeOptions = [
        { value: 'sync_bg', label: 'AMBIANCE MATCH' },
        { value: 'vu_meter', label: 'LEVEL METER' },
        { value: 'spectrum', label: 'FFT SPECTRUM' },
    ];
    
    if (mode === 'playground') {
        modeOptions.push({ value: 'rave', label: '☢️ RAVE STROBE' });
    }

    return (
        <div className="h-full flex flex-col gap-4">
            {/* Status Header */}
            <div className="flex justify-between items-center bg-locus-panel p-2 rounded border border-locus-border">
                <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${isLedConnected ? 'bg-locus-success' : 'bg-red-500'}`} />
                    <span className="font-mono text-xs text-locus-textLight">
                        LINK STATUS: {isLedConnected ? 'ONLINE' : 'DISCONNECTED'}
                    </span>
                </div>
                {!isLedConnected ? (
                    <CyberButton onClick={connectLed} size="sm">
                        CONNECT DEVICE
                    </CyberButton>
                ) : (
                    <CyberButton onClick={disconnectLed} variant="danger" size="sm">
                        DISCONNECT
                    </CyberButton>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                {/* Configuration */}
                <CyberCard title="Fixture Configuration">
                    <div className="flex flex-col gap-4">
                        <CyberSelect 
                            label="Behavior Mode"
                            value={ledConfig.mode}
                            onChange={(v) => setLedConfig(p => ({ ...p, mode: v }))}
                            options={modeOptions}
                        />
                        
                        <CyberRange 
                            label="Pixel Count"
                            value={ledConfig.count}
                            min={10} max={300} step={1}
                            unit=" px"
                            onChange={(v) => setLedConfig(p => ({ ...p, count: v }))}
                        />

                        <CyberRange 
                            label="Output Intensity"
                            value={ledConfig.brightness}
                            min={0} max={100} step={1}
                            unit="%"
                            onChange={(v) => setLedConfig(p => ({ ...p, brightness: v }))}
                        />

                        <div className="mt-4 pt-4 border-t border-locus-border">
                            <div className="text-[10px] text-gray-500 font-mono mb-2 uppercase">Protocol Settings</div>
                            <div className="flex gap-2">
                                <CyberSelect 
                                    value={ledConfig.baudRate}
                                    onChange={(v) => setLedConfig(p => ({ ...p, baudRate: v }))}
                                    className="flex-1"
                                    options={[
                                        { value: 115200, label: '115200 (Standard)' },
                                        { value: 500000, label: '500000 (High Speed)' },
                                    ]}
                                />
                            </div>
                        </div>
                    </div>
                </CyberCard>

                {/* Visual Preview */}
                <CyberCard title="EchoHouse Output Monitor">
                    <div className="w-full h-full flex items-center justify-center relative bg-locus-bg rounded">
                        <div className="w-64 h-40 border-4 border-locus-border rounded-lg relative shadow-xl bg-black">
                            <div className="absolute -inset-1 rounded-lg blur-md opacity-60"
                                style={{
                                    background: isLedConnected 
                                        ? `conic-gradient(from 180deg, ${ledConfig.mode === 'sync_bg' ? 'var(--bg-sync-color, cyan)' : 'red, yellow, green, blue'})`
                                        : 'none',
                                    animation: isLedConnected ? 'spin 10s linear infinite' : 'none'
                                }}
                            />
                            
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-[10px] text-gray-600 font-mono text-center">
                                    {isLedConnected ? 'TX ACTIVE' : 'NO SIGNAL'}
                                </span>
                            </div>
                        </div>
                    </div>
                </CyberCard>
            </div>
            
            {ledError && (
                <div className="text-locus-error text-xs font-mono p-2 border border-red-900 bg-red-900/10 rounded">
                    ERROR: {ledError}
                </div>
            )}
        </div>
    );
};