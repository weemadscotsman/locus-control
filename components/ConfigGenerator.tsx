import React, { useState } from 'react';
import { AIConfig } from '../types';
import { CyberCard, CyberSelect, CyberInput, CyberRange, CyberButton } from './ui/CyberControls';
import { useNetwork } from '../contexts/NetworkContext';

interface ConfigProps {
  aiConfig: AIConfig;
  setAiConfig: (config: AIConfig) => void;
}

const generateInstaller = (conf: any) => `
import os
import sys
import platform

# EchoHouse Auto-Installer [UDP Multicast + Latency Stepper]

PROJECT_NAME = "EchoHouse_Node"
SERVER_FILE = "server.py"
CLIENT_FILE = "client.py"

def create_file(name, content):
    with open(name, "w") as f:
        f.write(content.strip())
    print(f"[+] Created {name}")

SERVER_CODE = r'''
import socket
import time
import struct
import sys

try:
    import pyaudio
except ImportError:
    print("❌ Error: 'pyaudio' module not found. Run: pip install pyaudio")
    sys.exit(1)

MCAST_GRP = '224.1.1.1'
MCAST_PORT = ${conf.port}
TTL = 2

CHUNK = ${conf.chunk}
RATE = ${conf.rate}
CHANNELS = ${conf.channels}
FORMAT = pyaudio.paInt16

def main():
    p = pyaudio.PyAudio()
    try:
        stream = p.open(format=FORMAT, channels=CHANNELS, rate=RATE, input=True, frames_per_buffer=CHUNK)
    except Exception as e:
        print(f"❌ Audio Init Failed: {e}")
        return

    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
    sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, TTL)

    print(f"📡 EchoHouse Server Broadcasting on {MCAST_GRP}:{MCAST_PORT}")
    print(f"⚡ {RATE}Hz | {CHANNELS}CH | {CHUNK} Buffer")
    
    seq = 0
    try:
        while True:
            data = stream.read(CHUNK, exception_on_overflow=False)
            # Proto V3: Timestamp (8b) + Seq (4b) + Data
            header = struct.pack('!dI', time.time(), seq)
            sock.sendto(header + data, (MCAST_GRP, MCAST_PORT))
            seq += 1
    except KeyboardInterrupt:
        print("\nStopping...")
        stream.stop_stream()
        stream.close()
        p.terminate()

if __name__ == "__main__":
    main()
'''

CLIENT_CODE = r'''
import socket
import struct
import time
import threading
import sys
import queue

# --- LATENCY STEPPER CONFIG ---
TARGET_DELAY = ${conf.delay} / 1000.0  # seconds
STEP_SIZE = 0.010 # 10ms steps

try:
    import pyaudio
except ImportError:
    print("❌ Error: 'pyaudio' not found.")
    sys.exit(1)

MCAST_GRP = '224.1.1.1'
MCAST_PORT = ${conf.port}

CHUNK = ${conf.chunk}
RATE = ${conf.rate}
CHANNELS = ${conf.channels}
FORMAT = pyaudio.paInt16

audio_q = queue.PriorityQueue()
running = True

def rx_thread():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        sock.bind(('', MCAST_PORT))
        mreq = struct.pack("4sl", socket.inet_aton(MCAST_GRP), socket.INADDR_ANY)
        sock.setsockopt(socket.IPPROTO_IP, socket.IP_ADD_MEMBERSHIP, mreq)
    except Exception as e:
        print(f"❌ Network Error: {e}")
        return

    while running:
        try:
            data, _ = sock.recvfrom(65536)
            ts, seq = struct.unpack('!dI', data[:12])
            payload = data[12:]
            audio_q.put((ts, payload))
        except:
            pass

def tx_thread(stream):
    global TARGET_DELAY
    while running:
        if audio_q.empty():
            time.sleep(0.001)
            continue
            
        ts, payload = audio_q.get()
        play_time = ts + TARGET_DELAY
        now = time.time()
        
        if now < play_time:
            wait = play_time - now
            if wait > 0: time.sleep(wait)
        elif now > play_time + 0.5:
            continue # Too late, drop
            
        stream.write(payload)

def main():
    global TARGET_DELAY, running
    
    p = pyaudio.PyAudio()
    stream = p.open(format=FORMAT, channels=CHANNELS, rate=RATE, output=True, frames_per_buffer=CHUNK)
    
    t1 = threading.Thread(target=rx_thread, daemon=True)
    t2 = threading.Thread(target=tx_thread, args=(stream,), daemon=True)
    t1.start()
    t2.start()
    
    print(f"🎧 Client Active | Latency: {TARGET_DELAY*1000:.0f}ms")
    print("CONTROLS: [+] Increase Latency | [-] Decrease Latency | [Q] Quit")
    
    try:
        while running:
            cmd = input().strip().lower()
            if cmd == '+':
                TARGET_DELAY += STEP_SIZE
                print(f"⏱  Latency: {TARGET_DELAY*1000:.0f}ms")
            elif cmd == '-':
                TARGET_DELAY = max(0, TARGET_DELAY - STEP_SIZE)
                print(f"⏱  Latency: {TARGET_DELAY*1000:.0f}ms")
            elif cmd == 'q':
                running = False
    except KeyboardInterrupt:
        running = False
        
    stream.stop_stream()
    stream.close()
    p.terminate()

if __name__ == "__main__":
    main()
'''

def main():
    if not os.path.exists(PROJECT_NAME):
        os.makedirs(PROJECT_NAME)
    os.chdir(PROJECT_NAME)
    create_file(SERVER_FILE, SERVER_CODE)
    create_file(CLIENT_FILE, CLIENT_CODE)
    print(f"✅ Generated in {PROJECT_NAME}/")
    print("Run: python server.py (Sender) or python client.py (Receiver)")

if __name__ == "__main__":
    main()
`;

