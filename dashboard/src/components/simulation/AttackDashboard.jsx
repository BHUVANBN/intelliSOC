import { useState, useEffect, useRef, useMemo } from 'react'
import { api } from '../../services/api'
import { subscribeSimulation, simulationSocket } from '../../services/simulationStream'
import AttackBriefing, { ATTACK_BRIEFINGS } from './AttackBriefing'
import './sim_styles.css'

const NORMAL_LOG_THRESHOLD = 5

/* ── COMPONENT: NETWORK TOPOLOGY ── */
function NetworkTopology({ activeLayer, attackStarted }) {
  return (
    <div className="card" style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', marginBottom: '16px' }}>
      <div className="eyebrow" style={{ marginBottom: '16px' }}>Network Topology & Propagation</div>
      <div style={{ position: 'relative', height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
        
        {/* Connection paths */}
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
           <line x1="25%" y1="50%" x2="50%" y2="50%" stroke={attackStarted ? 'var(--red)' : 'var(--sep)'} strokeWidth="2" strokeDasharray={attackStarted ? "5,5" : "0"} />
           <line x1="50%" y1="50%" x2="75%" y2="50%" stroke={activeLayer === 'endpoint' && attackStarted ? 'var(--red)' : 'var(--sep)'} strokeWidth="2" strokeDasharray="5,5" />
        </svg>

        <div className="node-item" style={{ zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
           <div style={{ 
              width: 48, height: 48, borderRadius: '50%', background: attackStarted ? 'rgba(255,69,58,0.1)' : 'rgba(255,255,255,0.05)',
              border: `2px solid ${attackStarted ? 'var(--red)' : 'var(--sep)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, boxShadow: attackStarted ? '0 0 15px var(--glow-red)' : 'none'
           }}>🎭</div>
           <span className="meta-label">Attacker</span>
        </div>

        <div className="node-item" style={{ zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
           <div style={{ 
              width: 56, height: 56, borderRadius: '12px', background: activeLayer === 'network' ? 'rgba(10,132,255,0.1)' : 'rgba(255,255,255,0.05)',
              border: `2px solid ${activeLayer === 'network' ? 'var(--blue)' : 'var(--sep)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, transition: 'all 0.3s'
           }}>🌐</div>
           <span className="meta-label">Gateway</span>
        </div>

        <div className="node-item" style={{ zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
           <div style={{ 
              width: 48, height: 48, borderRadius: '8px', background: activeLayer === 'endpoint' ? 'rgba(255,69,58,0.1)' : 'rgba(255,255,255,0.05)',
              border: `2px solid ${activeLayer === 'endpoint' ? 'var(--red)' : 'var(--sep)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, boxShadow: activeLayer === 'endpoint' ? '0 0 15px var(--glow-red)' : 'none'
           }}>🖥️</div>
           <span className="meta-label">Target Host</span>
        </div>
      </div>
    </div>
  )
}

/* ── COMPONENT: SIMULATION SUMMARY ── */
function SimulationSummary({ profile, alerts, logs, onBack }) {
  const score = useMemo(() => {
    const base = 85;
    const bonus = alerts.length * 5;
    return Math.min(100, base + bonus);
  }, [alerts]);

  return (
    <div className="card" style={{ 
      animation: 'slideUp 0.5s ease-out', 
      background: 'linear-gradient(135deg, rgba(10,132,255,0.1), rgba(0,0,0,0.4))',
      border: '1px solid var(--blue)',
      padding: '40px', textAlign: 'center'
    }}>
      <div style={{ fontSize: 60, marginBottom: 20 }}>✅</div>
      <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 8px 0' }}>Simulation Complete</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>Scenario: {profile.name} — SOC Validation Successful</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, maxWidth: 600, margin: '0 auto 40px' }}>
         <div className="card" style={{ background: 'rgba(255,255,255,0.03)', padding: '20px' }}>
            <div className="meta-label">SOC Perf Score</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--green)' }}>{score}%</div>
         </div>
         <div className="card" style={{ background: 'rgba(255,255,255,0.03)', padding: '20px' }}>
            <div className="meta-label">Threats Caught</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--blue)' }}>{alerts.length}</div>
         </div>
         <div className="card" style={{ background: 'rgba(255,255,255,0.03)', padding: '20px' }}>
            <div className="meta-label">Data Ingested</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--purple)' }}>{logs.length}</div>
         </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
         <button className="card-btn" style={{ width: 'auto', padding: '12px 32px' }} onClick={onBack}>
            Return to Lab
         </button>
      </div>
    </div>
  )
}

function ThreatPopup({ alert, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 8000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div className="threat-popup">
      <div className="threat-popup-inner">
        <div className="threat-popup-icon">🚨</div>
        <div className="threat-popup-body">
          <div className="threat-popup-title">THREAT DETECTED</div>
          <div className="threat-popup-desc">{alert.description}</div>
          <div className="threat-popup-meta">
            <span className={`threat-popup-sev sev-${alert.severity?.toLowerCase()}`}>
              {alert.severity}
            </span>
            <span>Confidence: {(alert.confidence * 100).toFixed(0)}%</span>
            <span>{alert.mitre?.id}</span>
          </div>
        </div>
        <button className="threat-popup-close" onClick={onDismiss}>✕</button>
      </div>
      <div className="threat-popup-progress" />
    </div>
  )
}

function AttackDashboard({ attackType, onBack }) {
  const logsEndRef = useRef(null)

  const [phase, setPhase] = useState('briefing') // briefing | running
  const [logs, setLogs] = useState([])
  const [alerts, setAlerts] = useState([])
  const [status, setStatus] = useState({ status: 'idle', progress: 0, speed: 1.0 })
  const [profile, setProfile] = useState(null)
  const [isPaused, setIsPaused] = useState(false)
  const [selectedAlert, setSelectedAlert] = useState(null)
  const [activeTab, setActiveTab] = useState('logs')
  const [attackStarted, setAttackStarted] = useState(false)
  const [threatPopups, setThreatPopups] = useState([])
  const [redAlert, setRedAlert] = useState(false)
  const [activeLayer, setActiveLayer] = useState('network')
  
  const logCountRef = useRef(0)
  const isDemo = attackType === 'demo'

  useEffect(() => {
    const loadProfile = async () => {
      if (isDemo) {
        setProfile({
          icon: '🎬',
          name: 'Demo — Multi-Stage Chain',
          mitre: { id: 'APT-Hybrid', technique: 'Cross-Domain', tactic: 'Full Chain' },
          indicators: ['Initial Access', 'Command & Control', 'Exfiltration'],
          duration_seconds: 120,
          severity: 'CRITICAL'
        })
        return
      }
      try {
        const data = await api.getSimulationProfiles()
        const p = data.profiles.find(p => p.id === attackType)
        setProfile(p)
      } catch (err) {
        console.error('Failed to load profile:', err)
      }
    }
    loadProfile()
  }, [attackType, isDemo])

  useEffect(() => {
    if (phase !== 'running') return

    const unsub = subscribeSimulation((msg) => {
      if (msg.type === 'log') {
        logCountRef.current += 1
        const enriched = {
          ...msg.data,
          logPhase: logCountRef.current <= NORMAL_LOG_THRESHOLD ? 'normal' : 'attack'
        }
        if (logCountRef.current === NORMAL_LOG_THRESHOLD + 1) {
          setAttackStarted(true)
          setRedAlert(true)
          setTimeout(() => setRedAlert(false), 3000)
        }
        setActiveLayer(msg.data.layer)
        setLogs(prev => [...prev.slice(-100), enriched])
      } else if (msg.type === 'alert') {
        // Mock Reasoning for better Demo
        const reasoning = `Detected anomalous ${msg.data.threat_category || 'traffic'} pattern. The source node initiated multiple encrypted sessions to an unverified external peer, characteristic of T1071.001 (Web Protocols).`;
        const enrichedAlert = { ...msg.data, reasoning };

        setAlerts(prev => [...prev, enrichedAlert])
        setThreatPopups(prev => [...prev, { ...enrichedAlert, popupId: Date.now() }])
      } else if (msg.type === 'status') {
        setStatus(msg.data)
        setIsPaused(msg.data.status === 'paused')
      }
    })

    return unsub
  }, [phase, attackType])

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const handleStart = async () => {
    setPhase('running')
    try {
      await api.startSimulation(attackType, 1.5)
    } catch { }
  }

  const handlePause = async () => {
    if (isPaused) {
      await api.resumeSimulation();
      setIsPaused(false);
    } else {
      await api.pauseSimulation();
      setIsPaused(true);
    }
  }

  const handleStop = async () => {
    await api.stopSimulation()
    onBack()
  }

  const handleSpeedChange = (speed) => {
    simulationSocket.send({ type: 'set_speed', speed })
    setStatus(prev => ({ ...prev, speed }))
  }

  const dismissPopup = (popupId) => {
    setThreatPopups(prev => prev.filter(p => p.popupId !== popupId))
  }

  if (!profile) return <div className="loading">Mounting Lab Sandbox...</div>

  if (phase === 'briefing') {
    return <AttackBriefing attackType={attackType} profile={profile} onStart={handleStart} />
  }

  // SHOW SUMMARY IF COMPLETED
  if (status.status === 'completed' || status.progress >= 100) {
     return (
       <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>
          <SimulationSummary profile={profile} alerts={alerts} logs={logs} onBack={handleStop} />
       </div>
     )
  }

  return (
    <div className={`attack-dashboard ${redAlert ? 'red-alert-active' : ''}`} style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', position: 'relative' }}>
      <div className="scanline" />
      
      {/* ── HEADER ── */}
      <div className="dashboard-header" style={{
        background: 'rgba(255,255,255,0.03)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '0 0 24px 0',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div className="attack-info">
          <button className="btn-icon" onClick={handleStop} style={{ marginBottom: '12px', fontSize: '0.75rem' }}>
            ← Abort and Return to Lab
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
             <div className="card-icon-box" style={{ width: 44, height: 44, fontSize: 24 }}>{profile.icon}</div>
             <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>{profile.name}</h2>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                   <span className="card-mitre">{profile.mitre?.id}</span>
                   <span className="card-mitre" style={{ background: 'rgba(10,132,255,0.1)', color: 'var(--blue)' }}>{profile.mitre?.technique}</span>
                </div>
             </div>
          </div>
        </div>

        <div className="controls" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="meta-label">Speed</span>
            <select 
              value={status.speed || 1} 
              onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
              style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px', padding: '4px 8px' }}
            >
              {[0.5, 1, 2, 5, 10].map(s => <option key={s} value={s}>{s}x</option>)}
            </select>
          </div>
          <button className="card-btn" style={{ width: 120, background: isPaused ? 'var(--green)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} onClick={handlePause}>
            {isPaused ? '▶ RESUME' : '⏸ PAUSE'}
          </button>
          <button className="card-btn" style={{ width: 100, background: 'var(--red)' }} onClick={handleStop}>⏹ STOP</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
        
        {/* ── LEFT: MAIN VIEW ── */}
        <div>
          {/* Progress */}
          <div className="progress-section" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
               <span className="meta-label">Live Simulation Status: {status.status?.toUpperCase()}</span>
               <span className="meta-val" style={{ fontFamily: 'var(--font-mono)' }}>{Math.round(status.progress || 0)}%</span>
            </div>
            <div className="progress-track" style={{ height: '4px', background: 'rgba(255,255,255,0.05)' }}>
              <div className="progress-fill" style={{ 
                width: `${status.progress || 0}%`, 
                background: 'linear-gradient(to right, var(--blue), var(--purple))',
                boxShadow: '0 0 10px var(--glow-blue)',
                transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
              }} />
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden', minHeight: '520px', display: 'flex', flexDirection: 'column' }}>
            <div className="tabs" style={{ display: 'flex', borderBottom: '1px solid var(--sep)', background: 'rgba(0,0,0,0.1)' }}>
              {['logs', 'alerts', 'playbook'].map(t => (
                <button key={t} className={`tab ${activeTab === t ? 'active' : ''}`} 
                  style={{ padding: '12px 24px', border: 'none', background: 'none', color: activeTab === t ? '#fff' : 'var(--text-tertiary)', fontWeight: 700, cursor: 'pointer', borderBottom: activeTab === t ? '2px solid var(--blue)' : 'none' }}
                  onClick={() => setActiveTab(t)}>
                  {t.toUpperCase()} {t === 'logs' ? `(${logs.length})` : t === 'alerts' ? `(${alerts.length})` : ''}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              {activeTab === 'logs' && (
                <div className="logs-list">
                  {logs.map((log, idx) => (
                    <div key={idx} className={`log-entry log-${log.logPhase}`} style={{ fontSize: '0.75rem', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', gap: 12 }}>
                      <span className="timestamp" style={{ color: 'var(--text-tertiary)', minWidth: 70 }}>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      <span style={{ color: log.layer === 'network' ? 'var(--blue)' : 'var(--green)', minWidth: 60, fontWeight: 700, fontSize: '0.65rem' }}>[{log.layer.toUpperCase()}]</span>
                      <span style={{ color: log.logPhase === 'attack' ? 'var(--red)' : 'var(--text-secondary)' }}>{log.message}</span>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              )}

              {activeTab === 'alerts' && (
                <div className="alerts-list">
                  {alerts.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>Monitoring for intrusion markers...</div>
                  ) : (
                    alerts.map((alert, idx) => (
                      <div key={idx} className="card" 
                        style={{ borderLeft: `4px solid var(--${alert.severity?.toLowerCase()})`, marginBottom: '12px', cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}
                        onClick={() => { setSelectedAlert(alert); setActiveTab('playbook'); }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                           <span className="card-mitre">{alert.alert_id}</span>
                           <span style={{ color: `var(--${alert.severity?.toLowerCase()})`, fontWeight: 800, fontSize: '0.7rem' }}>{alert.severity}</span>
                        </div>
                        <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', fontWeight: 600 }}>{alert.description}</p>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Confidence: {(alert.confidence * 100).toFixed(0)}%</div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'playbook' && (
                <div className="playbook-view">
                   {selectedAlert ? (
                      <div>
                         <div className="eyebrow" style={{ marginBottom: '12px' }}>AI Detection Reasoning</div>
                         <div style={{ padding: '14px', background: 'rgba(10,132,255,0.05)', borderRadius: '8px', border: '1px solid rgba(10,132,255,0.1)', marginBottom: '24px', fontSize: '0.85rem', lineHeight: 1.6 }}>
                            {selectedAlert.reasoning}
                         </div>

                         <div className="eyebrow" style={{ marginBottom: '12px' }}>Mitigation Playbook</div>
                         <div className="playbook-steps">
                            {profile.playbook?.map((step, i) => (
                               <div key={i} style={{ display: 'flex', gap: 16, marginBottom: '12px' }}>
                                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--blue)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{i+1}</div>
                                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{step.action || step}</div>
                               </div>
                            ))}
                         </div>
                      </div>
                   ) : <div style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>Select an alert to view reasoning and playbooks.</div>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT: ANALYTICS ── */}
        <div>
          <NetworkTopology activeLayer={activeLayer} attackStarted={attackStarted} />

          <div className="card">
             <div className="eyebrow" style={{ marginBottom: 16 }}>Scenario Intelligence</div>
             <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="meta-item">
                   <span className="meta-label">Primary Tactic</span>
                   <span className="meta-val">{profile.mitre?.tactic}</span>
                </div>
                <div className="meta-item">
                   <span className="meta-label">Detection Goal</span>
                   <span className="meta-val">{profile.mitre?.technique}</span>
                </div>
             </div>

             <div className="eyebrow" style={{ marginTop: 20, marginBottom: 12 }}>Detection Signals</div>
             <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {profile.indicators?.map((ind, i) => (
                   <span key={i} className="signal-tag" style={{ margin: 0 }}>{ind}</span>
                ))}
             </div>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
             <div className="eyebrow" style={{ marginBottom: 16 }}>Live Stats</div>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ textAlign: 'center' }}>
                   <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{logs.length}</div>
                   <div className="meta-label">Events</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                   <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--red)' }}>{alerts.length}</div>
                   <div className="meta-label">Threats</div>
                </div>
             </div>
          </div>
        </div>

      </div>

      {threatPopups.slice(-1).map(p => <ThreatPopup key={p.popupId} alert={p} onDismiss={() => dismissPopup(p.popupId)} />)}
    </div>
  )
}

export default AttackDashboard