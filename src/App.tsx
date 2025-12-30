import React, {useEffect, useRef, useState} from "react";
import {Card} from "./zetacard";
import SpectralHeartbeat from "./components/SpectralHeartbeat";
import Omnibox from "./components/Omnibox";
import {Quadtree} from "./quadtree";
import {sigmoid, cosine} from "./math";
import type {CardQueryResult} from "./cardRegistry";

const W=900, H=600;

function useRaf(cb: (t:number)=>void){ const ref = useRef(cb); useEffect(()=>{ref.current=cb;}); useEffect(()=>{ let raf=0; const loop=(t:number)=>{ ref.current(t); raf=requestAnimationFrame(loop);}; raf=requestAnimationFrame(loop); return ()=>cancelAnimationFrame(raf); },[]); }

export default function App(){
  const canvasRef = useRef<HTMLCanvasElement|null>(null);
  const [open, setOpen] = useState(true);
  const [cardA] = useState(()=>{
    try {
      return new Card(64);
    } catch(e) {
      console.error("Error creating cardA:", e);
      throw e;
    }
  });
  const [cardB] = useState(()=>{
    try {
      return new Card(64);
    } catch(e) {
      console.error("Error creating cardB:", e);
      throw e;
    }
  });
  const [rects,setRects] = useState([{x:80,y:80,w:220,h:180},{x:300,y:200,w:260,h:200}]);
  const [drag, setDrag] = useState<{i:number,ox:number,oy:number}|null>(null);
  const [ambientA, setAmbientA] = useState(0.5);
  const [ambientB, setAmbientB] = useState(0.5);
  const [alpha,setAlpha] = useState(8);
  const [beta,setBeta] = useState(1);
  const [resThresh,setResThresh] = useState(0.2);
  const [tickEpsilon, setTickEpsilon] = useState(0.15);
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const [activeCardData, setActiveCardData] = useState<CardQueryResult | null>(null);
  const qtRef = useRef(new Quadtree(0,0,1,1));
  const prevZetaA = useRef<number[] | undefined>(cardA.zeta.slice());
  const prevZetaB = useRef<number[] | undefined>(cardB.zeta.slice());
  const [thetaA, setThetaA] = useState(0);
  const [thetaB, setThetaB] = useState(0);

  // animation loop
  useRaf(()=>{
    const c = canvasRef.current; if(!c) return; const ctx = c.getContext('2d'); if(!ctx) return;
    // step cards (capture previous zeta for heartbeat previews)
    const prevA = prevZetaA.current ? prevZetaA.current : cardA.zeta.slice();
    const prevB = prevZetaB.current ? prevZetaB.current : cardB.zeta.slice();
    cardA.params.ambient = ambientA; cardB.params.ambient = ambientB;
    cardA.step(); cardB.step();
    // compute angular change (theta) between prev and current zeta
    try{
      const ca = cardA.zeta, cb = cardB.zeta;
      const dotA = ca.reduce((s,n,i)=>s + (prevA[i]??0)*n,0);
      const na = Math.sqrt(ca.reduce((s,x)=>s+x*x,0))*Math.sqrt((prevA.reduce((s,x)=>s+x*x,0)||1));
      const angA = Math.acos(Math.max(-1,Math.min(1, dotA/(na||1))));
      const dotB = cb.reduce((s,n,i)=>s + (prevB[i]??0)*n,0);
      const nb = Math.sqrt(cb.reduce((s,x)=>s+x*x,0))*Math.sqrt((prevB.reduce((s,x)=>s+x*x,0)||1));
      const angB = Math.acos(Math.max(-1,Math.min(1, dotB/(nb||1))));
      setThetaA(angA); setThetaB(angB);
    }catch(e){
      // Ignore calculation errors in animation loop - use previous theta values
    }
    // update prev refs after stepping (so previews compare last->current)
    prevZetaA.current = prevA;
    prevZetaB.current = prevB;
    // clear
    ctx.fillStyle = '#111'; ctx.fillRect(0,0,W,H);
    // render cards to canvas
    cardA.renderTo(ctx, rects[0].x, rects[0].y, rects[0].w, rects[0].h);
    cardB.renderTo(ctx, rects[1].x, rects[1].y, rects[1].w, rects[1].h);
  // route quadtree events into cards (resonance gating)
  qtRef.current.queryAndDeliver(cardA, rects[0], resThresh, W, H);
  qtRef.current.queryAndDeliver(cardB, rects[1], resThresh, W, H);
    // overlap blend
    const overlap = getOverlap(rects[0],rects[1]);
    if(overlap){
      const region = ctx.getImageData(overlap.x, overlap.y, overlap.w, overlap.h);
      const imgA = ctx.getImageData(overlap.x, overlap.y, overlap.w, overlap.h);
      // for simplicity reuse same region; compute weight
      const cosineContrib = alpha * cosine(cardA.zeta, cardB.zeta);
      const ambientContrib = beta*(cardA.params.ambient - cardB.params.ambient);
      const w = sigmoid(cosineContrib + ambientContrib);
      for(let i=0;i<region.data.length;i+=4){
        region.data[i] = w*imgA.data[i] + (1-w)*region.data[i];
        region.data[i+1] = w*imgA.data[i+1] + (1-w)*region.data[i+1];
        region.data[i+2] = w*imgA.data[i+2] + (1-w)*region.data[i+2];
      }
      ctx.putImageData(region, overlap.x, overlap.y);
      // show weight and ambient influence
      ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.fillRect(overlap.x, overlap.y-40, 140,36);
      ctx.fillStyle='#000'; ctx.font='11px sans-serif';
      ctx.fillText('w=' + w.toFixed(2), overlap.x+4, overlap.y-24);
      ctx.fillText('cos:' + cosineContrib.toFixed(2) + ' amb:' + ambientContrib.toFixed(2), overlap.x+4, overlap.y-10);
    }

    // draw UI overlays: band bars and zeta
    drawCardInfo(ctx, rects[0], cardA, ambientA);
    drawCardInfo(ctx, rects[1], cardB, ambientB);
  });

  useEffect(()=>{
    const c=canvasRef.current; if(!c) return; 
    // Ensure canvas dimensions are set early to prevent blank screen
    if(c.width !== W || c.height !== H) {
      c.width=W; c.height=H;
    }
    
    const onDown = (e:MouseEvent)=>{
      const x=e.offsetX,y=e.offsetY;
      for(let i=0;i<rects.length;i++){
        const r=rects[i]; if(x>r.x && x<r.x+r.w && y>r.y && y<r.y+r.h){ setDrag({i,ox:x-r.x,oy:y-r.y}); break; }
      }
    };
    const onMove = (e:MouseEvent)=>{
      if(drag){ const x=e.offsetX,y=e.offsetY; setRects(rs=>{ const copy=[...rs]; copy[drag.i]={...copy[drag.i],x:x-drag.ox,y:y-drag.oy}; return copy; }); }
      // inject quadtree event normalized coords (transient)
      const normX = e.offsetX / W, normY = e.offsetY / H;
      qtRef.current.insert({x:normX,y:normY,energy:0.12, bandEnergy:[Math.random(),Math.random(),Math.random()]});
    };
    const onUp = ()=> setDrag(null);
    c.addEventListener('mousedown', onDown); c.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
    const dbl = (ev:MouseEvent)=>{
      const x=ev.offsetX,y=ev.offsetY; for(let i=0;i<rects.length;i++){ const r=rects[i]; if(x>r.x&&x<r.x+r.w&&y>r.y&&y<r.y+r.h){ // toggle attractor
        const which = Math.random()>0.5; const card = i===0?cardA:cardB; card.setAttractor(which);
        // animate parameter interpolation (simple linear over 400ms)
        const start = performance.now(); const dur=400; const from = {...card.params}; const to = which? {diffusion:0.12,sharpen:0.9,ambient:card.params.ambient} : {diffusion:0.3,sharpen:0.2,ambient:card.params.ambient};
        const tick = (t:number)=>{ const p = Math.min(1,(t-start)/dur); card.params.diffusion = from.diffusion*(1-p)+to.diffusion*p; card.params.sharpen = from.sharpen*(1-p)+to.sharpen*p; if(p<1) requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
      }} };
    c.addEventListener('dblclick', dbl);
    return ()=>{ c.removeEventListener('mousedown', onDown); c.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); c.removeEventListener('dblclick', dbl); };
  },[drag,rects]);

  // Handle Escape key to close active card view
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeCard) {
        setActiveCard(null);
        setActiveCardData(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCard]);

  return (<div>
    <Omnibox onInvoke={(id, mode, card) => {
      setActiveCard(id);
      setActiveCardData(card);
      setOpen(false);
    }} open={open} onOpenChange={setOpen} />
    {activeCard && activeCardData && (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0a0e27', zIndex: 9000, overflow: 'auto' }}>
        <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10000 }}>
          <button onClick={() => { setActiveCard(null); setActiveCardData(null); }} style={{ padding: '8px 12px', background: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Close (Esc)
          </button>
        </div>
        <div style={{ padding: '20px', maxWidth: '90vw', margin: '0 auto' }}>
          <h1 style={{ color: '#fff', marginBottom: '12px' }}>{activeCardData.manifest.title}</h1>
          <p style={{ color: '#bbb', marginBottom: '20px' }}>{activeCardData.manifest.tagline}</p>
          <div style={{ color: '#ddd', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '12px' }}>
            {activeCardData.manifest.semanticDescriptor}
          </div>
        </div>
      </div>
    )}
    {!activeCard && (
      <div data-testid="main-view">
        <div className="controls">
          <div>Card A ambient <input type="range" min={0} max={1} step={0.01} value={ambientA} onChange={e=>setAmbientA(Number(e.target.value))} /> <strong>{ambientA.toFixed(2)}</strong></div>
          <div>Card B ambient <input type="range" min={0} max={1} step={0.01} value={ambientB} onChange={e=>setAmbientB(Number(e.target.value))} /> <strong>{ambientB.toFixed(2)}</strong></div>
          <div>res thresh <input type="range" min={0} max={1} step={0.01} value={resThresh} onChange={e=>setResThresh(Number(e.target.value))} /> <strong>{resThresh.toFixed(2)}</strong></div>
          <div>alpha <input type="range" min={0} max={20} step={0.5} value={alpha} onChange={e=>setAlpha(Number(e.target.value))} /> <strong>{alpha.toFixed(1)}</strong></div>
          <div>beta <input type="range" min={-5} max={5} step={0.1} value={beta} onChange={e=>setBeta(Number(e.target.value))} /> <strong>{beta.toFixed(1)}</strong></div>
          <div style={{display:'flex',gap:12,marginTop:8,alignItems:'center'}}>
            <div style={{textAlign:'center'}}>
              <div>Card A heartbeat</div>
              <SpectralHeartbeat vector={cardA.zeta} prevVector={prevZetaA.current} size={120} tickEpsilon={tickEpsilon} />
              <div style={{fontSize:12,marginTop:6}}>θ = {thetaA.toFixed(3)} rad</div>
            </div>
            <div style={{textAlign:'center'}}>
              <div>Card B heartbeat</div>
              <SpectralHeartbeat vector={cardB.zeta} prevVector={prevZetaB.current} size={120} tickEpsilon={tickEpsilon} />
              <div style={{fontSize:12,marginTop:6}}>θ = {thetaB.toFixed(3)} rad</div>
            </div>
            <div style={{marginLeft:12}}>
              <div>tick epsilon <input type="range" min={0.01} max={1} step={0.01} value={tickEpsilon} onChange={e=>setTickEpsilon(Number(e.target.value))} /> <strong>{tickEpsilon.toFixed(2)}</strong></div>
            </div>
          </div>
        </div>
        <canvas ref={canvasRef} data-testid="canvas-root" width={W} height={H} style={{display:'block',margin:'0 auto',border:'1px solid #333',backgroundColor:'#111'}} />
      </div>
    )}
  </div>);
}

