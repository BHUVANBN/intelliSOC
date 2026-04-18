import React, { useMemo, useState, useEffect } from 'react';
import { useAlertStream } from './hooks/useAlertStream';
import IncidentFeed from './components/IncidentFeed';
import ThreatTimeline from './components/ThreatTimeline';
import SeverityGauge from './components/SeverityGauge';
import MitrePanel from './components/MitrePanel';
import StatCard from './components/StatCard';
import SimulationHub from './components/simulation/SimulationHub';
import AttackDashboard from './components/simulation/AttackDashboard';

import { connectSimulation } from './services/simulationStream';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8001';

export default function App() {
  const { incidents, connected, stats, eventsPerSec,
    fetchPlaybook, clearIncidents, toast } = useAlertStream();
  
  const [tab, setTab] = useState('incidents'); // incidents | timeline | mitre | simulate
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    connectSimulation();
  }, []);

  // Simulation state (Internal routing)
  const [simState, setSimState] = useState({ view: 'hub', attackType: null });

  /* ── Derived counts ── */
  const critical = incidents.filter(i => String(i.severity).includes('CRITICAL')).length;
  const high = incidents.filter(i => String(i.severity).includes('HIGH')).length;
  
  const threatCls = useMemo(() => {
    const m = {};
    incidents.forEach(i => {
      const cls = String(i.threat_class).split('.').pop();
      if (cls && cls !== 'BENIGN') m[cls] = (m[cls] || 0) + 1;
    });
    return m;
  }, [incidents]);

  const handleStartSimulation = (type) => {
    setSimState({ view: 'dashboard', attackType: type });
  };

  const handleReturnToHub = () => {
    setSimState({ view: 'hub', attackType: null });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* ══ NAVIGATION BAR ══════════════════════════════════════════════════ */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderBottom: '1px solid var(--sep)',
        padding: '0 24px',
        display: 'flex', alignItems: 'center', height: 52,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 32 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 'var(--r-xs)',
            background: 'linear-gradient(135deg,#0A84FF,#BF5AF2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14,
          }}>⚡</div>
          <span style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '-0.02em' }}>
            intelli<span style={{ color: 'var(--blue)' }}>SOC</span>
          </span>
        </div>

        {/* Tab strip */}
        <div className="tab-strip" style={{ marginRight: 'auto' }}>
          {[
            ['incidents', 'Incidents'], 
            ['timeline', 'Timeline'], 
            ['mitre', 'MITRE ATT&CK'],
            ['simulate', 'Simulate']
          ].map(([v, l]) => (
            <button key={v} className={`tab ${tab === v ? 'active' : ''}`} onClick={() => setTab(v)}>{l}</button>
          ))}
        </div>

        {/* Status indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: '0.76rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
            <span className="pulse-dot" style={{ background: connected ? 'var(--green)' : 'var(--red)' }} />
            {connected ? 'Live' : 'Offline'}
          </span>
          <span style={{ color: 'var(--text-tertiary)' }}>
            <span style={{ color: 'var(--cyan)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              {eventsPerSec}
            </span> eps
          </span>
          <a href={`${API}/docs`} target="_blank" rel="noreferrer"
            className="btn-icon" style={{ fontSize: '0.75rem', textDecoration: 'none' }}>
            API ↗
          </a>
        </div>
      </header>

      {/* ══ STAT CARDS ROW ══════════════════════════════════════════════════ */}
      {tab !== 'simulate' && (
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
        gap: 12, padding: '16px 24px 0',
      }}>
        <StatCard label="Total Alerts" value={incidents.length} icon="🛡️" color="var(--blue)" />
        <StatCard label="Critical" value={critical} icon="🔥" color="var(--red)"
          glow={critical > 0 ? 'var(--glow-red)' : undefined} />
        <StatCard label="High" value={high} icon="⚠️" color="var(--orange)"
          glow={high > 0 ? 'var(--glow-orange)' : undefined} />
        <StatCard label="Threat Classes" value={Object.keys(threatCls).length} icon="🎯" color="var(--purple)" />
      </div>
      )}

      {/* ══ MAIN LAYOUT ═════════════════════════════════════════════════════ */}
      <main style={{
        display: 'grid', gridTemplateColumns: tab === 'simulate' ? '1fr' : '1fr 320px',
        gap: 16, padding: '16px 24px',
        flex: 1, minHeight: 0,
      }}>

        {/* ── Left column ── */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>

          {/* Panel header */}
          <div style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--sep)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            {tab === 'incidents' && (
              <>
                <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>Live Incident Feed</span>
                <div className="tab-strip" style={{ marginLeft: 'auto' }}>
                  {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(f => (
                    <button key={f} className={`tab ${filter === f ? 'active' : ''}`}
                      style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                      onClick={() => setFilter(f)}>{f}</button>
                  ))}
                </div>
                <button className="btn-icon" style={{ fontSize: '0.75rem' }} onClick={clearIncidents}>
                  Clear
                </button>
              </>
            )}
            {tab === 'timeline' && <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>Threat Timeline — last 15 min</span>}
            {tab === 'mitre' && <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>Detected ATT&CK Techniques</span>}
            {tab === 'simulate' && <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>Simulation Lab · Demonstration Mode</span>}
          </div>

          {/* Panel body */}
          <div style={{ flex: 1, padding: tab === 'simulate' ? 0 : '14px 16px', overflowY: 'auto', minHeight: 0 }}>
            {tab === 'incidents' && (
              <IncidentFeed incidents={incidents} fetchPlaybook={fetchPlaybook} filter={filter} />
            )}
            {tab === 'timeline' && <ThreatTimeline incidents={incidents} />}
            {tab === 'mitre' && <MitrePanel incidents={incidents} />}
            {tab === 'simulate' && (
                simState.view === 'hub' ? 
                <SimulationHub onStartSimulation={handleStartSimulation} /> : 
                <AttackDashboard attackType={simState.attackType} onBack={handleReturnToHub} />
            )}
          </div>
        </div>

        {/* ── Right sidebar ── */}
        {tab !== 'simulate' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Severity gauge */}
          <div className="card">
            <div className="eyebrow" style={{ marginBottom: 14 }}>Severity Distribution</div>
            <SeverityGauge incidents={incidents} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 14 }}>
              {[['CRITICAL', 'var(--red)'], ['HIGH', 'var(--orange)'],
              ['MEDIUM', 'var(--yellow)'], ['LOW', 'var(--blue)']].map(([s, c]) => {
                const n = incidents.filter(i => String(i.severity).includes(s)).length;
                return (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: c, flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{s}</span>
                    <span style={{ marginLeft: 'auto', fontWeight: 700, color: c }}>{n}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Threat class breakdown */}
          <div className="card" style={{ flex: 1 }}>
            <div className="eyebrow" style={{ marginBottom: 14 }}>Threat Breakdown</div>
            {Object.keys(threatCls).length === 0 ? (
              <div style={{ color: 'var(--text-tertiary)', fontSize: '0.82rem', textAlign: 'center', padding: '20px 0' }}>
                Monitoring for threats...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Object.entries(threatCls).sort(([, a], [, b]) => b - a).map(([cls, cnt]) => {
                  const clr = {
                    BRUTE_FORCE: 'var(--red)', LATERAL_MOVEMENT: 'var(--orange)',
                    EXFILTRATION: 'var(--yellow)', C2_BEACON: 'var(--cyan)',
                  }[cls] || 'var(--text-secondary)';
                  const pct = Math.round((cnt / incidents.length) * 100);
                  return (
                    <div key={cls}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: 5 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{cls.replace(/_/g, ' ')}</span>
                        <span style={{ color: clr, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{cnt}</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${pct}%`, background: clr }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* System status */}
          <div className="card" style={{ padding: '14px 16px' }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>System Status</div>
            {[
              ['Detection', connected ? '🟢 Active' : '🔴 Offline'],
              ['ML Engine', 'XGBoost + Rules'],
              ['Redis', '🟢 Streaming'],
              ['API', 'localhost:8000'],
            ].map(([k, v]) => (
              <div key={k} style={{
                display: 'flex', justifyContent: 'space-between', padding: '5px 0',
                borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.74rem'
              }}>
                <span style={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>{k}</span>
                <span className="mono" style={{ color: 'var(--text-secondary)' }}>{v}</span>
              </div>
            ))}
            <div style={{
              marginTop: 10, padding: '7px 10px', background: 'rgba(10,132,255,0.08)',
              borderRadius: 'var(--r-xs)', border: '1px solid rgba(10,132,255,0.18)',
              fontSize: '0.70rem', color: 'var(--blue)', textAlign: 'center', fontWeight: 600
            }}>
              Hack Malenadu '26 · Problem Statement 3
            </div>
          </div>
        </div>
        )}
      </main>

      {/* ══ FOOTER ══════════════════════════════════════════════════════════ */}
      <footer style={{
        padding: '10px 24px', borderTop: '1px solid var(--sep)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: '0.68rem', color: 'var(--text-tertiary)',
      }}>
        <span>intelli-SOC — AI-Driven Threat Detection & Simulation Engine</span>
        <span>
          <span style={{ color: 'var(--blue)', fontWeight: 700 }}>⚡</span> Powered by XGBoost + SHAP
        </span>
      </footer>


      {/* Toast container */}
      {toast && (
        <div className="toast-container">
          <div className="toast toast-error">
            <div style={{ fontSize: 20 }}>🔥</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: 2 }}>
                {toast.title}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Source: {toast.msg}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
