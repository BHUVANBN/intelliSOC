"""
FastAPI Server — REST API + WebSocket endpoint for intelli-SOC.
Serves live incident data, playbooks, stats, and hunt results
to the React dashboard.
"""
from __future__ import annotations
import os
import time
import json
import logging
import asyncio
from datetime import datetime, timezone
from typing import Set, Optional

import redis.asyncio as aioredis
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware

from agent.api.alert_schema import (
    AlertPayload, PlaybookResponse, StatsResponse, HealthResponse
)
from agent.correlation.correlator import Correlator
from agent.playbook.generator import generate_playbook
from agent.simulation.engine import SimulationEngine
from agent.simulation.profiles import ATTACK_PROFILES

log = logging.getLogger("api.server")

_START_TIME = time.time()


class ConnectionManager:
    """Manages active WebSocket connections."""

    def __init__(self):
        self.active: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, ws: WebSocket):
        await ws.accept()
        async with self._lock:
            self.active.add(ws)
        log.info(f"WebSocket connected. Total clients: {len(self.active)}")

    async def disconnect(self, ws: WebSocket):
        async with self._lock:
            self.active.discard(ws)
        log.info(f"WebSocket disconnected. Total clients: {len(self.active)}")

    async def broadcast(self, data: dict):
        """Broadcast a JSON message to all connected clients."""
        if not self.active:
            return
        message = json.dumps(data)
        dead = set()
        async with self._lock:
            snapshot = set(self.active)
        for ws in snapshot:
            try:
                await ws.send_text(message)
            except Exception:
                dead.add(ws)
        async with self._lock:
            self.active -= dead


_manager = ConnectionManager()
_sim_manager = ConnectionManager()


