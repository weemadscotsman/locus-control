import React, { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import { LogEntry, AIConfig } from '../types';
import { runSystemDiagnostics } from '../services/diagnosticEngine';
import { usePerformance, useMetrics } from '../contexts/PerformanceContext';
import { useAudioSystem } from '../contexts/AudioContext';
import { useNetwork } from '../contexts/NetworkContext';
import { CyberButton } from './ui/CyberControls';

interface TerminalProps {
  aiConfig: AIConfig;
}

export const SystemTerminal: React.FC<TerminalProps> = ({ aiConfig }) => {
  const { logs, setLogs, config, clients } = useNetwork();
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'ERROR' | 'INFO'>('ALL');
  
  // Context Hooks
  const { metrics } = useMetrics(); 
  const { masterVolume, sources } = useAudioSystem();

  const prevSourcesLenRef = useRef(sources.length);

  // Auto-scroll logic
  useLayoutEffect(() => {
    if (scrollRef.current && autoScroll) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // --- LIVE TELEMETRY INJECTION ---
  useEffect(() => {
      if (sources.length !== prevSourcesLenRef.current) {
           setLogs(prev => [...prev.slice(-99), { 
              timestamp: new Date().toLocaleTimeString(), 
              message: `[AUDIO] Input Configuration Changed: ${sources.length} Active Channels`, 
              type: 'info' 
          }]);
          prevSourcesLenRef.current = sources.length;
      }
  }, [sources.length, setLogs]);

  const handleRunDiagnostics = () => {
    setLogs(prev => [...prev.slice(-90), { timestamp: new Date().toLocaleTimeString(), message: `Running System Diagnostics...`, type: 'info' }]);
    const result = runSystemDiagnostics(config, clients);
    result.checks.forEach((check) => {
        setLogs(prev => [...prev.slice(-99), { timestamp: new Date().toLocaleTimeString(), message: check, type: 'info' }]);
    });
  };

  const exportLogs = () => {
      const text = logs.map(l => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message}`).join('\n');
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `locus_log_${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
  };

  const clearLogs = () => setLogs([]);

  // Memoize and slice to prevent DOM explosion
  const visibleLogs = useMemo(() => {
      let filtered = logs;
      if (filter !== 'ALL') {
          filtered = logs.filter(log => {
            if (filter === 'ERROR') return log.type === 'error' || log.type === 'warn';
            if (filter === 'INFO') return log.type === 'info';
            return true;
          });
      }
      return filtered.slice(-100); // Only render last 100 lines
  }, [logs, filter]);

  return (
    <div className="flex flex-col h-full bg-[#161920] font-mono text-xs border border-locus-border rounded overflow-hidden">
      {/* Header / Controls */}
      <div className="p-2 border-b border-locus-border flex flex-wrap gap-2 justify-between items-center bg-[#0f1115]">
        <div className="flex items-center gap-2 text-gray-500 font-bold">
            SYSTEM EVENTS
        </div>
        
        <div className="flex gap-2">
            {['ALL', 'INFO', 'ERROR'].map(f => (
                <button 
                    key={f}
                    onClick={() => setFilter(f as any)}
                    className={`px-2 py-1 text-[10px] border transition-all rounded ${filter === f ? 'bg-locus-border text-white border-gray-500' : 'bg-transparent text-gray-500 border-transparent hover:text-white'}`}
                >
                    {f}
                </button>
            ))}
            <button onClick={clearLogs} className="text-[10px] text-locus-error hover:text-white uppercase px-2 font-bold">Clear</button>
        </div>
      </div>
      
      {/* Log View */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-1 scroll-smooth bg-[#0f1115] custom-scrollbar"
      >
        {visibleLogs.map((log, idx) => (
          <div key={idx} className={`flex gap-3 font-mono leading-tight py-0.5 border-b border-white/5 ${
            log.type === 'error' ? 'text-locus-error' : 
            log.type === 'warn' ? 'text-locus-accent' : 
            'text-locus-text'
          }`}>
            <span className="opacity-40 min-w-[65px] select-none text-[10px]">{log.timestamp}</span>
            <span className="break-all whitespace-pre-wrap">{log.message}</span>
          </div>
        ))}
        <div className="h-4" /> {/* Spacer */}
      </div>

      {/* Action Bar */}
      <div className="p-2 border-t border-locus-border bg-[#161920] grid grid-cols-2 gap-2">
        <CyberButton size="xs" onClick={handleRunDiagnostics}>
             DIAGNOSTICS
        </CyberButton>
        <CyberButton size="xs" variant="outline" onClick={exportLogs}>
             EXPORT LOG
        </CyberButton>
      </div>
    </div>
  );
};
