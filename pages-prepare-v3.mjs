import {cp,readFile,writeFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'..');
const output=resolve(root,'.pages-site');
const base=process.env.PAGES_BASE_PATH||'/';
if(!/^\/(?:[A-Za-z0-9_.-]+\/)*$/.test(base))throw Error('Invalid Pages base path');
await cp(resolve(root,'pages-original'),output,{recursive:true});
let routerPatched=0;
for(const name of await readdir(resolve(output,'assets'))){
 if(!name.endsWith('.js'))continue;
 const path=resolve(output,'assets',name);let text=await readFile(path,'utf8');
 text=text.replace(/(["'`])\/(assets|images|guide|guide-assets|role-icons|trophies|collector)\//g,(_,q,folder)=>q+base+folder+'/');
 text=text.replaceAll('/community-logo.png',base+'community-logo.png');
 text=text.replaceAll('فحص تلقائي كل 5 دقائق','تحديث البيانات كل 15 دقيقة عبر GitHub Actions').replaceAll('فحص تلقائي كل دقيقة','تحديث البيانات كل 15 دقيقة عبر GitHub Actions');
 text=text.replace('scrollRestoration:!0,defaultPreloadStaleTime:0','basepath:'+JSON.stringify(base)+',scrollRestoration:!0,defaultPreloadStaleTime:0');
 if(text.includes('basepath:'+JSON.stringify(base)+',scrollRestoration:!0,defaultPreloadStaleTime:0'))routerPatched++;
 await writeFile(path,text);
}
if(routerPatched!==1)throw Error('Expected exactly one original React router');
// Version changed bundles so browser/CDN caches cannot keep old root paths.
const revisions=new Map();
for(const name of await readdir(resolve(output,'assets'))){
 if(!name.endsWith('.js'))continue;
 const text=await readFile(resolve(output,'assets',name),'utf8');
 const digest=createHash('sha256').update(text).digest('hex').slice(0,12);
 revisions.set(name,name.replace(/\.js$/,'.pages-'+digest+'.js'));
}
for(const [name,versioned]of revisions){
 let text=await readFile(resolve(output,'assets',name),'utf8');
 for(const [oldName,newName]of revisions)text=text.replaceAll(oldName,newName);
 await writeFile(resolve(output,'assets',versioned),text);
}
let html=await readFile(resolve(output,'index.html'),'utf8');
html=html.replace(/((?:src|href)=")\/(assets|images|guide|guide-assets|role-icons|trophies|collector)\//g,(_,attribute,folder)=>attribute+base+folder+'/');
for(const [oldName,newName]of revisions)html=html.replaceAll(oldName,newName);
html=html.replace('<head>','<head>\n<script src="'+base+'pages-runtime.js" data-base="'+base+'"></script>');
await writeFile(resolve(output,'index.html'),html);
await cp(resolve(root,'server/pages-runtime.js'),resolve(output,'pages-runtime.js'));
console.log(JSON.stringify({base,routerPatched,originalInterfacePreserved:true}));
