#!/usr/bin/env python3
"""
Model Export and Deployment Script.
Step 7 + 10 of the ML pipeline.
"""
import os
import shutil
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("export")

# Source directories
PROC_DIR  = os.path.join(os.path.dirname(__file__), "data", "processed")
MODEL_DIR = os.path.join(os.path.dirname(__file__), "data", "models")

# Target directory for the agent
DEPLOY_DIR = os.path.join(os.path.dirname(__file__), "..", "user", "agent", "inference", "models")
os.makedirs(DEPLOY_DIR, exist_ok=True)

ARTIFACTS = [
    (os.path.join(MODEL_DIR, "model.pkl"), "model.pkl"),
    (os.path.join(PROC_DIR, "scaler.pkl"), "scaler.pkl"),
    (os.path.join(PROC_DIR, "feature_list.json"), "feature_list.json"),
    (os.path.join(PROC_DIR, "class_map.json"), "class_map.json"),
]

def main():
    log.info("═══ intelli-SOC Model Artifact Export ═══")
    
    success = 0
    for src, name in ARTIFACTS:
        if os.path.exists(src):
            dst = os.path.join(DEPLOY_DIR, name)
            shutil.copy2(src, dst)
            log.info(f"  [EXPORT] {name} → {dst}")
            success += 1
        else:
            log.warning(f"  [MISSING] {src}")

    if success == len(ARTIFACTS):
        log.info(f"\n✔ Export successful! {success} artifacts ready for deployment.")
    else:
        log.error(f"\n✖ Export incomplete. {success}/{len(ARTIFACTS)} artifacts found.")

if __name__ == "__main__":
    main()
