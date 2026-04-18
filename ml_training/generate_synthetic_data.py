import os
import numpy as np
import pandas as pd
import logging

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("synthetic_gen")

RAW_DIR = os.path.join(os.path.dirname(__file__), "data", "raw")
os.makedirs(RAW_DIR, exist_ok=True)

FEATURES = [
    "flow_duration", "flow_bytes_per_sec", "flow_packets_per_sec",
    "total_fwd_packets", "total_bwd_packets",
    "fwd_packet_len_mean", "bwd_packet_len_mean",
    "syn_flag_count", "rst_flag_count", "ack_flag_count",
    "flow_iat_mean", "flow_iat_std", "active_mean", "idle_mean",
    "subflow_fwd_bytes", "subflow_bwd_bytes"
]

def generate():
    log.info("Generating statistically-accurate synthetic training data...")
    data = []
    N = 4000 # samples per class
    
    for _ in range(N * 3): # BENIGN — dominant class
        row = {
            'flow_duration':         np.random.exponential(100_000),
            'flow_bytes_per_sec':    np.random.exponential(5000),
            'flow_packets_per_sec':  np.random.exponential(40),
            'total_fwd_packets':     np.random.poisson(8),
            'total_bwd_packets':     np.random.poisson(6),
            'fwd_packet_len_mean':   np.random.normal(500, 200),
            'bwd_packet_len_mean':   np.random.normal(400, 150),
            'syn_flag_count':        np.random.poisson(1),
            'rst_flag_count':        np.random.poisson(0.3),
            'ack_flag_count':        np.random.poisson(10),
            'flow_iat_mean':         np.random.exponential(200_000),
            'flow_iat_std':          np.random.exponential(150_000),
            'active_mean':           np.random.exponential(80_000),
            'idle_mean':             np.random.exponential(1_000_000),
            'subflow_fwd_bytes':     np.random.exponential(3000),
            'subflow_bwd_bytes':     np.random.exponential(2500),
            ' Label':                'BENIGN'
        }
        data.append(row)
        
    for _ in range(N): # BRUTE_FORCE — high SYN/RST, very short flows
        row = {
            'flow_duration':         np.random.exponential(2000),
            'flow_bytes_per_sec':    np.random.uniform(100, 1000),
            'flow_packets_per_sec':  np.random.uniform(10, 500),
            'total_fwd_packets':     np.random.poisson(3),
            'total_bwd_packets':     np.random.poisson(1),
            'fwd_packet_len_mean':   np.random.normal(60, 20),
            'bwd_packet_len_mean':   np.random.normal(40, 20),
            'syn_flag_count':        np.random.uniform(100, 800),
            'rst_flag_count':        np.random.uniform(80, 600),
            'ack_flag_count':        np.random.poisson(2),
            'flow_iat_mean':         np.random.exponential(5000),
            'flow_iat_std':          np.random.exponential(3000),
            'active_mean':           np.random.exponential(5000),
            'idle_mean':             np.random.exponential(2000),
            'subflow_fwd_bytes':     np.random.exponential(150),
            'subflow_bwd_bytes':     np.random.exponential(80),
            ' Label':                'BRUTE_FORCE'
        }
        data.append(row)
        
    for _ in range(N): # LATERAL_MOVEMENT — internal scan, many short flows
        row = {
            'flow_duration':         np.random.uniform(1000, 50000),
            'flow_bytes_per_sec':    np.random.uniform(50, 500),
            'flow_packets_per_sec':  np.random.uniform(5, 30),
            'total_fwd_packets':     np.random.poisson(3),
            'total_bwd_packets':     np.random.poisson(1),
            'fwd_packet_len_mean':   np.random.normal(80, 30),
            'bwd_packet_len_mean':   np.random.normal(60, 30),
            'syn_flag_count':        np.random.poisson(2),
            'rst_flag_count':        np.random.uniform(1, 5),
            'ack_flag_count':        np.random.poisson(2),
            'flow_iat_mean':         np.random.uniform(500, 5000),
            'flow_iat_std':          np.random.uniform(200, 4000),
            'active_mean':           np.random.uniform(500, 10000),
            'idle_mean':             np.random.exponential(5000),
            'subflow_fwd_bytes':     np.random.uniform(80, 400),
            'subflow_bwd_bytes':     np.random.uniform(40, 200),
            ' Label':                'LATERAL_MOVEMENT'
        }
        data.append(row)
        
    for _ in range(N): # EXFILTRATION — massive outbound bytes
        row = {
            'flow_duration':         np.random.uniform(10_000_000, 60_000_000),
            'flow_bytes_per_sec':    np.random.uniform(500_000, 5_000_000),
            'flow_packets_per_sec':  np.random.uniform(100, 2000),
            'total_fwd_packets':     np.random.uniform(500, 5000),
            'total_bwd_packets':     np.random.uniform(50, 500),
            'fwd_packet_len_mean':   np.random.normal(1400, 100),
            'bwd_packet_len_mean':   np.random.normal(100, 50),
            'syn_flag_count':        np.random.poisson(1),
            'rst_flag_count':        np.random.poisson(0.5),
            'ack_flag_count':        np.random.uniform(500, 5000),
            'flow_iat_mean':         np.random.exponential(5000),
            'flow_iat_std':          np.random.exponential(4000),
            'active_mean':           np.random.exponential(1_000_000),
            'idle_mean':             np.random.exponential(500_000),
            'subflow_fwd_bytes':     np.random.uniform(100_000, 2_000_000),
            'subflow_bwd_bytes':     np.random.uniform(5_000, 100_000),
            ' Label':                'EXFILTRATION'
        }
        data.append(row)
        
    for _ in range(N): # C2_BEACON — ultra-regular 30s heartbeat, tiny packets
        interval = np.random.normal(30_000_000, 200_000) # ~30s in microseconds
        row = {
            'flow_duration':         abs(np.random.normal(100_000, 20_000)),
            'flow_bytes_per_sec':    abs(np.random.normal(50, 10)),
            'flow_packets_per_sec':  abs(np.random.normal(2, 0.5)),
            'total_fwd_packets':     max(1, int(np.random.normal(2, 0.5))),
            'total_bwd_packets':     max(1, int(np.random.normal(1, 0.3))),
            'fwd_packet_len_mean':   abs(np.random.normal(64, 5)),
            'bwd_packet_len_mean':   abs(np.random.normal(64, 5)),
            'syn_flag_count':        np.random.poisson(1),
            'rst_flag_count':        np.random.poisson(0.1),
            'ack_flag_count':        np.random.poisson(1),
            'flow_iat_mean':         abs(interval),
            'flow_iat_std':          abs(np.random.normal(0.5, 0.2)), # KEY: very low
            'active_mean':           abs(np.random.normal(50_000, 10_000)),
            'idle_mean':             abs(interval * 0.9),
            'subflow_fwd_bytes':     abs(np.random.normal(64, 8)),
            'subflow_bwd_bytes':     abs(np.random.normal(64, 8)),
            ' Label':                'C2_BEACON'
        }
        data.append(row)
        
    df = pd.DataFrame(data)
    # Clip negatives to 0
    for col in FEATURES:
        df[col] = df[col].clip(lower=0)
    
    # Save to CSV
    df.to_csv(os.path.join(RAW_DIR, 'synthetic_demo_data.csv'), index=False)
    log.info(f'Synthetic data: {len(df)} rows, {df[" Label"].value_counts().to_dict()}')

if __name__ == "__main__":
    generate()