export const ConfigGenerator: React.FC<ConfigProps> = ({ aiConfig, setAiConfig }) => {
    const { config, setConfig } = useNetwork();

    const download = () => {
        const text = generateInstaller(config);
        const blob = new Blob([text], {type: 'text/x-python'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'install_echohouse.py';
        a.click();
    };

    return (
        <div className="h-full flex flex-col gap-4 overflow-y-auto p-1 custom-scrollbar">
            <CyberCard title="Network Protocol Config (UDP Multicast)">
                <div className="grid grid-cols-2 gap-4">
                    <CyberInput label="Multicast IP" value="224.1.1.1" disabled />
                    <CyberInput label="Port" value={config.port} onChange={e => setConfig({...config, port: parseInt(e.target.value)})} type="number" />
                    <CyberSelect 
                        label="Sample Rate" 
                        value={config.rate} 
                        options={[{value: 44100, label: '44100Hz'}, {value: 48000, label: '48000Hz'}]}
                        onChange={v => setConfig({...config, rate: v})}
                    />
                    <CyberSelect 
                        label="Chunk Size" 
                        value={config.chunk} 
                        options={[{value: 512, label: '512 (Low Latency)'}, {value: 1024, label: '1024 (Stable)'}, {value: 2048, label: '2048 (WiFi)'}]}
                        onChange={v => setConfig({...config, chunk: v})}
                    />
                </div>
                <div className="mt-4">
                    <CyberRange 
                        label="Base Latency Target (Client)"
                        value={config.delay}
                        min={0} max={2000} step={10} unit="ms"
                        onChange={v => setConfig({...config, delay: v})}
                    />
                    <p className="text-[10px] text-gray-500 mt-1">* Clients can adjust this locally using +/- keys.</p>
                </div>
            </CyberCard>

            <CyberCard title="Deployment">
                <div className="flex justify-between items-center bg-cyan-900/10 p-4 border border-cyan-500/20">
                    <div className="text-xs text-yellow-500">
                        GENERATE PYTHON INSTALLER
                        <div className="text-[10px] text-gray-500">Contains server.py & client.py with Latency Stepper.</div>
                    </div>
                    <CyberButton onClick={download}>DOWNLOAD .PY</CyberButton>
                </div>
            </CyberCard>
        </div>
    );
};