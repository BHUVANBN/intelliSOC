import { useState, useEffect } from 'react'
import { api } from '../../services/api'
import './sim_styles.css'

function SimulationHub({ onStartSimulation }) {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [startingDemo, setStartingDemo] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        const data = await api.getSimulationProfiles()
        setProfiles(data.profiles)
        setLoading(false)
      } catch {
        setError('Failed to load attack profiles')
        setLoading(false)
      }
    }
    init()
  }, [])

  const startSimulation = async (attackType) => {
    try {
      await api.startSimulation(attackType, 1.0)
      onStartSimulation(attackType)
    } catch (err) {
      if (err.message && err.message.includes('409')) {
        onStartSimulation(attackType)
      } else {
        setError('Failed to start simulation')
      }
    }
  }

  const handleLaunchDemo = async () => {
    setStartingDemo(true)
    try {
      await api.startSimulation('demo', 2.0)
      onStartSimulation('demo')
    } catch (err) {
      onStartSimulation('demo')
    }
  }

  if (loading) return <div className="loading" style={{ padding: 40, textAlign: 'center', opacity: 0.6 }}>Initializing Lab Environment...</div>
  if (error) return <div className="error" style={{ padding: 40, color: 'var(--red)' }}>{error}</div>

  return (
    <div className="sim-hub-container">
      
      {/* ── HEADER ── */}
      <div className="sim-header">
        <h2>Simulation Lab</h2>
        <p>Orchestrate synthetic threats to evaluate detection logic and response playbooks.</p>
      </div>

      <div className="sim-grid">
        
        {/* ── DEMO BANNER ── */}
        <div className="demo-row">
          <div className="demo-content">
            <h3>🎬 Multi-Stage Hackathon Demo</h3>
            <p>
              Launch a full attack lifecycle simulation including Reconnaissance, 
              Lateral Movement, and Data Exfiltration. Perfect for showcasing end-to-end SOC capabilities.
            </p>
          </div>
          <button className="demo-btn" onClick={handleLaunchDemo} disabled={startingDemo}>
            {startingDemo ? 'INITIALIZING...' : 'LAUNCH FULL DEMO 🚀'}
          </button>
        </div>

        {/* ── ATTACK CARDS ── */}
        {profiles.map((profile) => (
          <div key={profile.id} className={`premium-card ${profile.id}`}>
            <div className="card-top">
              <div className="card-icon-box">{profile.icon || '🛡️'}</div>
              <div className="card-mitre">{profile.mitre?.id || 'T1000'}</div>
            </div>

            <h3 className="card-title">{profile.name}</h3>
            <p className="card-desc">{profile.description}</p>

            <div className="card-metadata">
              <div className="meta-item">
                <span className="meta-label">Duration</span>
                <span className="meta-val">{profile.duration_seconds}s</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Severity</span>
                <span className="meta-val" style={{ color: `var(--${profile.severity?.toLowerCase()})` }}>
                  {profile.severity}
                </span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Tactic</span>
                <span className="meta-val">{profile.mitre?.tactic}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Phase</span>
                <span className="meta-val">Simulation</span>
              </div>
            </div>

            <div className="card-signals">
              <div className="card-signals-title">
                <span>🔍</span> Detection Signals
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                {profile.indicators?.slice(0, 3).map((ind, i) => (
                  <span key={i} className="signal-tag">{ind}</span>
                ))}
              </div>
            </div>

            <button className="card-btn" onClick={() => startSimulation(profile.id)}>
              <span>▶</span> START SCENARIO
            </button>
          </div>
        ))}

      </div>

      {/* ── INFO FOOTER ── */}
      <div style={{ marginTop: 40, padding: 20, textAlign: 'center', opacity: 0.5, fontSize: '0.8rem' }}>
        Note: These simulations generate synthetic telemetry and will not affect any live production systems.
      </div>
    </div>
  )
}

export default SimulationHub