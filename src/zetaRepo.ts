// Check if we're in Node.js environment
const isNode = typeof require !== 'undefined' && typeof global !== 'undefined' && global.require === require;

let fs: any = null;
let path: any = null;
let crypto: any = null;

if (isNode) {
  try {
    fs = require('fs/promises');
    path = require('path');
    crypto = require('crypto');
  } catch(e) {
    // Not in Node.js or modules not available
  }
}

// Optional isomorphic-git integration (best-effort). If `isomorphic-git` is
// installed in the environment, the repo will use it as a backend for
// interoperability. Otherwise the file-backed implementation remains used.
let hasIsogit = false as boolean;
let isogit: any = null;
let nodeFS: any = null;
try{
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  isogit = require('isomorphic-git');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  nodeFS = require('fs');
  hasIsogit = !!isogit && !!nodeFS;
}catch(e){ hasIsogit = false; }

type CommitObj = {
  tree: string;
  parents: string[];
  author?: {name:string,email?:string};
  message?: string;
  timestamp: number;
  metadata?: any;
};

/**
 * Minimal ZetaRepo: git-compatible API surface (init, blobs, trees, commits, refs)
 * Implements a light-weight, file-backed store under `.zeta_repo/`.
 * If `isomorphic-git` is added later, this class can be adapted to delegate to it.
 */
export class ZetaRepo {
  root: string;
  blobsDir: string;
  treesDir: string;
  commitsDir: string;
  refsFile: string;

  constructor(root = path.resolve('.zeta_repo')){
    this.root = root;
    this.blobsDir = path.join(this.root, 'blobs');
    this.treesDir = path.join(this.root, 'trees');
    this.commitsDir = path.join(this.root, 'commits');
    this.refsFile = path.join(this.root, 'refs.json');
    this.useIsogit = hasIsogit;
    this.workdir = path.join(this.root, 'workdir');
    this.listeners = {} as Record<string, Function[]>;
  }

  // simple event emitter
  on(event:string, cb:Function){ this.listeners[event] = this.listeners[event]||[]; this.listeners[event].push(cb); }
  off(event:string, cb:Function){ if(!this.listeners[event]) return; this.listeners[event] = this.listeners[event].filter(f=>f!==cb); }
  emit(event:string, ...args:any[]){ (this.listeners[event]||[]).forEach(f=>{ try{ f(...args);}catch(e){} }); }

  async init(){
    try{ await fs.mkdir(this.root, {recursive:true}); }catch(e){}
    for(const d of [this.blobsDir,this.treesDir,this.commitsDir]){ try{ await fs.mkdir(d, {recursive:true}); }catch(e){} }
    try{
      await fs.access(this.refsFile);
    }catch(e){
      await fs.writeFile(this.refsFile, JSON.stringify({ 'refs/heads/main': null }, null, 2), 'utf8');
    }
    if(this.useIsogit){
      try{
        // prepare a simple working directory for isomorphic-git
        await fs.mkdir(this.workdir, {recursive:true});
        await isogit.init({fs: nodeFS, dir: this.workdir});
      }catch(e){ /* ignore */ }
    }
  }

  private oidOf(content: Buffer | string){
    const buf = Buffer.isBuffer(content) ? content : Buffer.from(content);
    return crypto.createHash('sha1').update(buf).digest('hex');
  }

  async writeBlob(content: string | Buffer){
    const buf = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
    const oid = this.oidOf(buf);
    const p = path.join(this.blobsDir, oid + '.blob');
    try{ await fs.access(p); }catch(e){ await fs.writeFile(p, buf); }
    return oid;
  }

  async readBlob(oid: string){
    const p = path.join(this.blobsDir, oid + '.blob');
    try{
      return await fs.readFile(p);
    }catch(e){ throw new Error('blob not found ' + oid); }
  }

  async writeTree(entries: {path:string, oid:string, type:'blob'|'tree'}[]){
    // tree is mapping of path-> {oid,type}
    const treeObj:any = {};
    for(const e of entries) treeObj[e.path]= {oid:e.oid, type:e.type};
    const content = JSON.stringify(treeObj);
    const oid = this.oidOf(content);
    const p = path.join(this.treesDir, oid + '.json');
    try{ await fs.access(p); }catch(e){ await fs.writeFile(p, content, 'utf8'); }
    return oid;
  }

  async readTree(oid:string){
    const p = path.join(this.treesDir, oid + '.json');
    try{ const txt = await fs.readFile(p,'utf8'); return JSON.parse(txt); }catch(e){ throw new Error('tree not found ' + oid); }
  }

