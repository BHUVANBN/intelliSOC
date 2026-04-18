#!/usr/bin/env python3
"""
False Positive Seed: Legitimate Admin Backup Transfer
Purpose: Prove the model can classify BENIGN traffic correctly.

This script simulates a DevOps backup agent:
  - Transfers 80MB to a "whitelisted" S3 endpoint (mocked as /api/backup-sink)
  - Runs during business hours
  - Uses a known process name: backup_agent.py
  - Destination is whitelisted in the correlation engine

Correlation engine Rule 3 should classify this as BENIGN because:
  - Destination IP is in the whitelist
  - Process name matches known backup agent
  - Transfer happens during business hours (09:00–17:00)
"""
import os
import socket
import time
import logging
from datetime import datetime

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [BACKUP_AGENT] %(levelname)s %(message)s"
)
log = logging.getLogger("backup_agent")

TARGET_IP  = os.getenv("TARGET_IP", "172.25.0.20")
HTTP_PORT  = int(os.getenv("TARGET_HTTP_PORT", "8000"))

# Simulate S3-compatible whitelisted destination
BACKUP_DEST_IP   = "10.0.0.254"   # Internal S3 gateway — whitelisted
BACKUP_DEST_HOST = "s3.internal.corp"
BACKUP_SIZE_MB   = 80
CHUNK_SIZE       = 131072  # 128KB chunks — throttled, unlike malicious exfil


def is_business_hours() -> bool:
    """Check if current time is within business hours (9am–5pm)."""
    now = datetime.now()
    return 9 <= now.hour < 17


def run_backup(target_ip: str, port: int, size_mb: int):
    """Simulate a legitimate backup transfer via HTTP PUT to /api/backup-sink."""
    total_bytes = size_mb * 1024 * 1024
    sent = 0
    chunk_num = 0

    log.info(f"[backup_agent.py] Starting backup: {size_mb}MB → {BACKUP_DEST_HOST}")
    log.info(f"  Business hours: {is_business_hours()}")
    log.info(f"  This transfer should be classified as BENIGN by correlation engine")

    while sent < total_bytes:
        chunk = os.urandom(min(CHUNK_SIZE, total_bytes - sent))
        chunk_size = len(chunk)

        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(10.0)
            s.connect((target_ip, port))

            http_request = (
                f"PUT /api/backup-sink HTTP/1.1\r\n"
                f"Host: {BACKUP_DEST_HOST}\r\n"
                f"Content-Type: application/octet-stream\r\n"
                f"Content-Length: {chunk_size}\r\n"
                f"X-Process-Name: backup_agent.py\r\n"
                f"X-Destination: {BACKUP_DEST_IP}\r\n"
                f"X-Backup-Chunk: {chunk_num}\r\n"
                f"Connection: close\r\n"
                f"\r\n"
            ).encode()

            s.sendall(http_request + chunk)
            time.sleep(0.1)
            s.close()

            sent += chunk_size
            chunk_num += 1
            log.info(f"  Chunk {chunk_num}: {sent/1024/1024:.1f}MB / {size_mb}MB")

        except (ConnectionRefusedError, socket.timeout, OSError) as e:
            log.warning(f"  Backup chunk error: {e}")
            time.sleep(2)

        # Throttled — legitimate backup is polite about bandwidth
        time.sleep(0.3)

    log.info(f"[backup_agent.py] Backup complete: {sent/1024/1024:.1f}MB transferred")


def main():
    log.info("═══ Starting Legitimate Admin Backup (False Positive Seed) ═══")
    run_backup(TARGET_IP, HTTP_PORT, BACKUP_SIZE_MB)
    log.info("═══ Backup Agent Complete (Expected: BENIGN classification) ═══")


if __name__ == "__main__":
    main()
