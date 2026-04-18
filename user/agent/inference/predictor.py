"""
Predictor — Production Grade Hybrid Threat Scoring Engine.
Fixes applied: #3 (SHAP multiclass), #4 (mitre_id + shap_features populated).
"""
from __future__ import annotations
import os
import time
import logging
import numpy as np
import joblib
from typing import List, Optional, Dict, Tuple

from agent.normalization.schema import UnifiedEvent, ThreatClass, Severity, EventLayer
from agent.normalization.normalizer import Normalizer
from agent.inference.model_loader import ModelLoader, LABEL_MAP
from agent.correlation.correlator import Correlator
from agent.correlation.mitre_mapper import map_mitre

log = logging.getLogger("predictor")

BATCH_WINDOW_S = float(os.getenv("BATCH_WINDOW_MS", "500")) / 1000.0


def event_to_feature_vector(event: UnifiedEvent, feature_list: List[str]) -> List[float]:
    """Map a UnifiedEvent to a numeric feature vector."""
    feature_map = {
        "flow_duration":         float(event.flow_duration),
        "flow_bytes_per_sec":    float(event.flow_bytes_per_sec),
        "flow_packets_per_sec":  float(event.flow_packets_per_sec),
        "total_fwd_packets":     float(event.total_fwd_packets),
        "total_bwd_packets":     float(event.total_bwd_packets),
        "fwd_packet_len_mean":   float(event.fwd_packet_len_mean),
        "bwd_packet_len_mean":   float(event.bwd_packet_len_mean),
        "syn_flag_count":        float(event.flag_counts.syn),
        "rst_flag_count":        float(event.flag_counts.rst),
        "ack_flag_count":        float(event.flag_counts.ack),
        "flow_iat_mean":         float(event.flow_iat_mean),
        "flow_iat_std":          float(event.flow_iat_std),
        "active_mean":           float(event.active_mean),
        "idle_mean":             float(event.idle_mean),
        "subflow_fwd_bytes":     float(event.subflow_fwd_bytes),
        "subflow_bwd_bytes":     float(event.subflow_bwd_bytes),
    }
    return [feature_map.get(f, 0.0) for f in feature_list]


def endpoint_to_feature_vector(event: UnifiedEvent) -> List[float]:
    """Map a UnifiedEvent (endpoint) to a numeric feature vector."""
    # Features match train_endpoint.py
    is_root = 1 if (event.user == "root" or event.user == "0") else 0
    is_orphaned = 1 if event.parent_pid == 1 else 0
    has_net = 1 if (event.src_port or event.dst_port) else 0
    cmd_len = len(event.process_name or "") if event.process_name else 0
    file_count = len(event.file_access) if event.file_access else 0
    
    discovery_score = 0
    if event.audit_key == "discovery" or (event.process_name in ["whoami", "id", "hostname", "ifconfig"]):
        discovery_score = 10

    return [
        float(event.pid or 0), float(event.parent_pid or 0), 
        float(0 if event.user == "root" else 1000), 
        float(is_root), float(is_orphaned), float(has_net),
        float(cmd_len), float(file_count), float(discovery_score)
    ]


def calculate_hybrid_score(event: UnifiedEvent, ml_conf: float, ml_class: str) -> float:
    """Hybrid Threat Scoring: ML confidence + rule-based boosts."""
    rule_boost = 0.0

    if event.layer == EventLayer.NETWORK:
        if event.flag_counts.syn > 20 and ml_class == "BRUTE_FORCE":
            rule_boost += 0.15
        if 0 < event.flow_iat_std < 5.0 and ml_class == "C2_BEACON":
            rule_boost += 0.20
    else:
        # Endpoint Boosts
        if event.parent_pid == 1 and ml_class == "C2_BEACON":
            rule_boost += 0.25
        if len(event.file_access) > 100 and ml_class == "EXFILTRATION":
            rule_boost += 0.30

    final_score = (ml_conf * 0.7) + (rule_boost * 0.3)
    return min(0.99, final_score)


def map_score_to_severity(score: float, threat_class: str) -> Severity:
    if threat_class == "BENIGN" or score < 0.40:
        return Severity.BENIGN
    if score >= 0.90:
        return Severity.CRITICAL
    if score >= 0.75:
        return Severity.HIGH
    if score >= 0.55:
        return Severity.MEDIUM
    return Severity.LOW


