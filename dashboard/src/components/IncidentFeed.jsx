import React, { useRef, useEffect } from 'react';
import IncidentCard from './IncidentCard';
 
export default function IncidentFeed({ incidents, fetchPlaybook, removeIncident, filter }) {
  const ref = useRef(null);
 
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = 0;
  }, [incidents.length]);
 
  const shown = filter === 'ALL'
    ? incidents
    : incidents.filter(i => i.severity === filter || i.threat_class === filter);
 
  return (
    <div ref={ref} style={{height:'100%',overflowY:'auto',paddingRight:2}}>
      {shown.length === 0 ? (
        <div style={{
          display:'flex',flexDirection:'column',alignItems:'center',
          justifyContent:'center',height:220,gap:10,
          color:'var(--text-tertiary)',
        }}>
          <span style={{fontSize:40}}>🛡️</span>
          <span style={{fontSize:'0.82rem',fontWeight:600}}>No threats detected</span>
          <span style={{fontSize:'0.72rem'}}>System is monitoring your network</span>
        </div>
      ) : (
        shown.map(inc => (
          <IncidentCard key={inc.incident_id} incident={inc} fetchPlaybook={fetchPlaybook} removeIncident={removeIncident}/>
        ))
      )}
    </div>
  );
}
