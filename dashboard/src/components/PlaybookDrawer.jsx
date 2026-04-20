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

export default function PlaybookDrawer({ playbook, incident, removeIncident, onClose }) {
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
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8001'}/api/playbook/mitigate`, {
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
      
      // Auto-remove incident from feed after success
      if (data.status === 'success') {
        setTimeout(() => {
          removeIncident(playbook.generated_for);
          onClose();
        }, 3000); // 3 second delay so user can see the success message
      }
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
             <div className="eyebrow" style={{color:'var(--blue)', marginBottom:4, fontSize:'0.65rem'}}>Threat Analysis & Strategy</div>
             <p style={{marginBottom:8}}>
               {playbook.human_analysis || "The AI system is analyzing the telemetry patterns. Our goal is to contain the threat and preserve evidence for investigation."}
             </p>
             <div style={{fontSize:'0.72rem', color:'var(--text-muted)', display:'flex', alignItems:'center', gap:6}}>
               <span style={{color:'var(--green)'}}>●</span>
               <span>Strategy: {incident?.severity === 'CRITICAL' ? 'Immediate Containment' : 'Observation & Investigation'}</span>
             </div>
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
                marginBottom:14, borderRadius:'var(--r-md)',
                border:`1px solid ${isDone?'rgba(48,209,88,0.30)':ph.border}`,
                background:isDone?'rgba(48,209,88,0.04)':'var(--bg-card)',
                overflow:'hidden',
                transition:'all 0.2s',
                opacity:isDone?0.6:1,
                boxShadow: isDone ? 'none' : '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                {/* Step header */}
                <div style={{display:'flex',alignItems:'center',gap:12,
                              padding:'12px 14px', background:'rgba(255,255,255,0.02)'}}>
                  <div style={{
                    width:28, height:28, borderRadius:8, background:ph.bg, 
                    display:'flex', alignItems:'center', justifyContent:'center', border:`1px solid ${ph.border}`
                  }}>
                    {ph.icon}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:'0.65rem',fontWeight:700,color:ph.text,
                                   textTransform:'uppercase',letterSpacing:'0.07em', marginBottom:2}}>
                      {step.phase}
                    </div>
                    <div style={{fontWeight:700,fontSize:'0.9rem',color:'var(--text-primary)'}}>
                      {step.action}
                    </div>
                  </div>
                  {/* Check off button */}
                  <button
                    onClick={()=>toggle(step.step)}
                    style={{
                      width:24,height:24,borderRadius:'50%',border:'1px solid var(--border)',cursor:'pointer',
                      background:isDone?'var(--green)':'transparent',
                      color:isDone?'#000':'var(--text-tertiary)',fontSize:12,
                      display:'flex',alignItems:'center',justifyContent:'center',
                      flexShrink:0,transition:'all 0.2s',
                    }}>
                    {isDone?'✓':''}
                  </button>
                </div>
 
                <div style={{padding:'12px 14px'}}>
                  {/* Description FIRST */}
                  {step.description && (
                    <div style={{fontSize:'0.82rem',color:'var(--text-secondary)',lineHeight:1.6, marginBottom:12}}>
                      {step.description}
                    </div>
                  )}
 
                  {/* Command SECOND with Label */}
                  {step.command && (
                    <div style={{borderRadius:8, overflow:'hidden', border:'1px solid var(--border-subtle)'}}>
                      <div style={{
                        background:'rgba(255,255,255,0.05)', padding:'4px 10px', 
                        fontSize:'0.6rem', color:'var(--text-muted)', fontWeight:700,
                        display:'flex', justifyContent:'space-between', alignItems:'center'
                      }}>
                        <span>TERMINAL COMMAND</span>
                        <span style={{opacity:0.5}}>BASH</span>
                      </div>
                      <div style={{padding:'10px',background:'rgba(0,0,0,0.4)',
                                    position:'relative',display:'flex',alignItems:'flex-start',gap:10}}>
                        <pre className="mono" style={{
                          flex:1,fontSize:'0.72rem',color:'var(--cyan)',
                          whiteSpace:'pre-wrap',wordBreak:'break-all',lineHeight:1.5,
                        }}>{step.command}</pre>
                        <button
                          className="btn-icon"
                          style={{fontSize:'0.70rem',flexShrink:0,marginTop:1}}
                          onClick={()=>copy(step.command,step.step)}>
                          {copied===step.step?'✓':'⧉'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
          );
          })}
        </div>
 
        {/* Mitigation Script Section */}
        {playbook.mitigation && playbook.mitigation.script && (
          <div style={{margin:'0 20px 20px', padding:'16px', borderRadius:'var(--r-md)', 
                       background:'rgba(191,90,242,0.08)', border:'1px solid rgba(191,90,242,0.25)'}}>
            <div className="eyebrow" style={{color:'var(--purple)', marginBottom:10, display:'flex', justifyContent:'space-between'}}>
              <span>Autonomous Remediation Terminal</span>
              <span style={{fontSize:'0.6rem', color:playbook.mitigation.risk==='HIGH'?'var(--red)':'var(--orange)'}}>
                RISK: {playbook.mitigation.risk}
              </span>
            </div>
            
            {/* Terminal View: Shows during execution AND after results are back */}
            {(executing || result) ? (
              <div className="anim-fade-up" style={{
                background:'#000', padding:'14px', borderRadius:'var(--r-sm)',
                border:`1px solid ${result ? (result.status==='success'?'var(--green)':'var(--red)') : 'var(--purple)'}`,
                boxShadow:'0 0 20px rgba(0,0,0,0.5) inset'
              }}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:10}}>
                  <div style={{fontSize:'0.70rem', color:result ? (result.status==='success'?'var(--green)':'var(--red)') : 'var(--purple)', fontWeight:800}}>
                    {executing ? '⚡ DEPLOYING COUNTER-MEASURES...' : `✓ ${(result.status || 'ERROR').toUpperCase()}: ${result.message || result.detail || 'Execution completed'}`}
                  </div>
                  <div style={{display:'flex', gap:4}}>
                    <div style={{width:8, height:8, borderRadius:'50%', background:'#FF5F56'}}/>
                    <div style={{width:8, height:8, borderRadius:'50%', background:'#FFBD2E'}}/>
                    <div style={{width:8, height:8, borderRadius:'50%', background:'#27C93F'}}/>
                  </div>
                </div>
 
                <pre className="mono" style={{
                  fontSize:'0.75rem', color:executing ? 'var(--text-secondary)' : 'var(--text-primary)', 
                  whiteSpace:'pre-wrap', maxHeight:200, overflowY:'auto', lineHeight:1.5
                }}>
                  {executing ? (
                    <span className="blink-fast">$ sudo run-mitigation --id {playbook.generated_for}...</span>
                  ) : (
                    <>
                      <span style={{color:'var(--text-muted)'}}>$ </span>
                      {result.output || result.detail || "No output returned from execution."}
                      <div style={{marginTop:10, padding:8, background:'rgba(255,255,255,0.05)', borderRadius:4, color:result.status==='success'?'var(--green)':'var(--red)'}}>
                        {result.status === 'success' 
                          ? '✅ REMEDIATION SUCCESSFUL: Threats contained. Incident dismissed.' 
                          : '⚠️ REMEDIATION FAILED: Manual intervention required.'}
                      </div>
                    </>
                  )}
                </pre>
              </div>
            ) : (
              /* Initial State: Show Script & Deploy Button */
              <>
                <div style={{fontSize:'0.82rem', color:'var(--text-secondary)', marginBottom:12, lineHeight:1.5}}>
                  The system has generated a specific mitigation script to neutralize this {playbook.threat_class} attack. 
                  Review the code below before deployment.
                </div>
                <pre className="mono" style={{fontSize:'0.75rem', color:'var(--text-primary)', background:'rgba(0,0,0,0.3)', 
                                              padding:'10px', borderRadius:'var(--r-sm)', marginBottom:12, overflowX:'auto', border:'1px solid var(--border-subtle)'}}>
                  {playbook.mitigation.script}
                </pre>
                <div style={{display:'flex', gap:8}}>
                  <button className="btn btn-primary" style={{background:'var(--purple)', flex:1, fontWeight:800}}
                          onClick={executeMitigation}>
                    🚀 APPROVE & DEPLOY
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
