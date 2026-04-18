#!/bin/bash
# intelli-SOC — Launcher Script
# Hack Malenadu '26 | Cybersecurity Track | Problem Statement 3

# ANSI colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

API_PORT=${API_PORT:-8000}
DASHBOARD_PORT=${DASHBOARD_PORT:-3000}
REDIS_PORT=${REDIS_PORT:-6379}

echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}           intelli-SOC — AI Threat Engine Launcher         ${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"

# Check for docker
if ! [ -x "$(command -v docker)" ]; then
  echo -e "${RED}Error: docker is not installed.${NC}" >&2
  exit 1
fi

# Check for docker-compose
if ! [ -x "$(command -v docker-compose)" ] && ! docker compose version > /dev/null 2>&1; then
  echo -e "${RED}Error: docker-compose is not installed.${NC}" >&2
  exit 1
fi

echo -e "${BLUE}[1/3] Building containers...${NC}"
docker compose build

echo -e "${BLUE}[2/3] Starting services...${NC}"
docker compose up -d

echo -e "${BLUE}[3/3] Waiting for API to be healthy...${NC}"
MAX_RETRIES=30
RETRY_COUNT=0
until curl --output /dev/null --silent --head --fail http://localhost:${API_PORT}/health; do
    printf '.'
    sleep 2
    RETRY_COUNT=$((RETRY_COUNT+1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo -e "${RED}\nError: API failed to start within timeout.${NC}"
        docker compose logs user
        exit 1
    fi
done

echo -e "\n${GREEN}✔ intelli-SOC is UP and RUNNING!${NC}"
echo -e "${YELLOW}Dashboard:${NC} http://localhost:${DASHBOARD_PORT}"
echo -e "${YELLOW}API Docs: ${NC} http://localhost:${API_PORT}/docs"
echo -e "${YELLOW}Redis:    ${NC} localhost:${REDIS_PORT}"

echo -e "\n${BLUE}To see detection logs, run:${NC}"
echo -e "  docker compose logs -f user"

echo -e "\n${BLUE}To start the attack simulation, run:${NC}"
echo -e "  docker compose exec attacker python scripts/run_all_attacks.py"

echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
