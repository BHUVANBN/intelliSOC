"""
Playbook Generator — Dynamically fills playbook templates with incident context.
"""
from __future__ import annotations
import json
import os
import logging
import requests
import copy
from typing import Optional, Dict, List

log = logging.getLogger("playbook_generator")

TEMPLATE_DIR = os.path.join(os.path.dirname(__file__), "templates")

TEMPLATE_MAP = {
    "BRUTE_FORCE":      "brute_force.json",
    "LATERAL_MOVEMENT": "lateral_movement.json",
    "EXFILTRATION":     "exfiltration.json",
    "C2_BEACON":        "c2_beacon.json",
}

_TEMPLATE_CACHE: Dict[str, dict] = {}


def _load_template(threat_class: str) -> Optional[dict]:
    """Load and cache a playbook template."""
    t_key = str(threat_class).upper()
    
    # Fuzzy match template
    resolved = None
    for k in TEMPLATE_MAP.keys():
        if k in t_key:
            resolved = k
            break
            
    if not resolved:
        log.warning(f"No playbook template found for: {threat_class}")
        return None

    if resolved in _TEMPLATE_CACHE:
        return _TEMPLATE_CACHE[resolved]

    filename = TEMPLATE_MAP[resolved]
    path = os.path.join(TEMPLATE_DIR, filename)
    try:
        with open(path, "r") as f:
            template = json.load(f)
        _TEMPLATE_CACHE[resolved] = template
        return template
    except Exception as e:
        log.error(f"Failed to load template {filename}: {e}")
        return None


def _fill_template(template: dict, context: dict) -> dict:
    """
    Fill in template variables ({src_ip}, {dst_ip}, etc.) from incident context.
    Returns a deep-copied, filled template.
    """
    filled = copy.deepcopy(template)

    def replace_vars(text: str) -> str:
        if not isinstance(text, str):
            return text
        for key, value in context.items():
            text = text.replace(f"{{{key}}}", str(value) if value else f"<{key}>")
        return text

    for step in filled.get("steps", []):
        step["command"]     = replace_vars(step.get("command", ""))
        step["description"] = replace_vars(step.get("description", ""))
        step["action"]      = replace_vars(step.get("action", ""))

    return filled


# LLM Configuration
LLM_API_URL = os.getenv("LLM_API_URL", "http://localhost:11434/api/generate") # Default to Ollama
LLM_MODEL   = os.getenv("LLM_MODEL", "llama3.2")

def _generate_with_llm(context: dict) -> Optional[dict]:
    """Ask a local LLM to generate a custom playbook based on incident context."""
    prompt = f"""
    You are an expert SOC Analyst and Cyber Security Engineer.
    Generate a professional incident response playbook for the following security incident:
    
    THREAT: {context['threat_class']}
    SEVERITY: {context['severity']}
    SOURCE: {context['src_ip']} 
    TARGET: {context['dst_ip']}
    PROCESS: {context['process_name']} (PID: {context['pid']})
    USER: {context['user']}
    EXPLANATION: {context.get('explanation', 'Unknown behavior')}

    Requirements:
    1. Respond ONLY with a valid JSON object.
    2. Include 'title', 'mitre_id', and a list of 'steps'.
    3. Each step must have 'phase', 'action', 'command', and 'description'.
    4. Provide a 'mitigation' script in Bash or Python to solve the threat.
    
    JSON Template:
    {{
      "title": "Title here",
      "mitre_id": "T1234",
      "steps": [{{ "phase": "Contain", "action": "Block IP", "command": "iptables...", "description": "..." }}],
      "mitigation": {{ "script": "#!/bin/bash...", "language": "bash", "risk": "MEDIUM" }}
    }}
    """
    try:
        response = requests.post(LLM_API_URL, json={
            "model": LLM_MODEL,
            "prompt": prompt,
            "stream": False,
            "format": "json"
        }, timeout=10)
        
        if response.status_code == 200:
            res_json = response.json()
            content = res_json.get("response", "")
            return json.loads(content)
    except Exception as e:
        log.warning(f"LLM generation failed, falling back to templates: {e}")
    return None


