import React from 'react';
 
const MITRE_META = {
  'T1110.001': { tactic:'Credential Access', name:'Brute Force: Password Guessing',         icon:'🔨', color:'#FF453A' },
  'T1110.004': { tactic:'Credential Access', name:'Brute Force: Credential Stuffing',        icon:'🔑', color:'#FF453A' },
  'T1021.002': { tactic:'Lateral Movement',  name:'Remote Services: SMB/Admin Shares',       icon:'🔀', color:'#FF9F0A' },
  'T1046':     { tactic:'Discovery',         name:'Network Service Discovery',               icon:'🔍', color:'#BF5AF2' },
  'T1048.003': { tactic:'Exfiltration',      name:'Exfiltration Over Alternative Protocol',  icon:'📤', color:'#FFD60A' },
  'T1071.001': { tactic:'Command & Control', name:'App Layer Protocol: Web Protocols',        icon:'📡', color:'#64D2FF' },
  'T1571':     { tactic:'Command & Control', name:'Non-Standard Port',                        icon:'🌐', color:'#64D2FF' },
  'T1057':     { tactic:'Discovery',         name:'Process Discovery',                        icon:'⚙️', color:'#BF5AF2' },
};
 
export default function MitrePanel({ incidents }) {
  const counts = {};
  incidents.forEach(i => {
    if (i.mitre_id && i.threat_class !== 'BENIGN') {
      counts[i.mitre_id] = (counts[i.mitre_id]||0)+1;
    }
  });
  const techs = Object.entries(counts).sort(([,a],[,b])=>b-a);
 
  if (!techs.length) return (
    <div style={{color:'var(--text-tertiary)',fontSize:'0.82rem',padding:'40px 0',textAlign:'center'}}>
      <div style={{fontSize:32,marginBottom:10}}>🎯</div>
      No techniques detected yet
    </div>
  );
 
  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:10}}>
      {techs.map(([id,count])=>{
        const m = MITRE_META[id] || {tactic:'Unknown',name:id,icon:'⚠️',color:'#8E8E93'};
        return (
          <a key={id} href={`https://attack.mitre.org/techniques/${id.replace('.','/')}`}
             target="_blank" rel="noreferrer" style={{textDecoration:'none'}}>
            <div className="card anim-fade-up" style={{
              borderLeft:`3px solid ${m.color}`,
              background:`color-mix(in srgb, ${m.color} 5%, var(--bg-card))`,
              padding:'12px 14px', cursor:'pointer',
              transition:'all 0.2s',
            }}
            onMouseEnter={e=>e.currentTarget.style.background=`color-mix(in srgb, ${m.color} 10%, var(--bg-card))`}
            onMouseLeave={e=>e.currentTarget.style.background=`color-mix(in srgb, ${m.color} 5%, var(--bg-card))`}
            >
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                <span style={{fontSize:22}}>{m.icon}</span>
                <span style={{
                  padding:'2px 7px', borderRadius:'var(--r-xs)',
                  background:`color-mix(in srgb, ${m.color} 20%, transparent)`,
                  color:m.color, fontSize:'0.70rem', fontWeight:700,
                }}>
                  {count}×
                </span>
              </div>
              <div className="mono" style={{color:'var(--text-accent)',fontSize:'0.70rem',marginBottom:4}}>{id}</div>
              <div style={{fontWeight:700,fontSize:'0.78rem',lineHeight:1.3,color:'var(--text-primary)',marginBottom:4}}>
                {m.name}
              </div>
              <div style={{color:m.color,fontSize:'0.65rem',fontWeight:700,
                            textTransform:'uppercase',letterSpacing:'0.07em'}}>
                {m.tactic}
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}
