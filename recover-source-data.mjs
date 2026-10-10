// Recover missing source data from the owner's preserved compiled frontend.
// No downloaded replacement content and no execution of compiled application code.
import {readFile,writeFile,mkdir,readdir,copyFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(process.argv[2]||'site');
const ts=(await import(pathToFileURL(resolve(root,'node_modules/typescript/lib/typescript.js')).href)).default;
const assets=resolve(root,'pages-original/assets'),out=resolve(root,'src/data');
await mkdir(out,{recursive:true});
async function bundle(name){
 const text=await readFile(resolve(assets,name),'utf8');
 const tree=ts.createSourceFile(name,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),definitions=new Map();
 for(const s of tree.statements)if(ts.isVariableStatement(s))for(const d of s.declarationList.declarations)definitions.set(d.name.getText(tree),d.initializer);
 const resolving=new Set();
 function value(n){
  if(!n)throw Error('Missing preserved initializer');
  if(ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n))return n.text;
  if(ts.isNumericLiteral(n))return Number(n.text);
  if(n.kind===ts.SyntaxKind.TrueKeyword)return true;
  if(n.kind===ts.SyntaxKind.FalseKeyword)return false;
  if(n.kind===ts.SyntaxKind.NullKeyword)return null;
  if(ts.isPrefixUnaryExpression(n)){
   const v=value(n.operand);if(n.operator===ts.SyntaxKind.ExclamationToken)return !v;
   if(n.operator===ts.SyntaxKind.MinusToken)return -v;
  }
  if(ts.isArrayLiteralExpression(n))return n.elements.map(value);
  if(ts.isObjectLiteralExpression(n))return Object.fromEntries(n.properties.map(p=>{
   if(!ts.isPropertyAssignment(p))throw Error('Unsupported preserved property');
   return [ts.isIdentifier(p.name)?p.name.text:value(p.name),value(p.initializer)];
  }));
  if(ts.isCallExpression(n)&&n.expression.getText(tree)==='JSON.parse')return JSON.parse(value(n.arguments[0]));
  if(ts.isCallExpression(n)&&n.expression.getText(tree)==='x'&&ts.isStringLiteral(n.arguments[0]))return {$icon:n.arguments[0].text.split('-').map(s=>s[0].toUpperCase()+s.slice(1)).join('')};
  if(ts.isIdentifier(n)){
   if(resolving.has(n.text))throw Error('Recursive preserved value');
   resolving.add(n.text);try{return value(definitions.get(n.text));}finally{resolving.delete(n.text);}
  }
  throw Error('Unsupported static expression: '+n.getText(tree).slice(0,120));
 }
 return id=>value(definitions.get(id));
}
async function create(name,text){
 const file=resolve(out,name);try{const current=await readFile(file,'utf8');if(current!==text)throw Error('Refusing to replace existing source '+name);return;}catch(e){if(e.code!=='ENOENT')throw e;}
 await writeFile(file,text);
}
async function json(name,data){await create(name,JSON.stringify(data,null,2)+'\n');}
const online=await bundle('online-DGhP4SZN.js'),story=await bundle('story-BjlqNLt1.js'),trophies=await bundle('trophies-CNjKgksI.js');
for(const [file,id]of [['weapons.json','E'],['online-animals.json','O'],['horses.json','k'],['fence-online.json','v'],['collector.json','g']])await json(file,online(id));
for(const [file,id]of [['fish.json','o'],['animals.json','c'],['plants-fence.json','n']])await json(file,story(id));
await json('trophies.json',trophies('p'));
const home=await bundle('Footer-BdpFfJQ0.js'),homeData={};
for(const [name,id]of Object.entries({navLinks:'De',categories:'ar',beginnerSteps:'ir',moneyGuides:'lr',roles:'cr',tips:'dr',goldGuides:'mr',goldTips:'pr',about:'ur',socialLinks:'br'}))homeData[name]=home(id);
const icons=new Set();let homeText=Object.entries(homeData).map(([name,v])=>{
 const data=JSON.stringify(v,null,2).replace(/\{\s*"\$icon":\s*"([A-Za-z0-9]+)"\s*\}/g,(_,icon)=>{icons.add(icon);return icon;});
 const shape=name==='beginnerSteps'?': {title:string;description:string;detailTitle:string;accent:string;icon:LucideIcon;sections:MoneyGuideSection[]}[]':name==='moneyGuides'?': {label:string;title:string;detailTitle:string;summary:string;value:string;time:string;icon:LucideIcon;sections:MoneyGuideSection[]}[]':'';
 return 'export const '+name+shape+' = '+data+';';
}).join('\n');
homeText='// Restored verbatim from pages-original; original frontend is preserved.\nimport { '+[...icons].sort().join(', ')+', type LucideIcon } from "lucide-react";\nexport type MoneyGuideSection={title:string;paragraphs?:string[];steps?:{title:string;text:string}[];bullets?:string[];table?:{headers:string[];rows:string[][]};note?:string};\n'+homeText;
await create('home.ts',homeText+'\n');
const cards=await bundle('cards-BIbJYJho.js');
const cardData={abilityCards:cards('xe'),cardCategories:cards('l'),playStyles:cards('h'),abilityIntro:cards('x')};
await json('ability-cards-data.json',cardData);
await create('ability-cards.ts',`// Restored from the preserved original compiled frontend.
import data from './ability-cards-data.json';
export type CardCategory='deadeye'|'combat'|'recovery'|'defense';
export type PlayStyle='solo'|'team'|'pve'|'pvp'|'horse'|'close'|'long'|'tank';
export type AbilityCard={name:string;image?:string;arabic:string;category:CardCategory;kind:string;unlock:number;description:string;pros:string[];cons:string[];styles:PlayStyle[];suited?:string;note?:string};
export const abilityCards=data.abilityCards as AbilityCard[];
export const cardCategories=data.cardCategories as {id:CardCategory;label:string;art:string;description:string}[];
export const playStyles=data.playStyles as {id:PlayStyle;label:string}[];
export const abilityIntro=data.abilityIntro;
`);
await create('trader.ts',`// Restored production formula from the preserved original roles bundle.
export function traderEstimate(goods:number,target:number,supplies:number){const remaining=Math.max(0,target-goods),minutes=remaining*2;return {remaining,minutes,materials:remaining*2,nextSupply:Math.min(minutes,supplies),resupplies:Math.max(0,Math.ceil((minutes-supplies)/50))};}
export function traderDuration(minutes:number){if(minutes===0)return 'جاهزة الآن';const hours=Math.floor(minutes/60),rest=minutes%60;return [hours?hours+' ساعة':null,rest?rest+' دقيقة':null].filter(Boolean).join(' و');}
`);
// Compiled card/hero filenames are part of the restored data. Preserve their exact bytes.
await mkdir(resolve(root,'public/assets'),{recursive:true});
for(const name of await readdir(assets))if(!['.js','.css'].includes(extname(name))){
 const from=resolve(assets,name),to=resolve(root,'public/assets',name);
 try{const current=await readFile(to),original=await readFile(from);if(!current.equals(original))throw Error('Refusing to replace existing resource '+name);}catch(e){if(e.code!=='ENOENT')throw e;await copyFile(from,to);}
}
console.log(JSON.stringify({sourceDataRestored:true,weapons:online('E').length,horses:online('k').length,animals:story('c').length,fish:story('o').length,trophies:trophies('p').length,cards:cardData.abilityCards.length,originalContentPreserved:true}));
