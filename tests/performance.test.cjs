// No raw brokerage documents, account IDs or order IDs are needed by this test.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const repo=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(repo,'index.html'),'utf8');
const data=JSON.parse(fs.readFileSync(path.join(repo,'performance-2026.json'),'utf8'));
const js=html.slice(html.indexOf('/* PERFORMANCE_2026_START'),html.indexOf('/* PERFORMANCE_2026_END'));
const near=(a,b,message='')=>assert(Math.abs(a-b)<1e-5,`${message}: ${a} != ${b}`);
async function load(online){
 const nodes={};
 const node=id=>nodes[id]||(nodes[id]={value:'',textContent:'',innerHTML:'',attributes:{},listeners:{},
  addEventListener(event,cb){this.listeners[event]=cb;},setAttribute(name,value){this.attributes[name]=value;}});
 const context={window:{},document:{getElementById:node},console,fetch:async()=>{
  if(!online)throw Error('offline');return {ok:true,json:async()=>data};
 }};
 vm.runInNewContext(js,context);await new Promise(resolve=>setImmediate(resolve));
 return {nodes,core:context.window.MoiPerformanceCore};
}
(async()=>{
 const online=await load(true),offline=await load(false),{calculate,monthly,dayBefore}=online.core;
 for(const id of ['perfRealized','perfUnrealized','perfTotal','perfChart']){
  assert.equal(online.nodes[id].textContent||online.nodes[id].innerHTML,offline.nodes[id].textContent||offline.nodes[id].innerHTML);
 }
 assert.equal(online.nodes.perfTotal.textContent,'+29,501.67');
 for(const [broker,rows] of Object.entries(data.series)){
  assert.equal(rows[0][0],'2025-12-31');near(rows[0][1]+rows[0][2],0);
  assert.equal(rows.at(-1)[0],data.coverage[broker].end);
  assert.equal(new Set(rows.map(r=>r[0])).size,rows.length);
  for(let i=0;i<rows.length;i++){
   assert(rows[i].slice(1,3).every(Number.isFinite));assert(rows[i][3]<=rows[i][0]);
   if(i)assert.equal(dayBefore(rows[i][0]),rows[i-1][0]);
  }
 }
 for(const broker of ['both','moomoo','mplus']){
  const end=broker==='moomoo'?'2026-10-02':'2026-09-30';
  const total=calculate(data,broker,'2026-01-01',end),months=monthly(data,broker,'2026-01-01',end);
  for(const metric of ['realized','unrealized','total'])near(months.reduce((sum,r)=>sum+r[metric],0),total[metric],'months telescope');
  near(calculate(data,broker,'2026-01-01','2026-06-15').total+calculate(data,broker,'2026-06-16',end).total,total.total,'arbitrary split');
  near(calculate(data,broker,'2026-01-01','2026-01-01').total,0,'holiday baseline');
 }
 const end='2026-09-30';
 const both=calculate(data,'both','2026-01-01',end),moo=calculate(data,'moomoo','2026-01-01',end),mp=calculate(data,'mplus','2026-01-01',end);
 near(both.total,moo.total+mp.total);near(moo.realized,2485.12);near(mp.realized,5.8);
 near(both.realized,2490.92);near(both.unrealized,27010.752);near(both.total,29501.672);
 const synthetic={coverage:{mplus:{start:'2026-01-01',end:'2026-02-01'}},series:{mplus:[
  ['2025-12-31',0,0,'2025-12-31'],['2026-01-31',0,100,'2026-01-30'],['2026-02-01',110,0,'2026-01-30']]}};
 const transfer=calculate(synthetic,'mplus','2026-02-01','2026-02-01');
 near(transfer.realized,110);near(transfer.unrealized,-100);near(transfer.total,10,'do not double count selling float');
 assert.throws(()=>calculate(data,'both','2026-10-01','2026-10-02'),/只覆盖/);
 assert.throws(()=>calculate(data,'both','2025-12-31','2026-01-31'),/2026/);
 assert.throws(()=>calculate(data,'both','2026-02-30','2026-03-01'),/有效/);
 assert.throws(()=>calculate(data,'both','2026-03-11','2026-03-10'),/晚于/);
 assert.throws(()=>calculate(data,'both','2026-01-01','2026-12-31'),/只覆盖/);
 const missing=structuredClone(data);missing.series.mplus=missing.series.mplus.filter(r=>r[0]!=='2026-03-10');
 assert.throws(()=>calculate(missing,'mplus','2026-03-11','2026-03-11'),/缺失/);
 const n=online.nodes;n.perfPreset.value='3';n.perfPreset.listeners.change();
 assert.equal(n.perfStart.value,'2026-03-01');assert.equal(n.perfEnd.value,'2026-03-31');
 n.perfStart.value='2026-10-01';n.perfEnd.value='2026-10-02';n.perfStart.listeners.change();
 assert.equal(n.perfPreset.value,'custom');assert.equal(n.perfError.hidden,false);assert.equal(n.perfTotal.textContent,'—');assert.equal(n.perfChart.innerHTML,'');
 n.perfScope.value='moomoo';n.perfScope.listeners.change();assert.equal(n.perfError.hidden,true);
 n.perfScope.value='mplus';n.perfScope.listeners.change();assert.equal(n.perfError.hidden,false);assert.equal(n.perfEnd.value,'2026-10-02');
 assert.equal(data.notes.fullPortfolio,false);assert.equal(data.notes.headlineChanged,false);
 assert(html.includes('Math.max(0,myMv-margin)'));
 assert(!html.includes('<h2>2026 已实现股票买卖 '));
 console.log('PASS: rebased 2026 periods, realized + unrealized change, monthly/custom ranges, coverage guards, no double-counting, offline mirror and UI state.');
})().catch(error=>{console.error(error);process.exitCode=1});
