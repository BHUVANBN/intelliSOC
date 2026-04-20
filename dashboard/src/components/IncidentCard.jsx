import React, { useState } from 'react';
import SeverityBadge, { ThreatIcon } from './SeverityBadge';
import PlaybookDrawer from './PlaybookDrawer';
import { formatDistanceToNow } from 'date-fns';

const SEV_BORDER = {
  CRITICAL: 'rgba(239,68,68,0.4)',
  HIGH: 'rgba(249,115,22,0.3)',
  MEDIUM: 'rgba(234,179,8,0.25)',
  LOW: 'rgba(59,130,246,0.25)',
  BENIGN: 'rgba(16,185,129,0.2)',
};

export default function IncidentCard({ incident, fetchPlaybook, removeIncident }) {
  const [expanded, setExpanded] = useState(false);
  const [playbook, setPlaybook] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loadingPb, setLoadingPb] = useState(false);

  const age = (() => {
    try { return formatDistanceToNow(new Date(incident.timestamp), { addSuffix: true }); }
    catch { return ''; }
  })();

  const handlePlaybook = async (e) => {
    e.stopPropagation();
    setLoadingPb(true);
    const pb = await fetchPlaybook(incident.incident_id);
    setPlaybook(pb);
    setLoadingPb(false);
    setDrawerOpen(true);
  };

  const confPct = Math.round((incident.confidence || 0) * 100);

  return (
    <>
      <div
        className="anim-slide-up"
        style={{
          background: 'var(--bg-surface)',
          border: incident.severity === 'BENIGN' ? '2px solid #22c55e' : `1px solid ${SEV_BORDER[incident.severity] || 'var(--border)'}`,
          borderRadius: 'var(--r-md)',
          marginBottom: 12,
          cursor: 'pointer',
          transition: 'all 0.3s var(--ease)',
          boxShadow: incident.severity === 'CRITICAL'
            ? '0 8px 32px rgba(239,68,68,0.1)'
            : '0 4px 20px rgba(0,0,0,0.2)',
        }}
        onClick={() => setExpanded(e => !e)}
      >
        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
          <ThreatIcon threatClass={incident.threat_class} size={22} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>
                {incident.threat_class.replace(/_/g, ' ')}
              </span>
              <SeverityBadge severity={incident.severity} />
              {incident.suppressed && (
                <span className="badge badge-fp">FP · suppressed</span>
              )}
              {incident.mitre_id && (
                <span className="mono text-xs" style={{ color: 'var(--text-accent)' }}>
                  {incident.mitre_id}
                </span>
              )}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: 2 }}>
              <span className="mono">{incident.src_ip || '—'}</span>
              <span style={{ margin: '0 6px' }}>→</span>
              <span className="mono">{incident.dst_ip || '—'}:{incident.dst_port || '?'}</span>
              <span style={{ margin: '0 8px', opacity: 0.4 }}>·</span>
              <span>{age}</span>
            </div>
          </div>

          {/* Confidence meter */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ 
              fontSize: '1.1rem', 
              fontWeight: 700, 
              color: incident.severity === 'BENIGN' ? '#166534' : confColor(incident.confidence) 
            }}>
              {confPct}%
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>CONF</div>
          </div>
        </div>

        {/* ── Expanded detail ── */}
        {expanded && (
          <div style={{
            borderTop: '1px solid var(--border-subtle)',
            padding: '14px 16px',
            fontSize: '0.82rem',
            animation: 'fadeInUp 0.2s ease-out',
          }}>
            {incident.explanation && (
              <p style={{ color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.7 }}>
                {incident.explanation}
              </p>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginBottom: 14 }}>
              {[
                ['Rule', incident.rule_name?.replace(/_/g, ' ')],
                ['Layer', incident.layer],
                ['Process', incident.process_name],
                ['User', incident.user],
                ['Protocol', incident.protocol],
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={label} style={{ background: 'var(--bg-surface)', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {label}
                  </div>
                  <div className="mono" style={{ color: 'var(--text-primary)', marginTop: 2 }}>{value}</div>
                </div>
              ))}
            </div>

            {incident.shap_features && Object.keys(incident.shap_features).length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  Key SHAP Features
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {Object.entries(incident.shap_features).slice(0, 5).map(([feat, val]) => (
                    <span key={feat} className="mono" style={{
                      background: 'var(--bg-hover)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 6,
                      padding: '3px 8px',
                      fontSize: '0.72rem',
                      color: val > 0 ? '#f87171' : (incident.severity === 'BENIGN' ? '#166534' : '#34d399'),
                    }}>
                      {feat}: {val > 0 ? '+' : ''}{val.toFixed(3)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              {incident.severity !== 'BENIGN' && (
                <button
                  className="btn btn-primary"
                  onClick={handlePlaybook}
                  disabled={loadingPb}
                  id={`playbook-btn-${incident.incident_id}`}
                >
                  {loadingPb ? '⏳ Loading...' : '📋 Open Playbook'}
                </button>
              )}
              <button
                className="btn btn-ghost"
                onClick={(e) => { e.stopPropagation(); }}
              >
                🔗 {incident.mitre_id}
              </button>
            </div>
          </div>
        )}
      </div>

      {drawerOpen && playbook && (
        <PlaybookDrawer
          playbook={playbook}
          incident={incident}
          removeIncident={removeIncident}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </>
  );
}

function confColor(c) {
  if (!c) return 'var(--text-muted)';
  if (c >= 0.90) return '#ef4444';
  if (c >= 0.75) return '#f97316';
  if (c >= 0.55) return '#eab308';
  return '#3b82f6';
}
