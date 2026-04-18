import React from 'react';
 
const SEV_MAP = {
  CRITICAL: { cls:'badge-critical', dot:'var(--red)',    icon:'●' },
  HIGH:     { cls:'badge-high',     dot:'var(--orange)', icon:'●' },
  MEDIUM:   { cls:'badge-medium',   dot:'var(--yellow)', icon:'●' },
  LOW:      { cls:'badge-low',      dot:'var(--blue)',   icon:'●' },
  BENIGN:   { cls:'badge-benign',   dot:'var(--green)',  icon:'●' },
};
 
const THREAT_ICONS = {
  BRUTE_FORCE:      '🔨',
  LATERAL_MOVEMENT: '🔀',
  EXFILTRATION:     '📤',
  C2_BEACON:        '📡',
  BENIGN:           '✓',
};
 
export function SeverityBadge({ severity }) {
  const s = SEV_MAP[severity] || SEV_MAP.LOW;
  return (
    <span className={`badge ${s.cls}`}>
      <span style={{color:s.dot,fontSize:'0.55rem'}}>●</span>
      {severity}
    </span>
  );
}
 
export function ThreatIcon({ threatClass, size=18 }) {
  return (
    <span style={{fontSize:size, lineHeight:1}} role="img">
      {THREAT_ICONS[threatClass] || '⚠️'}
    </span>
  );
}
 
export default SeverityBadge;
