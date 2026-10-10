// GitHub Pages adapter: reuse the original validated sources and Arabic dictionaries.
import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {ChallengeService,atomicJson} from './challenges.mjs';
import {WeeklyService} from './weekly.mjs';
import {NazarService} from './nazar.mjs';
import {liveNewsState,mergeLiveNews,liveStatusState,liveStatusView,approvedNews} from './live-feeds.mjs';
import {translateNewsState,translationHealth} from './translation-bot.mjs';

const root=resolve(import.meta.dirname,'..');
const offline=process.argv.includes('--offline');
const cache=resolve(root,offline?'.pages-cache-offline':'.pages-cache');
const output=resolve(root,'.pages-site');
await mkdir(cache,{recursive:true});
const fetcher=offline?async()=>{throw Error('Offline verification; not a live source result');}:fetch;
const bucket={async get(key){try{const value=await readFile(resolve(cache,key),'utf8');return {json:async()=>JSON.parse(value)};}catch{return null;}},async put(key,value){const path=resolve(cache,key);await mkdir(dirname(path),{recursive:true});await writeFile(path,value);}};
const services=[new ChallengeService(cache,{fetcher}),new WeeklyService(cache,{fetcher}),new NazarService(cache,{fetcher})];
await Promise.all(services.map(s=>s.init()));
await Promise.all(services.map(s=>s.tick()));
const [rawNews,status,health]=await Promise.all([liveNewsState(bucket,fetcher),liveStatusState(bucket,fetcher),translationHealth(bucket,{fetcher})]);
const translated=await translateNewsState(rawNews,bucket,{fetcher,approved:approvedNews});
const editorial=JSON.parse(await readFile(resolve(root,'content/news-default.json'),'utf8'));
const news=mergeLiveNews(translated,editorial);
const api=resolve(output,'api');
await mkdir(api,{recursive:true});
const views={
 challenges:services[0].view(),weekly:services[1].view(),nazar:services[2].view(),news,
 'server-status':liveStatusView(status),
 'translation-status':{health,bot:translated.translationBot},
 'live-feed':{news:{lastChecked:rawNews.lastChecked,lastSuccess:rawNews.lastSuccess,error:rawNews.error,articles:rawNews.articles.length},status:liveStatusView(status)},
 health:{ok:true,runtime:'github-actions-static',generatedAt:new Date().toISOString(),challengesReady:!!services[0].cache,stale:services[0].view().stale},
 'admin/session':{authenticated:false,configured:false},
};
for(const [name,value]of Object.entries(views))await atomicJson(resolve(api,name+'.json'),value);
try{await cp(resolve(cache,'nazar-images'),resolve(api,'nazar/image'),{recursive:true});}catch{}
await writeFile(resolve(output,'.nojekyll'),'');
// Real HTML entry points retain working direct links on static hosting.
const html=await readFile(resolve(output,'index.html'),'utf8');
for(const path of ['about','admin','cards','challenges','community','gold','guide','money','news','online','roles','server-status','story','tips','trophies']){
 await mkdir(resolve(output,path),{recursive:true});await writeFile(resolve(output,path,'index.html'),html);
}
await writeFile(resolve(output,'404.html'),html);
console.log(JSON.stringify({offline,generatedAt:views.health.generatedAt,challengesReady:!!views.challenges.data,challengesStale:views.challenges.stale,weeklyReady:!!views.weekly.data,weeklyStale:views.weekly.stale,nazarDate:views.nazar.data?.date??null,nazarStale:views.nazar.stale,newsArticles:news.items.length,translationWorking:health.working,statusVerified:!!status.data}));
