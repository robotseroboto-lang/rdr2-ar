import {readFile,readdir,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'../.pages-site');
const html=await readFile(resolve(root,'index.html'),'utf8');
const entry=html.match(/src="([^"]+\/assets\/[^\"]+\.js)"/);
assert(entry,'The original React entry script must be present');
const base=entry[1].slice(0,entry[1].indexOf('assets/'));
const routes=['about','admin','cards','challenges','community','gold','guide','money','news','online','roles','server-status','story','tips','trophies'];
for(const route of routes)assert.equal(await readFile(resolve(root,route,'index.html'),'utf8'),html);
let count=0;
const checkPath=async url=>{url=url.split(/[?#]/)[0];if(url.includes('${')||url.includes('{')||url.endsWith('/'))return;assert(url.startsWith(base),'Resource escaped the project base path: '+url);const path=url.slice(base.length);assert((await stat(resolve(root,path))).isFile(),'Missing resource: '+path);count++;};
for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g))if(match[1].startsWith(base)&&/\.(js|css)$/.test(match[1]))await checkPath(match[1]);
const files=await readdir(resolve(root,'assets'));
for(const file of files.filter(x=>x.endsWith('.js'))){const text=await readFile(resolve(root,'assets',file),'utf8');assert(!text.includes('\"/community-logo.png\"'));if(text.includes(base+'community-logo.png'))await checkPath(base+'community-logo.png');for(const m of text.matchAll(/["'`](\/(?:[^"'`]*\/)?(?:images|guide|guide-assets|role-icons|trophies|collector)\/[^"'`\s)]+)/g))await checkPath(m[1]);}
for(const feed of ['challenges','weekly','nazar','news','server-status','translation-status','live-feed','health','admin/session']){const value=JSON.parse(await readFile(resolve(root,'api',feed+'.json'),'utf8'));assert(value&&typeof value==='object');if(['challenges','weekly','nazar'].includes(feed))assert.equal(typeof value.stale,'boolean');}
assert.equal(JSON.parse(await readFile(resolve(root,'api/admin/session.json'),'utf8')).authenticated,false);
console.log(JSON.stringify({base,routes:routes.length,verifiedResourceReferences:count,feeds:9,adminRequiresBackend:true}));
