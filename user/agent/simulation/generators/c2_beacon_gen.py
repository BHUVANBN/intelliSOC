"""
C2 Beaconing Attack Log Generator
"""
import random
from typing import List, Dict, Any


class C2BeaconGenerator:
    """Generates synthetic logs for C2 beaconing simulation"""
    
    def __init__(self):
        self.infected_host = "10.0.0.15"
        self.c2_server = "185.220.101.45"
        self.c2_domain = "secure-updates.org"
        self.beacon_interval = 30  # seconds between beacons
    
    def generate_events(self, duration_seconds: int) -> List[Dict[str, Any]]:
        """Generate C2 beaconing timeline"""
        events = []
        
        # Initial compromise (first 10 seconds)
        events.extend(self._generate_initial_compromise())
        
        # Beaconing phase
        num_beacons = duration_seconds // self.beacon_interval
        for i in range(num_beacons):
            beacon_time = 10 + (i * self.beacon_interval)
            
            # DNS query
            events.append({
                "timestamp": beacon_time,
                "layer": "network",
                "type": "dns_query",
                "src_ip": self.infected_host,
                "message": f"DNS query for {self.c2_domain}",
                "severity": "info",
                "details": {
                    "query": self.c2_domain,
                    "query_type": "A",
                    "response": self.c2_server
                },
                "delay": self.beacon_interval * 0.3
            })
            
            # HTTPS beacon (small payload)
            jitter = random.uniform(-2, 2)  # Add jitter to make it realistic
            events.append({
                "timestamp": beacon_time + 1 + jitter,
                "layer": "application",
                "type": "http_request",
                "src_ip": self.infected_host,
                "dst_ip": self.c2_server,
                "dst_port": 443,
                "message": f"HTTPS POST to {self.c2_domain}/api/check-in",
                "severity": "low",
                "details": {
                    "method": "POST",
                    "endpoint": "/api/check-in",
                    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "payload_size": random.randint(200, 500),
                    "status_code": 200
                },
                "delay": 1
            })
            
            # Command response (from C2)
            events.append({
                "timestamp": beacon_time + 2 + jitter,
                "layer": "application",
                "type": "http_response",
                "src_ip": self.c2_server,
                "dst_ip": self.infected_host,
                "message": f"Response from C2 server with commands",
                "severity": "low",
                "details": {
                    "status_code": 200,
                    "payload_size": random.randint(100, 300),
                    "commands": ["collect_info", "upload_data"]
                },
                "delay": 0.5
            })
            
            # Trigger alert after 3rd beacon (established pattern)
            if i == 3:
                events[-1]["trigger_alert"] = True
                events[-1]["confidence"] = 0.88
                events[-1]["severity"] = "high"
            
            # Endpoint activity (executing C2 commands)
            if i >= 2:
                events.append({
                    "timestamp": beacon_time + 5,
                    "layer": "endpoint",
                    "type": "process_execution",
                    "src_ip": self.infected_host,
                    "message": f"Suspicious process execution: powershell.exe -enc UwB0AGEAcgB0AC0AUwBs"[:50] + "...",
                    "severity": "high",
                    "details": {
                        "process": "powershell.exe",
                        "parent": "svchost.exe",
                        "command_line": "powershell -enc [base64]",
                        "user": "SYSTEM"
                    },
                    "delay": 3
                })
        
        return events
    
    def _generate_initial_compromise(self) -> List[Dict]:
        """Generate initial infection events"""
        return [
            {
                "timestamp": 0,
                "layer": "endpoint",
                "type": "file_created",
                "src_ip": self.infected_host,
                "message": f"Suspicious file created: C:\\Users\\Public\\update.exe",
                "severity": "medium",
                "details": {
                    "file_path": "C:\\Users\\Public\\update.exe",
                    "file_hash": "a1b2c3d4e5f6...",
                    "size": 245760
                },
                "delay": 0
            },
            {
                "timestamp": 2,
                "layer": "endpoint",
                "type": "registry_modification",
                "src_ip": self.infected_host,
                "message": f"Registry key modified for persistence",
                "severity": "high",
                "details": {
                    "key": "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
                    "value": "UpdateService"
                },
                "delay": 2
            },
            {
                "timestamp": 5,
                "layer": "network",
                "type": "first_contact",
                "src_ip": self.infected_host,
                "dst_ip": self.c2_server,
                "message": f"First contact with external server {self.c2_server}",
                "severity": "medium",
                "details": {
                    "destination": self.c2_domain,
                    "port": 443
                },
                "delay": 3
            }
        ]
