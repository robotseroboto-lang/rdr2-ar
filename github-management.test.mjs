import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {manage,validateNewsEdit,validateTranslations} from './github-management.mjs';
const item={id:'preserved-1',title:'خبر عربي',excerpt:'وصف الخبر',tag:'أخبار',date:'10 أكتوبر',image:'/images/news-trader.jpg',body:'تفاصيل الخبر',published:false};
const current={version:1,items:[item]};
test('news editing preserves existing items and rejects conflicting or unsafe edits',()=>{
 const edited=validateNewsEdit({version:1,items:[{...item,published:true}]},current);assert.equal(edited.version,2);assert.equal(edited.items[0].published,true);
 assert.throws(()=>validateNewsEdit({version:0,items:[item]},current),/conflict/);
 assert.throws(()=>validateNewsEdit({version:1,items:[]},current),/deleted/);
 assert.throws(()=>validateNewsEdit({version:1,items:[{...item,image:'javascript:alert(1)'}]},current));
 assert.throws(()=>validateNewsEdit({version:1,items:[{...item,image:'/uploads/../secret'}]},current));
 assert.throws(()=>validateNewsEdit({version:1,items:[{...item,sourceUrl:'https://user:secret@example.com'}]},current));
});
test('translation edits merge with the preserved dictionary',()=>{
 const original={MPGC_TEST:'ترجمة أصلية'};const merged=validateTranslations({MPGC_OTHER:'ترجمة أخرى'},original);
 assert.equal(merged.MPGC_TEST,'ترجمة أصلية');assert.equal(merged.MPGC_OTHER,'ترجمة أخرى');
 assert.throws(()=>validateTranslations({MPGC_OTHER:'English only'},original));
});
test('only the owner can write and every accepted change has a restorable backup',async()=>{
 const root=await mkdtemp(join(tmpdir(),'rdr-management-'));await writeFile(join(root,'managed-news.json'),JSON.stringify(current));
 await assert.rejects(manage({root,action:'news',payload:current,actor:'visitor',owner:'robotseroboto-lang'}),/owner/);
 assert.equal(JSON.parse(await readFile(join(root,'managed-news.json'),'utf8')).version,1);
 const result=await manage({root,action:'news',payload:current,actor:'robotseroboto-lang',owner:'robotseroboto-lang'});assert.equal(result.backupCreated,true);
 const names=await readdir(join(root,'managed-content/backups'));assert.equal(names.length,1);
 assert.deepEqual(JSON.parse(await readFile(join(root,'managed-content/backups',names[0]),'utf8')),current);
});
