import { useState, useEffect, useRef, useMemo } from 'react'
import { api } from '../../services/api'
import { subscribeSimulation, simulationSocket } from '../../services/simulationStream'
import AttackBriefing from './AttackBriefing'
import './sim_styles.css'

const NORMAL_LOG_THRESHOLD = 8

/* ── COMPONENT: NETWORK TOPOLOGY ── */
function NetworkTopology({ activeLayer, attackStarted }) {
  return (
    <div className="card" style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', marginBottom: '16px' }}>
      <div className="eyebrow" style={{ marginBottom: '16px' }}>Network Topology & Propagation</div>
      <div style={{ position: 'relative', height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
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
            fontSize: 24
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

function SimulationSummary({ profile, alerts, logs, onBack }) {
  const [selectedAlert, setSelectedAlert] = useState(null);

  return (
    <div className="card anim-slide-up" style={{
      background: 'linear-gradient(135deg, rgba(10,132,255,0.1), rgba(0,0,0,0.5))',
      border: '1px solid var(--blue)', padding: '40px', textAlign: 'left', maxWidth: '1100px', margin: '0 auto'
    }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
         <div style={{ fontSize: 64, marginBottom: 20 }}>✅</div>
         <h2 style={{ fontSize: '2.2rem', fontWeight: 900, marginBottom: 12 }}>Simulation Success</h2>
         <p style={{ color: 'var(--text-secondary)' }}>Scenario: {profile.name} · SOC Pipeline Validated</p>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 48 }}>
         <div className="card" style={{ background: 'rgba(255,255,255,0.03)', textAlign: 'center' }}>
            <div className="meta-label">Total Events</div>
            <div className="stat-num" style={{ color: 'var(--blue)', fontSize: '2rem' }}>{logs.length}</div>
         </div>
         <div className="card" style={{ background: 'rgba(255,255,255,0.03)', textAlign: 'center' }}>
            <div className="meta-label">Threats Caught</div>
            <div className="stat-num" style={{ color: 'var(--red)', fontSize: '2rem' }}>{alerts.length}</div>
         </div>
         <div className="card" style={{ background: 'rgba(255,255,255,0.03)', textAlign: 'center' }}>
            <div className="meta-label">Response Time</div>
            <div className="stat-num" style={{ color: 'var(--purple)', fontSize: '2rem' }}>~1.2s</div>
         </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
         <div>
            <div className="eyebrow" style={{ marginBottom: 16 }}>Captured Alerts Audit</div>
            <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
               {alerts.length === 0 ? <p style={{ opacity: 0.5 }}>No alerts detected.</p> : 
                 alerts.map((a, i) => (
                   <div key={i} className="card" 
                        style={{ 
                           borderLeft: `4px solid var(--red)`, 
                           cursor: 'pointer', 
                           background: selectedAlert === a ? 'rgba(255,69,58,0.1)' : 'rgba(255,255,255,0.02)',
                           padding: '12px 16px'
                        }}
                        onClick={() => setSelectedAlert(a)}>
                      <div className="meta-label" style={{ color: 'var(--red)', marginBottom: 4 }}>DETECTION: {a.alert_id}</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{a.description}</div>
                   </div>
                 ))
               }
            </div>
         </div>

         <div className="card" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="eyebrow" style={{ marginBottom: 16 }}>AI Response Playbook</div>
            {selectedAlert ? (
               <div className="anim-fade-up">
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 24, padding: 12, borderLeft: '2px solid var(--blue)', background: 'rgba(10,132,255,0.05)' }}>
                     {selectedAlert.description}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                     {profile.playbook?.map((step, i) => (
                        <div key={i} style={{ display: 'flex', gap: 12, fontSize: '0.85rem' }}>
                           <div style={{ color: 'var(--blue)', fontWeight: 900 }}>0{i+1}.</div>
                           <div style={{ color: 'rgba(255,255,255,0.8)' }}>{step.action || step}</div>
                        </div>
                     ))}
                  </div>
               </div>
            ) : <div style={{ textAlign: 'center', padding: 40, opacity: 0.5 }}>Select an alert to audit response</div>}
         </div>
      </div>

      <div style={{ marginTop: 40, textAlign: 'center' }}>
        <button className="card-btn" style={{ width: 'auto', padding: '14px 40px' }} onClick={onBack}>
           RETURN TO LAB HUB
        </button>
      </div>
    </div>
  )
}

function ThreatPopup({ alert, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 6000)
    return () => clearTimeout(t)
  }, [onDismiss])
  return (
    <div className="threat-popup">
      <div className="threat-popup-inner">
        <div className="threat-popup-icon">🚨</div>
        <div className="threat-popup-body">
          <div className="threat-popup-title">INTRUSION DETECTED</div>
          <p style={{ fontSize: '0.85rem', color: '#fff', margin: '4px 0' }}>{alert.description}</p>
          <div className="threat-popup-meta">
            <span style={{ color: 'var(--red)', fontWeight: 800 }}>{alert.severity}</span>
            <span>{alert.mitre?.id}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AttackDashboard({ attackType, onBack }) {
  const logsEndRef = useRef(null)
  const [phase, setPhase] = useState('briefing') 
  const [logs, setLogs] = useState([])
  const [alerts, setAlerts] = useState([])
  const [status, setStatus] = useState({ status: 'idle', progress: 0, speed: 1.0 })
  const [profile, setProfile] = useState(null)
  const [isPaused, setIsPaused] = useState(false)
  const [activeTab, setActiveTab] = useState('logs')
  const [attackStarted, setAttackStarted] = useState(false)
  const [threatPopups, setThreatPopups] = useState([])
  const [redAlert, setRedAlert] = useState(false)
  const [activeLayer, setActiveLayer] = useState('network')

  const logCountRef = useRef(0)

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await api.getSimulationProfiles()
        let p = data.profiles.find(p => p.id === attackType)
        if (attackType === 'demo') {
           p = { name: 'Multi-Stage Demo', icon: '🎬', mitre: { id: 'CHAIN', tactic: 'Cross-Domain', technique: 'Full Lifecycle' }, severity: 'CRITICAL', indicators: ['Initial Access', 'C2', 'Exfiltration'] }
        }
        setProfile(p)
      } catch (err) { console.error(err) }
    }
    loadProfile()
  }, [attackType])

  useEffect(() => {
    if (phase !== 'running') return
    const unsub = subscribeSimulation((msg) => {
      if (msg.type === 'log') {
        logCountRef.current += 1
        const enriched = { ...msg.data, logPhase: logCountRef.current <= NORMAL_LOG_THRESHOLD ? 'normal' : 'attack' }
        if (logCountRef.current === NORMAL_LOG_THRESHOLD + 1) {
          setAttackStarted(true)
          setRedAlert(true)
          setTimeout(() => setRedAlert(false), 2000)
        }
        setActiveLayer(msg.data.layer)
        setLogs(prev => [...prev.slice(-150), enriched])
      } else if (msg.type === 'alert') {
        setAlerts(prev => [...prev, msg.data])
        setThreatPopups(prev => [...prev, { ...msg.data, popupId: Date.now() }])
      } else if (msg.type === 'status') {
        setStatus(msg.data)
        setIsPaused(msg.data.status === 'paused')
      }
    })
    return unsub
  }, [phase])

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const handleStartExecution = async () => {
    setPhase('running')
    try {
      // CLEAR PREVIOUS STATE IN BACKEND IF NEEDED
      await fetch('http://localhost:8001/api/simulate/reset')
      // START THE SIMULATION
      await api.startSimulation(attackType, 1.5)
    } catch (err) {
      console.warn('Simulation start notice:', err)
    }
  }

  const handleStop = async () => {
    await api.stopSimulation()
    onBack()
  }

  const dismissPopup = (id) => setThreatPopups(p => p.filter(x => x.popupId !== id))

  if (!profile) return <div style={{ padding: 100, textAlign: 'center' }}>Initializing...</div>

  if (phase === 'briefing') {
    return <AttackBriefing attackType={attackType} profile={profile} onStart={handleStartExecution} />
  }

  if (status.status === 'completed' || status.progress >= 100) {
    return (
      <div style={{ padding: '60px 40px', maxWidth: '1000px', margin: '0 auto' }}>
        <SimulationSummary profile={profile} alerts={alerts} logs={logs} onBack={handleStop} />
      </div>
    )
  }

  return (
    <div className={`attack-dashboard ${redAlert ? 'red-alert-active' : ''}`} style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto', position: 'relative' }}>
      <div className="scanline" />

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, borderBottom: '1px solid var(--sep)', paddingBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div className="card-icon-box" style={{ width: 50, height: 50, fontSize: 28 }}>{profile.icon}</div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900 }}>{profile.name}</h2>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <span className="card-mitre">{profile.mitre?.id}</span>
              <span className="card-mitre" style={{ background: 'rgba(10,132,255,0.1)', color: 'var(--blue)' }}>{profile.mitre?.tactic}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
           <button className="card-btn" style={{ width: 140, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)' }} onClick={() => setIsPaused(!isPaused)}>
              {isPaused ? '▶ RESUME' : '⏸ PAUSE'}
           </button>
           <button className="card-btn" style={{ width: 120, background: 'var(--red)' }} onClick={handleStop}>Stop</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24 }}>
        
        {/* ── MAIN VIEW ── */}
        <div>
           {/* Progress */}
           <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                 <span className="eyebrow" style={{ marginBottom: 0 }}>MISSION PROGRESS</span>
                 <span className="stat-num" style={{ fontSize: '1.2rem' }}>{Math.round(status.progress)}%</span>
              </div>
              <div className="progress-track"><div className="progress-fill" style={{ width: `${status.progress}%` }} /></div>
           </div>

           <div className="card" style={{ padding: 0, overflow: 'hidden', minHeight: 600, display: 'flex', flexDirection: 'column' }}>
              <div className="tab-strip" style={{ borderRadius: 0, border: 'none', borderBottom: '1px solid var(--sep)', background: 'rgba(0,0,0,0.1)' }}>
                 {['logs', 'alerts'].map(t => (
                   <button key={t} className={`tab ${activeTab === t ? 'active' : ''}`} 
                           style={{ padding: '14px 28px', fontSize: '0.85rem' }}
                           onClick={() => setActiveTab(t)}>{t.toUpperCase()}</button>
                 ))}
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                 {activeTab === 'logs' ? (
                   <div>
                     {logs.map((log, i) => (
                       <div key={i} className={`mono log-line phase-${log.logPhase}`} style={{ 
                         fontSize: '0.78rem', 
                         padding: '8px 0', 
                         color: log.logPhase === 'attack' ? 'var(--red)' : 'rgba(255,255,255,0.3)',
                         borderBottom: '1px solid rgba(255,255,255,0.02)',
                         display: 'flex',
                         gap: 12,
                         transition: 'all 0.3s'
                       }}>
                         <span style={{ color: 'rgba(255,255,255,0.15)', minWidth: 70 }}>[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                         <span style={{ 
                            fontWeight: 800, 
                            color: log.logPhase === 'attack' ? 'var(--red)' : 'var(--blue)',
                            opacity: log.logPhase === 'attack' ? 1 : 0.4,
                            minWidth: 70
                         }}>[{log.layer.toUpperCase()}]</span>
                         <span style={{ flex: 1 }}>
                            {log.logPhase === 'normal' ? '☁️ ' : '🔥 '}
                            {log.message}
                         </span>
                       </div>
                     ))}
                     <div ref={logsEndRef} />
                   </div>
                 ) : (
                   <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                     {alerts.length === 0 ? <div style={{ textAlign: 'center', padding: 40, opacity: 0.5 }}>Monitoring for intrusions...</div> : 
                       alerts.map((a, i) => (
                         <div key={i} className="card" style={{ borderLeft: `4px solid var(--red)`, background: 'rgba(255,69,58,0.05)' }}>
                            <div className="eyebrow" style={{ color: 'var(--red)' }}>SOC ALERT · {a.alert_id}</div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 4 }}>{a.description}</div>
                            <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Confidence Score: {a.confidence * 100}%</div>
                         </div>
                       ))
                     }
                   </div>
                 )}
              </div>
           </div>
        </div>

        {/* ── SIDEBAR ── */}
        <div>
           <NetworkTopology activeLayer={activeLayer} attackStarted={attackStarted} />

           {/* Tactical Telemetry */}
           <div className="card anim-fade-up" style={{ marginBottom: 16, borderLeft: '4px solid var(--blue)' }}>
             <div className="eyebrow">Tactical Telemetry</div>
             {attackType === 'brute_force' && (
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
                  <div className="stat-num" style={{ fontSize: '1.4rem' }}>2,450</div><div className="meta-label">Attempts/m</div>
                  <div className="stat-num" style={{ fontSize: '1.4rem', color: 'var(--orange)' }}>98.2%</div><div className="meta-label">Fail Rate</div>
               </div>
             )}
             {attackType === 'c2_beacon' && (
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
                  <div className="stat-num" style={{ fontSize: '1.4rem' }}>30.0s</div><div className="meta-label">Pulse Int.</div>
                  <div className="stat-num" style={{ fontSize: '1.4rem', color: 'var(--cyan)' }}>200B</div><div className="meta-label">Payload</div>
               </div>
             )}
             {attackType === 'lateral_movement' && (
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
                  <div className="stat-num" style={{ fontSize: '1.4rem' }}>4</div><div className="meta-label">Hops</div>
                  <div className="stat-num" style={{ fontSize: '1.4rem', color: 'var(--purple)' }}>RPC</div><div className="meta-label">Tunnel</div>
               </div>
             )}
             {attackType === 'data_exfiltration' && (
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
                  <div className="stat-num" style={{ fontSize: '1.4rem' }}>142MB</div><div className="meta-label">Egress</div>
                  <div className="stat-num" style={{ fontSize: '1.4rem', color: 'var(--red)' }}>TLS</div><div className="meta-label">Enc.</div>
               </div>
             )}
             {attackType === 'demo' && (
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
                  <div className="stat-num" style={{ fontSize: '1.4rem' }}>MULTI</div><div className="meta-label">Mode</div>
                  <div className="stat-num" style={{ fontSize: '1.4rem', color: 'var(--green)' }}>ACTIVE</div><div className="meta-label">Engine</div>
               </div>
             )}
           </div>

           <div className="card">
              <div className="eyebrow">Live Signal Monitor</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                {profile.indicators?.map((ind, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: attackStarted ? 'var(--blue)' : 'var(--sep)' }} />
                    {ind}
                  </div>
                ))}
              </div>
           </div>
        </div>

      </div>

      {threatPopups.slice(-1).map(p => <ThreatPopup key={p.popupId} alert={p} onDismiss={() => dismissPopup(p.popupId)} />)}
    </div>
  )
}