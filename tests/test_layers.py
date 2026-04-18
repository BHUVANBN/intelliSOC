import os
import sys
import unittest
import numpy as np
import json
from datetime import datetime, timezone

# Add app to path
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "user"))

from agent.normalization.schema import UnifiedEvent, EventLayer, FlagCounts, ThreatClass, Severity
from agent.normalization.normalizer import Normalizer
from agent.inference.predictor import Predictor
from agent.correlation.correlator import Correlator

class TestIntelliSocLayers(unittest.TestCase):

    def setUp(self):
        self.normalizer = Normalizer()
        self.correlator = Correlator()

    def test_normalization_merge(self):
        """Layer: Normalization - Test merging network + endpoint context."""
        net_event = UnifiedEvent(
            layer=EventLayer.NETWORK,
            src_ip="10.0.0.1", dst_ip="172.25.0.20",
            flow_duration=1000,
        )
        ep_event = UnifiedEvent(
            layer=EventLayer.ENDPOINT,
            process_name="ssh", pid=1234, user="root",
            src_ip="127.0.0.1", dst_ip="127.0.0.1"
        )
        merged = self.normalizer.merge_network_endpoint(net_event, ep_event)
        
        self.assertEqual(merged.process_name, "ssh")
        self.assertEqual(merged.pid, 1234)
        self.assertEqual(merged.src_ip, "10.0.0.1") # Network priority for IPs

    def test_correlator_rule_brute_force(self):
        """Layer: Correlation - Test Brute Force confirmation logic."""
        event = UnifiedEvent(
            layer=EventLayer.NETWORK,
            threat_class=ThreatClass.BRUTE_FORCE,
            confidence=0.9,
            severity=Severity.HIGH,
            src_ip="172.25.0.30",
            flag_counts=FlagCounts(syn=100)
        )
        # Push to correlator
        self.correlator.process(event)
        incidents = self.correlator.get_incidents()
        
        self.assertTrue(len(incidents) > 0)
        self.assertEqual(incidents[0]["threat_class"], "BRUTE_FORCE")

    def test_predictor_vectorization(self):
        """Layer: Inference - Test event to feature vector mapping."""
        from agent.inference.predictor import event_to_feature_vector
        event = UnifiedEvent(
            layer=EventLayer.NETWORK,
            flow_duration=12345.6,
            flow_bytes_per_sec=5000.0,
            flag_counts=FlagCounts(syn=10, ack=5),
        )
        # Select 16 standard features
        features = ["flow_duration", "flow_bytes_per_sec", "syn_flag_count", "ack_flag_count"]
        vec = event_to_feature_vector(event, features)
        
        self.assertEqual(vec[0], 12345.6)
        self.assertEqual(vec[1], 5000.0)
        self.assertEqual(vec[2], 10.0)
        self.assertEqual(vec[3], 5.0)

    def test_mitre_mapping(self):
        """Layer: Intelligence - Test MITRE ATT&CK mapping consistency."""
        from agent.correlation.mitre_mapper import MITRE_MAP
        self.assertIn("BRUTE_FORCE", MITRE_MAP)
        # Use startswith to match sub-techniques like T1110.001
        self.assertTrue(MITRE_MAP["BRUTE_FORCE"]["technique_id"].startswith("T1110"))

if __name__ == "__main__":
    unittest.main()
