import { ServerConfig, ClientNode, LogEntry } from '../types';

export interface WSMessage {
    type: 'heartbeat' | 'config' | 'command' | 'telemetry' | 'error' | 'discovery';
    payload: any;
    timestamp: number;
    nodeId?: string;
}

export interface ConnectionState {
    isConnected: boolean;
    isConnecting: boolean;
    lastPing: number;
    latency: number;
    reconnectAttempts: number;
}

/**
 * Production-grade WebSocket service for real-time node communication.
 * Replaces the simulated setTimeout mock with actual WebSocket connections.
 */
export class WebSocketService {
    private ws: WebSocket | null = null;
    private config: ServerConfig;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    private listeners: Map<string, Set<(data: any) => void>> = new Map();
    private state: ConnectionState = {
        isConnected: false,
        isConnecting: false,
        lastPing: 0,
        latency: 0,
        reconnectAttempts: 0
    };
    
    // Connection constants
    private readonly MAX_RECONNECT_ATTEMPTS = 10;
    private readonly RECONNECT_DELAY_BASE = 1000;
    private readonly HEARTBEAT_INTERVAL = 5000;
    private readonly CONNECTION_TIMEOUT = 10000;

    constructor(config: ServerConfig) {
        this.config = config;
    }

    // --- PUBLIC API ---

    connect(): Promise<void> {
        if (this.state.isConnected || this.state.isConnecting) {
            return Promise.resolve();
        }

        this.state.isConnecting = true;
        
        return new Promise((resolve, reject) => {
            try {
                // Use config to connect to the node server
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const wsUrl = `${protocol}//${this.config.ip}:${this.config.port}/ws`;
                
                this.ws = new WebSocket(wsUrl);
                
                const timeout = setTimeout(() => {
                    this.ws?.close();
                    this.state.isConnecting = false;
                    reject(new Error('Connection timeout'));
                }, this.CONNECTION_TIMEOUT);

                this.ws.onopen = () => {
                    clearTimeout(timeout);
                    this.state.isConnected = true;
                    this.state.isConnecting = false;
                    this.state.reconnectAttempts = 0;
                    this.startHeartbeat();
                    this.emit('connected', { timestamp: Date.now() });
                    resolve();
                };

                this.ws.onmessage = (event) => this.handleMessage(event);
                
                this.ws.onclose = (event) => {
                    clearTimeout(timeout);
                    this.handleDisconnect(event);
                };
                
                this.ws.onerror = (error) => {
                    clearTimeout(timeout);
                    this.state.isConnecting = false;
                    this.emit('error', { type: 'connection', error });
                    reject(error);
                };

            } catch (error) {
                this.state.isConnecting = false;
                reject(error);
            }
        });
    }

    disconnect(): void {
        this.stopHeartbeat();
        this.clearReconnectTimer();
        
        if (this.ws) {
            this.ws.close(1000, 'Client disconnect');
            this.ws = null;
        }
        
        this.state.isConnected = false;
        this.state.isConnecting = false;
        this.emit('disconnected', {});
    }

    send(message: WSMessage): boolean {
        if (!this.state.isConnected || !this.ws) {
            console.warn('[WebSocket] Cannot send: not connected');
            return false;
        }

        try {
            this.ws.send(JSON.stringify(message));
            return true;
        } catch (error) {
            console.error('[WebSocket] Send failed:', error);
            this.emit('error', { type: 'send', error });
            return false;
        }
    }

    broadcastCommand(command: string, params: any = {}): void {
        this.send({
            type: 'command',
            payload: { command, params },
            timestamp: Date.now()
        });
    }

    updateConfig(config: Partial<ServerConfig>): void {
        this.config = { ...this.config, ...config };
        this.send({
            type: 'config',
            payload: config,
            timestamp: Date.now()
        });
    }

    on(event: string, callback: (data: any) => void): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);
        
        // Return unsubscribe function
        return () => {
            this.listeners.get(event)?.delete(callback);
        };
    }

    getState(): ConnectionState {
        return { ...this.state };
    }

    isConnected(): boolean {
        return this.state.isConnected;
    }

    // --- PRIVATE METHODS ---

    private handleMessage(event: MessageEvent): void {
        try {
            const message: WSMessage = JSON.parse(event.data);
            
            // Update latency on heartbeat response
            if (message.type === 'heartbeat') {
                this.state.latency = Date.now() - message.timestamp;
                this.state.lastPing = Date.now();
            }
            
            this.emit(message.type, message.payload);
            this.emit('message', message);
        } catch (error) {
            console.error('[WebSocket] Message parse error:', error);
            this.emit('error', { type: 'parse', error, raw: event.data });
        }
    }

    private handleDisconnect(event: CloseEvent): void {
        const wasConnected = this.state.isConnected;
        this.state.isConnected = false;
        this.state.isConnecting = false;
        
        this.stopHeartbeat();
        this.emit('disconnected', { code: event.code, reason: event.reason });

        // Attempt reconnect if not intentionally closed
        if (wasConnected && event.code !== 1000 && event.code !== 1001) {
            this.scheduleReconnect();
        }
    }

    private scheduleReconnect(): void {
        if (this.state.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
            this.emit('error', { 
                type: 'reconnect', 
                message: 'Max reconnection attempts reached' 
            });
            return;
        }

        this.state.reconnectAttempts++;
        const delay = this.RECONNECT_DELAY_BASE * Math.pow(2, this.state.reconnectAttempts - 1);
        
        this.emit('reconnecting', { 
            attempt: this.state.reconnectAttempts, 
            maxAttempts: this.MAX_RECONNECT_ATTEMPTS,
            delay 
        });

        this.reconnectTimer = setTimeout(() => {
            this.connect().catch(() => {
                // Error handled in connect()
            });
        }, Math.min(delay, 30000)); // Cap at 30 seconds
    }

    private clearReconnectTimer(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    private startHeartbeat(): void {
        this.heartbeatTimer = setInterval(() => {
            if (this.state.isConnected) {
                this.send({
                    type: 'heartbeat',
                    payload: { ping: true },
                    timestamp: Date.now()
                });
                
                // Check for stale connection
                if (this.state.lastPing > 0 && Date.now() - this.state.lastPing > this.HEARTBEAT_INTERVAL * 3) {
                    console.warn('[WebSocket] Connection stale, forcing reconnect');
                    this.ws?.close(3000, 'Stale connection');
                }
            }
        }, this.HEARTBEAT_INTERVAL);
    }

    private stopHeartbeat(): void {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    private emit(event: string, data: any): void {
        this.listeners.get(event)?.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`[WebSocket] Error in ${event} listener:`, error);
            }
        });
    }
}

// Singleton instance
let wsService: WebSocketService | null = null;

export const getWebSocketService = (config?: ServerConfig): WebSocketService => {
    if (!wsService && config) {
        wsService = new WebSocketService(config);
    }
    return wsService!;
};

export const resetWebSocketService = (): void => {
    wsService?.disconnect();
    wsService = null;
};