def _generate_human_analysis(context: dict) -> str:
    """Provides a plain-English explanation of the threat."""
    tc = context['threat_class'].replace('_', ' ').lower()
    
    analysis_templates = {
        "brute force": f"Our sensors detected someone repeatedly trying to guess the password for your system from {context['src_ip']}. This is usually an automated bot looking for weak passwords. Fortunately, our AI caught the pattern before they could potentially succeed.",
        "c2 beacon": f"An unusual 'heartbeat' signal was detected between this computer and a server at {context['dst_ip']}. This often happens when malware is trying to receive instructions from a hacker. We've identified the specific process ({context['process_name']}) responsible.",
        "exfiltration": f"We detected a large or unusual amount of data being sent to the internet at {context['dst_ip']}. This looks like an attempt to steal sensitive company files or databases. The transfer was initiated by {context['user']}.",
        "lateral movement": f"An attacker was caught trying to hop from one computer to another within our internal network. They were specifically targeting {context['dst_ip']} while using the identity of {context['user']}. We've blocked this movement to prevent them from reaching your critical servers.",
    }
    
    for key, template in analysis_templates.items():
        if key in tc:
            return template
            
    return f"We detected {tc} activity involving {context['src_ip']} and {context['process_name']}. Our AI logic identified this as a deviation from normal behavior that requires immediate attention."


def generate_playbook(incident_dict: dict) -> Optional[dict]:
    """Generate a playbook using Local LLM (if available) or fallback to templates."""
    t_raw = str(incident_dict.get("threat_class", "BENIGN")).upper()
    
    if "BENIGN" in t_raw:
        return None

    # Context construction
    context = {
        "threat_class":     t_raw.split(".")[-1],
        "severity":         str(incident_dict.get("severity", "LOW")).split(".")[-1],
        "src_ip":           incident_dict.get("src_ip", "UNKNOWN"),
        "dst_ip":           incident_dict.get("dst_ip", "UNKNOWN"),
        "dst_port":         incident_dict.get("dst_port", "?"),
        "pid":              incident_dict.get("pid", "?"),
        "process_name":     incident_dict.get("process_name", "unknown"),
        "user":             incident_dict.get("user", "unknown"),
        "explanation":      incident_dict.get("explanation", ""),
        "incident_id":      incident_dict.get("incident_id")
    }

    # 1. Try LLM first
    llm_playbook = _generate_with_llm(context)
    if llm_playbook:
        llm_playbook["generated_for"] = context["incident_id"]
        llm_playbook["llm_generated"] = True
        llm_playbook["human_analysis"] = llm_playbook.get("human_analysis") or _generate_human_analysis(context)
        return llm_playbook

    # 2. Fallback
    template = _load_template(t_raw)
    if not template:
        return None

    playbook = _fill_template(template, context)
    playbook["generated_for"] = context["incident_id"]
    playbook["llm_generated"] = False
    playbook["human_analysis"] = _generate_human_analysis(context)
    
    # Mitigation logic
    mitigation_script = f"#!/bin/bash\n# Mitigation for {context['threat_class']}\n"
    if "C2" in t_raw:
        mitigation_script += f"kill -9 {context['pid']}\n"
    elif "BRUTE" in t_raw:
        mitigation_script += f"iptables -A INPUT -s {context['src_ip']} -j DROP\n"
    elif "EXFIL" in t_raw:
        mitigation_script += f"iptables -A OUTPUT -d {context['dst_ip']} -j DROP\n"
    elif "LATERAL" in t_raw:
        mitigation_script += f"iptables -A INPUT -p tcp --dport 22 -s {context['src_ip']} -j DROP\n"
        
    playbook["mitigation"] = {
        "script": mitigation_script.strip(),
        "language": "bash",
        "risk": "MEDIUM"
    }
    return playbook
