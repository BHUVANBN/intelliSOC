"""
Unified Event Schema — Pydantic models for the intelli-SOC normalization layer.
All network and endpoint events are coerced into UnifiedEvent before inference.
"""
from __future__ import annotations
from datetime import datetime, timezone
from enum import Enum
from typing import Optional, Dict, List
from uuid import UUID, uuid4
from pydantic import BaseModel, Field, ConfigDict


class EventLayer(str, Enum):
    NETWORK     = "network"
    ENDPOINT    = "endpoint"
    APPLICATION = "application"


class ThreatClass(str, Enum):
    BENIGN           = "BENIGN"
    BRUTE_FORCE      = "BRUTE_FORCE"
    LATERAL_MOVEMENT = "LATERAL_MOVEMENT"
    EXFILTRATION     = "EXFILTRATION"
    C2_BEACON        = "C2_BEACON"


class Severity(str, Enum):
    BENIGN   = "BENIGN"
    LOW      = "LOW"
    MEDIUM   = "MEDIUM"
    HIGH     = "HIGH"
    CRITICAL = "CRITICAL"


class FlagCounts(BaseModel):
    syn: int = 0
    ack: int = 0
    fin: int = 0
    rst: int = 0
    psh: int = 0
    urg: int = 0


class UnifiedEvent(BaseModel):
    """Normalized event schema — merged from network + endpoint layers."""
    event_id:   UUID     = Field(default_factory=uuid4)
    timestamp:  datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    layer:      EventLayer

    # Network fields
    src_ip:     Optional[str]   = None
    dst_ip:     Optional[str]   = None
    src_port:   Optional[int]   = None
    dst_port:   Optional[int]   = None
    protocol:   Optional[str]   = None

    # Flow features (CICIDS-aligned)
    flow_duration:         float = 0.0   # microseconds
    flow_bytes_per_sec:    float = 0.0
    flow_packets_per_sec:  float = 0.0
    total_fwd_packets:     int   = 0
    total_bwd_packets:     int   = 0
    fwd_packet_len_mean:   float = 0.0
    bwd_packet_len_mean:   float = 0.0
    flag_counts:           FlagCounts = Field(default_factory=FlagCounts)
    flow_iat_mean:         float = 0.0
    flow_iat_std:          float = 0.0
    fwd_iat_total:         float = 0.0
    bwd_iat_total:         float = 0.0
    subflow_fwd_packets:   int   = 0
    subflow_bwd_packets:   int   = 0
    subflow_fwd_bytes:     int   = 0
    subflow_bwd_bytes:     int   = 0
    active_mean:           float = 0.0
    idle_mean:             float = 0.0
    init_win_bytes_fwd:    int   = 0
    init_win_bytes_bwd:    int   = 0

    # Endpoint fields
    process_name: Optional[str]       = None
    parent_pid:   Optional[int]       = None
    pid:          Optional[int]       = None
    user:         Optional[str]       = None
    file_access:  List[str]           = Field(default_factory=list)
    audit_key:    Optional[str]       = None

    # Application fields
    http_method:  Optional[str]       = None
    http_path:    Optional[str]       = None
    http_status:  Optional[int]       = None
    payload_size: Optional[int]       = None

    # ML output (populated after inference)
    confidence:   Optional[float]     = None
    threat_class: Optional[ThreatClass] = None
    severity:     Optional[Severity]  = None
    mitre_id:     Optional[str]       = None
    explanation:  Optional[str]       = None
    shap_features: Optional[Dict[str, float]] = None

    model_config = ConfigDict(use_enum_values=True)
