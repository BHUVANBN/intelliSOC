#!/usr/bin/env python3
"""
intelli-SOC Accuracy Auditor
Tests the precision and recall of the Hybrid Detection Engine (ML + Rules).
"""
import os
import time
import requests
import subprocess
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("auditor")

API_URL = "http://localhost:8001/api"
ATTACK_TARGET_IP = "172.25.0.20"

# Map script name to expected ThreatClass
TEST_CASES = [
    {"name": "Brute Force",      "script": "brute_force.py",      "expected": "BRUTE_FORCE"},
    {"name": "C2 Beaconing",    "script": "c2_beacon.py",        "expected": "C2_BEACON"},
    {"name": "Data Exfil",      "script": "exfiltration.py",     "expected": "EXFILTRATION"},
    {"name": "Lateral Movement", "script": "lateral_movement.py", "expected": "LATERAL_MOVEMENT"},
    {"name": "False Positive",  "script": "false_positive.py",   "expected": "BENIGN"}
]

def get_incident_counts():
    """Fetch all incidents and count them by threat class."""
    try:
        resp = requests.get(f"{API_URL}/incidents?limit=1000", timeout=5)
        incidents = resp.json().get("incidents", [])
        counts = {}
        for inc in incidents:
            tc = inc["threat_class"].split(".")[-1].upper()
            counts[tc] = counts.get(tc, 0) + 1
        return counts
    except Exception as e:
        log.error(f"Failed to fetch incidents: {e}")
        return {}

def trigger_attack(script_name):
    """Execute the attack script inside the attacker container."""
    log.info(f"▶️  Triggering attack: {script_name}")
    cmd = f"docker exec intelli_attacker python3 /app/scripts/{script_name}"
    subprocess.run(cmd.split(), capture_output=True)

def run_audit():
    log.info("═══ Starting Hybrid Detection Accuracy Audit ═══")
    
    results = []
    
    for case in TEST_CASES:
        log.info(f"\n--- Testing: {case['name']} ---")
        
        # 1. Get baseline
        prev_counts = get_incident_counts()
        prev_val = prev_counts.get(case['expected'], 0)
        
        # 2. Trigger
        trigger_attack(case['script'])
        
        # 3. Wait for pipeline (Capture -> Normalization -> Inference -> Correlation)
        # We wait 15 seconds to be safe
        log.info("⌛ Waiting 40s for processing...")
        time.sleep(40)
        
        # 4. Check results
        curr_counts = get_incident_counts()
        curr_val = curr_counts.get(case['expected'], 0)
        
        detected = False
        if case['expected'] == "BENIGN":
            # For false positive test, we expect NO increase in malicious incidents
            # Specifically check if any NEW malicious incidents were created
            malicious_incrs = sum([curr_counts.get(k,0) - prev_counts.get(k,0) for k in curr_counts if k != "BENIGN"])
            detected = (malicious_incrs == 0)
            status = "PASS (No FP)" if detected else f"FAIL ({malicious_incrs} False Positives)"
        else:
            detected = (curr_val > prev_val)
            status = "PASS (Correct Class)" if detected else "FAIL (Missed/Misclassified)"
        
        log.info(f"Result: {status}")
        results.append({"case": case['name'], "status": detected})

    # Summary
    log.info("\n" + "═"*40)
    log.info("         FINAL ACCURACY REPORT")
    log.info("═"*40)
    hits = sum(1 for r in results if r['status'])
    total = len(results)
    for r in results:
        mark = "✅" if r['status'] else "❌"
        log.info(f" {mark} {r['case']:<20} : {'SUCCESS' if r['status'] else 'FAILED'}")
    
    accuracy = (hits / total) * 100
    log.info("═"*40)
    log.info(f" TOTAL ACCURACY: {accuracy:.1f}%")
    log.info("═"*40)

if __name__ == "__main__":
    run_audit()