  async commit(treeOid:string, parents:string[], message:string, metadata?:any, author?:{name:string,email?:string}){
    const commit:CommitObj = {tree:treeOid, parents: parents||[], message, timestamp: Date.now(), metadata, author };
    const content = JSON.stringify(commit, null, 2);
    const oid = this.oidOf(content);
    const p = path.join(this.commitsDir, oid + '.json');
    try{ await fs.access(p); }catch(e){ await fs.writeFile(p, content, 'utf8'); }
    // emit commit event for watchers
    this.emit('commit', oid, commit);
    return oid;
  }

  async readCommit(oid:string):Promise<CommitObj>{
    const p = path.join(this.commitsDir, oid + '.json');
    try{ const txt = await fs.readFile(p,'utf8'); return JSON.parse(txt) as CommitObj; }catch(e){ throw new Error('commit not found ' + oid); }
  }

  async listCommits(): Promise<string[]>{
    try{ const files = await fs.readdir(this.commitsDir); return files.filter(f=>f.endsWith('.json')).map(f=>f.replace(/\.json$/,'')); }catch(e){ return []; }
  }

  async updateRef(ref:string, commitOid:string|null){
    let refs:any = {};
    try{ const txt = await fs.readFile(this.refsFile,'utf8'); refs = JSON.parse(txt); }catch(e){}
    refs[ref]=commitOid;
    await fs.writeFile(this.refsFile, JSON.stringify(refs,null,2),'utf8');
    this.emit('ref-update', ref, commitOid);
  }

  async readRef(ref:string){
    try{ const txt = await fs.readFile(this.refsFile,'utf8'); const refs = JSON.parse(txt); return refs[ref]||null; }catch(e){ return null; }
  }

  // convenience: write a card manifest at path and commit on branch
  async addCardAndCommit(cardPath:string, manifestContent:string, branch='refs/heads/main', message='Add card'){
    if(this.useIsogit){
      try{
        // write file into workdir and commit with isomorphic-git
        const fullPath = path.join(this.workdir, cardPath);
        await fs.mkdir(path.dirname(fullPath), {recursive:true});
        await fs.writeFile(fullPath, manifestContent, 'utf8');
        await isogit.add({fs: nodeFS, dir: this.workdir, filepath: cardPath});
        const oid = await isogit.commit({fs: nodeFS, dir: this.workdir, message, author: {name: (author&&author.name)||'zeta', email: (author&&author.email)||'zeta@example.com'}});
        // note: isogit.commit returns oid; we still mirror commit into our local object store
        const blobOid = await this.writeBlob(manifestContent);
        const entries = [{path:cardPath, oid:blobOid, type:'blob'}];
        const treeOid = await this.writeTree(entries);
        const parent = await this.readRef(branch);
        const commitOid = await this.commit(treeOid, parent? [parent] : [], message, undefined, author);
        await this.updateRef(branch, commitOid);
        return {blobOid, treeOid, commitOid, gitOid: oid};
      }catch(e){ /* fallback to file-backed below */ }
    }
    const blobOid = await this.writeBlob(manifestContent);
    const entries = [{path:cardPath, oid:blobOid, type:'blob'}];
    const treeOid = await this.writeTree(entries);
    const parent = await this.readRef(branch);
    const commitOid = await this.commit(treeOid, parent? [parent] : [], message);
    await this.updateRef(branch, commitOid);
    return {blobOid, treeOid, commitOid};
  }

  // read a path at a given ref (branch name)
  async readPathAtRef(ref:string, cardPath:string){
    // If using isogit, prefer to read from its workdir using the ref
    if(this.useIsogit){
      try{
        // attempt to read file at ref using isomorphic-git
        const buf = await isogit.readFile({fs: nodeFS, dir: this.workdir, filepath: cardPath, ref});
        if(buf) return buf.toString('utf8');
      }catch(e){ /* fallback */ }
    }
    const commitOid = await this.readRef(ref);
    if(!commitOid) throw new Error('ref has no commit: ' + ref);
    const commit = await this.readCommit(commitOid);
    const tree = await this.readTree(commit.tree);
    const ent = tree[cardPath];
    if(!ent) throw new Error('path not found in tree: ' + cardPath);
    if(ent.type==='blob') return (await this.readBlob(ent.oid)).toString('utf8');
    throw new Error('unsupported type');
  }
}

// Export a singleton for quick use
export const repo = new ZetaRepo();
