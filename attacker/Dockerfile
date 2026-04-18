# ════════════════════════════════════════════════
# Attacker Container — Kali Linux Rolling
# ════════════════════════════════════════════════
FROM kalilinux/kali-rolling:latest

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends \
        python3 python3-pip python3-venv \
        nmap hydra hping3 netcat-openbsd curl wget \
        openssh-client iputils-ping net-tools iproute2 \
        && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt

COPY scripts/ ./scripts/

CMD ["python3", "scripts/run_all_attacks.py"]
