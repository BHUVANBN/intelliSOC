#!/usr/bin/env python3
"""
CICIDS 2017 Preprocessing Pipeline
Loads raw CSVs, labels them by threat category, cleans data,
applies SMOTE for class balance, and saves processed splits.
"""
import os
import sys
import json
import logging
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from imblearn.over_sampling import SMOTE

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("preprocess")

RAW_DIR  = os.path.join(os.path.dirname(__file__), "data", "raw")
PROC_DIR = os.path.join(os.path.dirname(__file__), "data", "processed")
os.makedirs(PROC_DIR, exist_ok=True)

# ── Feature list — 16 high-signal features ──────────────────────────
FEATURES = [
    "flow_duration", "flow_bytes_per_sec", "flow_packets_per_sec",
    "total_fwd_packets", "total_bwd_packets",
    "fwd_packet_len_mean", "bwd_packet_len_mean",
    "syn_flag_count", "rst_flag_count", "ack_flag_count",
    "flow_iat_mean", "flow_iat_std", "active_mean", "idle_mean",
    "subflow_fwd_bytes", "subflow_bwd_bytes"
]

# ── CICIDS column name → our feature name mapping ───────────────────
COLUMN_MAP = {
    " Flow Duration":            "flow_duration",
    " Flow Bytes/s":             "flow_bytes_per_sec",
    " Flow Packets/s":           "flow_packets_per_sec",
    " Total Fwd Packets":        "total_fwd_packets",
    " Total Backward Packets":   "total_bwd_packets",
    " Fwd Packet Length Mean":   "fwd_packet_len_mean",
    " Bwd Packet Length Mean":   "bwd_packet_len_mean",
    " SYN Flag Count":           "syn_flag_count",
    " RST Flag Count":           "rst_flag_count",
    " ACK Flag Count":           "ack_flag_count",
    " Flow IAT Mean":            "flow_iat_mean",
    " Flow IAT Std":             "flow_iat_std",
    " Active Mean":              "active_mean",
    " Idle Mean":                "idle_mean",
    " Subflow Fwd Bytes":        "subflow_fwd_bytes",
    " Subflow Bwd Bytes":        "subflow_bwd_bytes",
    " Label":                    "label_raw",
}

# ── CICIDS label → our threat class mapping ──────────────────────────
# ── COMPLETE CICIDS 2017 Label Map ──────────────────────────────────
LABEL_MAP = {
    # Already normalized (from synthetic_gen.py)
    'BENIGN':                     'BENIGN',
    'BRUTE_FORCE':                'BRUTE_FORCE',
    'LATERAL_MOVEMENT':           'LATERAL_MOVEMENT',
    'EXFILTRATION':               'EXFILTRATION',
    'C2_BEACON':                  'C2_BEACON',
    # Real CICIDS 2017 Monday/Tuesday files
    'FTP-Patator':                'BRUTE_FORCE',
    'SSH-Patator':                'BRUTE_FORCE',
    # Wednesday — DoS
    'DoS Hulk':                   'BRUTE_FORCE',
    'DoS GoldenEye':              'BRUTE_FORCE',
    'DoS slowloris':              'BRUTE_FORCE',
    'DoS Slowhttptest':           'BRUTE_FORCE',
    'Heartbleed':                 'BRUTE_FORCE',
    # Thursday — Web Attacks + Infiltration
    'Web Attack Brute Force':     'BRUTE_FORCE',    # double space in CSV!
    'Web Attack - Brute Force':   'BRUTE_FORCE',
    'Web Attack XSS':             'EXFILTRATION',
    'Web Attack - XSS':           'EXFILTRATION',
    'Web Attack Sql Injection':   'EXFILTRATION',
    'Web Attack - Sql Injection': 'EXFILTRATION',
    'Infiltration':               'LATERAL_MOVEMENT',
    # Friday — PortScan + Bot + DDoS
    'PortScan':                   'LATERAL_MOVEMENT',
    'Bot':                        'C2_BEACON',
    'DDoS':                       'BRUTE_FORCE',
    'Brute Force':                'BRUTE_FORCE',
}

CLASS_ENCODE = {
    "BENIGN":           0,
    "BRUTE_FORCE":      1,
    "LATERAL_MOVEMENT": 2,
    "EXFILTRATION":     3,
    "C2_BEACON":        4,
}


