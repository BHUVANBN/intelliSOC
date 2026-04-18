import os
import time
import requests
import json
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [AUDIT] %(levelname)s %(message)s")
log = logging.getLogger("accuracy_audit")

API_PORT = os.getenv("API_PORT", "8000")
API_BASE = f"http://localhost:{API_PORT}/api"

EXPECTED_ATTACKS = [
    "BRUTE_FORCE",
    "C2_BEACON",
    "LATERAL_MOVEMENT",
    "EXFILTRATION"
]

def run_attacks():
    log.info("🚀 Triggering Attack Simulation via Attacker container...")
    import subprocess
    cmd = "docker compose exec attacker python3 scripts/run_all_attacks.py"
    subprocess.run(cmd.split(), capture_output=False)

def check_results():
    log.info("📊 Auditing API for detections...")
    try:
        resp = requests.get(f"{API_BASE}/incidents?limit=100")
        incidents = resp.json().get("incidents", [])
    except Exception as e:
        log.error(f"API reachable? {e}")
        return

    detected_classes = set(i["threat_class"] for i in incidents)
    # Normalize detections (strip prefix and uppercase)
    found_clean = set(str(d).split(".")[-1].upper() for d in detected_classes)
    
    log.info(f"Normalized Detections: {found_clean}")
    
    success_count = 0
    for attack in EXPECTED_ATTACKS:
        if attack in found_clean:
            log.info(f"✅ DETECTED: {attack}")
            success_count += 1
        else:
            log.error(f"❌ MISSED: {attack}")
            
    accuracy = (success_count / len(EXPECTED_ATTACKS)) * 100
    log.info(f"═══ FINAL AUDIT ACCURACY: {accuracy:.1f}% ═══")

if __name__ == "__main__":
    log.info("Starting End-to-End Accuracy Audit...")
    run_attacks()
    log.info("Waiting for inference pipeline to catch up (10s)...")
    time.sleep(10)
    check_results()
