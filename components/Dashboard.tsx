
import React, { useMemo, useState, useRef, useEffect, memo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { CyberCard, CyberInput, CyberButton } from './ui/CyberControls';
import { useNetwork } from '../contexts/NetworkContext';

// Memoized Controls to prevent typing interrupts
const NetworkControls = memo(({ onConnect }: { onConnect: (ip: string) => void }) => {
    const [manualIp, setManualIp] = useState('');
    return (
        <div className="flex gap-2 mb-4 border-b border-locus-border pb-4 items-end">
            <div className="flex-1">
                <CyberInput 
                    label="Manually Add Node (IP Address)"
                    value={manualIp}
                    onChange={(e) => setManualIp(e.target.value)}
                    placeholder="192.168.1.XXX"
                    className="mb-0"
                />
            </div>
            <div className="mb-[1px]">
                <CyberButton 
                    onClick={() => {
                        if (manualIp) {
                            onConnect(manualIp);
                            setManualIp('');
                        }
                    }}
                    disabled={!manualIp}
                    variant="primary"
                >
                    ADD NODE
                </CyberButton>
            </div>
        </div>
    );
});

export const Dashboard: React.FC = () => {
  const { clients, config, connectNode } = useNetwork();
  
  const avgLatency = clients.length > 0 ? Math.round(clients.reduce((a, b) => a + b.latency, 0) / clients.length) : 0;
  
  // Health is strictly latency based
  const systemHealth = clients.length === 0 ? 100 : Math.max(0, 100 - (avgLatency / 2));
  const healthColor = systemHealth > 90 ? 'text-locus-success' : systemHealth > 70 ? 'text-locus-accent' : 'text-locus-error';

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [canRenderChart, setCanRenderChart] = useState(false);

  useEffect(() => {
    if (!chartContainerRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
        // Use RAF to prevent loop limit errors and ensure layout is stable
        requestAnimationFrame(() => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                // Recharts needs positive integers. We add a buffer of 50px to be safe.
                // If it shrinks below this (e.g. during drag or hide), unmount the chart.
                if (width > 50 && height > 50) {
                    setCanRenderChart(true);
                } else {
                    setCanRenderChart(false);
                }
            }
        });
    });
    
    observer.observe(chartContainerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full overflow-y-auto custom-scrollbar p-1">
      
      {/* Stats Card */}
      <CyberCard title="Network Telemetry">
        <div ref={chartContainerRef} className="h-40 w-full min-h-[160px] relative overflow-hidden bg-[#0f1115] border border-locus-border rounded">
            {canRenderChart ? (
                <div className="absolute inset-0">
                    <ResponsiveContainer width="100%" height="100%" debounce={50}>
                        <BarChart data={clients} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2a2f3a" vertical={false} />
                            <XAxis dataKey="ip" hide />
                            <YAxis stroke="#475569" fontSize={10} tickFormatter={(val) => `${val}ms`} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#161920', border: '1px solid #2a2f3a', color: '#e2e8f0', fontFamily: 'monospace' }}
                                itemStyle={{ color: '#f59e0b' }}
                                cursor={{fill: 'rgba(255, 255, 255, 0.05)'}}
                            />
                            <Bar 
                                dataKey="latency" 
                                fill="#f59e0b" 
                                radius={[2, 2, 0, 0]} 
                                isAnimationActive={false} 
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-xs animate-pulse">
                    INITIALIZING SENSORS...
                </div>
            )}
            
            {clients.length === 0 && canRenderChart && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-xs font-mono bg-[#0f1115]/80 z-10">
                    NO ACTIVE NODES
                </div>
            )}
        </div>
        <div className="flex justify-between mt-4 border-t border-locus-border pt-2">
            <div className="flex flex-col">
                <span className="text-[10px] text-gray-500 uppercase">Avg Latency</span>
                <span className="text-xl text-locus-textLight font-mono leading-none">{avgLatency}<span className="text-xs text-gray-500">ms</span></span>
            </div>
            <div className="flex flex-col text-right">
                <span className="text-[10px] text-gray-500 uppercase">Health Score</span>
                <span className={`text-xl font-mono leading-none ${healthColor}`}>{Math.round(systemHealth)}%</span>
            </div>
        </div>
      </CyberCard>

      {/* Config Overview */}
      <CyberCard title="Protocol Settings">
        <div className="space-y-3 font-mono text-sm">
            <div className="flex justify-between items-center bg-locus-bg p-2 rounded border-l-2 border-locus-border">
                <span className="text-gray-500 text-xs uppercase">Multicast Group</span>
                <span className="text-locus-accent font-bold">{config.ip}:{config.port}</span>
            </div>
            <div className="flex justify-between items-center bg-locus-bg p-2 rounded border-l-2 border-locus-border">
                <span className="text-gray-500 text-xs uppercase">Sample Rate</span>
                <span className="text-locus-textLight font-bold">{config.rate} Hz</span>
            </div>
            <div className="flex justify-between items-center bg-locus-bg p-2 rounded border-l-2 border-locus-border">
                <span className="text-gray-500 text-xs uppercase">Chunk Size</span>
                <span className="text-locus-textLight font-bold">{config.chunk} Bytes</span>
            </div>
            <div className="flex justify-between items-center bg-locus-bg p-2 rounded border-l-2 border-locus-border">
                <span className="text-gray-500 text-xs uppercase">Connected Nodes</span>
                <span className="text-locus-textLight font-bold">{clients.length} / {config.maxClients}</span>
            </div>
        </div>
      </CyberCard>

      {/* Node Grid */}
      <div className="md:col-span-2">
         <CyberCard title="Node Fleet Management">
            <NetworkControls onConnect={connectNode} />

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                {clients.map((client) => (
                    <div key={client.ip} className={`bg-locus-bg border p-2 transition-all relative rounded ${client.status === 'warning' ? 'border-locus-accent' : 'border-locus-border hover:border-locus-text'}`}>
                        <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${client.status === 'warning' ? 'bg-locus-accent animate-pulse' : client.latency > 50 ? 'bg-orange-500' : 'bg-locus-success'} `} />
                        <div className="text-[10px] font-bold mb-1 text-gray-500">ID</div>
                        <div className="text-xs text-locus-textLight font-mono">{client.ip}</div>
                        <div className="mt-2 text-[10px] flex justify-between text-gray-500">
                            <span>{client.status === 'warning' ? 'LINKING...' : `${client.latency.toFixed(1)}ms`}</span>
                            <span>{client.buffer}% BUF</span>
                        </div>
                    </div>
                ))}
                {clients.length === 0 && (
                     <div className="col-span-full py-8 text-center text-gray-600 text-xs italic">
                         No nodes connected. Use manual add or check network status.
                     </div>
                )}
            </div>
         </CyberCard>
      </div>
    </div>
  );
};
