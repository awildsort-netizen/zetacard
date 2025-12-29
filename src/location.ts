import { repo } from './zetaRepo';

type Location = { commit: string | null; path: string };

type EventListener = (...args: unknown[]) => void;

export class LocationManager {
  currentCommit: string | null = null;
  currentPath: string = '/';
  listeners: Record<string, EventListener[]> = {};

  constructor(){ }

  on(ev: string, cb: EventListener){ this.listeners[ev] = this.listeners[ev]||[]; this.listeners[ev].push(cb); }
  off(ev: string, cb: EventListener){ if(!this.listeners[ev]) return; this.listeners[ev]=this.listeners[ev].filter(f=>f!==cb); }
  emit(ev:string, ...args:unknown[]){ 
    (this.listeners[ev]||[]).forEach(f=>{ 
      try{ 
        f(...args);
      }catch(e){ 
        // Ignore listener errors to prevent one failing listener from affecting others
      } 
    }); 
  }

  async init(){
    try{
      await repo.init();
    }catch(e){ 
      // Ignore init errors - repo may already be initialized
    }
    try{
      const head = await repo.readRef('refs/heads/main');
      this.currentCommit = head;
    }catch(e){ 
      this.currentCommit = null; 
    }
    this.currentPath = '/';

    // subscribe to repo events to keep location live
    try{
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if(typeof (repo as any).on === 'function'){
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (repo as any).on('ref-update', async (ref:string, oid:string)=>{
          // if HEAD changed, update current commit
          if(ref === 'refs/heads/main'){
            this.currentCommit = oid;
            this.emit('moved', {commit: this.currentCommit, path: this.currentPath});
          }
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (repo as any).on('commit', async (oid:string, commit:unknown)=>{
          // general commit: refresh knowledge
          this.emit('commit', {oid, commit});
        });
      }
    }catch(e){ 
      // Ignore subscription errors - repo events may not be available
    }
  }

  async here(): Promise<Location>{
    return { commit: this.currentCommit, path: this.currentPath };
  }

  // resolve a ref or commit or a compound string like 'main:/cards/pulse'
  async resolve(target: string): Promise<{commit:string|null, path?:string}>{
    if(!target) return {commit: this.currentCommit, path: this.currentPath};
    // compound: commit:path or ref:path
    const m = target.match(/^([^:]+):(.+)$/);
    if(m){
      const ref = m[1];
      const p = m[2];
      let commit: string | null = null;
      // if ref looks like a 40-char oid, use directly
      if(/^[0-9a-f]{6,40}$/i.test(ref)) commit = ref;
      else {
        try{ 
          commit = await repo.readRef(ref.startsWith('refs/')?ref:`refs/heads/${ref}`); 
        }catch(e){ 
          commit = null; 
        }
      }
      return { commit, path: p };
    }
    // single token: could be commit oid or ref
    if(/^[0-9a-f]{6,40}$/i.test(target)) return {commit: target};
    try{
      const commit = await repo.readRef(target.startsWith('refs/')?target:`refs/heads/${target}`);
      return { commit };
    }catch(e){ 
      return { commit: null }; 
    }
  }

  async move(target: string){
    const r = await this.resolve(target);
    if(r.commit) this.currentCommit = r.commit;
    if(r.path) this.currentPath = r.path;
    this.emit('moved', {commit: this.currentCommit, path: this.currentPath});
    return {commit: this.currentCommit, path: this.currentPath};
  }

  descend(relPath: string){
    const clean = relPath.replace(/^\/+|\/+$/g,'');
    if(!clean) return this.currentPath;
    if(this.currentPath === '/') this.currentPath = clean;
    else this.currentPath = `${this.currentPath.replace(/\/+$/,'')}/${clean}`;
    this.emit('moved', {commit: this.currentCommit, path: this.currentPath});
    return this.currentPath;
  }

  ascend(){
    if(this.currentPath === '/' ) return this.currentPath;
    const parts = this.currentPath.split('/').filter(Boolean);
    parts.pop();
    this.currentPath = parts.length? parts.join('/') : '/';
    this.emit('moved', {commit: this.currentCommit, path: this.currentPath});
    return this.currentPath;
  }
}

export const locationManager = new LocationManager();

export default LocationManager;
