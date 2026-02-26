
import { ClientNode, LogEntry, ServerConfig } from '../types';

export class NetworkService {
    private socket: WebSocket | null = null;
    private config: ServerConfig;
    private onMessageCallback: (data: any) => void;
    private onLogCallback: (msg: string, type: 'info' | 'warn' | 'error') => void;

    constructor(
        config: ServerConfig,
        onMessage: (data: any) => void,
        onLog: (msg: string, type: 'info' | 'warn' | 'error') => void
    ) {
        this.config = config;
        this.onMessageCallback = onMessage;
        this.onLogCallback = onLog;
    }

    public connect(ip: string) {
        // In a "hardened" system, we don't just mock a connection.
        // We attempt to establish a real link. 
        // Note: Browsers cannot do raw UDP/Multicast, so we assume a WebSocket bridge exists.
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${ip}:${this.config.port}/mesh`;

        this.onLogCallback(`Attempting connection to ${ip}...`, 'info');

        try {
            this.socket = new WebSocket(wsUrl);

            this.socket.onopen = () => {
                this.onLogCallback(`Link Established: Node ${ip} online.`, 'info');
                // Send initial handshake
                this.socket?.send(JSON.stringify({
                    type: 'HANDSHAKE',
                    payload: { client: 'LOCUS-CONTROL-V1', timestamp: Date.now() }
                }));
            };

            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.onMessageCallback(data);
                } catch (e) {
                    console.error("Failed to parse mesh message", e);
                }
            };

            this.socket.onerror = (error) => {
                this.onLogCallback(`Connection error on ${ip}`, 'error');
                console.error(`WebSocket Error [${ip}]:`, error);
            };

            this.socket.onclose = () => {
                this.onLogCallback(`Node ${ip} disconnected from mesh.`, 'warn');
            };

        } catch (e: any) {
            this.onLogCallback(`Failed to initiate connect to ${ip}: ${e.message}`, 'error');
        }
    }

    public disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }

    public send(data: any) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(data));
        }
    }
}
