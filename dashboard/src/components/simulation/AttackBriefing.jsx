import { useState, useEffect } from 'react'
import './sim_styles.css'

const ATTACK_BRIEFINGS = {
  brute_force: {
    title: 'Brute Force Attack',
    icon: '🔐',
    tagline: 'Credential Stuffing via Distributed Authentication Hammering',
    story: [
      'Scanning target subnet for open port 22/tcp (SSH)...',
      'Port identification complete. Service banner: OpenSSH 8.9p1.',
      'Initializing high-velocity authentication dictionary attack.',
      'Source node detected hammering with 20 attempts/sec.',
      'Log analysis: Multiple "Authentication Failure" events per ms.',
      'Monitoring for "Successful Login" marker in noisy log stream.',
      'Detection Objective: Identify pattern before first successful entry.',
    ],
    timeline: [
      { phase: 'RECON',   duration: '0–12s',  desc: 'Active port scanning & banner grab', color: '#007AFF' },
      { phase: 'ATTACK',  duration: '12–50s', desc: '4,000+ failed authentication events', color: '#FF9500' },
      { phase: 'EXPLOIT', duration: '50–55s', desc: 'Successful root access via credential stuffing', color: '#FF3B30' },
      { phase: 'ACCESS',  duration: '55s+',   desc: 'Interactive tty shell initialization', color: '#AF52DE' },
    ],
    checks: ['SSH Monitor: ARMED', 'Fail2Ban: OVERRRIDDEN', 'Honeypot: STANDBY']
  },
  c2_beacon: {
    title: 'C2 Beaconing',
    icon: '📡',
    tagline: 'Command & Control Signaling via Encrypted Heartbeats',
    story: [
      'Identifying rhythmic egress HTTPS/443 traffic patterns.',
      'Analyzing packet periodicity: Rests observed at 30.0s exactly.',
      'Deep Packet Inspection: 200-byte encrypted payload detected.',
      'Destination: Malicious C2 control node Identified.',
      'Process lineage analysis: PowerShell spawning network sockets.',
      'Persistence marker: Rootkit established in user-land memory.',
      'Detection Objective: Uncover hidden heartbeats in legitimate traffic.',
    ],
    timeline: [
      { phase: 'INFECTION', duration: '0–10s',   desc: 'Malicious dropper execution via Word macro', color: '#FF3B30' },
      { phase: 'BEACON',    duration: '10–100s',  desc: 'Periodic 30s heartbeat signals', color: '#FF9500' },
      { phase: 'C2 CMD',    duration: '100–120s', desc: 'Encoded command receipt from control node', color: '#AF52DE' },
      { phase: 'ACTION',    duration: '120s+',    desc: 'Automated data collection script launch', color: '#FF2D55' },
    ],
    checks: ['PCAP Engine: ACTIVE', 'Entropy Scan: READY', 'Process Guard: ON']
  },
  lateral_movement: {
    title: 'Lateral Movement',
    icon: '🕸️',
    tagline: 'Internal Network Propagation via Identity Hijack',
    story: [
      'Initial compromise node detected on Workstation-4.',
      'Attempting credential extraction from LSASS process memory.',
      'Accessing NTLM hashes for internal domain users.',
      'Initializing SMB/RPC scanning of adjacent hosts.',
      'WMI remoting detected targeting high-value node: DC-01.',
      'Unauthorized administrative logins detected across subnets.',
      'Detection Objective: Stop the spread before Domain compromise.',
    ],
    timeline: [
      { phase: 'CRED DUMP', duration: '0–20s',  desc: 'SAM/LSASS access for password hashes', color: '#FF3B30' },
      { phase: 'PROPAGATE', duration: '20–50s', desc: 'SMB/WMI lateral spread to Server-02', color: '#FF9500' },
      { phase: 'TARGETING', duration: '50–80s', desc: 'Domain Controller access attempt', color: '#AF52DE' },
      { phase: 'CONTROL',   duration: '80s+',   desc: 'Full Domain Administrative takeover', color: '#FF2D55' },
    ],
    checks: ['AD Audit: ACTIVE', 'RPC Guard: ARMED', 'Event Logs: MONITORING']
  },
  data_exfiltration: {
    title: 'Data Exfiltration',
    icon: '💎',
    tagline: 'Sensitive Asset Extraction via Covert Channels',
    story: [
      'Monitoring for massive internal database query patterns.',
      'Bulk file access detected in "Confidential" directories.',
      'Archive generation identified: staging.tar.gz created.',
      'Initiating outbound transfer to unauthorized external IP.',
      'Analyzing data chunks: HTTPS protocol used for obfuscation.',
      'Alert: Egress traffic exceeds standard 24hr baselines.',
      'Detection Objective: Prevent data loss before staging completes.',
    ],
    timeline: [
      { phase: 'DISCOVERY', duration: '0–20s',  desc: 'Bulk query to customer tables', color: '#007AFF' },
      { phase: 'STAGING',   duration: '20–40s', desc: 'Compression of 150MB sensitive assets', color: '#FF9500' },
      { phase: 'EXFIL',     duration: '40–90s', desc: 'Egress to malicious destination IP', color: '#FF3B30' },
      { phase: 'CLEANUP',   duration: '90s+',   desc: 'Deletion of staging files and event logs', color: '#64D2FF' },
    ],
    checks: ['DLP Engine: ACTIVE', 'Flow Monitor: READY', 'File Sentinel: ON']
  },
  demo: {
    title: 'Multi-Attack Demo',
    icon: '🎬',
    tagline: 'Orchestrated Campaign: Full Attack Chains Matrix',
    story: [
      'Initializing complex multi-vector campaign simulation.',
      'Executing Brute Force (Network) + C2 Beacon (Endpoint).',
      'Injecting legitimate backup noise for correlation noise.',
      'Triggering cross-layer correlation logic in Core Engine.',
      'Evaluating confidence scores for synchronized threat events.',
      'Strategic objective: Verify SOC response under heavy load.',
      'Final Phase: Automated playbook remediation verification.',
    ],
    timeline: [
      { phase: 'CHAIN A', duration: '0–60s',   desc: 'Brute Force + C2 initialization', color: '#FF3B30' },
      { phase: 'CHAIN B', duration: '60–100s', desc: 'Lateral spread & credential stealing', color: '#FF9500' },
      { phase: 'CHAIN C', duration: '100s+',   desc: 'Full exfiltration capture & mitigation', color: '#AF52DE' },
    ],
    checks: ['Global IDS: READY', 'AI Correlator: ACTIVE', 'Demo Mode: ENABLED']
  }
}

