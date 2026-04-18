"""
MITRE ATT&CK Mapper — Maps threat classes to MITRE technique IDs and details.
"""
from typing import Dict, Optional

MITRE_MAP: Dict[str, Dict] = {
    "BRUTE_FORCE": {
        "technique_id":   "T1110.001",
        "technique_name": "Brute Force: Password Guessing",
        "tactic":         "Credential Access",
        "url": "https://attack.mitre.org/techniques/T1110/001/",
        "secondary": {
            "technique_id":   "T1110.004",
            "technique_name": "Brute Force: Credential Stuffing",
            "tactic":         "Credential Access",
        }
    },
    "LATERAL_MOVEMENT": {
        "technique_id":   "T1021.002",
        "technique_name": "Remote Services: SMB/Windows Admin Shares",
        "tactic":         "Lateral Movement",
        "url": "https://attack.mitre.org/techniques/T1021/002/",
        "secondary": {
            "technique_id":   "T1046",
            "technique_name": "Network Service Discovery",
            "tactic":         "Discovery",
        }
    },
    "EXFILTRATION": {
        "technique_id":   "T1048.003",
        "technique_name": "Exfiltration Over Alternative Protocol",
        "tactic":         "Exfiltration",
        "url": "https://attack.mitre.org/techniques/T1048/003/",
        "secondary": None
    },
    "C2_BEACON": {
        "technique_id":   "T1071.001",
        "technique_name": "Application Layer Protocol: Web Protocols",
        "tactic":         "Command & Control",
        "url": "https://attack.mitre.org/techniques/T1071/001/",
        "secondary": {
            "technique_id":   "T1571",
            "technique_name": "Non-Standard Port",
            "tactic":         "Command & Control",
        }
    },
    "BENIGN": {
        "technique_id":   None,
        "technique_name": "No Technique — Benign Traffic",
        "tactic":         "N/A",
        "url":            None,
        "secondary":      None,
    }
}


def map_mitre(threat_class: str) -> Optional[str]:
    """Return primary MITRE technique ID for a threat class."""
    entry = MITRE_MAP.get(threat_class, MITRE_MAP["BENIGN"])
    return entry.get("technique_id")


def get_mitre_details(threat_class: str) -> dict:
    """Return full MITRE mapping details for a threat class."""
    return MITRE_MAP.get(threat_class, MITRE_MAP["BENIGN"]).copy()
