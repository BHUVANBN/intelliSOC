import React, { useState } from 'react';
 
const PHASE_STYLE = {
  Contain:     { bg:'rgba(255,69,58,0.10)',  border:'rgba(255,69,58,0.30)',  text:'#FF453A',  icon:'🔒' },
  Isolate:     { bg:'rgba(255,69,58,0.10)',  border:'rgba(255,69,58,0.30)',  text:'#FF453A',  icon:'🔕' },
  Investigate: { bg:'rgba(255,159,10,0.10)', border:'rgba(255,159,10,0.30)', text:'#FF9F0A',  icon:'🔍' },
  Eradicate:   { bg:'rgba(255,214,10,0.10)', border:'rgba(255,214,10,0.30)', text:'#FFD60A',  icon:'🗑️' },
  Harden:      { bg:'rgba(10,132,255,0.10)', border:'rgba(10,132,255,0.30)', text:'#0A84FF',  icon:'🛡️' },
  Hunt:        { bg:'rgba(191,90,242,0.10)', border:'rgba(191,90,242,0.30)', text:'#BF5AF2',  icon:'🎯' },
  Report:      { bg:'rgba(48,209,88,0.10)',  border:'rgba(48,209,88,0.30)',  text:'#30D158',  icon:'📄' },
};
 
