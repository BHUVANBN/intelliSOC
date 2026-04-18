"""
Model Loader — Loads the trained XGBoost model, scaler, and feature list.
Handles graceful fallback to a rule-based heuristic when model files are absent.
"""
from __future__ import annotations
import os
import json
import logging
from typing import Optional, List, Tuple

log = logging.getLogger("model_loader")

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
MODEL_PATH   = os.path.join(MODEL_DIR, "model.pkl")
SCALER_PATH  = os.path.join(MODEL_DIR, "scaler.pkl")
FEATURES_PATH = os.path.join(MODEL_DIR, "feature_list.json")

# Label mapping (must match ml_training/preprocess.py)
LABEL_MAP = {
    0: "BENIGN",
    1: "BRUTE_FORCE",
    2: "LATERAL_MOVEMENT",
    3: "EXFILTRATION",
    4: "C2_BEACON",
}


class ModelLoader:
    """Loads and holds trained ML models for different layers."""

    def __init__(self):
        self.net_model   = None
        self.net_scaler  = None
        self.net_features: List[str] = []
        
        self.ep_model    = None
        self.ep_scaler   = None
        self.ep_features: List[str] = []
        
        self._load_network()
        self._load_endpoint()

    def _load_network(self):
        try:
            import joblib
            path = os.path.join(MODEL_DIR, "model.pkl")
            s_path = os.path.join(MODEL_DIR, "scaler.pkl")
            f_path = os.path.join(MODEL_DIR, "feature_list.json")
            
            if os.path.exists(path):
                self.net_model = joblib.load(path)
                self.net_scaler = joblib.load(s_path)
                with open(f_path) as f:
                    self.net_features = json.load(f)
                log.info(f"✔ Network model loaded ({len(self.net_features)} feats)")
        except Exception as e:
            log.warning(f"Network model load failed: {e}")

    def _load_endpoint(self):
        try:
            import joblib
            path = os.path.join(MODEL_DIR, "endpoint_model.pkl")
            s_path = os.path.join(MODEL_DIR, "endpoint_scaler.pkl")
            
            if os.path.exists(path):
                self.ep_model = joblib.load(path)
                self.ep_scaler = joblib.load(s_path)
                self.ep_features = [
                    "pid", "parent_pid", "uid", 
                    "is_root", "is_orphaned", 
                    "has_net", "cmd_len",
                    "file_count", "discovery_score"
                ]
                log.info(f"✔ Endpoint model loaded ({len(self.ep_features)} feats)")
        except Exception as e:
            log.warning(f"Endpoint model load failed: {e}")

    def is_loaded(self, layer="network") -> bool:
        return (self.net_model is not None) if layer == "network" else (self.ep_model is not None)

    def get_feature_list(self, layer="network") -> List[str]:
        return self.net_features if layer == "network" else self.ep_features

    def get_label_map(self) -> dict:
        return LABEL_MAP.copy()
