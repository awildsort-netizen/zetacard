export const EPS = 1e-6;
export function clamp(v: number, a=0, b=1){ return Math.max(a, Math.min(b, v)); }
export function sigmoid(x:number){ return 1/(1+Math.exp(-x)); }
export function dot(a:number[], b:number[]){ let s=0; for(let i=0;i<a.length;i++) s+=a[i]*b[i]; return s; }
export function norm(a:number[]){ return Math.sqrt(a.reduce((s,x)=>s+x*x,0))+EPS; }
export function cosine(a:number[], b:number[]){ return dot(a,b)/(norm(a)*norm(b)); }
