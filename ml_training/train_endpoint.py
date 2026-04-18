import os
import pandas as pd
import numpy as np
import joblib
import logging
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("endpoint_train")

# Same as generator
FEATURES = [
    "pid", "ppid", "uid", 
    "is_root", "is_orphaned", 
    "has_network_conn", "cmd_length",
    "file_access_count", "discovery_score"
]

MODEL_DIR = "/home/batman/intelli-SOC/user/models"
os.makedirs(MODEL_DIR, exist_ok=True)

def train():
    data_path = "/home/batman/intelli-SOC/ml_training/data/raw/endpoint_threat_data.csv"
    if not os.path.exists(data_path):
        log.error(f"Data not found: {data_path}")
        return

    df = pd.DataFrame(pd.read_csv(data_path))
    X = df[FEATURES]
    y = df[' Label']
    
    # Map labels to integers
    label_map = {
        "BENIGN": 0,
        "BRUTE_FORCE": 1,
        "LATERAL_MOVEMENT": 2,
        "EXFILTRATION": 3,
        "C2_BEACON": 4
    }
    y_encoded = y.map(label_map)

    X_train, X_test, y_train, y_test = train_test_split(X, y_encoded, test_size=0.2, random_state=42)

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    log.info("Training Endpoint XGBoost Model...")
    model = XGBClassifier(
        n_estimators=100,
        max_depth=6,
        learning_rate=0.1,
        objective='multi:softprob',
        num_class=5,
        random_state=42
    )
    
    model.fit(X_train_scaled, y_train)

    y_pred = model.predict(X_test_scaled)
    log.info(f"\n{classification_report(y_test, y_pred, target_names=list(label_map.keys()))}")

    # Save
    joblib.dump(model, os.path.join(MODEL_DIR, "endpoint_classifier.joblib"))
    joblib.dump(scaler, os.path.join(MODEL_DIR, "endpoint_scaler.joblib"))
    log.info(f"Model and scaler saved to {MODEL_DIR}")

if __name__ == "__main__":
    train()
