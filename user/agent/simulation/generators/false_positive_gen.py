"""
False Positive Generator
Simulates a legitimate admin performing bulk file transfers
that superficially resembles data exfiltration
"""
from typing import List, Dict, Any


class FalsePositiveGenerator:
    """
    Generates logs for a legitimate admin backup job.
    Looks like exfiltration on the surface but has key
    differentiators that the reasoning engine will catch.
    """

    def __init__(self):
        self.admin_host = "10.0.0.50"
        self.backup_destination = "52.92.100.15"   # AWS S3
        self.backup_domain = "company-backup.s3.amazonaws.com"
        self.admin_user = "svc_backup"
        self.data_volume_mb = 200

    def generate_events(self, duration_seconds: int) -> List[Dict[str, Any]]:
        events = []

        # Scheduled task trigger (legitimate)
        events.append({
            "timestamp": 0,
            "layer": "endpoint",
            "type": "scheduled_task_run",
            "src_ip": self.admin_host,
            "user": self.admin_user,
            "message": f"Scheduled backup task started by {self.admin_user}",
            "severity": "info",
            "details": {
                "task_name": "DailyBackup",
                "trigger": "Scheduled - 09:00 daily",
                "user": self.admin_user
            },
            "delay": 0
        })

        # File access (looks like enumeration but is scheduled)
        events.append({
            "timestamp": 5,
            "layer": "endpoint",
            "type": "file_enumeration",
            "src_ip": self.admin_host,
            "user": self.admin_user,
            "message": f"Bulk file read by {self.admin_user} — daily backup job",
            "severity": "low",
            "details": {
                "directories": ["C:\\Data\\"],
                "files_accessed": 200,
                "file_types": [".xlsx", ".pdf", ".docx"],
                "user": self.admin_user,
                "process": "backup_agent.exe"
            },
            "delay": 5
        })

        # DNS to known corporate S3
        events.append({
            "timestamp": 15,
            "layer": "network",
            "type": "dns_query",
            "src_ip": self.admin_host,
            "message": f"DNS query for {self.backup_domain}",
            "severity": "info",
            "details": {
                "query": self.backup_domain,
                "resolved_ip": self.backup_destination,
                "known_good": True
            },
            "delay": 5
        })

        # Large upload — THIS triggers surface-level exfil alert
        chunks = 10
        chunk_size = self.data_volume_mb / chunks
        for i in range(chunks):
            events.append({
                "timestamp": 20 + i * 4,
                "layer": "application",
                "type": "http_upload",
                "src_ip": self.admin_host,
                "dst_ip": self.backup_destination,
                "user": self.admin_user,
                "message": f"HTTPS upload to {self.backup_domain} — chunk {i+1}/{chunks}",
                "severity": "medium",
                "details": {
                    "method": "PUT",
                    "endpoint": f"/company-backup/daily/{i+1}",
                    "payload_size_mb": round(chunk_size, 2),
                    "user_agent": "BackupAgent/2.1",
                    "status_code": 200,
                    "destination": self.backup_domain,
                    "user": self.admin_user,
                    "aws_authenticated": True
                },
                "delay": 4,
                # Trigger surface alert at chunk 5 — but reasoning will flag as FP
                "trigger_alert": i == 4,
                "confidence": 0.45,  # Low confidence — FP indicator
                "is_false_positive": True
            })

        return events