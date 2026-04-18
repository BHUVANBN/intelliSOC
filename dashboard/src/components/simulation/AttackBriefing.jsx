import { useState, useEffect } from 'react'

const ATTACK_BRIEFINGS = {
  brute_force: {
    title: 'Brute Force Attack',
    icon: '🔐',
    tagline: 'Credential Stuffing via Repeated Authentication',
    story: [
      'Attacker scanning SSH service on port 22...',
      'Methodical probing for service vulnerabilities identified.',
      'High-frequency authentication attempts initiated.',
      'Targeted credential stuffing using distributed hit-lists.',
      'Security boundary established — system entering high-alert.',
      'Detection engine correlation active.',
    ],
    timeline: [
      { phase: 'Recon',   duration: '0–10s',  desc: 'Port scan, fingerprinting', color: '#007AFF' },
      { phase: 'Brute',   duration: '10–50s', desc: '2500+ login attempts/min', color: '#FF9500' },
      { phase: 'Exploit', duration: '50-60s', desc: 'Unauthorized access gained', color: '#FF3B30' },
    ],
    checks: ['Network Boundary: SECURE', 'Inference Engine: READY', 'Honeypot: ACTIVE']
  },
  c2_beacon: {
    title: 'C2 Beaconing',
    icon: '📡',
    tagline: 'Command & Control Communication Pattern',
    story: [
      'Identifying rhythmic HTTPS heartbeat signals...',
      'Payload analysis suggests encrypted payload exchange.',
      'Consistent 200-byte packets detected at 30s intervals.',
      'Destination IP flagged as non-reputable/malicious.',
      'Analyzing cross-layer correlation for process persistence.',
      'Threat identified: Advanced Persistent Threat engagement.',
    ],
    timeline: [
      { phase: 'Infection', duration: '0–5s',   desc: 'Malware dropper execution', color: '#FF3B30' },
      { phase: 'Beacon',    duration: '5–110s',  desc: 'Subtle heartbeat patterns', color: '#FF9500' },
      { phase: 'Command',   duration: '110s+',   desc: 'C2 instruction receipt', color: '#AF52DE' },
    ],
    checks: ['Traffic Monitor: ACTIVE', 'Domain Analysis: READY', 'Process Guard: ON']
  },
  lateral_movement: {
    title: 'Lateral Movement',
    icon: '🕸️',
    tagline: 'Internal Network Propagation',
    story: [
      'Primary workstation compromise confirmed.',
      'Analyzing internal SMB/RPC traffic spikes.',
      'LSASS memory access detected on target node.',
      'Lateral spread detected via WMI remoting.',
      'Unauthorized administrative logins across subnets.',
      'Critical: Attacker targeting Domain Controller.',
    ],
    timeline: [
      { phase: 'Credential', duration: '0–30s',  desc: 'Memory dump, credential steal', color: '#FF3B30' },
      { phase: 'Propagation', duration: '30–60s', desc: 'SMB/WMI lateral hops', color: '#FF9500' },
      { phase: 'Targeting',   duration: '60s+',   desc: 'Administrative takeover', color: '#AF52DE' },
    ],
    checks: ['Internal Firewall: ACTIVE', 'Identity Guard: ON', 'Node Tracking: ACTIVE']
  },
  data_exfiltration: {
    title: 'Data Exfiltration',
    icon: '💎',
    tagline: 'Sensitive Data Theft via Covert Channel',
    story: [
      'Scanning for unusual egress traffic volume...',
      'Unauthorized data staging in high-value directory.',
      'Multiple bulk queries to customer database.',
      'Archive generation and compression detected.',
      'Data outflow initiated via encrypted HTTPS tunnel.',
      'Critical: Potential PII/Confidential data leakage.',
    ],
    timeline: [
      { phase: 'Discovery',    duration: '0–15s',  desc: 'Querying sensitive databases', color: '#007AFF' },
      { phase: 'Staging',      duration: '15–30s', desc: 'Archive compression & prep', color: '#FF9500' },
      { phase: 'Exfil',        duration: '30s+',   desc: 'Egress to malicious domain', color: '#FF3B30' },
    ],
    checks: ['DLP Engine: ACTIVE', 'Egress Control: STANDBY', 'Data Sentinel: ON']
  },
  demo: {
    title: 'Multi-Attack Demo',
    icon: '🎬',
    tagline: 'Strategic Chain: Discovery → Persistence → Exfiltration',
    story: [
      'Initializing complex multi-vector simulation...',
      'Simultaneous Brute Force & C2 Beaconing active.',
      'Adding legitimate backup noise for correlation testing.',
      'Evaluating cross-layer AI reasoning accuracy.',
      'Strategic objective: Full system compromise evaluation.',
      'SOC readiness verification in progress.',
    ],
    timeline: [
      { phase: 'Chain Link A', duration: '0–60s',   desc: 'Brute Force + C2 Start', color: '#FF3B30' },
      { phase: 'Chain Link B', duration: '60–100s', desc: 'Lateral spread attempts', color: '#FF9500' },
      { phase: 'Chain Link C', duration: '100s+',   desc: 'Full exfiltration capture', color: '#AF52DE' },
    ],
    checks: ['Global IDS: READY', 'AI Correlator: ACTIVE', 'Demo Mode: ENABLED']
  }
}

