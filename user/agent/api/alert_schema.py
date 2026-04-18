"""
Alert Schema — Pydantic models for the FastAPI REST/WebSocket API.
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional, Dict, List, Any
from pydantic import BaseModel


class AlertPayload(BaseModel):
    """Single alert/incident pushed over WebSocket and returned from REST API."""
    incident_id:       str
    timestamp:         str
    rule_name:         str
    threat_class:      str
    severity:          str
    confidence:        float
    src_ip:            Optional[str]
    dst_ip:            Optional[str]
    dst_port:          Optional[int]
    protocol:          Optional[str]
    mitre_id:          Optional[str]
    explanation:       Optional[str]
    process_name:      Optional[str]
    user:              Optional[str]
    shap_features:     Optional[Dict[str, float]]
    layer:             str
    suppressed:        bool
    suppression_count: int


class PlaybookResponse(BaseModel):
    incident_id:          Optional[str]
    threat_class:         str
    mitre_id:             Optional[str]
    title:                str
    steps:                List[Dict[str, Any]]
    incident_severity:    Optional[str]
    incident_confidence:  Optional[float]


class StatsResponse(BaseModel):
    total_incidents:  int
    by_threat_class:  Dict[str, int]
    by_severity:      Dict[str, int]
    events_per_second: float
    queue_depth:      int


class HealthResponse(BaseModel):
    status:       str
    model_loaded: bool
    uptime_s:     float
    total_events: int
