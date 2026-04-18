import React from 'react';
 
export default function StatCard({ label, value, icon, color, glow }) {
  return (
    <div
      className="card anim-fade-up"
      style={{
        display:'flex', alignItems:'center', gap:14,
        boxShadow: glow || 'none',
        transition:'box-shadow 0.3s, border-color 0.3s',
        borderColor: glow ? `${color.replace('var(--','').replace(')','')} + '33'` : undefined,
      }}
    >
      {/* Icon circle */}
      <div style={{
        width:44, height:44, borderRadius:'var(--r-sm)',
        background:`${color.replace(')',', 0.12)').replace('var(','')} ${color.includes('var') ? '' : '12'}`,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        display:'flex', alignItems:'center', justifyCenter:'center',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:20, flexShrink:0,
        border:`1px solid color-mix(in srgb, ${color} 25%, transparent)`,
      }}>
        {icon}
      </div>
      <div>
        <div className="eyebrow" style={{marginBottom:4}}>{label}</div>
        <div className="stat-num" style={{color}}>{value}</div>
      </div>
    </div>
  );
}
