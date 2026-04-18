"""
Lateral Movement Attack Log Generator
"""
import random
from typing import List, Dict, Any


class LateralMovementGenerator:
    """Generates synthetic logs for lateral movement simulation"""
    
    def __init__(self):
        self.initial_compromised = "10.0.0.15"
        self.target_hosts = ["10.0.0.5", "10.0.0.10", "10.0.0.20", "10.0.0.25"]
        self.domain_controller = "10.0.0.2"
        self.compromised_creds = {"username": "jdoe", "password": "Summer2023!"}
    
    def generate_events(self, duration_seconds: int) -> List[Dict[str, Any]]:
        """Generate lateral movement timeline"""
        events = []
        
        # Phase 1: Reconnaissance (0-15 seconds)
        events.extend(self._generate_recon())
        
        # Phase 2: Credential discovery (15-30 seconds)
        events.extend(self._generate_cred_harvest())
        
        # Phase 3: First hop - Spread to workstation (30-45 seconds)
        events.extend(self._generate_first_lateral_move())
        
        # Phase 4: Second hop - Another workstation (45-60 seconds)
        events.extend(self._generate_second_lateral_move())
        
        # Phase 5: Domain Controller access (60-75 seconds)
        events.extend(self._generate_dc_access())
        
        # Phase 6: Persistence and cleanup (75-90 seconds)
        events.extend(self._generate_persistence())
        
        return events
    
    def _generate_recon(self) -> List[Dict]:
        """Generate network reconnaissance"""
        return [
            {
                "timestamp": 0,
                "layer": "network",
                "type": "smb_scan",
                "src_ip": self.initial_compromised,
                "message": "SMB port scan of internal subnet 10.0.0.0/24",
                "severity": "medium",
                "details": {
                    "ports_scanned": [139, 445],
                    "hosts_found": len(self.target_hosts)
                },
                "delay": 0
            },
            {
                "timestamp": 5,
                "layer": "network",
                "type": "ldap_query",
                "src_ip": self.initial_compromised,
                "dst_ip": self.domain_controller,
                "message": "LDAP query for domain computers",
                "severity": "medium",
                "details": {"query": "(&(objectCategory=computer)(operatingSystem=*))"},
                "delay": 5
            },
            {
                "timestamp": 10,
                "layer": "endpoint",
                "type": "command_execution",
                "src_ip": self.initial_compromised,
                "message": "net view /domain executed",
                "severity": "medium",
                "details": {"command": "net view /domain", "output": "List of domain computers"},
                "delay": 5
            }
        ]
    
    def _generate_cred_harvest(self) -> List[Dict]:
        """Generate credential harvesting"""
        return [
            {
                "timestamp": 15,
                "layer": "endpoint",
                "type": "process_injection",
                "src_ip": self.initial_compromised,
                "message": "LSASS process accessed (credential dumping)",
                "severity": "critical",
                "trigger_alert": True,
                "confidence": 0.95,
                "details": {
                    "target_process": "lsass.exe",
                    "access_type": "PROCESS_VM_READ",
                    "tool": "mimikatz"
                },
                "delay": 5
            },
            {
                "timestamp": 20,
                "layer": "endpoint",
                "type": "file_access",
                "src_ip": self.initial_compromised,
                "message": "SAM database accessed",
                "severity": "high",
                "details": {
                    "files": ["C:\\Windows\\System32\\config\\SAM", "C:\\Windows\\System32\\config\\SYSTEM"],
                    "access_type": "read"
                },
                "delay": 5
            }
        ]
    
    def _generate_first_lateral_move(self) -> List[Dict]:
        """Generate first lateral movement to target host"""
        target = self.target_hosts[0]
        return [
            {
                "timestamp": 30,
                "layer": "network",
                "type": "smb_connection",
                "src_ip": self.initial_compromised,
                "dst_ip": target,
                "message": f"SMB connection to {target} using {self.compromised_creds['username']}",
                "severity": "high",
                "details": {
                    "share": "ADMIN$",
                    "auth_method": "NTLM",
                    "username": self.compromised_creds['username']
                },
                "delay": 5
            },
            {
                "timestamp": 32,
                "layer": "endpoint",
                "type": "service_creation",
                "src_ip": target,
                "message": f"New service created on {target}: 'WindowsUpdate'",
                "severity": "critical",
                "trigger_alert": True,
                "confidence": 0.90,
                "details": {
                    "service_name": "WindowsUpdate",
                    "binary_path": "C:\\Windows\\Temp\\svchost.exe",
                    "start_type": "Automatic"
                },
                "delay": 2
            },
            {
                "timestamp": 35,
                "layer": "network",
                "type": "psexec_usage",
                "src_ip": self.initial_compromised,
                "dst_ip": target,
                "message": f"PsExec used to execute commands on {target}",
                "severity": "critical",
                "details": {
                    "tool": "PsExec",
                    "command": "cmd.exe",
                    "parent": "services.exe"
                },
                "delay": 3
            }
        ]
    
    def _generate_second_lateral_move(self) -> List[Dict]:
        """Generate second lateral movement"""
        target = self.target_hosts[1]
        return [
            {
                "timestamp": 45,
                "layer": "network",
                "type": "wmi_connection",
                "src_ip": self.target_hosts[0],  # From first compromised host
                "dst_ip": target,
                "message": f"WMI connection from {self.target_hosts[0]} to {target}",
                "severity": "high",
                "details": {
                    "namespace": "root\\cimv2",
                    "query": "SELECT * FROM Win32_Process"
                },
                "delay": 5
            },
            {
                "timestamp": 50,
                "layer": "endpoint",
                "type": "remote_process",
                "src_ip": target,
                "message": f"Remote process creation detected on {target}",
                "severity": "critical",
                "trigger_alert": True,
                "confidence": 0.93,
                "details": {
                    "process": "powershell.exe",
                    "parent": "wmiprvse.exe",
                    "remote_source": self.target_hosts[0]
                },
                "delay": 5
            }
        ]
    
    def _generate_dc_access(self) -> List[Dict]:
        """Generate domain controller access"""
        return [
            {
                "timestamp": 60,
                "layer": "network",
                "type": "ldap_admin",
                "src_ip": self.target_hosts[1],
                "dst_ip": self.domain_controller,
                "message": f"LDAP bind with admin credentials from {self.target_hosts[1]}",
                "severity": "critical",
                "trigger_alert": True,
                "confidence": 0.97,
                "details": {
                    "bind_type": "simple",
                    "username": "DOMAIN\\administrator",
                    "objects_accessed": ["CN=Users", "CN=Computers"]
                },
                "delay": 5
            },
            {
                "timestamp": 65,
                "layer": "application",
                "type": "dcsync",
                "src_ip": self.target_hosts[1],
                "dst_ip": self.domain_controller,
                "message": "DCSync attack detected - replication of domain credentials",
                "severity": "critical",
                "details": {
                    "replication_partner": self.target_hosts[1],
                    "data_replicated": "NTDS.dit hashes"
                },
                "delay": 5
            }
        ]
    
    def _generate_persistence(self) -> List[Dict]:
        """Generate persistence mechanisms"""
        events = []
        for host in [self.target_hosts[0], self.domain_controller]:
            events.append({
                "timestamp": 75 + random.randint(0, 10),
                "layer": "endpoint",
                "type": "scheduled_task",
                "src_ip": host,
                "message": f"Scheduled task created on {host}",
                "severity": "high",
                "details": {
                    "task_name": "SystemUpdate",
                    "command": "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
                    "trigger": "At logon"
                },
                "delay": 3
            })
        return events