class Predictor:
    def __init__(self, normalizer: Normalizer, correlator: Correlator):
        self.normalizer = normalizer
        self.correlator = correlator
        self._loader = ModelLoader()
        self._shap_explainer_net = None
        self._shap_explainer_ep = None
        self._running = False
        self._init_shap()
        self.baselines = {"bytes_sec": 5000, "pkts_sec": 50}
        log.info("Predictor ready (Robust Bulk Inference Active)")

    def _init_shap(self):
        try:
            import shap
            if self._loader.is_loaded("network"):
                self._shap_explainer_net = shap.TreeExplainer(self._loader.net_model)
            if self._loader.is_loaded("endpoint"):
                self._shap_explainer_ep = shap.TreeExplainer(self._loader.ep_model)
        except Exception:
            log.warning("SHAP limited/disabled.")

    def predict_batch(self, events: List[UnifiedEvent]) -> List[Dict]:
        results = []
        for event in events:
            layer = event.layer
            model = self._loader.net_model if layer == EventLayer.NETWORK else self._loader.ep_model
            scaler = self._loader.net_scaler if layer == EventLayer.NETWORK else self._loader.ep_scaler
            
            if not model:
                results.append({
                    "class": "BENIGN", "confidence": 0.5, "severity": Severity.BENIGN,
                    "explanation": "Heuristic Mode", "shap_features": {}, "mitre_id": None
                })
                continue

            if layer == EventLayer.NETWORK:
                feats = [event_to_feature_vector(event, self._loader.net_features)]
            else:
                feats = [endpoint_to_feature_vector(event)]

            X_scaled = scaler.transform(feats)
            probs = model.predict_proba(X_scaled)[0]
            
            idx = int(np.argmax(probs))
            ml_class = LABEL_MAP.get(idx, "BENIGN")
            ml_conf = float(probs[idx])

            threat_score = calculate_hybrid_score(event, ml_conf, ml_class)
            severity = map_score_to_severity(threat_score, ml_class)

            explanation, shap_dict = self._generate_explanation(
                event, ml_class, X_scaled, idx
            )

            results.append({
                "class": ml_class,
                "confidence": ml_conf,
                "severity": severity,
                "threat_score": threat_score,
                "explanation": explanation,
                "shap_features": shap_dict,
                "mitre_id": map_mitre(ml_class),
            })
        return results

    def _generate_explanation(
        self, event: UnifiedEvent, ml_class: str,
        X_scaled: np.ndarray, class_idx: int
    ) -> tuple:
        """
        Fix 3: SHAP multiclass uses correct class index.
        """
        shap_dict = {}
        explainer = self._shap_explainer_net if event.layer == EventLayer.NETWORK else self._shap_explainer_ep
        feature_list = self._loader.net_features if event.layer == EventLayer.NETWORK else self._loader.ep_features

        if explainer and feature_list:
            try:
                sv = explainer.shap_values(X_scaled)
                if isinstance(sv, list):
                    class_sv = sv[class_idx][0]
                elif sv.ndim == 3:
                    class_sv = sv[class_idx, 0, :]
                else:
                    class_sv = sv[0]

                importances = {
                    feature_list[i]: float(class_sv[i])
                    for i in range(len(feature_list))
                }
                top5 = sorted(importances.items(), key=lambda x: abs(x[1]), reverse=True)[:5]
                shap_dict = {k: round(v, 4) for k, v in top5}

                human = {
                    # Network features
                    "syn_flag_count": "High SYN flood",
                    "rst_flag_count": "Elevated RST ratio",
                    "flow_duration": "Unusual flow duration",
                    "flow_bytes_per_sec": "High data transfer rate",
                    "flow_iat_mean": "Regular beacon interval",
                    "flow_iat_std": "Ultra-low IAT variance",
                    "subflow_fwd_bytes": "Large outbound payload",
                    "total_fwd_packets": "Abnormal packet count",
                    "flow_packets_per_sec": "High packet rate",
                    # Endpoint features
                    "is_root": "Privileged execution",
                    "is_orphaned": "Orphaned process",
                    "discovery_score": "Internal reconnaissance",
                    "uid": "Non-standard user context",
                    "file_access_count": "Massive file access",
                }
                reasons = [human.get(f, f.replace("_", " ").title()) for f, _ in top5[:3]]
                return (
                    f"{' + '.join(reasons)} → {ml_class.replace('_', ' ').title()}.",
                    shap_dict,
                )
            except Exception as e:
                log.debug(f"SHAP error: {e}")

        return f"Statistical pattern matches {ml_class.lower()} behavior.", shap_dict

    def run_loop(self):
        self._running = True
        batch_delay = max(0.01, BATCH_WINDOW_S)
        while self._running:
            batch = self.normalizer.drain_batch(max_events=200)
            if batch:
                start_t = time.time()
                results = self.predict_batch(batch)

                # Fix 4: Populate event.shap_features and event.mitre_id
                for event, res in zip(batch, results):
                    event.threat_class = ThreatClass(res["class"])
                    event.confidence = res["confidence"]
                    event.severity = res["severity"]
                    event.explanation = res["explanation"]
                    event.shap_features = res.get("shap_features", {})
                    event.mitre_id = res.get("mitre_id")
                    self.correlator.process(event)

                elapsed = (time.time() - start_t) * 1000
                if len(batch) > 10:
                    log.debug(
                        f"Batch inference: {len(batch)} events in {elapsed:.1f}ms "
                        f"({len(batch) / max(0.001, elapsed / 1000):.0f} EPS)"
                    )
                # Dynamic backoff: If batch was small, sleep more; if large, sleep less
                time.sleep(batch_delay if len(batch) < 50 else 0.01)
            else:
                time.sleep(batch_delay)

    def stop(self):
        self._running = False