def load_raw_files() -> pd.DataFrame:
    """Load all CICIDS CSVs, rename columns, apply label mapping."""
    frames = []
    csv_files = [f for f in os.listdir(RAW_DIR) if f.endswith(".csv")]

    if not csv_files:
        log.error(f"No CSV files found in {RAW_DIR}. Run download_dataset.py first.")
        sys.exit(1)

    for fname in sorted(csv_files):
        path = os.path.join(RAW_DIR, fname)
        log.info(f"Loading: {fname}")
        try:
            df = pd.read_csv(path, low_memory=False, encoding="utf-8")
        except Exception as e:
            log.warning(f"  Failed to load {fname}: {e}")
            continue

        # Rename columns
        df.rename(columns=COLUMN_MAP, inplace=True)

        # Keep only relevant columns
        available = [c for c in FEATURES + ["label_raw"] if c in df.columns]
        if "label_raw" not in available:
            log.warning(f"  No label column in {fname}, skipping")
            continue

        df = df[available]

        # Map labels — robust normalization (handles trailing spaces + mixed casing)
        df['label_raw_clean'] = df['label_raw'].str.strip().str.replace(r'\s+', ' ', regex=True)
        df['label'] = df['label_raw_clean'].map(LABEL_MAP)
        # Fallback: try title-case for unmapped labels
        mask = df['label'].isna()
        df.loc[mask, 'label'] = df.loc[mask, 'label_raw_clean'].str.title().map(LABEL_MAP)
        unmapped = df["label"].isna().sum()
        if unmapped > 0:
            unique_unmapped = df[df["label"].isna()]["label_raw"].unique()
            log.warning(f"  {unmapped} rows with unmapped labels: {unique_unmapped[:5]}")
        df.dropna(subset=["label"], inplace=True)
        df.drop(columns=["label_raw", "label_raw_clean"], inplace=True, errors='ignore')

        frames.append(df)
        log.info(f"  {len(df):,} rows | Label dist: {df['label'].value_counts().to_dict()}")

    if not frames:
        log.error("No valid dataframes loaded.")
        sys.exit(1)

    combined = pd.concat(frames, ignore_index=True)
    log.info(f"Combined dataset: {len(combined):,} rows")
    return combined


def clean(df: pd.DataFrame) -> pd.DataFrame:
    """Replace Inf/NaN, clip outliers, add missing feature columns."""
    # Add any missing feature columns as 0
    for feat in FEATURES:
        if feat not in df.columns:
            df[feat] = 0.0

    df = df[FEATURES + ["label"]].copy()

    # Replace Inf
    df.replace([np.inf, -np.inf], np.nan, inplace=True)

    # Fill NaN with column median
    for col in FEATURES:
        df[col].fillna(df[col].median(), inplace=True)

    # Clip outliers at 99.9th percentile
    for col in FEATURES:
        p999 = df[col].quantile(0.999)
        df[col] = df[col].clip(upper=p999)

    log.info(f"After cleaning: {len(df):,} rows, {df['label'].value_counts().to_dict()}")
    return df


def apply_smote(X: np.ndarray, y: np.ndarray) -> tuple:
    """Apply SMOTE to balance minority classes."""
    log.info("Applying SMOTE for minority class oversampling...")
    from collections import Counter
    log.info(f"  Before SMOTE: {dict(Counter(y))}")

    smote = SMOTE(
        sampling_strategy="not majority",
        random_state=42,
        k_neighbors=5
    )
    X_res, y_res = smote.fit_resample(X, y)
    log.info(f"  After SMOTE:  {dict(Counter(y_res))}")
    return X_res, y_res


def main():
    log.info("═══ intelli-SOC Preprocessing Pipeline ═══")

    # 1. Load
    df = load_raw_files()

    # 2. Clean
    df = clean(df)

    # 3. Encode labels
    df["label_enc"] = df["label"].map(CLASS_ENCODE)
    df.dropna(subset=["label_enc"], inplace=True)
    df["label_enc"] = df["label_enc"].astype(int)

    X = df[FEATURES].values
    y = df["label_enc"].values

    # 4. Train/test split (stratified)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    log.info(f"Train: {len(X_train):,} | Test: {len(X_test):,}")

    # 5. Scale
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled  = scaler.transform(X_test)

    # 6. SMOTE on training set only
    X_train_smote, y_train_smote = apply_smote(X_train_scaled, y_train)

    # 7. Save
    log.info("Saving processed splits...")
    np.save(os.path.join(PROC_DIR, "X_train.npy"), X_train_smote)
    np.save(os.path.join(PROC_DIR, "X_test.npy"),  X_test_scaled)
    np.save(os.path.join(PROC_DIR, "y_train.npy"), y_train_smote)
    np.save(os.path.join(PROC_DIR, "y_test.npy"),  y_test)

    import joblib
    joblib.dump(scaler, os.path.join(PROC_DIR, "scaler.pkl"))

    with open(os.path.join(PROC_DIR, "feature_list.json"), "w") as f:
        json.dump(FEATURES, f, indent=2)

    with open(os.path.join(PROC_DIR, "class_map.json"), "w") as f:
        json.dump({str(v): k for k, v in CLASS_ENCODE.items()}, f, indent=2)

    log.info("Preprocessing complete. Run: python train.py")


if __name__ == "__main__":
    main()
