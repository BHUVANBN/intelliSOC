#!/usr/bin/env python3
"""
intelli-SOC — Master Attack Orchestrator
Runs all four attack scenarios in sequence with configurable timing.
"""
import os
import time
import subprocess
import threading
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [ATTACKER] %(levelname)s %(message)s"
)
log = logging.getLogger("orchestrator")

TARGET_IP = os.getenv("TARGET_IP", "172.25.0.20")
WARMUP_S = int(os.getenv("ATTACK_WARMUP_S", "10"))

SCRIPTS_DIR = os.path.dirname(__file__)


def run_script(name: str, script: str, delay: float = 0):
    """Run a Python attack script in a subprocess after an optional delay."""
    time.sleep(delay)
    log.info(f"▶  Launching attack: {name}")
    path = os.path.join(SCRIPTS_DIR, script)
    result = subprocess.run(
        ["python3", path],
        env={**os.environ, "TARGET_IP": TARGET_IP},
        capture_output=False
    )
    log.info(f"✔  {name} completed (exit={result.returncode})")


def main():
    log.info(f"intelli-SOC Attacker Container started. Warm-up: {WARMUP_S}s")
    
    # Initialize IP Aliases for distributed attacks / spoofing
    try:
        from network_utils import setup_ip_aliases
        setup_ip_aliases(count=50) 
        os.environ["DYNAMIC_ATTACK_IP"] = "true"
    except Exception as e:
        log.warning(f"Could not setup IP aliases: {e}. Falling back to single-IP mode.")
    
    time.sleep(WARMUP_S)

    log.info("══════════════════════════════════════════")
    log.info("  intelli-SOC  Attack Simulation Starting ")
    log.info("══════════════════════════════════════════")

    threads = [
        threading.Thread(target=run_script, args=("Brute Force",      "brute_force.py",      0),  daemon=True),
        threading.Thread(target=run_script, args=("C2 Beacon",        "c2_beacon.py",         5),  daemon=True),
        threading.Thread(target=run_script, args=("False Positive",   "false_positive.py",   15),  daemon=True),
        threading.Thread(target=run_script, args=("Lateral Movement", "lateral_movement.py", 60),  daemon=True),
        threading.Thread(target=run_script, args=("Data Exfiltration","exfiltration.py",     120), daemon=True),
    ]

    for t in threads:
        t.start()

    for t in threads:
        t.join()

    log.info("All attack scenarios complete.")


if __name__ == "__main__":
    main()
