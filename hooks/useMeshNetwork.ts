
import { useState, useEffect, useCallback, useRef } from 'react';
import { ClientNode, LogEntry, ServerConfig } from '../types';
import { NetworkService } from '../services/NetworkService';

export const useMeshNetwork = (config: ServerConfig, booted: boolean) => {
    const [clients, setClients] = useState<ClientNode[]>([]);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const networkServiceRef = useRef<Map<string, NetworkService>>(new Map());

    // Helper to add logs (exposed to UI)
    const addLog = useCallback((msg: string, type: 'info' | 'warn' | 'error' = 'info') => {
        setLogs(prev => {
            const newLogs = [...prev, { timestamp: new Date().toLocaleTimeString(), message: msg, type }];
            return newLogs.slice(-500);
        });
    }, []);

    const handleMeshMessage = useCallback((ip: string, data: any) => {
        if (data.type === 'HEARTBEAT') {
            setClients(prev => prev.map(c => {
                if (c.ip === ip) {
                    return {
                        ...c,
                        status: 'connected',
                        latency: data.payload.latency,
                        buffer: data.payload.buffer
                    };
                }
                return c;
            }));
        }
    }, []);

    // Manual Node Connection
    const connectNode = useCallback((ip: string) => {
        if (!ip) return;

        // --- HARDENING: IP VALIDATION ---
        const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        if (!ipRegex.test(ip)) {
            addLog(`Invalid IP Format: ${ip}`, 'error');
            return;
        }

        if (networkServiceRef.current.has(ip)) {
            addLog(`Already connected to ${ip}`, 'warn');
            return;
        }

        setClients(prev => {
            if (prev.find(c => c.ip === ip)) return prev;
            return [...prev, {
                ip,
                status: 'warning',
                latency: 0,
                buffer: 0
            }];
        });

        const service = new NetworkService(
            config,
            (data) => handleMeshMessage(ip, data),
            addLog
        );
        service.connect(ip);
        networkServiceRef.current.set(ip, service);

    }, [config, addLog, handleMeshMessage]);

    // Initial Boot Log
    useEffect(() => {
        if (booted) {
            addLog('Locus Control Link Layer initialized.', 'info');
            addLog(`Listening for Mesh Handshakes on ${config.ip}:${config.port}...`, 'info');
        }
    }, [booted, addLog, config.ip, config.port]);

    // Cleanup
    useEffect(() => {
        return () => {
            networkServiceRef.current.forEach(service => service.disconnect());
            networkServiceRef.current.clear();
        };
    }, []);

    return { clients, logs, setLogs, addLog, connectNode };
};