export default function PlaybookDrawer({ playbook, incident, onClose }) {
  const [copied,   setCopied]   = useState(null);
  const [done,     setDone]     = useState(new Set());
  const [result, setResult]      = useState(null);
  const [executing, setExecuting] = useState(false);
 
  const copy = async (cmd, n) => {
    try { await navigator.clipboard.writeText(cmd); setCopied(n); setTimeout(()=>setCopied(null),2000); }
    catch {}
  };
 
  const toggle = n => setDone(prev => {
    const s = new Set(prev); s.has(n)?s.delete(n):s.add(n); return s;
  });
 
  const executeMitigation = async () => {
    setExecuting(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/playbook/mitigate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          incident_id: playbook.generated_for, 
          script: playbook.mitigation.script,
          language: playbook.mitigation.language
        })
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setResult({ status: 'error', message: 'Network error during execution' });
    }
    setExecuting(false);
  };
 
  const total    = playbook.steps?.length||0;
  const progress = Math.round((done.size/Math.max(total,1))*100);
 
  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position:'fixed',inset:0,
        background:'rgba(0,0,0,0.70)',
        backdropFilter:'blur(8px)',
        zIndex:100,
      }}/>
 
      {/* Drawer */}
      <div id="playbook-drawer" className="anim-slide-right" style={{
        position:'fixed',top:0,right:0,bottom:0,
        width:'min(560px,96vw)',
        background:'var(--bg-surface)',
        borderLeft:'1px solid var(--border)',
        zIndex:101, display:'flex', flexDirection:'column',
        boxShadow:'-24px 0 80px rgba(0,0,0,0.70)',
      }}>
 
        {/* Header */}
        <div style={{
          padding:'20px 22px',
          borderBottom:'1px solid var(--sep)',
          background:'rgba(44,44,46,0.50)',
          backdropFilter:'blur(20px)',
        }}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
            <div>
              <div className="eyebrow" style={{marginBottom:4, display:'flex', alignItems:'center', gap:8}}>
                  <span>Incident Response Playbook {playbook.llm_generated && '· AI-SYNTHeSIzed'}</span>
                  <button 
                    onClick={() => alert(`Reporting Incident ${incident?.incident_id} as False Positive...`)}
                    style={{ 
                      fontSize:'0.6rem', padding:'2px 8px', borderRadius:20, background:'rgba(255,159,10,0.1)', 
                      border:'1px solid rgba(255,159,10,0.3)', color:'#FF9F0A', cursor:'pointer', fontWeight:800
                    }}
                  >
                    🚩 REPORT FALSE POSITIVE
                  </button>
              </div>
              <h2 style={{fontSize:'1.0rem',fontWeight:800,color:'var(--text-primary)',lineHeight:1.3}}>
                {playbook.title}
              </h2>
            </div>
            <button className="btn-icon" onClick={onClose} style={{marginLeft:12,flexShrink:0}}>✕</button>
          </div>

          {/* Human Analysis (Plain English) */}
          <div style={{
             marginTop:16, padding:14, borderRadius:12, 
             background:'rgba(10,132,255,0.07)', border:'1px solid rgba(10,132,255,0.15)',
             fontSize:'0.82rem', lineHeight:1.6, color:'var(--text-secondary)'
          }}>
             <div className="eyebrow" style={{color:'var(--blue)', marginBottom:4, fontSize:'0.65rem'}}>Human Intelligence Analysis</div>
             {playbook.human_analysis || "The AI system is analyzing the specific telemetry patterns of this incident. This involves cross-referencing process lineage with network flow anomalies."}
          </div>

          {/* Progress */}
          <div style={{marginTop:16}}>
            <div style={{display:'flex',justifyContent:'space-between',
                          fontSize:'0.70rem',color:'var(--text-tertiary)',marginBottom:6}}>
              <span>Response Progress</span>
              <span style={{color:progress===100?'var(--green)':'var(--text-secondary)',fontWeight:600}}>
                {done.size}/{total} steps — {progress}%
              </span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{
                width:`${progress}%`,
                background:progress===100
                  ?'var(--green)'
                  :'linear-gradient(90deg,#0A84FF,#64D2FF)',
              }}/>
            </div>
          </div>
        </div>
 
        {/* Steps */}
        <div style={{flex:1,overflowY:'auto',padding:'14px 20px'}}>
          {(playbook.steps||[]).map(step => {
            const ph   = PHASE_STYLE[step.phase] || PHASE_STYLE.Investigate;
            const isDone = done.has(step.step);
            return (
              <div key={step.step} style={{
                marginBottom:10, borderRadius:'var(--r-sm)',
                border:`1px solid ${isDone?'rgba(48,209,88,0.30)':ph.border}`,
                background:isDone?'rgba(48,209,88,0.07)':ph.bg,
                overflow:'hidden',
                transition:'all 0.2s',
                opacity:isDone?0.72:1,
              }}>
                {/* Step header */}
                <div style={{display:'flex',alignItems:'center',gap:10,
                              padding:'10px 14px',borderBottom:`1px solid ${ph.border}55`}}>
                  <span style={{fontSize:14}}>{ph.icon}</span>
                  <span style={{fontSize:'0.70rem',fontWeight:700,color:ph.text,
                                 textTransform:'uppercase',letterSpacing:'0.07em'}}>
                    {step.phase}
                  </span>
                  <span style={{flex:1,fontWeight:600,fontSize:'0.82rem',color:'var(--text-primary)'}}>
                    {step.action}
                  </span>
                  {/* Check off button */}
                  <button
                    onClick={()=>toggle(step.step)}
                    style={{
                      width:22,height:22,borderRadius:'50%',border:'none',cursor:'pointer',
                      background:isDone?'var(--green)':'rgba(255,255,255,0.08)',
                      color:isDone?'#000':'var(--text-tertiary)',fontSize:12,
                      display:'flex',alignItems:'center',justifyContent:'center',
                      flexShrink:0,transition:'all 0.2s',
                    }}>
                    {isDone?'✓':'○'}
                  </button>
                </div>
 
                {/* Command */}
                {step.command && (
                  <div style={{padding:'8px 14px',background:'rgba(0,0,0,0.35)',
                                position:'relative',display:'flex',alignItems:'flex-start',gap:10}}>
                    <pre className="mono" style={{
                      flex:1,fontSize:'0.74rem',color:'var(--cyan)',
                      whiteSpace:'pre-wrap',wordBreak:'break-all',lineHeight:1.5,
                    }}>{step.command}</pre>
                    <button
                      className="btn-icon"
                      style={{fontSize:'0.70rem',flexShrink:0,marginTop:1}}
                      onClick={()=>copy(step.command,step.step)}>
                      {copied===step.step?'✓':'⧉'}
                    </button>
                  </div>
                )}
 
                {step.description && (
                  <div style={{padding:'8px 14px',fontSize:'0.75rem',color:'var(--text-secondary)',lineHeight:1.6}}>
                    {step.description}
                  </div>
                )}
              </div>
            );
          })}
        </div>
 
        {/* Mitigation Script Section */}
        {playbook.mitigation && playbook.mitigation.script && (
          <div style={{margin:'0 20px 20px', padding:'16px', borderRadius:'var(--r-md)', 
                       background:'rgba(191,90,242,0.08)', border:'1px solid rgba(191,90,242,0.25)'}}>
            <div className="eyebrow" style={{color:'var(--purple)', marginBottom:10, display:'flex', justifyContent:'space-between'}}>
              <span>Autonomous Remediation {playbook.mitigation.language.toUpperCase()}</span>
              <span style={{fontSize:'0.6rem', color:playbook.mitigation.risk==='HIGH'?'var(--red)':'var(--orange)'}}>
                RISK: {playbook.mitigation.risk}
              </span>
            </div>
            
            {result ? (
              <div className="anim-fade-up" style={{
                background:'#000', padding:'12px', borderRadius:'var(--r-sm)',
                border:`1px solid ${result.status==='success'?'var(--green)':'var(--red)'}`,
                marginBottom:12
              }}>
                <div style={{fontSize:'0.70rem', color:result.status==='success'?'var(--green)':'var(--red)', fontWeight:800, marginBottom:8}}>
                  {result.status.toUpperCase()}: {result.message}
                </div>
                {result.output && (
                  <pre className="mono" style={{fontSize:'0.68rem', color:'var(--text-secondary)', whiteSpace:'pre-wrap'}}>
                    $ {result.output}
                  </pre>
                )}
                <button className="btn btn-ghost" style={{marginTop:10, width:'100%', justifyContent:'center'}} onClick={()=>setResult(null)}>
                  Ready for new execution
                </button>
              </div>
            ) : (
              <>
                <pre className="mono" style={{fontSize:'0.75rem', color:'var(--text-primary)', background:'rgba(0,0,0,0.3)', 
                                              padding:'10px', borderRadius:'var(--r-sm)', marginBottom:12, overflowX:'auto'}}>
                  {playbook.mitigation.script}
                </pre>
                <div style={{display:'flex', gap:8}}>
                  <button className="btn btn-primary" style={{background:'var(--purple)', flex:1}}
                          disabled={executing}
                          onClick={executeMitigation}>
                    {executing ? '⏳ Deploying...' : '✓ Approve & Deploy'}
                  </button>
                  <button className="btn btn-ghost" style={{flex:1}} onClick={() => alert('Mitigation Rejected')}>
                    ✕ Reject
                  </button>
                </div>
              </>
            )}
          </div>
        )}
 
        {/* Footer */}
        <div style={{padding:'14px 20px',borderTop:'1px solid var(--sep)',
                      background:'rgba(44,44,46,0.50)',display:'flex',gap:8}}>
          <button className="btn btn-ghost" style={{flex:1,justifyContent:'center'}} onClick={onClose}>
            Close
          </button>
          {progress === 100 && (
            <button className="btn btn-primary" style={{flex:2,justifyContent:'center'}}>
              ✓ Incident Resolved
            </button>
          )}
        </div>
      </div>
    </>
  );
}
