import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
 
const COLORS = {
  CRITICAL:'#FF453A', HIGH:'#FF9F0A', MEDIUM:'#FFD60A', LOW:'#0A84FF', BENIGN:'#30D158'
};
 
export default function SeverityGauge({ incidents }) {
  const counts = { CRITICAL:0, HIGH:0, MEDIUM:0, LOW:0, BENIGN:0 };
  incidents.forEach(i => { 
    const sev = String(i.severity).split('.').pop();
    if (counts[sev]!==undefined) counts[sev]++; 
  });
  const data = Object.entries(counts).filter(([,v])=>v>0).map(([name,value])=>({name,value}));
 
  if (!data.length) {
    return (
      <div style={{height:120,display:'flex',alignItems:'center',
                   justifyContent:'center',color:'var(--text-tertiary)',fontSize:'0.80rem'}}>
        No incidents yet
      </div>
    );
  }
 
  const CustomTooltip = ({active,payload}) =>
    active&&payload?.length ? (
      <div style={{background:'var(--bg-elevated)',border:'1px solid var(--border)',
                   borderRadius:'var(--r-xs)',padding:'8px 12px',fontSize:'0.78rem'}}>
        <span style={{color:COLORS[payload[0].name],fontWeight:700}}>{payload[0].name}</span>
        <span style={{color:'var(--text-secondary)',marginLeft:8}}>{payload[0].value}</span>
      </div>
    ) : null;
 
  return (
    <ResponsiveContainer width="100%" height={130}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={36} outerRadius={56}
             paddingAngle={3} dataKey="value" stroke="none">
          {data.map(e=>(
            <Cell key={e.name} fill={COLORS[e.name]}
                  style={{filter:`drop-shadow(0 0 6px ${COLORS[e.name]}55)`}}/>
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip/>}/>
      </PieChart>
    </ResponsiveContainer>
  );
}
