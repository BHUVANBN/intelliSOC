#!/bin/bash
set -e

echo "═══════════════════════════════════════════"
echo "  intelli-SOC Detection Agent Starting..."
echo "═══════════════════════════════════════════"

# Start auditd for endpoint monitoring
sed -i 's/priority_boost = 4/priority_boost = 0/' /etc/audit/auditd.conf || true
service auditd start || true
auditctl -R /etc/audit/rules.d/intelli-soc.rules 2>/dev/null || true
echo "[+] auditd started"

# Start SSH server (brute-force target)
service ssh start || true
echo "[+] sshd started on port 22"

# Wait for Redis
echo "[*] Waiting for Redis at ${REDIS_URL}..."
until python3 -c "import redis; r=redis.from_url('${REDIS_URL}'); r.ping()" 2>/dev/null; do
    sleep 1
done
echo "[+] Redis connected"

# Check model files exist
if [ ! -f /app/agent/inference/models/model.pkl ]; then
    echo "[!] WARNING: model.pkl not found. Running in HEURISTIC mode."
    echo "[!] Run: cd ml_training && python preprocess.py && python train.py && python export_model.py"
fi

# Launch the detection agent
echo "[+] Starting Detection Agent..."
cd /app
exec python3 -m agent.main
