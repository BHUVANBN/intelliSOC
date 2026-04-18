"""
Endpoint Capture — auditd log reader + psutil process monitor.
Produces UnifiedEvent objects with endpoint context for the normalizer.
"""
from __future__ import annotations
import os
import re
import time
import logging
import threading
from typing import Optional, Dict, List
from datetime import datetime, timezone

try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False

from agent.normalization.schema import UnifiedEvent, EventLayer
from agent.normalization.normalizer import Normalizer

log = logging.getLogger("endpoint_capture")

AUDIT_LOG = "/var/log/audit/audit.log"

# Known safe process names (no alert for these)
WHITELIST_PROCESSES = {
    "sshd", "systemd", "bash", "python3", "uvicorn",
    "auditd", "rsyslogd", "cron", "redis-server",
}

# Discovery / lateral movement indicator commands
DISCOVERY_COMMANDS = {
    "whoami", "id", "hostname", "ip", "ifconfig",
    "netstat", "ss", "nmap", "arp", "route",
    "net", "ipconfig", "ps", "top",
}

# Lateral movement indicator keywords in audit keys
LATERAL_KEYS = {"discovery", "port_scan", "netcat"}


class AuditdReader:
    """Tail and parse auditd log for relevant security events."""

    EXECVE_RE = re.compile(
        r'type=EXECVE.*?argc=(\d+).*?a0="([^"]+)"',
        re.DOTALL
    )
    SYSCALL_RE = re.compile(
        r'type=SYSCALL.*?pid=(\d+).*?ppid=(\d+).*?uid=(\d+).*?key="([^"]+)"'
    )
    PATH_RE = re.compile(r'type=PATH.*?name="([^"]+)"')

    def __init__(self):
        self._position = 0
        self._fd: Optional[object] = None

    def open(self):
        try:
            self._fd = open(AUDIT_LOG, "r")
            self._fd.seek(0, 2)  # Seek to end (tail mode)
            self._position = self._fd.tell()
            log.info(f"auditd reader opened: {AUDIT_LOG}")
        except FileNotFoundError:
            log.warning(f"auditd log not found: {AUDIT_LOG}. Endpoint events from auditd disabled.")
            self._fd = None

    def read_new_events(self) -> List[dict]:
        """Read and parse new audit records since last read."""
        if self._fd is None:
            return []

        events = []
        try:
            self._fd.seek(self._position)
            lines = self._fd.readlines()
            self._position = self._fd.tell()

            block: List[str] = []
            for line in lines:
                if line.startswith("type=SYSCALL"):
                    if block:
                        parsed = self._parse_block(block)
                        if parsed:
                            events.append(parsed)
                    block = [line]
                else:
                    block.append(line)

            if block:
                parsed = self._parse_block(block)
                if parsed:
                    events.append(parsed)

        except (IOError, OSError) as e:
            log.debug(f"auditd read error: {e}")

        return events

    def _parse_block(self, block: List[str]) -> Optional[dict]:
        block_str = " ".join(block)
        syscall_m = self.SYSCALL_RE.search(block_str)
        execve_m  = self.EXECVE_RE.search(block_str)
        path_m    = self.PATH_RE.search(block_str)

        if not syscall_m:
            return None

        pid   = int(syscall_m.group(1))
        ppid  = int(syscall_m.group(2))
        uid   = int(syscall_m.group(3))
        key   = syscall_m.group(4)

        cmd   = execve_m.group(2) if execve_m else None
        path  = path_m.group(1)   if path_m  else None

        return {
            "pid": pid, "ppid": ppid, "uid": uid,
            "key": key, "cmd": cmd, "path": path,
            "timestamp": datetime.now(timezone.utc),
        }


class EndpointCapture:
    """Monitors endpoint events via auditd + psutil."""

    def __init__(self, normalizer: Normalizer):
        self.normalizer = normalizer
        self._running = False
        self._reader = AuditdReader()
        self._known_pids: Dict[int, dict] = {}
        log.info("EndpointCapture initialized")

    def _process_audit_event(self, ev: dict) -> Optional[UnifiedEvent]:
        """Convert raw audit event to UnifiedEvent."""
        cmd = os.path.basename(ev.get("cmd") or "unknown")
        key = ev.get("key", "")
        pid = ev.get("pid", 0)

        # Resolve username from UID
        try:
            import pwd
            user = pwd.getpwuid(ev.get("uid", 0)).pw_name
        except (KeyError, ImportError):
            user = str(ev.get("uid", 0))

        # Determine process name from psutil if possible
        process_name = cmd
        if PSUTIL_AVAILABLE and pid:
            try:
                proc = psutil.Process(pid)
                process_name = proc.name()
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass

        return UnifiedEvent(
            layer        = EventLayer.ENDPOINT,
            timestamp    = ev["timestamp"],
            process_name = process_name,
            parent_pid   = ev.get("ppid"),
            pid          = pid,
            user         = user,
            file_access  = [ev["path"]] if ev.get("path") else [],
            audit_key    = key,
            src_ip       = "127.0.0.1",
            dst_ip       = "127.0.0.1",
        )

    def _scan_processes(self):
        """Use psutil to find anomalous processes (orphaned, suspicious)."""
        if not PSUTIL_AVAILABLE:
            return

        for proc in psutil.process_iter(["pid", "name", "ppid", "username", "connections"]):
            try:
                info = proc.info
                pid = info["pid"]

                # Skip known processes
                if info["name"] in WHITELIST_PROCESSES:
                    continue

                # Check for orphaned process (ppid=1 but not systemd child)
                connections = info.get("connections", []) or []
                external_conns = [
                    c for c in connections
                    if c.status == "ESTABLISHED" and
                    c.raddr and not c.raddr.ip.startswith(("172.", "10.", "127."))
                ]

                if external_conns and info["ppid"] == 1:
                    # Orphaned process with external connection — C2 indicator
                    for conn in external_conns:
                        event = UnifiedEvent(
                            layer        = EventLayer.ENDPOINT,
                            process_name = info["name"],
                            parent_pid   = info["ppid"],
                            pid          = pid,
                            user         = info.get("username", "unknown"),
                            src_ip       = conn.laddr.ip if conn.laddr else "0.0.0.0",
                            dst_ip       = conn.raddr.ip,
                            src_port     = conn.laddr.port if conn.laddr else 0,
                            dst_port     = conn.raddr.port,
                            protocol     = "TCP",
                            audit_key    = "orphaned_external_conn",
                        )
                        self.normalizer.push(event)
                        log.info(
                            f"Orphaned proc alert: {info['name']} (pid={pid}) "
                            f"→ {conn.raddr.ip}:{conn.raddr.port}"
                        )

            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue

    def start(self):
        """Start endpoint monitoring (blocking loop)."""
        self._running = True
        self._reader.open()
        log.info("EndpointCapture started (auditd + psutil)")

        while self._running:
            # Process auditd events
            for ev in self._reader.read_new_events():
                unified = self._process_audit_event(ev)
                if unified:
                    self.normalizer.push(unified)
                    log.debug(f"Endpoint event: [{unified.audit_key}] "
                              f"{unified.process_name} (uid={unified.user})")

            # Scan running processes every 5s
            self._scan_processes()
            time.sleep(2)

    def stop(self):
        self._running = False
