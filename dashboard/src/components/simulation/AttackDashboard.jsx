import { useState, useEffect, useRef, useMemo } from 'react'
import { api } from '../../services/api'
import { subscribeSimulation, simulationSocket } from '../../services/simulationStream'
import AttackBriefing from './AttackBriefing'
import { getRandomLog } from './LogGenerator'
import './sim_styles.css'

const NORMAL_LOG_THRESHOLD = 8

/* ── COMPONENT: NETWORK TOPOLOGY ── */
function NetworkTopology({ activeLayer, attackStarted }) {
  return (
    <div className="card" style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', marginBottom: '16px' }}>
      <div className="eyebrow" style={{ marginBottom: '16px' }}>Network Topology & Propagation</div>
      <div style={{ position: 'relative', height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
          <line x1="25%" y1="50%" x2="50%" y2="50%" stroke="rgba(255,255,255,0.05)" strokeDasharray="4" />
          <line x1="50%" y1="50%" x2="75%" y2="50%" stroke="rgba(255,255,255,0.05)" strokeDasharray="4" />
        </svg>
        <div className={`node ${activeLayer === 'network' ? 'node-active' : ''} ${attackStarted ? 'compromised' : ''}`} style={{ zIndex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '1.2rem' }}>🌐</div><div style={{ fontSize: '0.6rem', fontWeight: 800 }}>GW</div>
        </div>
        <div className={`node ${activeLayer === 'endpoint' ? 'node-active' : ''}`} style={{ zIndex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '1.2rem' }}>💻</div><div style={{ fontSize: '0.6rem', fontWeight: 800 }}>EP</div>
        </div>
        <div className={`node ${activeLayer === 'c2' ? 'node-active' : ''}`} style={{ zIndex: 1, textAlign: 'center', opacity: activeLayer === 'c2' ? 1 : 0.3 }}>
          <div style={{ fontSize: '1.2rem' }}>☁️</div><div style={{ fontSize: '0.6rem', fontWeight: 800 }}>C2</div>
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
         <p style={{ color: 'var(--text-secondary)' }}>Scenario: {profile?.name} · SOC Pipeline Validated</p>
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
                   <div key={i} className="card" style={{ borderLeft: '4px solid var(--red)', cursor: 'pointer', background: selectedAlert === a ? 'rgba(255,69,58,0.1)' : 'rgba(255,255,255,0.02)', padding: '12px 16px' }}
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
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 24, padding: 12, borderLeft: '2px solid var(--blue)', background: 'rgba(10,132,255,0.05)' }}>{selectedAlert.description}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                     {profile?.playbook?.map((step, i) => (
                        <div key={i} style={{ display: 'flex', gap: 12, fontSize: '0.85rem' }}>
                           <div style={{ color: 'var(--blue)', fontWeight: 900 }}>0{i+1}.</div>
                           <div style={{ color: 'rgba(255,255,255,0.8)' }}>{step.action || step}</div>
                        </div>
                     ))}
                     {!profile?.playbook && <div style={{ opacity: 0.5 }}>Standard isolation procedure recommended.</div>}
                  </div>
               </div>
            ) : <div style={{ textAlign: 'center', padding: 40, opacity: 0.5 }}>Select an alert to audit response</div>}
         </div>
      </div>
      <div style={{ marginTop: 40, textAlign: 'center' }}>
        <button className="card-btn" style={{ width: 'auto', padding: '14px 40px' }} onClick={onBack}>RETURN TO LAB HUB</button>
      </div>
    </div>
  )
}

