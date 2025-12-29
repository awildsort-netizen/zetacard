import {dot, norm} from "./math";

export type QEvent = {x:number,y:number,energy:number,bandEnergy:number[],t:number};

// Simple quadtree used as an event-bus. Events are inserted with normalized
// coordinates (0..1). Querying delivers events to a card when resonance
// passes; delivered events are transient and cleared so they don't accumulate.
export class Quadtree {
  x:number; y:number; w:number; h:number; depth:number;
  children: Quadtree[] | null;
  events:QEvent[];
  constructor(x=0,y=0,w=1,h=1,depth=0){ this.x=x; this.y=y; this.w=w; this.h=h; this.depth=depth; this.children=null; this.events=[]; }
  insert(ev:Omit<QEvent,'t'>){
    const e:QEvent = {...ev, t: performance.now()};
    if(e.x < this.x || e.x > this.x+this.w || e.y < this.y || e.y > this.y+this.h) return;
    if(this.depth>6 || (this.events.length<6 && this.children==null)){
      this.events.push(e); return;
    }
    if(!this.children) this.subdivide();
    for(const c of this.children) c.insert(e);
  }
  subdivide(){
    const hw=this.w/2, hh=this.h/2; this.children = [
      new Quadtree(this.x,this.y,hw,hh,this.depth+1),
      new Quadtree(this.x+hw,this.y,hw,hh,this.depth+1),
      new Quadtree(this.x,this.y+hh,hw,hh,this.depth+1),
      new Quadtree(this.x+hw,this.y+hh,hw,hh,this.depth+1)
    ];
    for(const e of this.events){ for(const c of this.children) c.insert(e); }
    this.events.length=0;
  }

  // Deliver events to `card` if resonance passes. `rect` is the card's
  // screen rectangle {x,y,w,h} in pixels. screenW/screenH are canvas size.
  // After delivery the events in leaf nodes are cleared (transient events).
  queryAndDeliver(card:{ bandEnergy: number[]; size: number; surface: Float32Array }, rect:{x:number,y:number,w:number,h:number}, resonanceThreshold:number, screenW:number, screenH:number){
    const cband = card.bandEnergy.slice(); const cn = norm(cband);
    if(cn<=0) return;
    if(this.children){
      for(const ch of this.children) ch.queryAndDeliver(card, rect, resonanceThreshold, screenW, screenH);
      return;
    }
    for(const e of this.events){
      const ed = e.bandEnergy.slice(); const en = norm(ed);
      if(en<=0) continue;
      const res = dot(ed, cband) / (en*cn);
      if(res > resonanceThreshold){
        // map normalized event coords (0..1) to screen px
        const sx = Math.floor(e.x * screenW);
        const sy = Math.floor(e.y * screenH);
        // map screen pos to card-local coordinates
        const localX = Math.floor((sx - rect.x)/rect.w * card.size);
        const localY = Math.floor((sy - rect.y)/rect.h * card.size);
        if(localX>=0 && localY>=0 && localX<card.size && localY<card.size){
          const idx = localY*card.size + localX;
          card.surface[idx] = clamp01(card.surface[idx] + e.energy);
        }
      }
    }
    // clear delivered events so they don't persist
    this.events.length = 0;
  }
}

function clamp01(v:number){ return Math.max(0, Math.min(1, v)); }
