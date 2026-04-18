# intelli-SOC Hackathon Demo Script
## Hack Malenadu '26 — Cybersecurity Track — Problem Statement 3

---

## Pre-Demo Checklist (5 min before presentation)

- [ ] `docker compose up` running (all 4 containers healthy)
- [ ] Dashboard open at http://localhost:3000
- [ ] API docs open at http://localhost:8000/docs
- [ ] Browser zoom at 90% for full dashboard visibility
- [ ] Attacker container ready (will auto-start after user is healthy)

---

## Demo Timeline (10 minutes)

### T+0:00 — System Overview (1 min)
**Say:** "intelli-SOC is a two-container AI threat detection platform. The attacker container simulates real adversary behavior; the user container runs our ML-powered detection stack."

- Show the dashboard header: **LIVE** status, EPS meter
- Point to the 4-container Docker Compose architecture in README

---

### T+0:30 — Baseline Benign Traffic (30s)
**Say:** "We start with benign traffic to establish a baseline. Notice the model correctly classifies normal flows as BENIGN."

- Dashboard shows 0 or low incidents
- Point to Severity Gauge — should be mostly BENIGN/LOW

---

### T+1:00 — Brute Force Attack Fires (2 min)
**Say:** "At T+10s after warm-up, the attacker launches an SSH brute force — 847 connection attempts in 60 seconds."

- Watch for **CRITICAL** alert: `BRUTE_FORCE | T1110.001`
- Click the incident card → expand → show:
  - Confidence: ~94%
  - SHAP features: `syn_flag_count`, `rst_flag_count`, `flow_packets_per_sec`
  - Plain-English explanation
- Click **Open Playbook** → show PlaybookDrawer
  - Walk through: Block IP → Lock account → Grep auth.log
  - Copy a command to clipboard
- **Key point:** "Every alert comes with MITRE mapping AND actionable steps."

---

### T+1:30 — False Positive Demo (1 min)
**Say:** "At T+15s, our admin backup agent runs — 80MB transfer to internal S3. Watch what happens."

- Dashboard should NOT show a HIGH/CRITICAL alert for backup traffic
- If a BENIGN/suppressed card appears, show the yellow FP badge
- **Key point:** "Rule 3 in our correlator whitelists known backup agents and destinations. No alert fatigue."

---

### T+2:00 — C2 Beacon Detected (1.5 min)
**Say:** "Simultaneously, a C2 beaconing channel is active — 64-byte pings every 30 seconds to a non-CDN external IP."

- Show **CRITICAL** alert: `C2_BEACON | T1071.001`
- Point to:
  - `flow_iat_std < 5s` (super regular interval)
  - Fixed `fwd_packet_len_mean = 64B`
  - `dst_ip = 198.51.100.77` (external, non-CDN)
- Open playbook → show **Isolate** step first (highest severity response)

---

### T+3:00 — Lateral Movement (2 min)
**Say:** "At T+60s, post-compromise lateral movement begins — internal port scan plus discovery commands."

- Show **CRITICAL** alert: `LATERAL_MOVEMENT | T1021.002 + T1046`
- Expand card → show **CROSS-LAYER** correlation note
  - "Network scan detected AND auditd shows whoami/id/netstat execution"
- Switch to **MITRE ATT&CK tab** — show detected technique grid
- Point out T1046 (Network Service Discovery) appearing alongside T1021.002

---

### T+4:00 — Data Exfiltration (1 min)
**Say:** "At T+120s, data exfiltration begins — 50MB in rapid POST requests to an external IP."

- Show **HIGH** alert: `EXFILTRATION | T1048.003`
- Point to `flow_bytes_per_sec` spike on Timeline tab

---

### T+5:00 — Dashboard Walkthrough (1 min)
**Say:** "Let me walk through the full dashboard."

- **Stat cards:** Total incidents, Critical count, High count, Threat classes
- **Timeline:** 15-min chart — show the spike at attack times
- **Severity Gauge:** Donut with distribution
- **MITRE Panel:** All 5 techniques detected
- **System Status:** Redis streaming, EPS counter

---

### T+6:00 — API Demo (30s)
**Say:** "The entire detection pipeline is API-first."

Open http://localhost:8000/docs:
- Call `GET /api/stats` → show incident counts
- Call `GET /api/mitre/navigator` → show Navigator layer JSON
- Call `GET /api/incidents` → show raw incident payload

---

### T+6:30 — Architecture & ML Summary (1 min)
**Say:** "Under the hood: XGBoost trained on CICIDS 2017 with SMOTE oversampling. SHAP values generate the plain-English explanations you saw on every alert. Inference runs in 500ms batches, Redis Streams handles 100k+ events/second."

- Show the 5-class model: BENIGN, BRUTE_FORCE, LATERAL_MOVEMENT, EXFILTRATION, C2_BEACON
- Mention fallback heuristic when model not loaded

---

## Key Differentiators to Emphasize

1. **Two signal layers:** Network (Scapy) + Endpoint (auditd/psutil) with cross-layer correlation
2. **Explainability:** SHAP per alert — not a black box
3. **False positive handling:** Rule-based suppression + model confidence threshold — the backup agent demo
4. **Dynamic playbooks:** Context-aware with real IPs, PIDs, timestamps pre-filled
5. **Production-grade:** Redis Streams, async FastAPI, WebSocket push, 500 eps capable

---

## Backup Talking Points

**Q: Why XGBoost over a neural network?**
> "XGBoost gives us 92%+ F1 on CICIDS with 10x faster inference — and SHAP has native support for tree models. A neural network would require LIME/SHAP approximations and longer training time with no F1 improvement on tabular security data."

**Q: How do you handle zero-day attacks the model hasn't seen?**
> "The heuristic layer catches behavioral anomalies regardless of known signatures. We also have Threat Hunt mode using DBSCAN clustering — low-confidence event clusters can surface slow-burn attacks below the alert threshold."

**Q: Can this scale to a real enterprise?**
> "Redis Streams supports 100k+ eps at single-node. The detection agent batches inference in 500ms windows — at 500 eps that's 250 events per batch, well within XGBoost's throughput. For enterprise scale, replace single Redis with Redis Cluster and run multiple detection agent replicas behind a load balancer."
