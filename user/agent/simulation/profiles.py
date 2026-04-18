"""
Attack Simulation Profiles
Define the structure and metadata for each attack type
"""

ATTACK_PROFILES = {
    "brute_force": {
        "name": "Brute Force Attack",
        "description": "Multiple failed authentication attempts followed by potential success. Simulates credential stuffing against SSH or web login.",
        "duration_seconds": 60,
        "mitre": {
            "tactic": "Credential Access",
            "technique": "Brute Force",
            "id": "T1110"
        },
        "icon": "🔐",
        "severity": "High",
        "indicators": [
            "Multiple failed logins from same IP",
            "Rapid authentication attempts",
            "Distributed attempts (optional)",
            "Success after many failures"
        ],
        "playbook": [
            {"step": 1, "action": "Block source IP address", "urgency": "immediate"},
            {"step": 2, "action": "Review authentication logs for successful login", "urgency": "high"},
            {"step": 3, "action": "Force password reset for targeted accounts", "urgency": "high"},
            {"step": 4, "action": "Enable MFA if not already active", "urgency": "medium"},
            {"step": 5, "action": "Monitor for lateral movement from compromised account", "urgency": "medium"}
        ]
    },
    
    "c2_beacon": {
        "name": "C2 Beaconing",
        "description": "Periodic communication between infected host and command & control server. Low and slow pattern typical of APTs.",
        "duration_seconds": 120,
        "mitre": {
            "tactic": "Command and Control",
            "technique": "Application Layer Protocol",
            "id": "T1071"
        },
        "icon": "📡",
        "severity": "High",
        "indicators": [
            "Regular interval connections",
            "Small payload size (200-500 bytes)",
            "External domain/IP communication",
            "User-Agent anomalies"
        ],
        "playbook": [
            {"step": 1, "action": "Isolate infected host from network", "urgency": "immediate"},
            {"step": 2, "action": "Block C2 domain/IP at firewall/DNS", "urgency": "immediate"},
            {"step": 3, "action": "Capture memory dump for forensics", "urgency": "high"},
            {"step": 4, "action": "Hunt for persistence mechanisms", "urgency": "high"},
            {"step": 5, "action": "Scan for malware indicators", "urgency": "medium"}
        ]
    },
    
    "lateral_movement": {
        "name": "Lateral Movement",
        "description": "Attacker spreads through internal network after initial compromise. Uses SMB, WMI, or PowerShell remoting.",
        "duration_seconds": 90,
        "mitre": {
            "tactic": "Lateral Movement",
            "technique": "Remote Services",
            "id": "T1021"
        },
        "icon": "🕸️",
        "severity": "Critical",
        "indicators": [
            "Internal connections to new hosts",
            "SMB/RDP traffic patterns",
            "PowerShell remoting",
            "Credential usage on multiple systems"
        ],
        "playbook": [
            {"step": 1, "action": "Disable compromised accounts", "urgency": "immediate"},
            {"step": 2, "action": "Block SMB between workstations", "urgency": "immediate"},
            {"step": 3, "action": "Enable enhanced logging on all systems", "urgency": "high"},
            {"step": 4, "action": "Hunt for persistence on all potentially touched systems", "urgency": "high"},
            {"step": 5, "action": "Review domain controller access logs", "urgency": "high"}
        ]
    },
    
    "data_exfiltration": {
        "name": "Data Exfiltration",
        "description": "Unusual data transfer from internal systems to external destinations. May use DNS tunneling or direct upload.",
        "duration_seconds": 90,
        "mitre": {
            "tactic": "Exfiltration",
            "technique": "Exfiltration Over C2 Channel",
            "id": "T1041"
        },
        "icon": "💎",
        "severity": "Critical",
        "indicators": [
            "Large outbound data transfer",
            "Unusual destination geolocation",
            "Off-hours data movement",
            "DNS tunneling patterns (optional)"
        ],
        "playbook": [
            {"step": 1, "action": "Block external destination IP/domain", "urgency": "immediate"},
            {"step": 2, "action": "Rate limit egress traffic", "urgency": "immediate"},
            {"step": 3, "action": "Identify what data was accessed", "urgency": "high"},
            {"step": 4, "action": "Notify data owner and legal if PII involved", "urgency": "high"},
            {"step": 5, "action": "Review DLP policies", "urgency": "medium"}
        ]
    }
}