function AttackDashboard({ attackType, onStop }) {
  const [phase, setPhase] = useState('briefing')
  const [logs, setLogs] = useState([])
  const [alerts, setAlerts] = useState([])
  const [activeLayer, setActiveLayer] = useState('network')
  const [redAlert, setRedAlert] = useState(false)
  const [status, setStatus] = useState({ status: 'idle', progress: 0, speed: 1.0 })
  const [profile, setProfile] = useState(null)
  const [selectedLog, setSelectedLog] = useState(null)
  const [activeTab, setActiveTab] = useState('logs')
  const [attackStarted, setAttackStarted] = useState(false)
  
  const logCountRef = useRef(0)
  const logsEndRef = useRef(null)

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await api.getSimulationProfiles()
        let p = data.profiles.find(p => p.id === attackType)
        if (attackType === 'demo') {
           p = { name: 'Multi-Stage Demo', icon: '🎬', mitre: { id: 'CHAIN', technique: 'Full Lifecycle' }, playbook: ['Isolate network', 'Revoke tokens', 'Reset domain'] }
        }
        setProfile(p)
      } catch (err) { console.error(err) }
    }
    loadProfile()
  }, [attackType])

  useEffect(() => {
    if (phase !== 'running') return
    // Reset local state for fresh simulation start
    logCountRef.current = 0
    setLogs([])
    setAlerts([])
    
    const unsub = subscribeSimulation((msg) => {
      if (msg.type === 'log') {
        logCountRef.current += 1
        const simulated = getRandomLog(attackType, logCountRef.current, NORMAL_LOG_THRESHOLD)
        const enriched = { ...simulated, timestamp: new Date().toISOString() }
        if (logCountRef.current === NORMAL_LOG_THRESHOLD + 1) {
          setAttackStarted(true)
          setRedAlert(true)
          setTimeout(() => setRedAlert(false), 2000)
        }
        setActiveLayer(simulated.layer || 'network')
        setLogs(prev => [...prev.slice(-200), enriched])
      } else if (msg.type === 'alert') {
        const newAlert = { ...msg.data, receivedAt: new Date().toISOString() }
        setAlerts(prev => [...prev, newAlert])
        // Switch to ALERTS tab automatically for the very first alert
        if (alerts.length === 0) setActiveTab('alerts')
      } else if (msg.type === 'status') {
        setStatus(msg.data)
      }
    })
    return () => {
      unsub()
      logCountRef.current = 0
    }
  }, [phase, attackType])

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const handleStartExecution = async () => {
    setPhase('running')
    try {
      await fetch('http://localhost:8001/api/simulate/reset')
      await api.startSimulation(attackType, 1.5)
    } catch (err) { console.warn(err) }
  }

  const handleStop = async () => {
     try { await api.stopSimulation() } catch {}
     onStop()
  }

  if (status.status === 'completed' || status.progress >= 100) {
    return <div style={{ padding: '60px 40px', maxWidth: '1000px', margin: '0 auto' }}>
      <SimulationSummary profile={profile} alerts={alerts} logs={logs} onBack={handleStop} />
    </div>
  }

  if (phase === 'briefing') {
    return <AttackBriefing attackType={attackType} profile={profile} onStart={handleStartExecution} />
  }

  return (
    <div className={`sim-dashboard-container ${redAlert ? 'red-alert' : ''}`}>
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
           <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900 }}>{profile?.name}</h2>
           <span className="eyebrow" style={{ color: 'var(--red)', background: 'rgba(255,59,48,0.1)', padding: '4px 12px', borderRadius: 20 }}>
             <span className="pulse-dot" style={{ background: 'var(--red)', width: 6, height: 6, marginRight: 8 }} />
             IN PROGRESS
           </span>
        </div>
        <button className="card-btn" style={{ width: 'auto', background: 'rgba(255,59,48,0.1)', color: 'var(--red)', border: '1px solid rgba(255,59,48,0.2)', padding: '10px 24px' }} onClick={handleStop}>
          ABORT SIMULATION
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24 }}>
        <div>
           {/* Progress */}
           <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                 <span className="eyebrow">MISSION PROGRESS</span>
                 <span className="stat-num">{Math.round(status.progress)}%</span>
              </div>
              <div className="progress-track" style={{ height: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 20 }}>
                 <div className="progress-fill" style={{ 
                   width: `${status.progress}%`, 
                   background: 'linear-gradient(90deg, #0A84FF, #64D2FF)',
                   boxShadow: '0 0 20px rgba(10,132,255,0.6)',
                   borderRadius: 20
                 }} />
               </div>
           </div>

           {/* Forensic Log Suite */}
           <div className="card" style={{ padding: 0, overflow: 'hidden', minHeight: 600, display: 'flex', flexDirection: 'column', position: 'relative' }}>
              <div className="scanline" />
              <div className="tab-strip" style={{ borderRadius: 0, border: 'none', borderBottom: '1px solid var(--sep)', background: 'rgba(0,0,0,0.3)', display: 'flex', gap: 32, padding: '0 24px' }}>
                 <div className={`tab ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')} style={{ padding: '16px 0', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', opacity: activeTab === 'logs' ? 1 : 0.4, borderBottom: activeTab === 'logs' ? '2px solid var(--blue)' : 'none' }}>TACTICAL LOGS</div>
                 <div className={`tab ${activeTab === 'alerts' ? 'active' : ''}`} onClick={() => setActiveTab('alerts')} style={{ padding: '16px 0', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', opacity: activeTab === 'alerts' ? 1 : 0.4, borderBottom: activeTab === 'alerts' ? '2px solid var(--red)' : 'none' }}>ALERTS ({alerts.length})</div>
              </div>

             <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
               <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                 {activeTab === 'logs' ? (
                   <div>
                     {logs.map((log, i) => (
                       <div key={i} className={`mono log-line phase-${log.logPhase}`}
                            onClick={() => setSelectedLog(log)}
                            style={{ 
                               fontSize: '0.78rem', padding: '10px', 
                               color: log.logPhase === 'attack' ? 'var(--red)' : 'rgba(255,255,255,0.4)',
                               background: selectedLog === log ? 'rgba(255,255,255,0.03)' : 'transparent',
                               display: 'flex', gap: 12, cursor: 'pointer', borderRadius: 6
                            }}>
                         <span style={{ color: 'rgba(255,255,255,0.15)', minWidth: 70 }}>[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                         <span style={{ flex: 1 }}>{log.logPhase === 'normal' ? '☁️ ' : '🔥 '}{log.message}</span>
                       </div>
                     ))}
                     <div ref={logsEndRef} />
                   </div>
                 ) : (
                   <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                     {alerts.length === 0 ? <div style={{ textAlign: 'center', padding: 40, opacity: 0.5 }}>Monitoring...</div> :
                       alerts.map((a, i) => (
                         <div key={i} className="card" style={{ borderLeft: '4px solid var(--red)', background: 'rgba(255,69,58,0.05)' }}>
                            <div className="eyebrow" style={{ color: 'var(--red)' }}>DETECTION · {a.alert_id}</div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{a.description}</div>
                         </div>
                       ))
                     }
                   </div>
                 )}
               </div>

               {/* Forensics Intelligence Panel */}
               {selectedLog && (
                 <div className="anim-slide-in-right" style={{ width: '300px', background: 'rgba(255,255,255,0.02)', padding: '20px', borderLeft: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <div className="eyebrow" style={{ color: 'var(--blue)' }}>Tactical Intel</div>
                       <button onClick={() => setSelectedLog(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.4 }}>✕</button>
                    </div>
                    <div>
                       <div className="meta-label">Technical Analysis</div>
                       <div style={{ fontSize: '0.8rem', color: '#fff', lineHeight: 1.5 }}>{selectedLog.explanation}</div>
                    </div>
                    <div style={{ padding: 12, background: 'rgba(52,199,89,0.05)', borderRadius: 8 }}>
                       <div className="meta-label" style={{ color: 'var(--green)' }}>Prevention</div>
                       <div style={{ fontSize: '0.75rem' }}>{selectedLog.prevention}</div>
                    </div>
                    <div>
                       <div className="meta-label">Remediation</div>
                       <div style={{ padding: 10, background: '#000', borderRadius: 6, fontSize: '0.65rem', color: 'var(--blue)', border: '1px solid rgba(10,132,255,0.2)' }}>{selectedLog.code}</div>
                    </div>
                 </div>
               )}
             </div>
           </div>
        </div>

        <div>
           <NetworkTopology activeLayer={activeLayer} attackStarted={attackStarted} />
           <div className="card anim-fade-up" style={{ borderLeft: '4px solid var(--blue)' }}>
              <div className="eyebrow">Tactical Telemetry</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                 <div className="stat-num" style={{ fontSize: '1.4rem' }}>{status.progress > 50 ? 'FAST' : 'STABLE'}</div><div className="meta-label">Status</div>
                 <div className="stat-num" style={{ fontSize: '1.4rem', color: 'var(--orange)' }}>Active</div><div className="meta-label">Sensor</div>
              </div>
           </div>
        </div>
      </div>
    </div>
  )
}

export default AttackDashboard