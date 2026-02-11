
export type PermissionType = 'microphone' | 'camera' | 'serial' | 'screen';
export type PermissionStatus = 'prompt' | 'granted' | 'denied' | 'error';

class PermissionManager {
    private static instance: PermissionManager;
    private statuses: Map<PermissionType, PermissionStatus> = new Map();

    private constructor() {
        this.statuses.set('microphone', 'prompt');
        this.statuses.set('camera', 'prompt');
        this.statuses.set('serial', 'prompt');
        this.statuses.set('screen', 'prompt');
    }

    public static getInstance(): PermissionManager {
        if (!PermissionManager.instance) {
            PermissionManager.instance = new PermissionManager();
        }
        return PermissionManager.instance;
    }

    public getStatus(type: PermissionType): PermissionStatus {
        return this.statuses.get(type) || 'prompt';
    }

    public async requestMicrophone(deviceId?: string): Promise<MediaStream> {
        try {
            const constraints: MediaStreamConstraints = {
                audio: deviceId ? { deviceId: { exact: deviceId } } : true
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.statuses.set('microphone', 'granted');
            return stream;
        } catch (error: any) {
            // SOFT FALLBACK: If specific device fails, try default input
            if (deviceId && (error.name === 'OverconstrainedError' || error.name === 'NotFoundError')) {
                console.warn('[PermissionManager] Target device failed, falling back to default input.');
                try {
                    const fallbackStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    this.statuses.set('microphone', 'granted');
                    return fallbackStream;
                } catch (fallbackErr) {
                    this.handleError('microphone', fallbackErr);
                    throw fallbackErr;
                }
            }

            console.error('[PermissionManager] Mic Error:', error);
            this.handleError('microphone', error);
            throw error;
        }
    }

    public async requestCamera(constraints?: MediaTrackConstraints): Promise<MediaStream> {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: constraints || true
            });
            this.statuses.set('camera', 'granted');
            return stream;
        } catch (error: any) {
            console.error('[PermissionManager] Camera Error:', error);
            this.handleError('camera', error);
            throw error;
        }
    }

    public async requestScreen(): Promise<MediaStream> {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true
            });
            this.statuses.set('screen', 'granted');
            return stream;
        } catch (error: any) {
            console.error('[PermissionManager] Screen Error:', error);
            // Screen share cancellation is common, treat as 'prompt' not 'denied' usually
            this.statuses.set('screen', 'prompt'); 
            throw error;
        }
    }

    public async requestSerial(baudRate: number): Promise<any> {
        if (!('serial' in navigator)) {
            const e = new Error('Web Serial API not supported');
            this.statuses.set('serial', 'error');
            throw e;
        }

        try {
            const port = await (navigator as any).serial.requestPort();
            await port.open({ baudRate });
            this.statuses.set('serial', 'granted');
            return port;
        } catch (error: any) {
            console.error('[PermissionManager] Serial Error:', error);
            this.handleError('serial', error);
            throw error;
        }
    }

    public async enumerateAudioDevices(): Promise<MediaDeviceInfo[]> {
        try {
            // Ensure we have permission first to get labels
            // If strictly needed, we could trigger a dummy getUserMedia here, 
            // but usually we rely on the app flow to request permission first.
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.filter(d => d.kind === 'audioinput');
        } catch (error) {
            console.warn('[PermissionManager] Enumerate Error:', error);
            return [];
        }
    }

    private handleError(type: PermissionType, error: any) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            this.statuses.set(type, 'denied');
        } else {
            this.statuses.set(type, 'error');
        }
    }
}

export const permissionManager = PermissionManager.getInstance();
