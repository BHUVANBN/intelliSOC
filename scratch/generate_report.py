import os

def generate_report(root_dir, output_file):
    exclude_dirs = {'.git', 'node_modules', '__pycache__', '.pytest_cache', 'logs', 'models', 'data'}
    exclude_files = {output_file, 'intelli_soc_fix_guide.docx.pdf'}
    
    with open(output_file, 'w', encoding='utf-8') as out:
        out.write("================================================================================\n")
        out.write("      INTELLI-SOC: PROJECT ARCHITECTURE & CODE DOCUMENTATION (COMPLETE DUMP)    \n")
        out.write("================================================================================\n\n")
        
        out.write("--- PROJECT OVERVIEW ---\n")
        out.write("intelli-SOC is an AI-driven threat detection and simulation engine designed for \n")
        out.write("Hack Malenadu '26. It features a hybrid detection pipeline combining XGBoost \n")
        out.write("machine learning with deterministic behavioral rules to detect multi-layer attacks.\n\n")
        
        out.write("--- ARCHITECTURE ---\n")
        out.write("1. Attacker Container: Orchestrates multi-vector attacks (Brute Force, C2, etc.)\n")
        out.write("2. User Container: Ingests network packets (Scapy) and endpoint logs (auditd/psutil).\n")
        out.write("3. Redis: Serves as a low-latency event bus and incident store.\n")
        out.write("4. Dashboard: React-based frontend for real-time visualization.\n\n")
        
        out.write("--- ACCESS & ENDPOINTS ---\n")
        out.write("- API Root: http://localhost:8001/api\n")
        out.write("- WebSocket Alerts: ws://localhost:8001/ws/alerts\n")
        out.write("- Dashboard UI: http://localhost:3001\n")
        out.write("- SSH Target: ssh root@172.25.0.20\n\n")
        
        out.write("--- FILES & CODES ---\n\n")
        
        for root, dirs, files in os.walk(root_dir):
            # Prune directories
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            
            for file in sorted(files):
                if file in exclude_files:
                    continue
                
                # Skip binary files based on extension or heuristic
                if file.endswith(('.pkl', '.json', '.pdf', '.docx', '.png', '.jpg', '.jpeg', '.gif', '.ico')):
                    if not file.endswith('.json'): # Keep json if it's small config
                         continue
                
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, root_dir)
                
                # Skip large files (> 500KB)
                if os.path.getsize(file_path) > 500 * 1024:
                    continue
                    
                out.write(f"\nFILE: ./{rel_path}\n")
                out.write("-" * 40 + "\n")
                
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
                        out.write(f.read())
                except Exception as e:
                    out.write(f"[Error reading file: {e}]\n")
                
                out.write("\n" + "=" * 80 + "\n")

if __name__ == "__main__":
    generate_report('/home/batman/intelli-SOC', '/home/batman/intelli-SOC/INTELLI_SOC_FULL_REPORT.txt')
