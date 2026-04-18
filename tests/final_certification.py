#!/usr/bin/env python3
"""
intelli-SOC Robust Accuracy Auditor
Certified End-to-End Validation Script
"""
import os
import time
import requests
import subprocess
import logging
import sys

# Configure high-quality logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
log = logging.getLogger("cert_auditor")

API_URL = "http://localhost:8001/api"
HEALTH_URL = "http://localhost:8001/health"

# Test cases mapped to expected results
TEST_CASES = [
    {"name": "Brute Force",      "script": "brute_force.py",      "expected": "BRUTE_FORCE", "wait": 75},
    {"name": "C2 Beaconing",    "script": "c2_beacon.py",        "expected": "C2_BEACON",   "wait": 75},
    {"name": "Data Exfil",      "script": "exfiltration.py",     "expected": "EXFILTRATION", "wait": 75},
    {"name": "Lateral Movement", "script": "lateral_movement.py", "expected": "LATERAL_MOVEMENT", "wait": 75},
    {"name": "False Positive",  "script": "false_positive.py",   "expected": "BENIGN", "wait": 10}
]

def wait_for_system_ready(timeout=60):
    """Ensures the detection agent and ML model are fully operational."""
    log.info("🔍 Waiting for Sentinel Engine to become HEALTHY...")
    start = time.time()
    while time.time() - start < timeout:
        try:
            resp = requests.get(HEALTH_URL, timeout=2)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("model_loaded") is True:
                    log.info("✅ Engine is ONLINE and ML Model is LOADED.")
                    return True
        except:
            pass
        time.sleep(2)
    log.error("❌ System failed to reach healthy state.")
    return False

def get_incident_counts():
    """Fetches incident counts from the API."""
    try:
        resp = requests.get(f"{API_URL}/incidents?limit=1000", timeout=5)
        incidents = resp.json().get("incidents", [])
        counts = {}
        for inc in incidents:
            tc = str(inc["threat_class"]).split(".")[-1].upper()
            counts[tc] = counts.get(tc, 0) + 1
        return counts
    except Exception as e:
        log.error(f"Incident fetch failed: {e}")
        return {}

def trigger_attack(script_name):
    """Launches the attack simulation."""
    log.info(f"🚀 Launching Attack Vector: {script_name}")
    # We use -d to ensure we don't block the audit script if an attack takes long
    cmd = f"docker exec -d intelli_attacker python3 /app/scripts/{script_name}"
    subprocess.run(cmd.split(), capture_output=True)

def run_certification():
    if not wait_for_system_ready():
        return

    log.info("\n" + "="*50)
    log.info("   INTELLI-SOC HYBRID ENGINE CERTIFICATION")
    log.info("="*50)
    
    results = []
    
    for case in TEST_CASES:
        log.info(f"\n[PHASE] Testing {case['name']} accuracy...")
        
        # Snapshot before
        prev_counts = get_incident_counts()
        prev_val = prev_counts.get(case['expected'], 0)
        
        # Trigger
        trigger_attack(case['script'])
        
        # Wait for simulation cycle + inference gap
        log.info(f" Waiting {case['wait']}s for classification results...")
        time.sleep(case['wait'])
        
        # Snapshot after
        curr_counts = get_incident_counts()
        curr_val = curr_counts.get(case['expected'], 0)
        
        detected = False
        if case['expected'] == "BENIGN":
            # Check for zero increase in malicious incidents
            malicious_new = sum([curr_counts.get(k,0) - prev_counts.get(k,0) for k in curr_counts if k != "BENIGN"])
            detected = (malicious_new == 0)
            status = "PASS (Zero False Positives)" if detected else f"FAIL ({malicious_new} FP detected)"
        else:
            detected = (curr_val > prev_val)
            status = "PASS (Accurate Classification)" if detected else "FAIL (Missed/Incorrect)"
        
        log.info(f" Result: {status}")
        results.append({"case": case['name'], "status": detected})

    # Certification Summary
    log.info("\n" + "╔" + "═"*44 + "╗")
    log.info("║         CERTIFICATION AUDIT REPORT         ║")
    log.info("╠" + "═"*44 + "╣")
    
    hits = sum(1 for r in results if r['status'])
    for r in results:
        icon = " [OK] " if r['status'] else " [!!] "
        log.info(f"║ {icon} {r['case']:<25} : PASSED {' ' if r['status'] else ' FAI '} ║")
    
    accuracy = (hits / len(TEST_CASES)) * 100
    log.info("╠" + "═"*44 + "╣")
    log.info(f"║ FINAL DETECTION ACCURACY: {accuracy:>10.1f}%     ║")
    log.info("╚" + "═"*44 + "╝\n")

if __name__ == "__main__":
    run_certification()