function TypewriterText({ text, speed = 20, onDone }) {
  const [displayed, setDisplayed] = useState('')
  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1))
        i++
      } else {
        clearInterval(interval)
        onDone?.()
      }
    }, speed)
    return () => clearInterval(interval)
  }, [text])
  return <span>{displayed}<span className="briefing-cursor">_</span></span>
}

function AttackBriefing({ attackType, profile, onStart }) {
  const [currentLine, setCurrentLine] = useState(0)
  const [allDone, setAllDone] = useState(false)
  const briefing = ATTACK_BRIEFINGS[attackType] || ATTACK_BRIEFINGS['brute_force']

  const handleLineDone = () => {
    if (currentLine < briefing.story.length - 1) {
      setTimeout(() => setCurrentLine(c => c + 1), 300)
    } else {
      setAllDone(true)
    }
  }

  return (
    <div className="briefing-overlay">
      <div className="scanline" />
      <div className="briefing-container">
        
        {/* Top Header */}
        <div className="briefing-header">
           <div className="briefing-icon">{briefing.icon}</div>
           <div style={{ flex: 1 }}>
              <h1 className="briefing-title">{briefing.title}</h1>
              <p className="briefing-tagline" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                 <span>{briefing.tagline}</span>
                 <span style={{ fontSize: '0.7rem', background: 'rgba(10,132,255,0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                    {profile?.mitre?.id || 'T1000'}
                 </span>
              </p>
           </div>
        </div>

        {/* Diagnostic Checks (Building Tension) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 40 }}>
           {briefing.checks.map((chk, i) => (
              <div key={i} style={{ 
                 background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', 
                 padding: '12px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 700,
                 color: 'var(--text-tertiary)', letterSpacing: '0.1em'
              }}>
                 <span style={{ color: 'var(--blue)', marginRight: 8 }}>[OK]</span> {chk}
              </div>
           ))}
        </div>

        {/* Script Execution (Typewriter) */}
        <div className="briefing-story">
           {briefing.story.slice(0, currentLine + 1).map((line, idx) => (
              <div key={idx} className={`briefing-line ${idx < currentLine ? 'done' : 'active'}`}>
                 <span style={{ color: 'var(--blue)', marginRight: 12 }}>{'>'}</span>
                 {idx < currentLine ? line : <TypewriterText text={line} onDone={handleLineDone} />}
              </div>
           ))}
        </div>

        {/* Timeline (High-end) */}
        {allDone && (
           <div className="briefing-timeline" style={{ animation: 'fadeIn 0.5s ease-out' }}>
              {briefing.timeline.map((item, i) => (
                 <div key={i} className="briefing-timeline-step" style={{ borderLeft: `3px solid ${item.color}` }}>
                    <div className="briefing-timeline-phase" style={{ color: item.color }}>{item.phase}</div>
                    <div className="briefing-timeline-desc">{item.desc}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', marginTop: 4 }}>Time Window: {item.duration}</div>
                 </div>
              ))}
           </div>
        )}

        {/* Actions */}
        <div style={{ marginTop: 24 }}>
           {allDone ? (
              <button className="briefing-start-btn" onClick={onStart}>
                 INITIALIZE SIMULATION MATRIX ⚡
              </button>
           ) : (
              <button 
                 onClick={() => { setCurrentLine(briefing.story.length-1); setAllDone(true); }}
                 style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
              >
                 SKIP DIAGNOSTIC ⏭
              </button>
           )}
        </div>

      </div>
    </div>
  )
}

export default AttackBriefing
export { ATTACK_BRIEFINGS }