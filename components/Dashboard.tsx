import React, { useState, memo } from 'react';
import { CyberCard, CyberInput, CyberButton } from './ui/CyberControls';
import { useNetwork } from '../contexts/NetworkContext';

// Memoized Controls
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

// Lightweight CSS Bar
const LatencyBar = memo(({ latency, ip }: { latency: number, ip: string }) => {
    // Clamp height 0-100% based on 0-200ms range
    const scale = Math.min(1.0, Math.max(0.05, latency / 200));
    const color = latency < 20 ? '#10b981' : latency < 100 ? '#f59e0b' : '#ef4444';
    
    return (
        <div className="flex-1 flex flex-col items-center justify-end group min-w-[10px] gap-1 h-full">
            <div className="w-full relative flex items-end h-full bg-[#161920] rounded-sm overflow-hidden">
                 <div 
                    style={{ transform: `scaleY(${scale})`, backgroundColor: color }} 
                    className="w-full h-full origin-bottom transition-transform duration-300 ease-out opacity-80 group-hover:opacity-100 will-change-transform"
                 />
            </div>
             <div className="text-[8px] text-gray-600 font-mono -rotate-90 origin-center truncate w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-8">
                {ip.split('.').pop()}
            </div>
        </div>
    );
});

export const Dashboard: React.FC = memo(() => {
  const { clients, config, connectNode } = useNetwork();
  
  const avgLatency = clients.length > 0 ? Math.round(clients.reduce((a, b) => a + b.latency, 0) / clients.length) : 0;
  
  // Health is strictly latency based
  const systemHealth = clients.length === 0 ? 100 : Math.max(0, 100 - (avgLatency / 2));
  const healthColor = systemHealth > 90 ? 'text-locus-success' : systemHealth > 70 ? 'text-locus-accent' : 'text-locus-error';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full overflow-y-auto custom-scrollbar p-1">
      
      {/* Stats Card - Native Visualization */}
      <CyberCard title="Network Telemetry">
        <div className="h-40 w-full min-h-[160px] relative bg-[#0f1115] border border-locus-border rounded p-2 flex items-end gap-1">
            {clients.length > 0 ? (
                clients.map(client => (
                    <LatencyBar key={client.ip} latency={client.latency} ip={client.ip} />
                ))
            ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-xs font-mono">
                    AWAITING TELEMETRY...
                </div>
            )}
             {/* Grid Lines */}
             <div className="absolute inset-0 pointer-events-none opacity-10 flex flex-col justify-between p-2">
                 <div className="border-t border-gray-400 w-full"></div>
                 <div className="border-t border-gray-400 w-full"></div>
                 <div className="border-t border-gray-400 w-full"></div>
                 <div className="border-t border-gray-400 w-full"></div>
             </div>
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
});