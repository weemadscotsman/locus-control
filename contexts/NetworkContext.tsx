import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ClientNode, LogEntry, ServerConfig } from '../types';
import { useMeshNetwork } from '../hooks/useMeshNetwork';
import { getStorageService } from '../services/StorageService';

interface NetworkContextType {
    clients: ClientNode[];
    logs: LogEntry[];
    setLogs: React.Dispatch<React.SetStateAction<LogEntry[]>>;
    config: ServerConfig;
    setConfig: (c: ServerConfig) => void;
    connectNode: (ip: string) => Promise<void>;
    disconnectNode: (ip: string) => void;
    addLog: (msg: string, type: 'info' | 'warn' | 'error') => void;
    isDiscovering: boolean;
    connectionState: 'disconnected' | 'connecting' | 'connected' | 'error';
    saveConfig: () => Promise<void>;
    loadConfig: () => Promise<void>;
    resetConfig: () => void;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

const DEFAULT_CONFIG: ServerConfig = {
    ip: '224.1.1.1', 
    port: 5005, 
    rate: 44100, 
    channels: 2, 
    chunk: 1024, 
    delay: 0, 
    maxClients: 50
};

export const useNetwork = () => {
    const context = useContext(NetworkContext);
    if (!context) throw new Error("useNetwork must be used within NetworkProvider");
    return context;
};

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Default Config with persistence
    const [config, setConfigState] = useState<ServerConfig>(DEFAULT_CONFIG);
    const [isConfigLoaded, setIsConfigLoaded] = useState(false);

    // Load saved config on mount
    useEffect(() => {
        const loadSavedConfig = async () => {
            try {
                const storage = getStorageService();
                const data = await storage.load();
                if (data.config) {
                    // Merge with defaults to ensure all fields exist
                    setConfigState(prev => ({ ...DEFAULT_CONFIG, ...data.config }));
                }
            } catch (error) {
                console.error('Failed to load network config:', error);
            } finally {
                setIsConfigLoaded(true);
            }
        };
        
        loadSavedConfig();
    }, []);

    // Save config when it changes
    const saveConfig = useCallback(async () => {
        try {
            const storage = getStorageService();
            const data = await storage.load();
            await storage.save({ ...data, networkConfig: config });
        } catch (error) {
            console.error('Failed to save network config:', error);
        }
    }, [config]);

    const loadConfig = useCallback(async () => {
        try {
            const storage = getStorageService();
            const data = await storage.load();
            if (data.networkConfig && typeof data.networkConfig === 'object') {
                const savedConfig = data.networkConfig as Partial<ServerConfig>;
                setConfigState({ ...DEFAULT_CONFIG, ...savedConfig });
            }
        } catch (error) {
            console.error('Failed to load network config:', error);
        }
    }, []);

    const resetConfig = useCallback(() => {
        setConfigState(DEFAULT_CONFIG);
    }, []);

    // Enhanced config setter with auto-save
    const setConfig = useCallback((newConfig: ServerConfig | ((prev: ServerConfig) => ServerConfig)) => {
        setConfigState(prev => {
            const updated = typeof newConfig === 'function' ? newConfig(prev) : newConfig;
            // Debounced save
            setTimeout(() => {
                getStorageService().load().then(data => {
                    getStorageService().save({ ...data, networkConfig: updated });
                });
            }, 500);
            return updated;
        });
    }, []);

    // Use the enhanced mesh network hook
    const { 
        clients, 
        logs, 
        setLogs, 
        addLog, 
        connectNode,
        disconnectNode,
        isDiscovering,
        connectionState
    } = useMeshNetwork(config, isConfigLoaded);

    return (
        <NetworkContext.Provider value={{
            clients,
            logs,
            setLogs,
            config,
            setConfig,
            connectNode,
            disconnectNode,
            addLog,
            isDiscovering,
            connectionState,
            saveConfig,
            loadConfig,
            resetConfig
        }}>
            {children}
        </NetworkContext.Provider>
    );
};
