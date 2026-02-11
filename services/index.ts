// Core Services
export { AIAdapter, aiLayer } from './AIAdapter';
export type { VisionResult, AIProviderStatus } from './AIAdapter';
export { AudioEngine } from './AudioEngine';
export { permissionManager } from './PermissionManager';
export type { PermissionType, PermissionStatus } from './PermissionManager';
export { runSystemDiagnostics } from './diagnosticEngine';
export type { DiagnosticResult } from './diagnosticEngine';

// New Production Services
export { 
    WebSocketService, 
    getWebSocketService, 
    resetWebSocketService
} from './WebSocketService';
export type { WSMessage, ConnectionState } from './WebSocketService';

export { 
    NetworkDiscoveryService, 
    getDiscoveryService, 
    resetDiscoveryService
} from './NetworkDiscoveryService';
export type { DiscoveryEvent } from './NetworkDiscoveryService';

export { 
    StorageService, 
    getStorageService
} from './StorageService';
export type { StorageData, AppSettings, StorageError } from './StorageService';

// DJ Controller Service
export {
    DJControllerService,
    getDJControllerService,
    resetDJControllerService
} from './DJControllerService';
export type { MIDIControlMapping, ControllerProfile } from './DJControllerService';
