
import asyncio
import logging
from datetime import datetime, timezone
from typing import List, Optional, Dict
from uuid import uuid4

from agent.normalization.schema import UnifiedEvent, EventLayer
from agent.simulation.generators.brute_force_gen import BruteForceGenerator
from agent.simulation.generators.c2_beacon_gen import C2BeaconGenerator
from agent.simulation.generators.lateral_movement_gen import LateralMovementGenerator
from agent.simulation.generators.data_exfil_gen import DataExfilGenerator
from agent.simulation.generators.false_positive_gen import FalsePositiveGenerator
from agent.simulation.profiles import ATTACK_PROFILES

log = logging.getLogger("simulation_engine")

class SimulationEngine:
    def __init__(self, normalizer, broadcast_func=None):
        self.normalizer = normalizer
        self.broadcast = broadcast_func
        self.is_running = False
        self.is_paused = False
        self.current_attack: Optional[str] = None
        self.progress = 0.0
        self.speed = 1.0
        self._stop_event = asyncio.Event()
        self._pause_event = asyncio.Event()
        self._pause_event.set()

        self.generators = {
            "brute_force": BruteForceGenerator(),
            "c2_beacon": C2BeaconGenerator(),
            "lateral_movement": LateralMovementGenerator(),
            "data_exfiltration": DataExfilGenerator(),
            "false_positive": FalsePositiveGenerator()
        }

    async def run_simulation(self, attack_type: str):
        if attack_type == "demo":
            await self.run_demo()
            return

        self.is_running = True
        self.is_paused = False
        self.current_attack = attack_type
        self.progress = 0.0
        self._stop_event.clear()
        self._pause_event.set()

        log.info(f"🚀 Starting simulation: {attack_type}")

        try:
            gen = self.generators.get(attack_type)
            if not gen:
                log.error(f"Unknown generator for {attack_type}")
                return

            profile = ATTACK_PROFILES.get(attack_type, {})
            duration = profile.get("duration_seconds", 60)
            raw_events = gen.generate_events(duration)
            
            log.info(f"Generated {len(raw_events)} events for {attack_type}")
            await self._execute(raw_events, attack_type, profile)
            log.info(f"✅ Simulation {attack_type} completed successfully")
        except Exception as e:
            log.error(f"❌ Simulation {attack_type} failed: {e}")
        finally:
            self.is_running = False
            self.current_attack = None
            log.info(f"🏁 Simulation engine reset to idle")

    async def run_demo(self):
        """Runs a sequence of attacks for demonstration."""
        attacks = ["brute_force", "c2_beacon", "data_exfiltration"]
        self.is_running = True
        self.is_paused = False
        self.progress = 0.0
        self._stop_event.clear()
        self._pause_event.set()

        log.info("🎬 Starting Multi-Stage Demo Simulation")

        try:
            for i, at in enumerate(attacks):
                if self._stop_event.is_set():
                    break
                self.current_attack = f"Demo: {at.replace('_', ' ').title()}"
                log.info(f"🎭 Demo Phase {i+1}: {at}")
                
                gen = self.generators.get(at)
                profile = ATTACK_PROFILES.get(at, {})
                raw_events = gen.generate_events(30) # 30s per stage
                await self._execute(raw_events, at, profile, progress_offset=i/len(attacks)*100, progress_scale=1/len(attacks))
            
            log.info("✨ Demo Simulation completed")
        except Exception as e:
            log.error(f"💥 Demo Simulation failed: {e}")
        finally:
            self.is_running = False
            self.current_attack = None
            log.info("🏁 Simulation engine reset to idle")

    async def _execute(self, raw_events, attack_type, profile, progress_offset=0.0, progress_scale=1.0):
        total = len(raw_events)
        try:
            for i, raw_e in enumerate(raw_events):
                if self._stop_event.is_set():
                    break
                await self._pause_event.wait()

                # Delay
                delay = raw_e.get("delay", 0) / (self.speed or 1.0)
                if delay > 0:
                    await asyncio.sleep(delay)

                # Broadcast Log
                if self.broadcast:
                    await self.broadcast({
                        "type": "log",
                        "data": {
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                            "layer": raw_e.get("layer", "network"),
                            "message": raw_e.get("message", ""),
                            "severity": raw_e.get("severity", "info"),
                            "attack_type": attack_type
                        }
                    })

                # If trigger_alert, push to normalizer
                if raw_e.get("trigger_alert"):
                    from agent.normalization.schema import UnifiedEvent, EventLayer
                    event = UnifiedEvent(
                        layer=EventLayer.NETWORK if raw_e.get("layer") == "network" else EventLayer.ENDPOINT,
                        timestamp=datetime.now(timezone.utc),
                        src_ip=raw_e.get("src_ip"),
                        dst_ip=raw_e.get("dst_ip"),
                        user=raw_e.get("user")
                    )
                    if self.normalizer:
                        self.normalizer.push(event)
                    
                    if self.broadcast:
                        await self.broadcast({
                            "type": "alert",
                            "data": {
                                "alert_id": f"SIM-{attack_type[:3].upper()}-{i}",
                                "description": raw_e.get("message"),
                                "severity": raw_e.get("severity", "high").upper(),
                                "confidence": raw_e.get("confidence", 0.95),
                                "threat_category": attack_type,
                                "mitre": profile.get("mitre"),
                                "playbook": profile.get("playbook")
                            }
                        })

                self.progress = progress_offset + (((i + 1) / total) * 100 * progress_scale)
                if i % 2 == 0 and self.broadcast:
                    await self.broadcast({
                        "type": "status",
                        "data": {
                            "status": "running" if not self.is_paused else "paused",
                            "progress": self.progress,
                            "speed": self.speed,
                            "current_attack": self.current_attack
                        }
                    })
        except Exception as e:
            log.error(f"Execution Error: {e}")


    def stop(self):
        self._stop_event.set()
        self._pause_event.set()

    def pause(self):
        self.is_paused = True
        self._pause_event.clear()

    def resume(self):
        self.is_paused = False
        self._pause_event.set()
