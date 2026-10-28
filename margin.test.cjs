const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=__dirname,html=fs.readFileSync(path.join(root,'index.html'),'utf8'),data=JSON.parse(fs.readFileSync(path.join(root,'portfolio-data.json'),'utf8'));
const helper=html.split('/* MAYBANK_JOURNAL_CALC_START */')[1].split('/* MAYBANK_JOURNAL_CALC_END */')[0];
const context={};vm.createContext(context);vm.runInContext(helper,context);
const calculate=context.calculateMaybankJournal,stock=data.my.find(s=>s.t==='MAYBANK'),j=data.marginJournal;
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,a+' != '+b);
const baseline=calculate(stock,j);
near(baseline.costMyr,529828.80);near(baseline.priceProfitMyr,-77281.80);
near(baseline.netProfitMyr,-59271.79);near(baseline.principalMyr,157970);
near(baseline.capitalReturnPct,-59271.79/157970*100);
assert.equal(baseline.netProfitMyr,data.derived.maybankNetProfitMyr);
near(baseline.capitalReturnPct,data.marginJournal.sheetCapitalReturnPct);
assert.equal(calculate(stock,null),null);
assert.equal(calculate(stock,{...j,netFinancingInterestMyr:null}),null);
assert.equal(calculate({...stock,qty:stock.qty+100},j),null);
assert.equal(calculate(stock,{...j,cashDepositsMyr:j.cashWithdrawalsMyr,transferredMaybankCapitalMyr:0}).capitalReturnPct,null);
// New external cash increases principal, not profit.
const funded=calculate(stock,{...j,cashDepositsMyr:j.cashDepositsMyr+1000});
near(funded.principalMyr,baseline.principalMyr+1000);near(funded.netProfitMyr,baseline.netProfitMyr);
// Reinvesting dividends changes share cost/quantity, not external principal.
const flat={...stock,px:10},flatBase=calculate(flat,j),qty=stock.qty+100,avg=(baseline.costMyr+1000)/qty;
const reinvested=calculate({...flat,qty},{...j,quantity:qty,averageCostMyr:avg,maybankDividendsMyr:j.maybankDividendsMyr+1000});
near(reinvested.principalMyr,flatBase.principalMyr);near(reinvested.netProfitMyr-flatBase.netProfitMyr,1000);
// REIT values do not contaminate the Maybank calculation.
near(calculate(stock,{...j,reitDividendsMyr:999999,reitCapitalMyr:999999}).netProfitMyr,baseline.netProfitMyr);
// Current assets already reflect dividends through the actual loan; never add income to NAV.
const fx=data.fx.usdMyr,sum=(xs,fn)=>xs.reduce((a,x)=>a+fn(x),0);
const gross=sum(data.us,x=>x.qty*x.px)*fx+sum(data.my,x=>x.qty*x.px)+data.gold.oz*data.gold.spotUsd*fx*data.constants.uobBuybackMultiplier+data.crypto.qty*data.crypto.pxUsd*fx+data.cash.usd*fx+data.cash.myr;
const liabilities=sum(data.options,x=>x.closePx*100*x.contracts)*fx;
assert.equal(Math.round(gross-data.constants.marginLoanMyr-liabilities),data.derived.netWorthMyr);
const invested=sum(data.us,x=>x.qty*x.cost)*fx+sum(data.my,x=>x.qty*x.cost)+data.gold.oz*data.gold.costPerOz+data.crypto.costMyr;
const investedMV=gross-data.cash.usd*fx-data.cash.myr;
const roi=investedMV-invested+sum(data.options,x=>x.expPL)*fx+(data.wheelRealized+data.stockRealizedUsd+data.mplusRealizedUsd)*fx+baseline.netIncomeMyr;
near(+roi.toFixed(2),data.derived.costBasisReturnMyr);
const inline=html.split('  const holdings=')[1].split('/* MAYBANK_JOURNAL_CALC_START */')[0].trim();
const mirror={};vm.createContext(mirror);vm.runInContext('this.holdings='+inline,mirror);
for(const key of ['us','my','cash','options','marginJournal'])assert.deepEqual(JSON.parse(JSON.stringify(mirror.holdings[key])),data[key]);
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean);
scripts.forEach(s=>new vm.Script(s));const main=scripts.find(s=>s.includes('  const holdings='));
async function render(payload){
 const ids=new Set([...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1])),nodes={};
 const el=id=>!ids.has(id)?null:(nodes[id]||(nodes[id]={textContent:'',innerHTML:'',style:{},listeners:{},addEventListener(k,cb){this.listeners[k]=cb;}}));
 const ctx={window:{},document:{getElementById:el},console,fetch:async()=>{if(!payload)throw Error('offline');return {ok:true,json:async()=>payload};}};
 vm.runInNewContext(main,ctx);await new Promise(resolve=>setImmediate(resolve));return nodes;
}
(async()=>{
 const offline=await render(null);assert.match(offline.mbPL.innerHTML,/-59,271.79/);assert.match(offline.mbPLEquity.innerHTML,/-37.52%/);assert.equal(offline.mbEquity.textContent,'157,970.00');assert.equal(offline.netWorth.textContent,'1,384,734');
 const fresh=JSON.parse(JSON.stringify(data));fresh.marginJournal.cashDepositsMyr+=1000;fresh.marginJournal.maybankDividendsMyr+=100;
 const online=await render(fresh);assert.match(online.mbPL.innerHTML,/-59,171.79/);assert.equal(online.mbEquity.textContent,'158,970.00');assert.match(online.dataSrc.textContent,/数据载自/);
 assert.ok(!html.includes('mbRow.cost-margin'));assert.ok(html.includes("if(d.marginJournal)holdings.marginJournal=d.marginJournal;"));
 console.log('PASS: Maybank-only P/L, principal return, new deposits, dividend reinvestment, REIT exclusion, missing-source guards, no double-counted NAV/ROI, inline/online snapshot and rendered UI.');
})().catch(e=>{console.error(e);process.exitCode=1;});
