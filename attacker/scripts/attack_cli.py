#!/usr/bin/env python3

import os
import subprocess
import threading
import time
import sys

# Standard ANSI Color codes for better aesthetics
BLUE = '\033[94m'
CYAN = '\033[96m'
GREEN = '\033[92m'
YELLOW = '\033[93m'
RED = '\033[91m'
BOLD = '\033[1m'
UNDERLINE = '\033[4m'
ENDC = '\033[0m'

SCRIPTS = {
    "1": ("Brute Force", "brute_force.py", "🔥"),
    "2": ("Lateral Movement", "lateral_movement.py", "🛤️ "),
    "3": ("Data Exfiltration", "exfiltration.py", "📤"),
    "4": ("C2 Beacon", "c2_beacon.py", "📡"),
    "5": ("False Positive (Backup)", "false_positive.py", "🛡️ "),
}

# Configuration from environment variables
TARGET_IP = os.getenv("TARGET_IP", "172.25.0.20")
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def print_banner():
    """Prints a premium-looking banner for the interactive CLI."""
    banner = f"""
{RED}{BOLD}    ⚡ INTELLI-SOC ATTACK SIMULATOR ⚡{ENDC}
{BLUE}    ────────────────────────────────────────{ENDC}
{CYAN}    Target Node   : {ENDC}{BOLD}{TARGET_IP}{ENDC}
{CYAN}    Mode          : {ENDC}Interactive Orchestration
{CYAN}    Version       : {ENDC}2.1.0
{BLUE}    ────────────────────────────────────────{ENDC}
    """
    print(banner)


def run_parallel(selected):
    """Orchestrates multiple attacks running in parallel threads."""
    threads = []
    print(f"\n{BOLD}{RED}[💀] BROADCASTING MULTI-LAYER ATTACK CHAIN...{ENDC}")
    
    for key in selected:
        name, script, emoji = SCRIPTS[key]
        t = threading.Thread(target=run_script, args=(name, script, emoji))
        threads.append(t)

    for i, t in enumerate(threads):
        t.start()
        time.sleep(1.5)  # Staggered launch for realistic network patterns

    for t in threads:
        t.join()
    
    print(f"{BOLD}{GREEN}\n[★] MASSIVE ATTACK SEQUENCE COMPLETE.{ENDC}")

# Global toggle for dynamic IP
dynamic_mode = False

def show_menu():
    """Displays the interactive menu."""
    mode_text = f"{GREEN}ON (50 IPs cycled){ENDC}" if dynamic_mode else f"{RED}OFF (Static IP){ENDC}"
    print(f"{BOLD}DYNAMIC IP MODE: {mode_text}{ENDC}")
    print(f"{BOLD}{UNDERLINE}SELECT ATTACK VECTOR:{ENDC}")
    for key, (name, _, emoji) in SCRIPTS.items():
        print(f"  {BOLD}{CYAN}{key}.{ENDC} {emoji} {BOLD}{name}{ENDC}")
    
    print(f"\n  {BOLD}{YELLOW}8.{ENDC} 🔄 {BOLD}Toggle Dynamic IP Mode{ENDC}")
    print(f"  {BOLD}{RED}6.{ENDC} 💥 {BOLD}Multi-Layer Attack (ALL){ENDC}")
    print(f"  {BOLD}{YELLOW}7.{ENDC} 🛠️  {BOLD}Custom Multi-Select{ENDC}")
    print(f"  {BOLD}{BLUE}0.{ENDC} 🚪 {BOLD}Exit{ENDC}")
    print(f"{BLUE}    ────────────────────────────────────────{ENDC}")

def run_script(name, script, emoji):
    """Executes a single attack script as a subprocess."""
    path = os.path.join(BASE_DIR, script)
    env = {**os.environ, "TARGET_IP": TARGET_IP, "DYNAMIC_ATTACK_IP": str(dynamic_mode).lower()}

    if not os.path.exists(path):
        print(f"\n{RED}[!] Error: Script not found: {script}{ENDC}\n")
        return

    print(f"\n{BOLD}{YELLOW}[{emoji}] Initializing: {name}...{ENDC}")
    if dynamic_mode:
        print(f"{GREEN}[⚡] Stealth Mode Active: Rotating source IPs{ENDC}")

    try:
        subprocess.run(["python3", path], env=env, check=True)
        print(f"\n{GREEN}[✓] SUCCESS: {name} cycle completed.{ENDC}\n")
    except subprocess.CalledProcessError as e:
        print(f"\n{RED}[❌] FAILED: {name} exited with code {e.returncode}.{ENDC}\n")
    except KeyboardInterrupt:
        print(f"\n{RED}[!] CANCELED: User interrupted execution.{ENDC}\n")

def main():
    global dynamic_mode
    try:
        while True:
            os.system('clear' if os.name == 'posix' else 'cls')
            print_banner()
            show_menu()
            
            try:
                choice = input(f"{BOLD}{GREEN}Choice >> {ENDC}").strip()
            except EOFError:
                break

            if choice == "0":
                break

            elif choice == "8":
                dynamic_mode = not dynamic_mode
                if dynamic_mode:
                    from network_utils import setup_ip_aliases
                    setup_ip_aliases()
                continue

            elif choice in SCRIPTS:
                name, script, emoji = SCRIPTS[choice]
                run_script(name, script, emoji)
                input(f"\n{CYAN}Press Enter to return to menu...{ENDC}")

            elif choice == "6":
                run_parallel(list(SCRIPTS.keys()))
                input(f"\n{CYAN}Press Enter to return to menu...{ENDC}")

            elif choice == "7":
                print(f"\n{BOLD}Specify indices (space-separated):{ENDC}")
                selected_raw = input(f"{BOLD}{GREEN}Indices >> {ENDC}").strip().split()
                valid = [c for c in selected_raw if c in SCRIPTS]

                if not valid:
                    print(f"\n{RED}[!] Invalid selection. Returning to menu...{ENDC}")
                    time.sleep(1.5)
                    continue

                run_parallel(valid)
                input(f"\n{CYAN}Press Enter to return to menu...{ENDC}")

            else:
                print(f"\n{RED}[!] Invalid option: {choice}{ENDC}")
                time.sleep(1)

    except KeyboardInterrupt:
        print(f"\n\n{RED}[!] EMERGENCY SYSTEM SHUTDOWN...{ENDC}")
        sys.exit(0)

if __name__ == "__main__":
    main()
