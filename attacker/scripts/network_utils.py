#!/usr/bin/env python3

import os
import subprocess
import random
import socket
import logging

log = logging.getLogger("network_utils")

def setup_ip_aliases(count=50, subnet_prefix="172.25.0."):
    """
    Assigns multiple IP aliases to the eth0 interface.
    Default range: 172.25.0.100 - 172.25.0.150
    """
    log.info(f"Setting up {count} IP aliases on eth0...")
    for i in range(100, 100 + count):
        ip = f"{subnet_prefix}{i}"
        # We ignore errors if the IP is already assigned
        subprocess.run(
            ["ip", "addr", "add", f"{ip}/24", "dev", "eth0"],
            capture_output=True,
            check=False
        )
    log.info("IP aliasing complete.")

def get_random_ip(subnet_prefix="172.25.0."):
    """Returns a random IP from the assigned aliases."""
    return f"{subnet_prefix}{random.randint(100, 149)}"

def create_spoofed_socket():
    """Returns a socket bound to a random source IP if aliasing is enabled."""
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    
    if os.getenv("DYNAMIC_ATTACK_IP", "false").lower() == "true":
        try:
            src_ip = get_random_ip()
            s.bind((src_ip, 0))
            # Tag the log if possible or just rely on OS
        except OSError:
            # If IPs aren't set up yet, do it once
            setup_ip_aliases()
            try:
                src_ip = get_random_ip()
                s.bind((src_ip, 0))
            except OSError:
                pass # Fallback to default IP if it fails
    return s
