import React, {useEffect, useRef, useState} from 'react';
import {queryCards, detectFacets, refreshRegistryFromRepo} from '../cardRegistry';
import { eventLog } from '../instrumentation';

export default function Omnibox({onInvoke, open: externalOpen, onOpenChange}:{onInvoke?:(id:string, mode:'SafeRun'|'Run', card:any)=>void, open?:boolean, onOpenChange?:(open:boolean)=>void}){
  const [localOpen, setLocalOpen] = useState(true);
  const open = externalOpen !== undefined ? externalOpen : localOpen;
  const setOpen = (value: boolean) => {
    if(onOpenChange) {
      onOpenChange(value);
    } else {
      setLocalOpen(value);
    }
  };
  
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement|null>(null);

  useEffect(()=>{ 
    setResults(queryCards(q)); 
    setSel(0); 
    if(q) {
      const flowId = eventLog.startFlow();
      eventLog.emit({type: 'SEARCH_QUERY', query: q, flowId});
    }
  },[q]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(()=>{
    const onKey = (e:KeyboardEvent)=>{
      if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='k'){ e.preventDefault(); setOpen(true); inputRef.current?.focus(); }
      if(!open) return;
      if(e.key==='Escape'){ setOpen(false); }
      if(e.key==='ArrowDown'){ e.preventDefault(); setSel(s=>Math.min(s+1, results.length-1)); }
      if(e.key==='ArrowUp'){ e.preventDefault(); setSel(s=>Math.max(s-1,0)); }
      if(e.key==='Enter'){ e.preventDefault(); const r = results[sel]; if(r) onInvoke?.(r.manifest.id, 'Run', r); }
    };
    window.addEventListener('keydown', onKey); return ()=>window.removeEventListener('keydown', onKey);
  },[open, results, sel, onInvoke]);

  const facets = detectFacets(q);
  const thumbnailColor = (id:string)=>{
    let h = 0; for(let i=0;i<id.length;i++) h = (h * 31 + id.charCodeAt(i)) % 360;
    return `hsl(${h} 65% 45%)`;
  };
  const thumbnailInitials = (t:string)=> (t||'').split(' ').map(s=>s[0]).filter(Boolean).slice(0,2).join('').toUpperCase();
  const handleInvoke = (r:any, mode:'SafeRun'|'Run')=>{
    if(!r) return;
    setOpen(false);
    const flowId = eventLog.startFlow();
    eventLog.emit({type: 'CARD_SELECTED', cardId: r.manifest.id, cardTitle: r.manifest.title, flowId});
    eventLog.emit({type: 'CARD_OPENED', cardId: r.manifest.id, mode, flowId});
    onInvoke?.(r.manifest.id, mode, r);
  };

  return (
    <>
      {open ? (
        <>
          <div className={`omnibox-overlay ${open? 'open':''}`} onClick={()=>setOpen(false)} aria-hidden={!open} />
          <div data-testid="omnibox" className="omnibox" role="search" aria-label="Omnibox search" aria-expanded={open} style={{position:'fixed',left:12,top:12,width:680,background:'#111',color:'#fff',padding:12,borderRadius:8,boxShadow:'0 6px 20px rgba(0,0,0,0.6)',zIndex:9999}}>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <input ref={inputRef} value={q} onChange={e=>setQ(e.target.value)} placeholder='Type or paste to find cards (Ctrl+K)' aria-controls="omnibox-results" aria-label="Search cards" style={{flex:1,padding:8,borderRadius:6,border:'1px solid #333',background:'#0e0e0e',color:'#fff'}} />
              <button aria-label="Run selection" onClick={()=>{ const r = results[sel]; if(r) handleInvoke(r,'Run'); }} style={{padding:'6px 10px'}}>Run</button>
              <button aria-label="Refresh registry" onClick={async ()=>{ setIsRefreshing(true); try{ await refreshRegistryFromRepo(); setResults(queryCards(q)); }catch(e){ console.error(e); } finally{ setIsRefreshing(false);} }} style={{padding:'6px 10px'}}>{isRefreshing? 'Refreshing...' : 'Refresh'}</button>
            </div>
            <div style={{display:'flex',gap:12,marginTop:8}}>
              <div style={{flex:'0 0 380px',maxHeight:220,overflow:'auto'}}>
                <div id="omnibox-results" role="listbox" aria-label="Search results">
                  {results.map((r,i)=> (
                    <div key={r.manifest.id} role="option" aria-selected={i===sel} tabIndex={0} onMouseEnter={()=>setSel(i)} style={{padding:8,background:i===sel? 'rgba(255,255,255,0.04)':'transparent',borderRadius:6,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <div>
                        <div style={{fontWeight:600}}>{r.manifest.title}</div>
                        <div style={{fontSize:12,color:'#bbb'}}>{r.manifest.tagline}</div>
                        <div style={{fontSize:11,color:'#888',marginTop:4}}>match: {r.score.toFixed(2)} • {r.manifest.tags.join(', ')}</div>
                      </div>
                      <div style={{textAlign:'right'}}>
                        {(r.manifest.badges||[]).map(b=> <span key={b} style={{background:'#222',color:'#9fefc0',padding:'2px 6px',borderRadius:6,marginLeft:6,fontSize:11}}>{b}</span>)}
                      </div>
                    </div>
                  ))}
                </div>
                {results.length===0 && <div style={{color:'#777',padding:8}}>No matches</div>}
              </div>
              <div style={{flex:1,background:'#0b0b0b',padding:10,borderRadius:6,border:'1px solid #202020'}}>
                <div style={{fontSize:13,fontWeight:600}}>Preview</div>
                {results[sel] ? (
                  <div style={{marginTop:8}}>
                    <div style={{fontWeight:700}}>{results[sel].manifest.title}</div>
                    <div style={{color:'#bbb',fontSize:13}}>{results[sel].manifest.tagline}</div>
                    <div style={{marginTop:8,fontSize:12}}>Detected facets: {facets.join(', ') || 'none'}</div>
                    <div style={{marginTop:8}}>
                      <pre style={{whiteSpace:'pre-wrap',fontSize:12,color:'#ddd'}}>{results[sel].manifest.semanticDescriptor}</pre>
                    </div>
                  </div>
                ) : <div style={{color:'#666',marginTop:8}}>Select a result to preview</div>}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