function TypewriterText({ text, speed = 15, onDone }) {
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
      setTimeout(() => setCurrentLine(c => c + 1), 250)
    } else {
      setAllDone(true)
    }
  }

  return (
    <div className="briefing-overlay">
      <div className="scanline" />
      <div className="briefing-container anim-slide-up">
        
        {/* Top Header */}
        <div className="briefing-header">
           <div className="briefing-icon">{briefing.icon}</div>
           <div style={{ flex: 1 }}>
              <h1 className="briefing-title" style={{ color: '#fff' }}>{briefing.title}</h1>
              <p className="briefing-tagline" style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--blue)' }}>
                 <span>{briefing.tagline}</span>
                 <span style={{ fontSize: '0.7rem', background: 'rgba(10,132,255,0.15)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(10,132,255,0.3)' }}>
                    {profile?.mitre?.id || 'T1000'}
                 </span>
              </p>
           </div>
        </div>

        {/* Diagnostic Checks */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 40 }}>
           {briefing.checks.map((chk, i) => (
              <div key={i} style={{ 
                 background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', 
                 padding: '14px', borderRadius: '10px', fontSize: '0.68rem', fontWeight: 800,
                 color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em'
              }}>
                 <span style={{ color: 'var(--blue)', marginRight: 10 }}>[OK]</span> {chk}
              </div>
           ))}
        </div>

        {/* Script Execution (Typewriter) */}
        <div className="briefing-story">
           {briefing.story.slice(0, currentLine + 1).map((line, idx) => (
              <div key={idx} className={`briefing-line ${idx < currentLine ? 'done' : 'active'}`}>
                 <span style={{ color: 'var(--blue)', marginRight: 12, fontWeight: 900 }}>{'>'}</span>
                 {idx < currentLine ? line : <TypewriterText text={line} speed={15} onDone={handleLineDone} />}
              </div>
           ))}
        </div>

        {/* Timeline */}
        {allDone && (
           <div className="briefing-timeline">
              {briefing.timeline.map((item, i) => (
                 <div key={i} className="briefing-timeline-step" style={{ borderLeft: `4px solid ${item.color}`, background: 'rgba(255,255,255,0.02)', animation: 'slideUp 0.4s ease-out' }}>
                    <div className="briefing-timeline-phase" style={{ color: item.color }}>{item.phase}</div>
                    <div className="briefing-timeline-desc" style={{ color: '#fff' }}>{item.desc}</div>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginTop: 6, fontWeight: 700 }}>WINDOW: {item.duration}</div>
                 </div>
              ))}
           </div>
        )}

        {/* Actions */}
        <div style={{ marginTop: 24 }}>
           {allDone ? (
              <button className="briefing-start-btn" onClick={() => { console.log('Initializing Matrix...'); onStart(); }} style={{ position: 'relative', zIndex: 1001 }}>
                 INITIALIZE SIMULATION MATRIX ⚡
              </button>
           ) : (
              <button 
                 onClick={() => { setCurrentLine(briefing.story.length-1); setAllDone(true); }}
                 style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.05em' }}
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