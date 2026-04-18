#!/usr/bin/env python3
"""
Model Training Pipeline
Trains XGBoost (primary) + Random Forest (ensemble backup) on preprocessed CICIDS data.
Target: F1 > 0.92 per class.
"""
import os
import json
import logging
import numpy as np
import joblib
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.metrics import classification_report, f1_score, confusion_matrix
from xgboost import XGBClassifier

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("train")

PROC_DIR  = os.path.join(os.path.dirname(__file__), "data", "processed")
MODEL_DIR = os.path.join(os.path.dirname(__file__), "data", "models")
os.makedirs(MODEL_DIR, exist_ok=True)

CLASS_NAMES = ["BENIGN", "BRUTE_FORCE", "LATERAL_MOVEMENT", "EXFILTRATION", "C2_BEACON"]


def load_data():
    log.info("Loading preprocessed data...")
    X_train = np.load(os.path.join(PROC_DIR, "X_train.npy"))
    X_test  = np.load(os.path.join(PROC_DIR, "X_test.npy"))
    y_train = np.load(os.path.join(PROC_DIR, "y_train.npy"))
    y_test  = np.load(os.path.join(PROC_DIR, "y_test.npy"))
    log.info(f"  Train: {X_train.shape} | Test: {X_test.shape}")
    return X_train, X_test, y_train, y_test


def train_xgboost(X_train, y_train, X_test=None, y_test=None) -> XGBClassifier:
    log.info("Training XGBoost classifier...")
    
    model = XGBClassifier(
        n_estimators=500,           # More trees = better generalization
        max_depth=6,                # Reduced from 8 to prevent overfitting
        learning_rate=0.05,         # Lower LR with more trees = better
        subsample=0.85,
        colsample_bytree=0.85,
        min_child_weight=3,         # Regularization for rare classes
        gamma=0.1,                  # Min split loss — reduces false positives
        reg_alpha=0.05,             # L1 regularization
        reg_lambda=1.5,             # L2 regularization
        eval_metric="mlogloss",
        random_state=42,
        n_jobs=-1,
        tree_method="hist",
        # NO use_label_encoder — removed in XGBoost 2.0
        # NO device — not needed with tree_method='hist'
    )
    # Early stopping for optimal tree count
    if X_test is not None and y_test is not None:
        X_val = X_test[:len(X_test)//2]
        y_val = y_test[:len(y_test)//2]
        model.fit(
            X_train, y_train,
            eval_set=[(X_val, y_val)],
            verbose=50
        )
    else:
        model.fit(X_train, y_train)
    log.info("XGBoost training complete.")
    return model


def train_random_forest(X_train, y_train) -> RandomForestClassifier:
    log.info("Training Random Forest classifier (ensemble backup)...")
    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=12,
        min_samples_split=5,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)
    log.info("Random Forest training complete.")
    return model


def evaluate_model(model, X_test, y_test, name: str):
    log.info(f"\n{'═'*50}")
    log.info(f"  {name} — Classification Report")
    log.info(f"{'═'*50}")
    y_pred = model.predict(X_test)
    
    print(classification_report(y_test, y_pred, target_names=CLASS_NAMES, zero_division=0))
    
    log.info("Confusion Matrix:")
    print(confusion_matrix(y_test, y_pred))
    
    macro_f1 = f1_score(y_test, y_pred, average="macro", zero_division=0)
    log.info(f"  Macro F1: {macro_f1:.4f}")
    return macro_f1


def main():
    log.info("═══ intelli-SOC Model Training Pipeline ═══")

    if not os.path.exists(os.path.join(PROC_DIR, "X_train.npy")):
        log.error("Preprocessed data not found. Run preprocess.py first.")
        return

    X_train, X_test, y_train, y_test = load_data()
    # LOAD SCALER from preprocess stage
    scaler = joblib.load(os.path.join(PROC_DIR, "scaler.pkl"))

    # Train primary models
    xgb_model = train_xgboost(X_train, y_train, X_test, y_test)
    evaluate_model(xgb_model, X_test, y_test, "XGBoost")

    rf_model  = train_random_forest(X_train, y_train)
    evaluate_model(rf_model, X_test, y_test, "Random Forest")

    # Save artifacts IMMEDIATELY
    log.info("Saving model artifacts...")
    joblib.dump(xgb_model, os.path.join(MODEL_DIR, "model.pkl"))
    joblib.dump(rf_model,  os.path.join(MODEL_DIR, "rf_model.pkl"))
    # MISSING SCALE SAVE FIX
    joblib.dump(scaler,    os.path.join(MODEL_DIR, "scaler.pkl"))

    # Create Ensemble (Manual soft voting for demo)
    try:
        log.info("Computing Ensemble (Soft Voting)...")
        p1 = xgb_model.predict_proba(X_test)
        p2 = rf_model.predict_proba(X_test)
        p_ens = (p1 * 0.7) + (p2 * 0.3)
        y_ens = np.argmax(p_ens, axis=1)
        
        log.info(f"\n{'═'*50}")
        log.info(f"  Ensemble (Manual) — Classification Report")
        log.info(f"{'═'*50}")
        print(classification_report(y_test, y_ens, target_names=CLASS_NAMES, zero_division=0))
    except Exception as e:
        log.warning(f"Ensemble evaluation failed: {e}")

    results = {
        "primary_model": "model.pkl",
        "backup_model":  "rf_model.pkl",
    }
    with open(os.path.join(MODEL_DIR, "training_results.json"), "w") as f:
        json.dump(results, f, indent=2)

    log.info("\n✔ Training complete!")
    log.info("Run: python evaluate.py  →  python export_model.py")


if __name__ == "__main__":
    main()
