#!/usr/bin/env python3
"""
intelli-SOC Detection Agent — Main Entry Point
Starts all monitoring threads and the FastAPI server.
"""
import os
import sys
import logging
import threading
import asyncio
import uvicorn

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)-22s] %(levelname)s %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("/app/logs/agent.log", mode="a"),
    ]
)
log = logging.getLogger("main")

# Ensure log dir exists
os.makedirs("/app/logs", exist_ok=True)

from agent.capture.network_capture   import NetworkCapture
from agent.capture.endpoint_capture  import EndpointCapture
from agent.normalization.normalizer   import Normalizer
from agent.inference.predictor        import Predictor
from agent.correlation.correlator     import Correlator
from agent.api.server                 import create_app


def start_capture_threads(normalizer: Normalizer):
    """Launch network and endpoint capture in background threads."""
    net_capture  = NetworkCapture(normalizer=normalizer)
    ep_capture   = EndpointCapture(normalizer=normalizer)

    net_thread = threading.Thread(
        target=net_capture.start,
        name="NetworkCapture",
        daemon=True
    )
    ep_thread = threading.Thread(
        target=ep_capture.start,
        name="EndpointCapture",
        daemon=True
    )

    net_thread.start()
    ep_thread.start()
    log.info("Capture threads started: NetworkCapture, EndpointCapture")
    return net_thread, ep_thread


def start_inference_thread(normalizer: Normalizer, correlator: Correlator):
    """Launch the batch inference + correlation loop."""
    predictor = Predictor(normalizer=normalizer, correlator=correlator)
    inf_thread = threading.Thread(
        target=predictor.run_loop,
        name="InferenceLoop",
        daemon=True
    )
    inf_thread.start()
    log.info("Inference loop started")
    return inf_thread


def main():
    log.info("══════════════════════════════════════════════════")
    log.info("  intelli-SOC AI Threat Detection Engine v1.0")
    log.info("══════════════════════════════════════════════════")

    # Shared components
    correlator = Correlator()
    normalizer = Normalizer()

    # Start background threads
    start_capture_threads(normalizer)
    start_inference_thread(normalizer, correlator)

    # Start FastAPI server (blocking)
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", "8000"))

    log.info(f"Starting FastAPI server on {host}:{port}")
    app = create_app(correlator=correlator, normalizer=normalizer)
    uvicorn.run(app, host=host, port=port, log_level="warning")


if __name__ == "__main__":
    main()
