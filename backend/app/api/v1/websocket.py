from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
import json
import logging

logger = logging.getLogger("attack_path_compiler.websocket")

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        # Maps scenario_id -> list of active WebSockets
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, scenario_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.setdefault(scenario_id, []).append(websocket)
        logger.info(f"WebSocket connected for scenario {scenario_id}")

    def disconnect(self, scenario_id: str, websocket: WebSocket):
        if scenario_id in self.active_connections:
            if websocket in self.active_connections[scenario_id]:
                self.active_connections[scenario_id].remove(websocket)
            if not self.active_connections[scenario_id]:
                del self.active_connections[scenario_id]

    async def broadcast(self, scenario_id: str, message: dict):
        if scenario_id in self.active_connections:
            serialized = json.dumps(message, default=str)
            dead_connections = []
            for connection in self.active_connections[scenario_id]:
                try:
                    await connection.send_text(serialized)
                except Exception:
                    dead_connections.append(connection)
            for dead in dead_connections:
                self.disconnect(scenario_id, dead)

manager = ConnectionManager()

async def broadcast_update(scenario_id: str, message: dict):
    await manager.broadcast(scenario_id, message)

@router.websocket("/scenarios/{id}/stream")
async def websocket_stream(websocket: WebSocket, id: str):
    await manager.connect(id, websocket)
    try:
        while True:
            # Keep alive and receive client pings/subscriptions
            data = await websocket.receive_text()
            # Echo heartbeat ack
            await websocket.send_text(json.dumps({"type": "ack", "scenario_id": id, "received": data}))
    except WebSocketDisconnect:
        manager.disconnect(id, websocket)
