
import { ServerConfig, ClientNode } from '../types';

export interface DiagnosticResult {
    status: 'NOMINAL' | 'WARNING' | 'CRITICAL';
    checks: string[];
    recommendation: string;
}

/**
 * Pure logic diagnostic suite.
 * Runs in < 1ms on any hardware. Zero network overhead.
 */
export const runSystemDiagnostics = (
    config: ServerConfig,
    clients: ClientNode[]
): DiagnosticResult => {
    const checks: string[] = [];
    let errorScore = 0;

    // 1. CONFIGURATION INTEGRITY
    const bandwidth = (config.rate * config.channels * 16) / 8; // bytes per second
    const bandwidthMbps = (bandwidth / 1024 / 1024) * 8; // Mbps (approx)
    
    checks.push(`[NET_CALC] RAW AUDIO BANDWIDTH: ${bandwidthMbps.toFixed(2)} Mbps`);

    // Check Multicast IP validity
    const firstOctet = parseInt(config.ip.split('.')[0]);
    if (config.ip === '224.1.1.1') {
        checks.push(`[MCAST] GROUP OK: ${config.ip} (Local Scope)`);
    } else if (firstOctet >= 224 && firstOctet <= 239) {
        checks.push(`[MCAST] GROUP OK: ${config.ip}`);
    } else {
        checks.push(`[MCAST] WARNING: ${config.ip} is NOT a standard Multicast range (224.0.0.0/4). Latency may degrade.`);
        errorScore += 1;
    }

    // Check Chunk/Rate Ratio (CPU vs Latency)
    const packetDuration = (config.chunk / config.rate) * 1000;
    checks.push(`[TIMING] PACKET DURATION: ${packetDuration.toFixed(2)}ms`);
    
    if (packetDuration < 5) {
        checks.push(`[CPU] WARN: Very low packet duration (<5ms). Old CPUs may choke on interrupt load.`);
        errorScore += 1;
    } else if (packetDuration > 50) {
        checks.push(`[LATENCY] WARN: High packet duration (>50ms). Native latency floor is high.`);
    } else {
        checks.push(`[CPU] TIMING OPTIMAL.`);
    }

    // 2. NODE FLEET ANALYSIS
    if (clients.length === 0) {
        checks.push(`[NODES] NO CLIENTS DETECTED. BROADCASTING INTO VOID.`);
        return {
            status: 'WARNING',
            checks,
            recommendation: "Verify client.py is running on receiving devices."
        };
    }

    const avgLatency = clients.reduce((sum, c) => sum + c.latency, 0) / clients.length;
    const strugglingClients = clients.filter(c => c.buffer < 40);
    const highLatencyClients = clients.filter(c => c.latency > 100);

    checks.push(`[FLEET] NODES: ${clients.length} | AVG LATENCY: ${avgLatency.toFixed(1)}ms`);

    if (strugglingClients.length > 0) {
        checks.push(`[BUFFER] CRITICAL: ${strugglingClients.length} nodes experiencing underrun (<40%). Packet loss detected.`);
        strugglingClients.forEach(c => checks.push(`   > NODE ${c.ip}: ${c.buffer}% BUF`));
        errorScore += 2;
    }

    if (highLatencyClients.length > 0) {
        checks.push(`[SYNC] WARN: ${highLatencyClients.length} nodes desynchronized (>100ms offset).`);
        errorScore += 1;
    }

    // 3. LOGIC GATES
    if (errorScore >= 2) {
        return {
            status: 'CRITICAL',
            checks,
            recommendation: "NETWORK CONGESTION OR CPU STARVATION. REDUCE SAMPLE RATE (22050Hz) OR INCREASE CHUNK SIZE (2048)."
        };
    } else if (errorScore > 0) {
        return {
            status: 'WARNING',
            checks,
            recommendation: "SYSTEM OPERATIONAL WITH MINOR JITTER. CHECK WIFI SIGNAL STRENGTH."
        };
    }

    return {
        status: 'NOMINAL',
        checks,
        recommendation: "SYSTEM OPTIMAL. MAX HEADROOM AVAILABLE."
    };
};
