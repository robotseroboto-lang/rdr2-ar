import test from 'node:test';
import assert from 'node:assert/strict';
import {translateNewsState} from './translation-bot.mjs';
test('full news text survives the former word limits and resumes safely across batches',async()=>{
 const storage=new Map();const bucket={async get(k){return storage.has(k)?{json:async()=>JSON.parse(storage.get(k))}:null;},async put(k,v){storage.set(k,v);}};
 const now=Date.parse('2026-10-10T03:00:00Z');
 const article={id:'full123',hash:'full-hash',date:now/1000,title:'Reward '.repeat(30)+'777',excerpt:'Reward '.repeat(60)+'888'};
 const body=Array.from({length:300},(_,i)=>'Reward'+String.fromCharCode(65+Math.floor(i/26),65+i%26)).join(' ')+' Final reward 987654';const requested=[];
 const fetcher=async url=>{
  if(String(url).includes('api.rdo.gg/news/'))return Response.json({article:{id:article.id,title:article.title,content:body}});
  const text=new URL(url).searchParams.get('q');requested.push(text);
  return Response.json({responseStatus:200,quotaFinished:false,responseData:{translatedText:'مكافآت اللعبة '+(text.match(/ZXQTERM\d+QXZ/g)||[]).join(' ')}});
 };
 let result;
 for(let round=0;round<4;round++){
  result=await translateNewsState({articles:[article]},bucket,{fetcher,now:now+round*300001});
  if(result.botTranslations[article.id].complete)break;
 }
 const job=result.botTranslations[article.id];
 assert.equal(job.sourceBody,body);
 assert.equal(job.complete,true);
 assert.match(job.title,/777/);assert.match(job.excerpt,/888/);assert.match(job.body,/987654/);
 assert.ok(requested.some(part=>part.includes('Final reward')));
 assert.ok(requested.length>6,'the test must exercise resuming after a request batch');
 assert.ok(storage.has('translation/news-v2.json'));
 assert.ok(!storage.has('translation/news.json'),'previous cache is not overwritten');
});
