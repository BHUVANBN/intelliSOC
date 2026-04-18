#!/usr/bin/env python3
"""
Evaluate the trained model on test data.
Step 3 + 10 of the ML pipeline.
"""
import os
import joblib
import numpy as np
import logging
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("evaluate")

PROC_DIR  = os.path.join(os.path.dirname(__file__), "data", "processed")
MODEL_DIR = os.path.join(os.path.dirname(__file__), "data", "models")
CLASS_NAMES = ["BENIGN", "BRUTE_FORCE", "LATERAL_MOVEMENT", "EXFILTRATION", "C2_BEACON"]

def main():
    log.info("═══ intelli-SOC Model Evaluation ═══")
    
    # Load test data
    X_test = np.load(os.path.join(PROC_DIR, "X_test.npy"))
    y_test = np.load(os.path.join(PROC_DIR, "y_test.npy"))
    
    # Load model
    model_path = os.path.join(MODEL_DIR, "model.pkl")
    if not os.path.exists(model_path):
        log.error("Model file not found. Run train.py first.")
        return
        
    model = joblib.load(model_path)
    log.info(f"Loaded primary model: {model_path}")
    
    # Predict
    y_pred = model.predict(X_test)
    
    # Metrics
    accuracy = accuracy_score(y_test, y_pred)
    log.info(f"Test Accuracy: {accuracy:.4f}")
    
    log.info("\nDetailed Classification Report:")
    print(classification_report(y_test, y_pred, target_names=CLASS_NAMES, zero_division=0))
    
    log.info("\nConfusion Matrix:")
    print(confusion_matrix(y_test, y_pred))

if __name__ == "__main__":
    main()
