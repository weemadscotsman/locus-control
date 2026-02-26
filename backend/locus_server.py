
import asyncio
import json
import logging
import websockets
from datetime import datetime

# CONFIGURATION
WS_HOST = "0.0.0.0"
WS_PORT = 5005

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("LOCUS-SERVER")

class LocusServer:
    def __init__(self):
        self.clients = set()
        self.nodes = {} # {ip: {latency: X, buffer: Y}}

    async def register(self, websocket):
        self.clients.add(websocket)
        logger.info(f"New client connected: {websocket.remote_address}")
        try:
            async for message in websocket:
                data = json.loads(message)
                await self.handle_message(websocket, data)
        finally:
            self.clients.remove(websocket)
            logger.info(f"Client disconnected: {websocket.remote_address}")

    async def handle_message(self, websocket, data):
        msg_type = data.get("type")
        payload = data.get("payload", {})

        if msg_type == "HANDSHAKE":
            logger.info(f"Handshake received: {payload.get('client')}")
            # Send initial state
            await websocket.send(json.dumps({
                "type": "INIT_STATE",
                "payload": {"nodes": self.nodes}
            }))

    async def broadcast_heartbeats(self):
        """Simulate real-time telemetry updates from the mesh."""
        while True:
            await asyncio.sleep(1) # Frequency of updates
            if self.clients:
                for ip in list(self.nodes.keys()):
                    # Simulate small fluctuations in telemetry
                    import random
                    self.nodes[ip]['latency'] += random.uniform(-1, 1)
                    self.nodes[ip]['latency'] = max(1, min(200, self.nodes[ip]['latency']))
                    self.nodes[ip]['buffer'] = max(0, min(100, self.nodes[ip]['buffer'] + random.uniform(-2, 2)))

                    heartbeat = {
                        "type": "HEARTBEAT",
                        "payload": {
                            "ip": ip,
                            "latency": self.nodes[ip]['latency'],
                            "buffer": self.nodes[ip]['buffer']
                        }
                    }
                    message = json.dumps(heartbeat)
                    await asyncio.gather(*[client.send(message) for client in self.clients])

    def add_node_to_mesh(self, ip):
        self.nodes[ip] = {"latency": 10.0, "buffer": 100.0}
        logger.info(f"Node {ip} added to mesh.")

async def main():
    server = LocusServer()
    # Pre-populate some nodes for demo if needed, or wait for actual nodes to register
    server.add_node_to_mesh("192.168.1.101")
    server.add_node_to_mesh("192.168.1.105")

    async with websockets.serve(server.register, WS_HOST, WS_PORT):
        logger.info(f"Locus Control Hardened Backend running on ws://{WS_HOST}:{WS_PORT}")
        await server.broadcast_heartbeats()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