function drawCardInfo(ctx:CanvasRenderingContext2D, rect:{ x: number; y: number; w: number; h: number }, card:Card, ambient?:number){
  const x = rect.x + 6, y = rect.y + 6;
  ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(x-4,y-4,150,98);
  ctx.fillStyle='white'; ctx.font='12px sans-serif';
  // draw small bar graph for bands
  const bw=36, bh=8; let bx=x; for(let i=0;i<card.bandEnergy.length;i++){
    ctx.fillStyle='#444'; ctx.fillRect(bx, y, bw, bh);
    ctx.fillStyle=['#4caf50','#ff9800','#2196f3'][i%3]; ctx.fillRect(bx, y, Math.max(1, Math.floor(bw*card.bandEnergy[i])), bh);
    bx += bw+6;
  }
  ctx.fillStyle='white'; ctx.fillText('bands: ' + card.bandEnergy.map(b=>b.toFixed(2)).join(','), x, y+26);
  ctx.fillText('zeta: ' + card.zeta.map(z=>z.toFixed(2)).join(','), x, y+44);
  // ambient indicator bar
  if(ambient !== undefined){
    const ambientBarW = 100, ambientBarH = 6;
    ctx.fillStyle='#333'; ctx.fillRect(x, y+58, ambientBarW, ambientBarH);
    // color gradient: cool (low ambient) -> warm (high ambient)
    const hue = 240 - ambient*180; // 240° (cool blue) to 60° (warm yellow)
    ctx.fillStyle=`hsl(${hue}, 100%, 50%)`;
    ctx.fillRect(x, y+58, Math.max(1, Math.floor(ambientBarW*ambient)), ambientBarH);
    ctx.fillStyle='white'; ctx.font='11px sans-serif'; ctx.fillText(`ambient: ${ambient.toFixed(2)}`, x, y+74);
  }
}

function getOverlap(a:{x:number,y:number,w:number,h:number},b:{x:number,y:number,w:number,h:number}){
  const x = Math.max(a.x,b.x); const y = Math.max(a.y,b.y); const rx = Math.min(a.x+a.w, b.x+b.w); const ry = Math.min(a.y+a.h, b.y+b.h);
  if(rx>x && ry>y) return {x, y, w: rx-x, h: ry-y}; return null;
}
