import {EPS, cosine} from "./math";

export type Params = {diffusion:number, sharpen:number, ambient:number};

export class Card {
  size:number;
  surface:Float32Array;
  tmp:Float32Array;
  params:Params;
  bandEnergy:number[];
  zeta:number[];

  constructor(size=64){
    this.size = size;
    this.surface = new Float32Array(size*size);
    this.tmp = new Float32Array(size*size);
    this.params = {diffusion:0.2,sharpen:0.5,ambient:0.5};
    this.bandEnergy = [0,0,0];
    this.zeta = [0,0,0];
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
}

function clamp01(v:number){ return Math.max(0, Math.min(1, v)); }
