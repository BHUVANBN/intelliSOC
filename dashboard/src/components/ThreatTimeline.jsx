import React, { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import { format, subMinutes, startOfMinute } from 'date-fns';
 
const THREAT_COLORS = {
  BRUTE_FORCE:      '#FF453A',
  LATERAL_MOVEMENT: '#FF9F0A',
  EXFILTRATION:     '#FFD60A',
  C2_BEACON:        '#64D2FF',
  BENIGN:           '#30D158',
};
 
export default function ThreatTimeline({ incidents }) {
  const data = useMemo(() => {
    const now = new Date();
    const buckets = {};
    for (let i = 14; i >= 0; i--) {
      const t = startOfMinute(subMinutes(now, i));
      const key = format(t, 'HH:mm');
      buckets[key] = { time: key, BRUTE_FORCE:0, LATERAL_MOVEMENT:0, EXFILTRATION:0, C2_BEACON:0 };
    }
    incidents.forEach(inc => {
      try {
        const k = format(startOfMinute(new Date(inc.timestamp)), 'HH:mm');
        if (buckets[k] && inc.threat_class !== 'BENIGN') {
          buckets[k][inc.threat_class] = (buckets[k][inc.threat_class]||0)+1;
        }
      } catch {}
    });
    return Object.values(buckets).sort((a,b) => a.time.localeCompare(b.time));
  }, [incidents]);
 
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active||!payload?.length) return null;
    return (
      <div style={{
        background:'var(--bg-elevated)',border:'1px solid var(--border)',
        borderRadius:'var(--r-sm)',padding:'10px 14px',fontSize:'0.78rem',
      }}>
        <div style={{fontWeight:700,marginBottom:6,color:'var(--text-primary)'}}>{label}</div>
        {payload.filter(p=>p.value>0).map(p=>(
          <div key={p.name} style={{display:'flex',gap:8,alignItems:'center',color:p.color}}>
            <span>●</span>
            <span style={{color:'var(--text-secondary)'}}>{p.name.replace(/_/g,' ')}</span>
            <span style={{marginLeft:'auto',fontWeight:700}}>{p.value}</span>
          </div>
        ))}
      </div>
    );
  };
 
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{top:8,right:8,left:-20,bottom:0}}>
        <defs>
          {Object.entries(THREAT_COLORS).filter(([k])=>k!=='BENIGN').map(([k,c])=>(
            <linearGradient key={k} id={`g-${k}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={c} stopOpacity={0.25}/>
              <stop offset="95%" stopColor={c} stopOpacity={0}/>
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="time" tick={{fill:'var(--text-tertiary)',fontSize:11}} tickLine={false} axisLine={false}/>
        <YAxis allowDecimals={false} tick={{fill:'var(--text-tertiary)',fontSize:11}} tickLine={false} axisLine={false}/>
        <Tooltip content={<CustomTooltip/>}/>
        <Legend wrapperStyle={{fontSize:'0.74rem',paddingTop:12}}
                formatter={v=><span style={{color:'var(--text-secondary)'}}>{v.replace(/_/g,' ')}</span>}/>
        {Object.entries(THREAT_COLORS).filter(([k])=>k!=='BENIGN').map(([k,c])=>(
          <Area key={k} type="monotone" dataKey={k} stroke={c} strokeWidth={1.5}
                fill={`url(#g-${k})`} dot={false} activeDot={{r:4,stroke:c,strokeWidth:2}}/>
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
