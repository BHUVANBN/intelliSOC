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
    fetchPlaybook, clearIncidents, removeIncident, toast } = useAlertStream();
  
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
        position: 'sticky', top: 0, zIndex: 100,
        background: 'var(--vibrancy)',
        backdropFilter: 'blur(32px) saturate(180%)',
        borderBottom: '1px solid var(--sep)',
        padding: '0 32px',
        display: 'flex', alignItems: 'center', height: 64,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginRight: 48 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 'var(--r-sm)',
            background: 'linear-gradient(135deg,#0A84FF,#BF5AF2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, boxShadow: '0 4px 12px rgba(10,132,255,0.3)',
          }}>⚡</div>
          <span style={{ fontWeight: 900, fontSize: '1.05rem', letterSpacing: '-0.03em' }}>
            intelli<span style={{ color: 'var(--blue)' }}>SOC</span>
          </span>
        </div>

        {/* Tab strip */}
        <div className="tab-strip" style={{ marginRight: 'auto', background: 'rgba(255,255,255,0.03)' }}>
          {[
            ['incidents', 'Incidents'], 
            ['timeline', 'Timeline'], 
            ['mitre', 'MITRE ATT&CK'],
            ['simulate', 'Simulate Lab']
          ].map(([v, l]) => (
            <button key={v} className={`tab ${tab === v ? 'active' : ''}`} onClick={() => setTab(v)}>{l}</button>
          ))}
        </div>

        {/* Status indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: '0.8rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontWeight: 600 }}>
            <span className="pulse-dot" style={{ background: connected ? 'var(--green)' : 'var(--red)', boxShadow: connected ? '0 0 10px var(--green)' : 'none' }} />
            {connected ? 'LIVE' : 'OFFLINE'}
          </span>
          <span style={{ color: 'var(--text-tertiary)' }}>
            <span style={{ color: 'var(--cyan)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              {eventsPerSec}
            </span> EPS
          </span>
          <a href={`${API}/docs`} target="_blank" rel="noreferrer"
            className="btn btn-ghost" style={{ fontSize: '0.75rem', textDecoration: 'none', padding: '6px 12px' }}>
            DOCS ↗
          </a>
        </div>
      </header>

      {/* ══ STAT CARDS ROW ══════════════════════════════════════════════════ */}
      {tab !== 'simulate' && (
      <div className="anim-slide-up" style={{
        display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
        gap: 16, padding: '24px 32px 0',
      }}>
        <StatCard label="Total Alerts" value={incidents.length} icon="🛡️" color="var(--blue)" />
        <StatCard label="Critical" value={critical} icon="🔥" color="var(--red)" />
        <StatCard label="High" value={high} icon="⚠️" color="var(--orange)" />
        <StatCard label="Threat Classes" value={Object.keys(threatCls).length} icon="🎯" color="var(--purple)" />
      </div>
      )}

      {/* ══ MAIN LAYOUT ═════════════════════════════════════════════════════ */}
      <main style={{
        display: 'grid', gridTemplateColumns: tab === 'simulate' ? '1fr' : '1fr 340px',
        gap: 16, padding: '16px 32px 32px',
        flex: 1, minHeight: 0,
      }}>

        {/* ── Left column ── */}
        <div className="card anim-slide-up" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>

          {/* Panel header */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--sep)',
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'rgba(255,255,255,0.01)'
          }}>
            {tab === 'incidents' && (
              <>
                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#fff' }}>LIVE THREAT FEED</span>
                <div className="tab-strip" style={{ marginLeft: 'auto', background: 'rgba(0,0,0,0.2)' }}>
                  {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(f => (
                    <button key={f} className={`tab ${filter === f ? 'active' : ''}`}
                      style={{ padding: '4px 12px', fontSize: '0.74rem' }}
                      onClick={() => setFilter(f)}>{f}</button>
                  ))}
                </div>
                <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '6px 14px' }} onClick={clearIncidents}>
                  Clear Logs
                </button>
              </>
            )}
            {tab === 'timeline' && <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#fff' }}>THREAT PROPAGATION TIMELINE</span>}
            {tab === 'mitre' && <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#fff' }}>ATT&CK MATRIX OVERLAY</span>}
            {tab === 'simulate' && <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#fff' }}>SIMULATION LAB</span>}
          </div>

          {/* Panel body */}
          <div style={{ flex: 1, padding: tab === 'simulate' ? '32px' : '20px', overflowY: 'auto', minHeight: 0 }}>
            {tab === 'incidents' && (
              <IncidentFeed incidents={incidents} fetchPlaybook={fetchPlaybook} removeIncident={removeIncident} filter={filter} />
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
        <div className="anim-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Severity gauge */}
          <div className="card">
            <div className="eyebrow">Severity Analytics</div>
            <SeverityGauge incidents={incidents} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
              {[['CRITICAL', 'var(--red)'], ['HIGH', 'var(--orange)'],
              ['MEDIUM', 'var(--yellow)'], ['LOW', 'var(--blue)']].map(([s, c]) => {
                const n = incidents.filter(i => String(i.severity).includes(s)).length;
                return (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{s}</span>
                    <span style={{ marginLeft: 'auto', fontWeight: 800, color: c }}>{n}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Threat class breakdown */}
          <div className="card" style={{ flex: 1 }}>
            <div className="eyebrow">Threat Taxonomy</div>
            {Object.keys(threatCls).length === 0 ? (
              <div style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', textAlign: 'center', padding: '32px 0' }}>
                Awaiting telemetry...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {Object.entries(threatCls).sort(([, a], [, b]) => b - a).map(([cls, cnt]) => {
                  const clr = {
                    BRUTE_FORCE: 'var(--red)', LATERAL_MOVEMENT: 'var(--orange)',
                    EXFILTRATION: 'var(--yellow)', C2_BEACON: 'var(--cyan)',
                  }[cls] || 'var(--text-secondary)';
                  const pct = Math.round((cnt / incidents.length) * 100);
                  return (
                    <div key={cls}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 6 }}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{cls.replace(/_/g, ' ')}</span>
                        <span style={{ color: clr, fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{cnt}</span>
                      </div>
                      <div className="progress-track" style={{ height: 4 }}>
                        <div className="progress-fill" style={{ width: `${pct}%`, background: clr, boxShadow: `0 0 10px ${clr}44` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* System status */}
          <div className="card" style={{ padding: '20px' }}>
            <div className="eyebrow">Diagnostic Health</div>
            {[
              ['Sensor Network', connected ? '🟢 Connected' : '🔴 Fault'],
              ['Inference', '⚡ XGBoost Hybrid'],
              ['Telemetry', '🟢 10ms Latency'],
              ['API Node', 'v1.0.4-stable'],
            ].map(([k, v]) => (
              <div key={k} style={{
                display: 'flex', justifyContent: 'space-between', padding: '8px 0',
                borderBottom: '1px solid var(--sep)', fontSize: '0.78rem'
              }}>
                <span style={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>{k}</span>
                <span className="mono" style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>{v}</span>
              </div>
            ))}
            {/* System Status Banner removed per user request */}
          </div>
        </div>
        )}
      </main>

      {/* ══ FOOTER ══════════════════════════════════════════════════════════ */}
      <footer style={{
        padding: '16px 32px', borderTop: '1px solid var(--sep)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: '0.7rem', color: 'var(--text-tertiary)', 
        background: 'var(--bg-base)', fontWeight: 600
      }}>
        <span>intelli-SOC · INTELLIGENT THREAT DETECTION & ORCHESTRATION</span>
        <div style={{ display: 'flex', gap: 24 }}>
           <span><span style={{ color: 'var(--blue)' }}>⚡</span> XGBoost CORE</span>
           <span><span style={{ color: 'var(--purple)' }}>🔮</span> SHAP INTERPRETABILITY</span>
           <span><span style={{ color: 'var(--green)' }}>🛡️</span> ATT&CK ALIGNED</span>
        </div>
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
