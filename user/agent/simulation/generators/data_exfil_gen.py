"""
Data Exfiltration Attack Log Generator
"""
import random
from typing import List, Dict, Any


class DataExfilGenerator:
    """Generates synthetic logs for data exfiltration simulation"""
    
    def __init__(self):
        self.source_host = "10.0.0.25"
        self.destination = "45.142.212.100"  # Suspicious external IP
        self.destination_domain = "cloud-backup-service.xyz"
        self.data_volume_mb = 150  # Total data to exfil
    
    def generate_events(self, duration_seconds: int) -> List[Dict[str, Any]]:
        """Generate data exfiltration timeline"""
        events = []
        
        # Phase 1: Data discovery (0-15 seconds)
        events.extend(self._generate_discovery())
        
        # Phase 2: Staging (15-30 seconds)
        events.extend(self._generate_staging())
        
        # Phase 3: Exfiltration via HTTPS (30-75 seconds)
        events.extend(self._generate_https_exfil(duration_seconds - 15))
        
        # Phase 4: Cleanup (last 15 seconds)
        events.extend(self._generate_cleanup())
        
        return events
    
    def _generate_discovery(self) -> List[Dict]:
        """Generate data discovery phase"""
        return [
            {
                "timestamp": 0,
                "layer": "endpoint",
                "type": "file_enumeration",
                "src_ip": self.source_host,
                "message": "Bulk file access in sensitive directories",
                "severity": "medium",
                "details": {
                    "directories": ["C:\\Data\\CustomerRecords", "C:\\Data\\Financial"],
                    "files_accessed": 127,
                    "file_types": [".xlsx",".csv",".pdf"]
                },
                "delay": 0
            },
            {
                "timestamp": 5,
                "layer": "endpoint",
                "type": "database_query",
                "src_ip": self.source_host,
                "message": "Large database query executed",
                "severity": "medium",
                "details": {
                    "database": "customer_db",
                    "query": "SELECT * FROM customers WHERE ...",
                    "rows_returned": 50000
                },
                "delay": 5
            },
            {
                "timestamp": 10,
                "layer": "endpoint",
                "type": "data_compression",
                "src_ip": self.source_host,
                "message": "Suspicious archive creation: data.zip",
                "severity": "high",
                "details": {
                    "archive_path": "C:\\Temp\\data.zip",
                    "size_mb": 145,
                    "compression_ratio": 0.15
                },
                "delay": 5
            }
        ]
    
    def _generate_staging(self) -> List[Dict]:
        """Generate staging phase"""
        return [
            {
                "timestamp": 15,
                "layer": "network",
                "type": "dns_query",
                "src_ip": self.source_host,
                "message": f"DNS query for {self.destination_domain}",
                "severity": "info",
                "details": {
                    "query": self.destination_domain,
                    "resolved_ip": self.destination
                },
                "delay": 5
            },
            {
                "timestamp": 20,
                "layer": "network",
                "type": "connection_established",
                "src_ip": self.source_host,
                "dst_ip": self.destination,
                "message": f"HTTPS connection established to {self.destination}",
                "severity": "info",
                "details": {
                    "port": 443,
                    "sni": self.destination_domain,
                    "ja3_fingerprint": "abc123..."
                },
                "delay": 5
            }
        ]
    
    def _generate_https_exfil(self, duration: float) -> List[Dict]:
        """Generate HTTPS exfiltration events"""
        events = []
        chunks = 15  # Number of chunks to send
        chunk_size = self.data_volume_mb / chunks
        interval = duration / chunks
        
        for i in range(chunks):
            timestamp = 30 + (i * interval)
            
            # HTTP POST with data chunk
            events.append({
                "timestamp": timestamp,
                "layer": "application",
                "type": "http_upload",
                "src_ip": self.source_host,
                "dst_ip": self.destination,
                "message": f"Large HTTPS POST to {self.destination_domain}/upload",
                "severity": "high",
                "details": {
                    "method": "POST",
                    "endpoint": "/upload/chunk",
                    "payload_size_mb": round(chunk_size, 2),
                    "content_type": "application/octet-stream",
                    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
                },
                "delay": interval * 0.8
            })
            
            # Network layer view
            events.append({
                "timestamp": timestamp + 0.5,
                "layer": "network",
                "type": "outbound_transfer",
                "src_ip": self.source_host,
                "dst_ip": self.destination,
                "message": f"Outbound data transfer: {chunk_size:.1f} MB",
                "severity": "high",
                "details": {
                    "bytes_sent": int(chunk_size * 1024 * 1024),
                    "duration_seconds": 3,
                    "protocol": "HTTPS"
                },
                "delay": interval * 0.2
            })
            
            # Trigger alert after significant data volume
            if i == 8:  # Alert at ~80 MB transferred
                events[-1]["trigger_alert"] = True
                events[-1]["confidence"] = 0.85
                events[-1]["severity"] = "high"
            
            if i == 14:  # Critical at full volume
                events[-1]["trigger_alert"] = True
                events[-1]["confidence"] = 0.96
                events[-1]["severity"] = "critical"
                events[-1]["message"] = f"CRITICAL: Large data exfiltration detected ({self.data_volume_mb} MB)"
        
        return events
    
    def _generate_cleanup(self) -> List[Dict]:
        """Generate cleanup phase"""
        return [
            {
                "timestamp": 80,
                "layer": "endpoint",
                "type": "file_deletion",
                "src_ip": self.source_host,
                "message": "Archive file deleted after transfer",
                "severity": "high",
                "details": {
                    "file": "C:\\Temp\\data.zip",
                    "method": "secure_delete"
                },
                "delay": 5
            },
            {
                "timestamp": 85,
                "layer": "endpoint",
                "type": "log_clearing",
                "src_ip": self.source_host,
                "message": "Windows Event Log cleared",
                "severity": "critical",
                "trigger_alert": True,
                "confidence": 0.94,
                "details": {
                    "logs_cleared": ["Security", "System"],
                    "method": "wevtutil cl"
                },
                "delay": 5
            }
        ]
