import { useState, useEffect, useCallback, useRef } from 'react';
import { ClientNode, LogEntry, ServerConfig } from '../types';
import { getDiscoveryService, DiscoveryEvent } from '../services/NetworkDiscoveryService';
import { getWebSocketService } from '../services/WebSocketService';

export interface UseMeshNetworkReturn {
    clients: ClientNode[];
    logs: LogEntry[];
    setLogs: React.Dispatch<React.SetStateAction<LogEntry[]>>;
    addLog: (msg: string, type?: 'info' | 'warn' | 'error') => void;
    connectNode: (ip: string) => Promise<void>;
    disconnectNode: (ip: string) => void;
    isDiscovering: boolean;
    connectionState: 'disconnected' | 'connecting' | 'connected' | 'error';
}

/**
 * Production-ready mesh network hook using real WebSocket and discovery services.
 * Replaces the setTimeout mock with actual network communication.
 */
export const useMeshNetwork = (config: ServerConfig, booted: boolean): UseMeshNetworkReturn => {
    const [clients, setClients] = useState<ClientNode[]>([]);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isDiscovering, setIsDiscovering] = useState(false);
    const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
    
    const discoveryRef = useRef(getDiscoveryService(config));
    const wsRef = useRef(getWebSocketService(config));
    const unsubscribers = useRef<(() => void)[]>([]);

    // Helper to add logs
    const addLog = useCallback((msg: string, type: 'info' | 'warn' | 'error' = 'info') => {
        setLogs(prev => {
            const newLogs = [...prev, { 
                timestamp: new Date().toLocaleTimeString(), 
                message: msg, 
                type 
            }];
            return newLogs.slice(-500); // Keep last 500 logs
        });
    }, []);

    // Initialize services on boot
    useEffect(() => {
        if (!booted) return;

        const discovery = discoveryRef.current;
        const ws = wsRef.current;

        // Subscribe to discovery events
        const unsubDiscovery = discovery.on((event: DiscoveryEvent) => {
            switch (event.type) {
                case 'discovered':
                    if (event.node) {
                        setClients(prev => {
                            if (prev.find(c => c.ip === event.node!.ip)) return prev;
                            return [...prev, event.node!];
                        });
                        addLog(`Node discovered: ${event.node.ip}`, 'info');
                    }
                    break;
                    
                case 'lost':
                    if (event.node) {
                        setClients(prev => prev.filter(c => c.ip !== event.node!.ip));
                        addLog(`Node lost: ${event.node.ip}`, 'warn');
                    }
                    break;
                    
                case 'updated':
                    if (event.node) {
                        setClients(prev => prev.map(c => 
                            c.ip === event.node!.ip ? event.node! : c
                        ));
                    }
                    if (event.nodes) {
                        setClients(event.nodes);
                    }
                    break;
                    
                case 'error':
                    addLog(`Discovery error: ${event.error}`, 'error');
                    break;
            }
        });

        // Subscribe to WebSocket events
        const unsubWSConnected = ws.on('connected', () => {
            setConnectionState('connected');
            addLog('WebSocket connected', 'info');
        });

        const unsubWSDisconnected = ws.on('disconnected', () => {
            setConnectionState('disconnected');
            addLog('WebSocket disconnected', 'warn');
        });

        const unsubWSReconnecting = ws.on('reconnecting', (data: any) => {
            setConnectionState('connecting');
            addLog(`Reconnecting... Attempt ${data.attempt}/${data.maxAttempts}`, 'warn');
        });

        const unsubWSError = ws.on('error', (data: any) => {
            setConnectionState('error');
            addLog(`Connection error: ${data.message || data.type}`, 'error');
        });

        const unsubWSMessage = ws.on('message', (msg: any) => {
            // Handle incoming messages from nodes
            if (msg.type === 'telemetry' && msg.nodeId) {
                setClients(prev => prev.map(c => {
                    if (c.ip === msg.nodeId) {
                        return {
                            ...c,
                            latency: msg.payload.latency || c.latency,
                            buffer: msg.payload.buffer ?? c.buffer,
                            status: msg.payload.status || c.status
                        };
                    }
                    return c;
                }));
            }
        });

        // Store unsubscribers
        unsubscribers.current = [
            unsubDiscovery,
            unsubWSConnected,
            unsubWSDisconnected,
            unsubWSReconnecting,
            unsubWSError,
            unsubWSMessage
        ];

        // Start discovery
        setIsDiscovering(true);
        discovery.start();
        
        // Connect WebSocket
        setConnectionState('connecting');
        ws.connect().catch((err: Error) => {
            addLog(`Failed to connect: ${err.message}`, 'error');
            setConnectionState('error');
        });

        // Initial boot logs
        addLog('EchoHouse Control Link Layer initialized.', 'info');
        addLog(`Listening for nodes on multicast group ${config.ip}:${config.port}...`, 'info');

        return () => {
            // Cleanup
            unsubscribers.current.forEach(unsub => unsub());
            discovery.stop();
            ws.disconnect();
        };
    }, [booted, config, addLog]);

    // Manual Node Connection
    const connectNode = useCallback(async (ip: string) => {
        if (!ip) return;
        
        addLog(`Initiating EchoHouse Handshake: ${ip}...`, 'info');
        
        try {
            const node = await discoveryRef.current.addNode(ip);
            if (node) {
                addLog(`Link Established: Node ${ip} online. Latency: ${node.latency}ms`, 'info');
            } else {
                addLog(`Failed to connect to ${ip}`, 'error');
            }
        } catch (error: any) {
            addLog(`Connection failed: ${error.message}`, 'error');
        }
    }, [addLog]);

    // Disconnect a node
    const disconnectNode = useCallback((ip: string) => {
        discoveryRef.current.removeNode(ip);
        setClients(prev => prev.filter(c => c.ip !== ip));
        addLog(`Node ${ip} disconnected`, 'info');
    }, [addLog]);

    return { 
        clients, 
        logs, 
        setLogs, 
        addLog, 
        connectNode,
        disconnectNode,
        isDiscovering,
        connectionState
    };
};
