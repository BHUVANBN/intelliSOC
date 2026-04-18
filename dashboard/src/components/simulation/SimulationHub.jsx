import { useState, useEffect } from 'react'
import { api } from '../../services/api'
import './sim_styles.css'

function SimulationHub({ onStartSimulation }) {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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

  if (loading) return (
    <div style={{ padding: 100, textAlign: 'center' }}>
       <div className="pulse-dot" style={{ width: 40, height: 40, background: 'var(--blue)', margin: '0 auto 20px' }} />
       <div className="eyebrow">Initializing Lab Environment...</div>
    </div>
  )

  if (error) return <div className="error" style={{ padding: 40, color: 'var(--red)', textAlign: 'center' }}>{error}</div>

  return (
    <div className="sim-hub-container anim-slide-up">
      
      {/* ── HEADER ── */}
      <div className="sim-header">
        <h2>Simulate Lab</h2>
        <p>
          Execute high-fidelity synthetic threat scenarios. Each scenario is mapped to 
          <span style={{ color: 'var(--blue)', fontWeight: 700 }}> MITRE ATT&CK®</span> techniques.
        </p>
      </div>

      <div className="sim-grid">
        
        {/* ── MULTI-STAGE DEMO ── */}
        <div className="demo-row anim-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="demo-content">
            <div className="eyebrow" style={{ color: 'var(--purple)', marginBottom: 8 }}>Featured Campaign</div>
            <h3>🎬 Full Attack Lifecycle Demo</h3>
            <p>A high-impact demonstration covering the entire kill chain.</p>
          </div>
          <button className="demo-btn" onClick={() => onStartSimulation('demo')}>
            LAUNCH FULL DEMO 🚀
          </button>
        </div>

        {/* ── INDIVIDUAL SCENARIOS ── */}
        {profiles.map((profile, i) => (
          <div 
            key={profile.id} 
            className={`premium-card ${profile.id} anim-slide-up`} 
            style={{ animationDelay: `${0.2 + (i * 0.1)}s` }}
          >
            <div className="card-top">
              <div className="card-icon-box">{profile.icon || '🛡️'}</div>
              <div className="card-mitre">{profile.mitre?.id || 'T1000'}</div>
            </div>

            <h3 className="card-title">{profile.name}</h3>
            <p className="card-desc">{profile.description}</p>

            <div className="card-metadata">
              <div className="meta-item">
                <span className="meta-label">Complexity</span>
                <span className="meta-val">Advanced</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Severity</span>
                <span className="meta-val" style={{ color: profile.severity === 'Critical' ? 'var(--red)' : 'var(--orange)' }}>
                  {profile.severity}
                </span>
              </div>
            </div>

            <div className="card-signals">
              <div className="card-signals-title"><span>🔍</span> Detection Signals</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {profile.indicators?.slice(0, 2).map((ind, idx) => (
                  <span key={idx} className="signal-tag" style={{ margin: 0 }}>{ind}</span>
                ))}
              </div>
            </div>

            <button className="card-btn" onClick={() => onStartSimulation(profile.id)}>
               <span>▶</span> START SIMULATION
            </button>
          </div>
        ))}

      </div>
    </div>
  )
}

export default SimulationHub