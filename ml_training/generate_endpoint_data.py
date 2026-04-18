import os
import numpy as np
import pandas as pd
import logging

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("endpoint_gen")

RAW_DIR = os.path.join(os.path.dirname(__file__), "data", "raw")
os.makedirs(RAW_DIR, exist_ok=True)

# Features for Endpoint Monitoring
EP_FEATURES = [
    "pid", "ppid", "uid", 
    "is_root", "is_orphaned", 
    "has_network_conn", "cmd_length",
    "file_access_count", "discovery_score"
]

def generate_endpoint():
    log.info("Generating endpoint threat training data...")
    data = []
    N = 4000 
    
    for _ in range(N * 3): # BENIGN processes
        row = {
            'pid':              np.random.randint(100, 50000),
            'ppid':             np.random.randint(1, 1000),
            'uid':              np.random.choice([0, 1000, 1001], p=[0.1, 0.45, 0.45]),
            'is_root':          0,
            'is_orphaned':      0,
            'has_network_conn': np.random.choice([0, 1], p=[0.9, 0.1]),
            'cmd_length':       np.random.randint(10, 50),
            'file_access_count': np.random.poisson(2),
            'discovery_score':   np.random.poisson(0.1),
            ' Label':           'BENIGN'
        }
        if row['uid'] == 0: row['is_root'] = 1
        data.append(row)
        
    for _ in range(N): # RANSOMWARE — high file access, root usage
        row = {
            'pid':              np.random.randint(1000, 60000),
            'ppid':             np.random.randint(1000, 2000),
            'uid':              0, # Root
            'is_root':          1,
            'is_orphaned':      0,
            'has_network_conn': 0,
            'cmd_length':       np.random.randint(40, 120),
            'file_access_count': np.random.randint(500, 5000), # MASSIVE access
            'discovery_score':   np.random.randint(1, 5),
            ' Label':           'EXFILTRATION' # Reusing class for Ransomware/Exfil behavior
        }
        data.append(row)
        
    for _ in range(N): # C2 / PERSISTENCE — Orphaned with network
        row = {
            'pid':              np.random.randint(100, 60000),
            'ppid':             1, # Orphaned
            'uid':              np.random.choice([0, 1000]),
            'is_root':          0,
            'is_orphaned':      1,
            'has_network_conn': 1,
            'cmd_length':       np.random.randint(20, 200),
            'file_access_count': np.random.poisson(5),
            'discovery_score':   np.random.poisson(1),
            ' Label':           'C2_BEACON'
        }
        if row['uid'] == 0: row['is_root'] = 1
        data.append(row)

    for _ in range(int(N/2)): # DISCOVERY — many commands like whoami, id
        row = {
            'pid':              np.random.randint(100, 60000),
            'ppid':             np.random.randint(100, 1000),
            'uid':              1000,
            'is_root':          0,
            'is_orphaned':      0,
            'has_network_conn': 0,
            'cmd_length':       np.random.randint(5, 15),
            'file_access_count': np.random.poisson(10),
            'discovery_score':   np.random.randint(5, 20),
            ' Label':           'BRUTE_FORCE' 
        }
        data.append(row)

    for _ in range(int(N/2)): # LATERAL MOVEMENT — Internal scanning / Port forwarding
        row = {
            'pid':              np.random.randint(100, 60000),
            'ppid':             np.random.randint(100, 1000),
            'uid':              1000,
            'is_root':          0,
            'is_orphaned':      0,
            'has_network_conn': 1,
            'cmd_length':       np.random.randint(10, 40),
            'file_access_count': np.random.poisson(5),
            'discovery_score':   np.random.randint(2, 10),
            ' Label':           'LATERAL_MOVEMENT' 
        }
        data.append(row)
        
    df = pd.DataFrame(data)
    df.to_csv(os.path.join(RAW_DIR, 'endpoint_threat_data.csv'), index=False)
    log.info(f'Endpoint data generated: {len(df)} rows.')

if __name__ == "__main__":
    generate_endpoint()
