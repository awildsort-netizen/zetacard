import {EPS, cosine} from "./math";
import {
  ZetaCardContract,
  CardID,
  CardMeta,
  CardFailure,
  CardActivationContext,
  CardFailureRegistry,
} from "./cardContract";

export type Params = {diffusion:number, sharpen:number, ambient:number};

export type CardState = {
  size: number;
  surface: Float32Array;
  params: Params;
  bandEnergy: number[];
  zeta: number[];
};

export class Card implements ZetaCardContract<CardState> {
  readonly id: CardID;
  readonly meta: CardMeta;

  size:number;
  surface:Float32Array;
  tmp:Float32Array;
  params:Params;
  bandEnergy:number[];
  zeta:number[];
  private _isActive: boolean = false;

  constructor(size=64, cardId?: CardID){
    this.size = size;
    this.surface = new Float32Array(size*size);
    this.tmp = new Float32Array(size*size);
    this.params = {diffusion:0.2,sharpen:0.5,ambient:0.5};
    this.bandEnergy = [0,0,0];
    this.zeta = [0,0,0];
    
    // Card contract: identity and metadata
    this.id = cardId || `ζ.card.spectral.heartbeat`;
    this.meta = {
      title: "Spectral Heartbeat",
      description: "Normalized spectral vector with angular change detection",
      tags: ["spectral", "deterministic", "validator"],
    };
    
    // random init
    for(let i=0;i<this.surface.length;i++) this.surface[i]=Math.random()*0.2;
  }

  // simple operator T: a diffusion step + unsharp mask (sharpen)
  step(){
    const s=this.size; const src=this.surface; const dst=this.tmp;
    for(let y=0;y<s;y++){
      for(let x=0;x<s;x++){
        const i=y*s+x;
        const v = src[i];
        // 4-neighbor Laplacian
        let lap=0; 
        lap += src[((y-1+s)%s)*s + x] - v;
        lap += src[((y+1)%s)*s + x] - v;
        lap += src[y*s + ((x-1+s)%s)] - v;
        lap += src[y*s + ((x+1)%s)] - v;
        const diff = this.params.diffusion * lap;
        // unsharp-ish: sharpen = amplify center - blur
        const blurred = v + 0.25*lap;
        const sharpened = v + this.params.sharpen*(v - blurred);
        dst[i] = clamp01(v + diff + (sharpened - v)*0.2);
      }
    }
    // swap
    this.surface = dst.slice();
    this.tmp.fill(0);
    this.computeBandsAndZeta();
  }

  computeBandsAndZeta(){
    // multi-scale edge energy: compute absolute Laplacian at scales by box downsampling
    const s=this.size; const src=this.surface;
    const bands:number[] = [0,0,0];
    // scale 0: full res
    for(let y=1;y<s-1;y++){
      for(let x=1;x<s-1;x++){
        const i=y*s+x; const v=src[i];
        const lap = Math.abs(src[(y-1)*s+x] + src[(y+1)*s+x] + src[y*s+(x-1)] + src[y*s+(x+1)] - 4*v);
        bands[0]+=lap;
      }
    }
    // scale 1: 2x downsample
    let b1=0; for(let y=1;y<s-1;y+=2) for(let x=1;x<s-1;x+=2){
      const i=y*s+x; const v=src[i];
      const lap = Math.abs(src[(y-1)*s+x] + src[(y+1)*s+x] + src[y*s+(x-1)] + src[y*s+(x+1)] - 4*v);
      b1+=lap;
    }
    bands[1]=b1; 
    // scale 2: 4x down
    let b2=0; for(let y=1;y<s-1;y+=4) for(let x=1;x<s-1;x+=4){
      const i=y*s+x; const v=src[i];
      const lap = Math.abs(src[(y-1)*s+x] + src[(y+1)*s+x] + src[y*s+(x-1)] + src[y*s+(x+1)] - 4*v);
      b2+=lap;
    }
    bands[2]=b2;
    // normalize
    const norm = bands.reduce((a,b)=>a+b,0)+EPS;
    this.bandEnergy = bands.map(b=>b/norm);
    // zeta for s=[0.5,1.0,2.0]
    const svals=[0.5,1.0,2.0];
    const lambdas = bands.map(x=>x+EPS);
    this.zeta = svals.map(sv => lambdas.reduce((sum,lk)=>sum + Math.pow(lk, -sv),0));
  }

  renderTo(ctx:CanvasRenderingContext2D, dx:number, dy:number, dw:number, dh:number){
    // draw surface into an offscreen canvas then scale up
    const s=this.size; const img=new ImageData(s,s);
    for(let y=0;y<s;y++){
      for(let x=0;x<s;x++){
        const i=y*s+x; const v=clamp01(this.surface[i]);
        const idx=(y*s+x)*4;
        const col = Math.floor(v*255);
        img.data[idx]=col; img.data[idx+1]=col; img.data[idx+2]=col; img.data[idx+3]=255;
      }
    }
    const off = document.createElement('canvas'); off.width=s; off.height=s;
    const oc = off.getContext('2d')!; oc.putImageData(img,0,0);
    ctx.imageSmoothingEnabled = true; ctx.drawImage(off, dx, dy, dw, dh);
  }

  // switch between two attractor parameter sets
  setAttractor(a:boolean){
    if(a){ this.params = {diffusion:0.12,sharpen:0.9,ambient:this.params.ambient}; }
    else { this.params = {diffusion:0.3,sharpen:0.2,ambient:this.params.ambient}; }
  }

  // ===== ZetaCardContract implementation =====

  /**
   * Card contract: state snapshot.
   * Encapsulates all mutable state in a single reproducible structure.
   */
  getState(): CardState {
    return {
      size: this.size,
      surface: this.surface.slice(),
      params: { ...this.params },
      bandEnergy: [...this.bandEnergy],
      zeta: [...this.zeta],
    };
  }

  /**
   * Card contract: restore state.
   * Allows the card to be reset to a known state without mutation from views.
   */
  setState(next: CardState): void {
    this.size = next.size;
    this.surface = new Float32Array(next.surface);
    this.tmp = new Float32Array(this.size * this.size);
    this.params = { ...next.params };
    this.bandEnergy = [...next.bandEnergy];
    this.zeta = [...next.zeta];
  }

  /**
   * Card contract: activation operator.
   * This is the ONLY way the card should become active.
   * Views must not activate cards directly; they must call this method.
   */
  activate(ctx?: CardActivationContext): void {
    this._isActive = true;
    // The router should reflect this activation into the URL
    if (ctx?.reason) {
      console.log(`[${this.id}] activated: ${ctx.reason}`);
    }
  }

  /**
   * Card contract: introspection.
   * Declare failure modes so the UI can render appropriate warnings.
   */
  getFailures?(): CardFailure[] {
    const failures: CardFailure[] = [];

    // Check for flat spectrum
    const energy = this.bandEnergy.reduce((a, b) => a + b, 0);
    const maxBand = Math.max(...this.bandEnergy);
    if (energy > 0 && maxBand / energy < 1.5) {
      // bands are too uniform
      failures.push(CardFailureRegistry.FLAT_SPECTRUM);
    }

    return failures;
  }

  /**
   * Check if card is currently active.
   * (Useful for internal state tracking; not part of contract but useful for runtime.)
   */
  isActive(): boolean {
    return this._isActive;
  }
}

function clamp01(v:number){ return Math.max(0, Math.min(1, v)); }
