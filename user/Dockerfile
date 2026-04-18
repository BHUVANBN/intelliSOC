# ════════════════════════════════════════════════
# User / Victim Container — Ubuntu 22.04 LTS
# ════════════════════════════════════════════════
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# System dependencies
RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends \
        python3.11 python3.11-venv python3-pip \
        tcpdump libpcap-dev \
        auditd audispd-plugins \
        curl wget net-tools iproute2 iptables \
        openssh-server \
        && apt-get clean && rm -rf /var/lib/apt/lists/*

# Use python3.11 as default
RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1

WORKDIR /app

COPY requirements.txt .
RUN pip3 install --no-cache-dir --default-timeout=1000 -r requirements.txt

COPY agent/ ./agent/

# Configure SSH server (weak creds for brute-force simulation)
RUN mkdir /var/run/sshd && \
    echo 'root:toor' | chpasswd && \
    sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config && \
    sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config

# Configure auditd rules for endpoint monitoring
COPY auditd.rules /etc/audit/rules.d/intelli-soc.rules

EXPOSE 22 8000

# Start auditd, sshd, then detection agent
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
CMD ["/entrypoint.sh"]