def create_app(correlator: Correlator, normalizer=None) -> FastAPI:
    """Create and configure the FastAPI application."""

    app = FastAPI(
        title="intelli-SOC Threat Detection API",
        description="AI-driven threat detection & simulation engine — Hack Malenadu '26",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # CORS for React dashboard
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Redis client
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    _redis: Optional[aioredis.Redis] = None

    # Wire the broadcast callback into the correlator
    correlator.set_broadcast(_manager.broadcast)

    # Initialize Simulation Engine
    sim_engine = SimulationEngine(normalizer, _sim_manager.broadcast)

    # ──────────────────────────────────────────────────────────────────
    # Lifecycle
    # ──────────────────────────────────────────────────────────────────

    @app.on_event("startup")
    async def startup():
        nonlocal _redis
        # Inject loop for thread-safe async dispatch
        correlator.set_event_loop(asyncio.get_running_loop())
        try:
            _redis = aioredis.from_url(redis_url, decode_responses=True)
            await _redis.ping()
            correlator.set_redis(_redis)
            log.info(f"Redis connected: {redis_url}")
        except Exception as e:
            log.warning(f"Redis unavailable: {e}. Incidents will not be persisted.")

    @app.on_event("shutdown")
    async def shutdown():
        if _redis:
            await _redis.aclose()

    # ──────────────────────────────────────────────────────────────────
    # Health
    # ──────────────────────────────────────────────────────────────────

    @app.get("/health", response_model=HealthResponse, tags=["System"])
    async def health():
        return {
            "status": "ok",
            "model_loaded": os.path.exists(
                "/app/agent/inference/models/model.pkl"
            ),
            "uptime_s": round(time.time() - _START_TIME, 1),
            "total_events": normalizer.total_events if normalizer else 0,
        }

    # ──────────────────────────────────────────────────────────────────
    # Incidents
    # ──────────────────────────────────────────────────────────────────

    @app.get("/api/incidents", tags=["Incidents"])
    async def get_incidents(limit: int = Query(50, le=500), offset: int = 0):
        """Retrieve recent incidents, newest first."""
        return {"incidents": correlator.get_incidents(limit=limit, offset=offset)}

    # ──────────────────────────────────────────────────────────────────
    # Simulation Lab
    # ──────────────────────────────────────────────────────────────────

    @app.get("/api/simulate/profiles", tags=["Simulation"])
    async def get_simulation_profiles():
        return {
            "profiles": [
                {"id": k, **v} for k, v in ATTACK_PROFILES.items()
            ]
        }

    @app.post("/api/simulate/start", tags=["Simulation"])
    async def simulate_start(request: Request, background_tasks: BackgroundTasks):
        try:
            body = await request.json()
        except Exception:
            body = {}

        attack_type = body.get("attack_type")
        speed = body.get("speed", 1.0)
        
        if attack_type != "demo" and attack_type not in ATTACK_PROFILES:
            raise HTTPException(status_code=400, detail="Invalid attack type")

        if sim_engine.is_running:
            raise HTTPException(status_code=409, detail="Simulation already running")

        sim_engine.speed = speed
        background_tasks.add_task(sim_engine.run_simulation, attack_type)
        return {"status": "started", "timestamp": datetime.now(timezone.utc).isoformat()}

    @app.post("/api/simulate/stop", tags=["Simulation"])
    async def simulate_stop():
        sim_engine.stop()
        return {"status": "stopped"}

    @app.post("/api/simulate/pause", tags=["Simulation"])
    async def simulate_pause():
        sim_engine.pause()
        return {"status": "paused"}

    @app.post("/api/simulate/resume", tags=["Simulation"])
    async def simulate_resume():
        sim_engine.resume()
        return {"status": "resumed"}

    @app.get("/api/simulate/status", tags=["Simulation"])
    async def simulate_status():
        return {
            "is_running": sim_engine.is_running,
            "is_paused": sim_engine.is_paused,
            "current_attack": sim_engine.current_attack,
            "progress": sim_engine.progress,
            "speed": sim_engine.speed
        }

    # ──────────────────────────────────────────────────────────────────
    # Playbooks & MITRE
    # ──────────────────────────────────────────────────────────────────

    @app.get("/api/playbook/{incident_id}", tags=["Playbooks"])
    async def get_playbook(incident_id: str):
        """Generate a response playbook for a specific incident."""
        all_inc = correlator.get_incidents(limit=10_000)
        incident = None
        for inc in all_inc:
            if str(inc["incident_id"]) == str(incident_id):
                incident = inc
                break

        if not incident:
            # Check if it's a simulation ID (e.g., SIM-BRU-1)
            if incident_id.startswith("SIM-"):
                 prefix = incident_id.split("-")[1] # BRU, C2, LAT, DAT
                 mapping = {
                     "BRU": "brute_force",
                     "C2":  "c2_beacon",
                     "LAT": "lateral_movement",
                     "DAT": "data_exfiltration"
                 }
                 p_id = mapping.get(prefix, "brute_force")
                 profile = ATTACK_PROFILES.get(p_id)
                 if profile:
                     return {
                         "title": f"SIMULATED: {profile['name']}",
                         "threat_class": p_id.upper(),
                         "steps": profile['playbook']
                     }
            raise HTTPException(status_code=404, detail="Incident not found")

        playbook = generate_playbook(incident)
        if not playbook:
            raise HTTPException(status_code=404, detail="No playbook for BENIGN incidents")

        return playbook

    @app.get("/api/stats", response_model=StatsResponse, tags=["Stats"])
    async def get_stats():
        """Get aggregated detection statistics."""
        base = correlator.get_stats()
        eps   = normalizer.events_per_second if normalizer else 0.0
        depth = normalizer.queue_depth       if normalizer else 0
        return {**base, "events_per_second": round(eps, 1), "queue_depth": depth}

    # ──────────────────────────────────────────────────────────────────
    # WebSocket
    # ──────────────────────────────────────────────────────────────────

    @app.websocket("/ws/simulation")
    async def websocket_simulation(ws: WebSocket):
        await _sim_manager.connect(ws)
        try:
            while True:
                data = await ws.receive_text()
                # allow client to set speed via WS
                msg = json.loads(data)
                if msg.get("type") == "set_speed":
                    sim_engine.speed = float(msg.get("speed", 1.0))
        except WebSocketDisconnect:
            pass
        finally:
            await _sim_manager.disconnect(ws)

    @app.websocket("/ws/alerts")
    async def websocket_alerts(ws: WebSocket):
        await _manager.connect(ws)
        try:
            recent = correlator.get_incidents(limit=50)
            for inc in reversed(recent):
                await ws.send_text(json.dumps(inc))
            while True:
                try:
                    data = await asyncio.wait_for(ws.receive_text(), timeout=30)
                except asyncio.TimeoutError:
                    await ws.send_text(json.dumps({"type": "heartbeat"}))
        except WebSocketDisconnect:
            pass
        finally:
            await _manager.disconnect(ws)

    return app
