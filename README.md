# 🛡️ intelli-SOC — AI-Driven Threat Detection & Simulation Engine
> **Hack Malenadu '26 | Cybersecurity Track | Problem Statement 3**

intelli-SOC is a next-generation Security Operations Center (SOC) platform that leverages Machine Learning, real-time network analysis, and endpoint telemetry to detect and respond to advanced cyber threats. Built for high throughput and explainable AI, it bridges the gap between black-box detection and actionable response.

---

## 🌟 Key Features

- **🧠 Explainable AI (XAI)**: Uses **XGBoost 2.0** with **SHAP** values to provide human-readable explanations for every alert. No more "the model said so"—know *why* it flagged a flow.
- **🔄 Cross-Layer Correlation**: Merges **Network (Scapy)** and **Endpoint (auditd/psutil)** signals to detect sophisticated lateral movement and data exfiltration.
- **⚡ High Throughput**: Powered by **Redis Streams** and **FastAPI**, capable of processing 100k+ events per second with sub-500ms inference latency.
- **🎯 MITRE ATT&CK Mapping**: Every detection is automatically mapped to MITRE techniques (T1110.001, T1071.001, etc.) and visualized in a dedicated MITRE panel.
- **📜 Automated Playbooks**: Context-aware response playbooks that pre-fill commands with real IPs, PIDs, and timestamps for rapid incident response.
- **🛡️ False Positive Suppression**: Rule-based correlator with confidence thresholds and whitelisting to reduce alert fatigue.
- **🔍 Threat Hunt Mode**: Uses **DBSCAN clustering** for anomaly detection, surfacing zero-day threats that haven't been seen by the model.

---

## 🏗️ Architecture

intelli-SOC operates on a distributed containerized architecture designed for scalability and isolation.

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

### Data Pipeline
1. **Capture**: Scapy sniffs network packets; auditd monitors system calls.
2. **Normalize**: Raw data is converted into structured features (flow metrics, process metadata).
3. **Inference**: XGBoost model predicts threat category in 500ms windows.
4. **Correlate**: Logic layer validates model output against heuristic rules and endpoint state.
5. **Stream**: Alerts are pushed to Redis Streams and broadcasted via WebSockets.
6. **Visualize**: React Dashboard renders real-time incidents and MITRE maps.

---

## 🛠️ Tech Stack

| Layer | Technology |
|:---|:---|
| **Machine Learning** | XGBoost 2.0, scikit-learn, SHAP, SMOTE |
| **Detection Agent** | Python 3.11, Scapy, psutil, auditd |
| **Backend API** | FastAPI, Uvicorn, Redis Streams |
| **Frontend UI** | React 18, Recharts, Framer Motion |
| **Infrastructure** | Docker Compose, Kali Linux, Ubuntu 22.04 |
| **Dataset** | CICIDS 2017 (UNB) |

---

## 🚀 Quick Start

### 1. Prerequisites
- Docker & Docker Compose
- Node.js & npm (for local dashboard dev)
- Python 3.11+ (for ML training)

### 2. Setup Environment
```bash
cp .env.example .env  # Update ports if needed
```

### 3. Train the ML Model (Optional - Pre-trained included)
```bash
cd ml_training
pip install -r requirements.txt
python download_dataset.py   # ~1GB CICIDS 2017
python preprocess.py         # Clean + SMOTE balance
python train.py              # Train XGBoost
python export_model.py       # Export to user/agent/inference/models/
```

### 4. Launch with Docker
```bash
docker compose build
docker compose up -d
```

- **Dashboard**: [http://localhost:3000](http://localhost:3000)
- **API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🧪 Simulated Attack Vectors

You can launch orchestrated attacks via the interactive CLI to test detection:
```bash
docker exec -it intelli-soc-attacker python3 /app/scripts/attack_cli.py
```

| Threat | MITRE ID | Description |
|:---|:---|:---|
| **Brute Force** | T1110.001 | High-frequency SSH login attempts |
| **C2 Beaconing** | T1071.001 | Periodic fixed-payload heartbeats to external IPs |
| **Lateral Movement** | T1021.002 | Internal port scanning + discovery commands |
| **Data Exfiltration** | T1048.003 | Large outbound data transfers via HTTP POST |
| **False Positive** | — | Administrative backup simulation (Whitelisted) |

---

## 📊 Dashboard Overview

The SOC Dashboard provides a unified view of the security posture:
- **Incident Feed**: Real-time cards with SHAP explainability and quick-action playbooks.
- **MITRE Panel**: Dynamic grid highlighting active techniques.
- **Threat Timeline**: 15-minute rolling window of traffic spikes and incident frequency.
- **Severity Gauge**: Visual distribution of Low, Medium, High, and Critical threats.
- **System Health**: EPS (Events Per Second) monitor and service status.

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/health` | System status & model metadata |
| `GET` | `/api/incidents` | List recent security incidents |
| `GET` | `/api/playbook/{id}` | Dynamic response guide for incident |
| `GET` | `/api/mitre/navigator` | Export MITRE Navigator layer JSON |
| `WS` | `/ws/alerts` | Real-time WebSocket alert stream |

---

## 📂 Project Structure

```text
.
├── attacker/           # Attack simulation container & scripts
├── dashboard/          # React-based SOC interface
├── docs/               # Documentation & Demo scripts
├── ml_training/        # Model training pipeline (CICIDS 2017)
├── user/               # Victim container & Detection Agent
│   ├── agent/          # Core detection logic (Inference, Capture, etc.)
│   └── models/         # Pre-trained XGBoost artifacts
├── docker-compose.yml  # Orchestration
└── start.sh            # Global startup script
```

---

## 📜 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
*Developed for Hack Malenadu '26 by Team intelli-SOC.*
