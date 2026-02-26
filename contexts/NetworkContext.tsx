import React, { createContext, useContext, useState, useEffect } from 'react';
import { ClientNode, LogEntry, ServerConfig } from '../types';
import { useMeshNetwork } from '../hooks/useMeshNetwork';

interface NetworkContextType {
    clients: ClientNode[];
    logs: LogEntry[];
    setLogs: React.Dispatch<React.SetStateAction<LogEntry[]>>;
    config: ServerConfig;
    setConfig: (c: ServerConfig) => void;
    connectNode: (ip: string) => void;
    addLog: (msg: string, type: 'info' | 'warn' | 'error') => void;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const useNetwork = () => {
    const context = useContext(NetworkContext);
    if (!context) throw new Error("useNetwork must be used within NetworkProvider");
    return context;
};

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Default Config
    const [config, setConfig] = useState<ServerConfig>({
        ip: '224.1.1.1', 
        port: 5005, 
        rate: 44100, 
        channels: 2, 
        chunk: 1024, 
        delay: 0, 
        maxClients: 50
    });

    // Use the hook with the current config
    const { clients, logs, setLogs, addLog, connectNode } = useMeshNetwork(config, true);

    return (
        <NetworkContext.Provider value={{
            clients,
            logs,
            setLogs,
            config,
            setConfig,
            connectNode,
            addLog
        }}>
            {children}
        </NetworkContext.Provider>
    );
};