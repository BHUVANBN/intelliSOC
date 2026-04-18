#!/usr/bin/env python3
"""
CICIDS 2017 Dataset Downloader
Downloads the required CSV files from the UNB public mirror.
Files are saved to ml_training/data/raw/
"""
import os
import sys
import requests
from tqdm import tqdm

RAW_DIR = os.path.join(os.path.dirname(__file__), "data", "raw")
os.makedirs(RAW_DIR, exist_ok=True)

# UNB CICIDS 2017 public download URLs
# Mirror: https://www.unb.ca/cic/datasets/ids-2017.html
CICIDS_FILES = {
    "Monday-WorkingHours.pcap_ISCX.csv": (
        "https://intrusion-detection.distrinet-research.be/WTMC2021/Data/"
        "CICIDS2017/Monday-WorkingHours.pcap_ISCX.csv"
    ),
    "Tuesday-WorkingHours.pcap_ISCX.csv": (
        "https://intrusion-detection.distrinet-research.be/WTMC2021/Data/"
        "CICIDS2017/Tuesday-WorkingHours.pcap_ISCX.csv"
    ),
    "Wednesday-workingHours.pcap_ISCX.csv": (
        "https://intrusion-detection.distrinet-research.be/WTMC2021/Data/"
        "CICIDS2017/Wednesday-workingHours.pcap_ISCX.csv"
    ),
    "Thursday-WorkingHours-Morning-WebAttacks.pcap_ISCX.csv": (
        "https://intrusion-detection.distrinet-research.be/WTMC2021/Data/"
        "CICIDS2017/Thursday-WorkingHours-Morning-WebAttacks.pcap_ISCX.csv"
    ),
    "Thursday-WorkingHours-Afternoon-Infilteration.pcap_ISCX.csv": (
        "https://intrusion-detection.distrinet-research.be/WTMC2021/Data/"
        "CICIDS2017/Thursday-WorkingHours-Afternoon-Infilteration.pcap_ISCX.csv"
    ),
    "Friday-WorkingHours-Morning.pcap_ISCX.csv": (
        "https://intrusion-detection.distrinet-research.be/WTMC2021/Data/"
        "CICIDS2017/Friday-WorkingHours-Morning.pcap_ISCX.csv"
    ),
    "Friday-WorkingHours-Afternoon-DDos.pcap_ISCX.csv": (
        "https://intrusion-detection.distrinet-research.be/WTMC2021/Data/"
        "CICIDS2017/Friday-WorkingHours-Afternoon-DDos.pcap_ISCX.csv"
    ),
    "Friday-WorkingHours-Afternoon-PortScan.pcap_ISCX.csv": (
        "https://intrusion-detection.distrinet-research.be/WTMC2021/Data/"
        "CICIDS2017/Friday-WorkingHours-Afternoon-PortScan.pcap_ISCX.csv"
    ),
}


def download_file(url: str, dest_path: str, name: str):
    if os.path.exists(dest_path):
        size_mb = os.path.getsize(dest_path) / 1024 / 1024
        print(f"  [SKIP] {name} already exists ({size_mb:.1f} MB)")
        return True

    print(f"  [DOWN] {name}")
    try:
        resp = requests.get(url, stream=True, timeout=60)
        resp.raise_for_status()
        total = int(resp.headers.get("content-length", 0))
        with open(dest_path, "wb") as f, tqdm(
            total=total, unit="B", unit_scale=True, desc=name[:40], leave=False
        ) as bar:
            for chunk in resp.iter_content(chunk_size=8192):
                f.write(chunk)
                bar.update(len(chunk))
        size_mb = os.path.getsize(dest_path) / 1024 / 1024
        print(f"  [OK]   {name} — {size_mb:.1f} MB")
        return True
    except Exception as e:
        print(f"  [ERR]  {name}: {e}")
        if os.path.exists(dest_path):
            os.remove(dest_path)
        return False


def main():
    print("═══════════════════════════════════════════")
    print("  intelli-SOC — CICIDS 2017 Downloader")
    print("═══════════════════════════════════════════")
    print(f"  Output: {RAW_DIR}")
    print()

    success = 0
    for name, url in CICIDS_FILES.items():
        dest = os.path.join(RAW_DIR, name)
        if download_file(url, dest, name):
            success += 1

    print()
    print(f"Downloaded {success}/{len(CICIDS_FILES)} files.")

    if success < len(CICIDS_FILES):
        print()
        print("NOTE: If downloads fail, manually download CICIDS 2017 from:")
        print("  https://www.unb.ca/cic/datasets/ids-2017.html")
        print(f"  Place CSV files in: {RAW_DIR}")
        sys.exit(1)

    print("All files ready. Run: python preprocess.py")


if __name__ == "__main__":
    main()
