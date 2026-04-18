# intelli-SOC — AI-Driven Threat Detection & Simulation Engine
> Hack Malenadu '26 | Cybersecurity Track | Problem Statement 3

[![Python](https://img.shields.io/badge/Python-3.11-blue)](https://python.org)
[![XGBoost](https://img.shields.io/badge/ML-XGBoost-orange)](https://xgboost.ai)
[![React](https://img.shields.io/badge/Dashboard-React_18-61dafb)](https://react.dev)
[![Docker](https://img.shields.io/badge/Infra-Docker_Compose-2496ED)](https://docker.com)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     threat_net (172.25.0.0/24)              │
│                                                             │
│  ┌──────────────┐    traffic    ┌──────────────────────────┐│
│  │   ATTACKER   │ ────────────► │        USER / VICTIM     ││
│  │  Kali Linux  │               │  Detection Agent         ││
│  │  172.25.0.30 │               │  FastAPI + WebSocket     ││
│  │              │               │  172.25.0.20             ││
│  └──────────────┘               └────────────┬─────────────┘│
│                                              │              │
│  ┌─────────────┐                ┌────────────▼─────────────┐│
│  │   Redis 7   │ ◄──────────── │   Correlator + Playbook  ││
│  │  172.25.0.10│                │   ML Inference (XGBoost) ││
│  └─────────────┘                └──────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │  React SOC Dashboard│
                    │   localhost:3000   │
                    └────────────────────┘
```

## Quick Start

### Step 1 — Train the ML model (one-time, offline)
```bash
cd ml_training
pip install -r requirements.txt
python download_dataset.py   # ~1GB CICIDS 2017 download
python preprocess.py         # Clean + SMOTE balance
python train.py              # Train XGBoost + RF
python evaluate.py           # Print classification report
python export_model.py       # Copy artifacts to user/agent/inference/models/
```

### Step 2 — Build Docker images
```bash
docker compose build
```

### Step 3 — Start the dashboard (dev mode)
```bash
cd dashboard
npm install
npm start
# Dashboard available at http://localhost:3000
```

### Step 4 — Launch the simulation
```bash
docker compose up -d
# API:       http://localhost:8001/docs
# Dashboard: http://localhost:3001
```

### Step 5 — Orchestrate Attacks (Manual/Interactive)
You can launch attacks manually using the interactive CLI within the attacker container:
```bash
docker exec -it intelli-soc-attacker python3 /app/scripts/attack_cli.py
```
This tool allows you to:
- Run specific attack vectors (Brute Force, Exfiltration, etc.)
- Launch a full multi-layer attack chain
- Customize an attack sequence with specific modules

---

## Detection Capabilities

| Threat Category | MITRE ID | Detection Signal | Severity |
|----------------|----------|-----------------|----------|
| Brute Force | T1110.001 | 847+ SYN/s, high RST ratio | CRITICAL |
| Lateral Movement | T1021.002 + T1046 | Internal port scan + auditd discovery commands | CRITICAL |
| Data Exfiltration | T1048.003 | >500KB/s outbound to non-whitelisted IP | HIGH |
| C2 Beaconing | T1071.001 | Low IAT-std, fixed 64B payload, orphaned process | CRITICAL |
| False Positive | — | backup_agent.py to whitelisted S3 → BENIGN | — |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| ML | XGBoost 2.0 + scikit-learn + SHAP |
| Detection Agent | Python 3.11 + Scapy + psutil + auditd |
| Backend API | FastAPI + Uvicorn + Redis Streams |
| Dashboard | React 18 + Recharts + WebSocket |
| Infrastructure | Docker Compose + Kali Linux + Ubuntu 22.04 |
| Dataset | CICIDS 2017 (UNB) |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | System health + model status |
| GET | `/api/incidents` | Recent incidents (newest first) |
| GET | `/api/incidents/{id}` | Single incident detail |
| GET | `/api/playbook/{id}` | Response playbook for incident |
| GET | `/api/stats` | Aggregated detection stats |
| GET | `/api/mitre` | Detected ATT&CK techniques |
| GET | `/api/mitre/navigator` | MITRE Navigator layer JSON |
| WS  | `/ws/alerts` | Real-time incident stream |

## Demo Script

See `docs/demo_script.md` for the full timed hackathon demo guide.
