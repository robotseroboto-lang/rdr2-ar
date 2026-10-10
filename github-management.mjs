// Secure owner-triggered GitHub management; no password or token is sent to Pages.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const defaultOwner='robotseroboto-lang';
const text=(value,max,required=true)=>{
 if(typeof value!=='string'||value.length>max||(required&&!value.trim()))throw Error('Invalid text field');
 return value.trim();
};
function link(value){if(!value)return '';const u=new URL(text(value,2000));if(u.protocol!=='https:'||u.username||u.password)throw Error('Only public HTTPS links are accepted');return u.href;}
function image(value){if(!value)return '';value=text(value,2000);if(value.startsWith('/')){if(!/^\/(images|uploads)\/[A-Za-z0-9._/-]+$/.test(value)||value.split('/').includes('..'))throw Error('Invalid image path');return value;}return link(value);}
function expiry(value){if(!value)return '';if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value)throw Error('Invalid expiry date');return value;}
export function validateNewsEdit(payload,current){
 if(!payload||payload.version!==current.version)throw Error('Version conflict; reload current news before saving');
 if(!Array.isArray(payload.items)||payload.items.length>200)throw Error('Invalid news list');
 const ids=new Set();const items=payload.items.map(item=>{
  const id=text(item.id,100);if(!/^[A-Za-z0-9_-]+$/.test(id)||ids.has(id))throw Error('Duplicate or invalid news identifier');ids.add(id);
  if(typeof item.published!=='boolean')throw Error('Publication state must be explicit');
  return {id,title:text(item.title,300),excerpt:text(item.excerpt,2000),tag:text(item.tag,80),date:text(item.date,100),image:image(item.image),body:text(item.body||'',60000,false),published:item.published,sourceUrl:link(item.sourceUrl),expiresAt:expiry(item.expiresAt),origin:item.origin==='automatic'?'automatic':'manual',locked:item.locked===true,...(item.sourceHash?{sourceHash:text(item.sourceHash,128)}:{})};
 });
 if(current.items.some(item=>!ids.has(item.id)))throw Error('Existing news cannot be deleted; unpublish it instead');
 return {version:current.version+1,items};
}
export function validateTranslations(payload,current){
 if(!payload||typeof payload!=='object'||Array.isArray(payload)||Object.keys(payload).length>2000)throw Error('Invalid translation dictionary');
 for(const [key,value]of Object.entries(payload))if(!/^(MPGC|MPRC|AWARD_ROLE_COLLECTOR_SET|PM_COLLECTOR_WEEKLY|PROVISION|CONSUMABLE|DOCUMENT_CARD|COLLECTOR_FOSSIL|LEGENDARY_ITEM)_[A-Z0-9_]+$/.test(key)||typeof value!=='string'||value.length>600||!/[\u0600-\u06ff]/.test(value)||/[A-Za-z]/.test(value.replace(/\([^)]*\)/g,'')))throw Error('Invalid Arabic game translation');
 return {...current,...payload};
}
export async function manage({root,action,payload,actor,owner=defaultOwner}){
 if(actor!==owner||owner!==defaultOwner)throw Error('Only the verified repository owner may publish edits');
 if(!['news','translations'].includes(action))throw Error('Unsupported action');
 const name=action==='news'?'managed-news.json':'managed-translations.json',path=resolve(root,name);
 const current=JSON.parse(await readFile(path,'utf8'));
 const next=action==='news'?validateNewsEdit(payload,current):validateTranslations(payload,current);
 const backups=resolve(root,'managed-content/backups');await mkdir(backups,{recursive:true});
 await writeFile(resolve(backups,Date.now()+'-'+randomUUID()+'-'+name),JSON.stringify(current,null,2)+'\n',{flag:'wx'});
 await writeFile(path,JSON.stringify(next,null,2)+'\n');
 return {file:name,backupCreated:true,...(action==='news'?{version:next.version}:{translations:Object.keys(next).length})};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const result=await manage({root:process.cwd(),action:process.env.MANAGEMENT_ACTION,payload:JSON.parse(process.env.MANAGEMENT_PAYLOAD||'null'),actor:process.env.GITHUB_ACTOR,owner:process.env.GITHUB_REPOSITORY_OWNER});
 console.log(JSON.stringify(result));
}
