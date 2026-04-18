#!/usr/bin/env python3
"""
Threat Category 4: C2 Beaconing
MITRE ATT&CK: T1071.001 — Application Layer Protocol: Web Protocols
              T1571     — Non-Standard Port

Simulates:
  - A compromised process sending periodic 64-byte HTTP GET beacons every 30s
  - Target: non-CDN, non-whitelisted external IP
  - Pattern: very regular interval (low flow_iat_std)
  - Process has no documented parent (orphaned)

Detection signals:
  - flow_iat_std < 5s (extremely regular interval)
  - Small fixed packet size (64 bytes)
  - External non-CDN destination
  - Process spawned without known parent
"""
import os
import socket
import time
import logging
import random
import hashlib

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [C2_BEACON] %(levelname)s %(message)s"
)
log = logging.getLogger("c2_beacon")

TARGET_IP       = os.getenv("TARGET_IP", "172.25.0.20")
HTTP_PORT       = int(os.getenv("TARGET_HTTP_PORT", "8000"))
BEACON_INTERVAL = int(os.getenv("C2_BEACON_INTERVAL_S", "30"))
BEACON_COUNT    = int(os.getenv("C2_BEACON_COUNT", "3"))

# Simulated C2 server — sent to user container /api/c2-sink for capture
C2_IP   = "198.51.100.77"   # TEST-NET-2, definitely not CDN
C2_PORT = 4443

BEACON_PAYLOAD = b"A" * 64  # Fixed 64-byte beacon


def craft_beacon(sequence: int) -> bytes:
    """
    Craft a 64-byte HTTP GET beacon with C2-like headers.
    Mimics a malware implant phone-home pattern.
    """
    # Checksum to simulate encrypted C2 ID
    session_id = hashlib.md5(f"c2-{sequence}".encode()).hexdigest()[:16]
    payload_size = 64

    http_get = (
        f"GET /update?id={session_id}&seq={sequence} HTTP/1.1\r\n"
        f"Host: {C2_IP}\r\n"
        f"User-Agent: Mozilla/5.0\r\n"
        f"X-Beacon-Seq: {sequence}\r\n"
        f"Connection: close\r\n"
        f"\r\n"
    ).encode()

    # Pad/trim to exactly 64 bytes
    if len(http_get) < payload_size:
        http_get += b"\x00" * (payload_size - len(http_get))
    return http_get[:payload_size]


def send_beacon(target_ip: str, port: int, sequence: int):
    """Send a single beacon to the target (user container acts as C2 sink)."""
    beacon = craft_beacon(sequence)
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(3.0)
        s.connect((target_ip, port))

        # Wrap in HTTP for the C2 sink endpoint
        wrapper = (
            f"POST /api/c2-sink HTTP/1.1\r\n"
            f"Host: {target_ip}:{port}\r\n"
            f"Content-Type: application/octet-stream\r\n"
            f"Content-Length: {len(beacon)}\r\n"
            f"X-C2-IP: {C2_IP}\r\n"
            f"X-Beacon-Seq: {sequence}\r\n"
            f"Connection: close\r\n"
            f"\r\n"
        ).encode() + beacon

        s.sendall(wrapper)
        s.close()
        log.info(f"  Beacon #{sequence:03d} sent [{len(beacon)}B] → interval={BEACON_INTERVAL}s")
    except (ConnectionRefusedError, socket.timeout, OSError) as e:
        log.warning(f"  Beacon #{sequence} failed: {e}")


def main():
    log.info("═══ Starting C2 Beaconing Attack Scenario ═══")
    log.info(f"  Interval: {BEACON_INTERVAL}s | Count: {BEACON_COUNT} beacons")
    log.info(f"  Simulated C2 IP: {C2_IP}:{C2_PORT}")

    for seq in range(1, BEACON_COUNT + 1):
        send_beacon(TARGET_IP, HTTP_PORT, seq)
        if seq < BEACON_COUNT:
            # Very precise sleep to keep low IAT std (detection signal)
            time.sleep(BEACON_INTERVAL)

    log.info("═══ C2 Beaconing Scenario Complete ═══")


if __name__ == "__main__":
    main()
