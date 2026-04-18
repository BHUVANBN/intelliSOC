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
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:12}}>
      {techs.map(([id,count])=>{
        const m = MITRE_META[id] || {tactic:'Unknown',name:id,icon:'⚠️',color:'#8E8E93'};
        return (
          <a key={id} href={`https://attack.mitre.org/techniques/${id.replace('.','/')}`}
             target="_blank" rel="noreferrer" style={{textDecoration:'none'}}>
            <div className="card anim-fade-up" style={{
              borderLeft:`4px solid ${m.color}`,
              background:`color-mix(in srgb, ${m.color} 4%, var(--bg-surface))`,
              padding:'16px 20px', cursor:'pointer',
            }}
            >
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
                <span style={{fontSize:24}}>{m.icon}</span>
                <span style={{
                  padding:'3px 10px', borderRadius:'100px',
                  background:`color-mix(in srgb, ${m.color} 15%, transparent)`,
                  color:m.color, fontSize:'0.75rem', fontWeight:800,
                }}>
                  {count} Detection{count > 1 ? 's' : ''}
                </span>
              </div>
              <div className="mono" style={{color:'var(--blue)',fontSize:'0.75rem',fontWeight:700,marginBottom:6}}>{id}</div>
              <div style={{fontWeight:800,fontSize:'0.85rem',lineHeight:1.4,color:'#fff',marginBottom:8}}>
                {m.name}
              </div>
              <div className="eyebrow" style={{color:m.color, marginBottom:0}}>
                {m.tactic}
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}
