const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const context={};vm.createContext(context);
vm.runInContext(html.split('/* ALLOCATION_DETAIL_START */')[1].split('/* ALLOCATION_DETAIL_END */')[0],context);
const calc=context.allocationBreakdown,near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
// Both weights divide by current NAV, not the market subtotal or historical capital.
const stocks=[{t:'A',qty:10,px:20,cost:30},{t:'B',qty:5,px:20,cost:10}];
const us=calc(stocks,4,1000),a=us.rows.find(r=>r.ticker==='A');
near(a.value,800);near(a.costValue,1200);near(a.netWorthWeight,80);near(a.costWeight,120);
near(us.totalWeight,120);near(us.totalCostWeight,140);
// A different FX moves both USD numerators; a different NAV moves both weights.
near(calc(stocks,5,2000).rows.find(r=>r.ticker==='A').costWeight,75);
// The same loan is removed from Maybank's current and cost numerators, once each.
const my=calc(stocks,1,1000,150,'A'),financed=my.rows.find(r=>r.ticker==='A');
near(financed.value,50);near(financed.costValue,150);near(financed.netWorthWeight,5);near(financed.costWeight,15);
near(my.total,150);near(my.costTotal,200);near(my.unallocatedLoan,0);
near(my.rows.reduce((sum,r)=>sum+r.value,0),my.total);near(my.rows.reduce((sum,r)=>sum+r.costValue,0),my.costTotal);
// A missing financed ticker keeps the debt visible; duplicate lots cannot deduct twice.
const missing=calc(stocks,1,1000,150,'MAYBANK');near(missing.unallocatedLoan,150);near(missing.costTotal,200);
const lots=calc([stocks[0],{...stocks[0],qty:5}],1,1000,150,'A');near(lots.rows.reduce((sum,r)=>sum+r.deductedLoan,0),150);near(lots.costTotal,300);
// Do not clamp underwater equity to zero, or fabricate a missing cost / valid NAV.
near(calc(stocks,1,1000,500,'A').rows.find(r=>r.ticker==='A').netWorthWeight,-30);
assert.equal(calc(stocks,1,0).rows[0].costWeight,null);assert.equal(calc(stocks,1,-1).rows[0].netWorthWeight,null);
assert.equal(calc([{t:'X',qty:1,px:10}],1,1000).rows[0].costWeight,null);
assert.equal(calc([{t:'X',qty:1,px:10}],1,1000).totalCostWeight,null);
// Golden fixture independently checks the owner-corrected Maybank amount and cost.
const fixture=calc([{t:'MAYBANK',qty:45300,px:10.04,cost:11.696},{t:'IGBREIT',qty:11800,px:2.74,cost:2.67},{t:'SUNREIT',qty:10000,px:2.07,cost:2.11}],1,1288145,355897.77,'MAYBANK');
const mb=fixture.rows.find(r=>r.ticker==='MAYBANK');near(mb.value,98914.23);near(mb.costValue,173931.03);near(fixture.total,151946.23);
// Gold and crypto use existing MYR cost, without applying USD FX to that cost twice.
for(const [value,cost] of [[113260,148722],[11030,15994.97]]){
 const alt=calc([{t:'asset',qty:1,px:value,cost}],1,1288145);near(alt.rows[0].netWorthWeight,value/1288145*100);near(alt.rows[0].costWeight,cost/1288145*100);
}
const data=JSON.parse(fs.readFileSync(__dirname+'/portfolio-data.json','utf8'));
const current=calc(data.my,1,data.derived.netWorthMyr,data.constants.marginLoanMyr,'MAYBANK');
near(current.total,data.my.reduce((sum,s)=>sum+s.qty*s.px,0)-data.constants.marginLoanMyr);
near(current.costTotal,data.my.reduce((sum,s)=>sum+s.qty*s.cost,0)-data.constants.marginLoanMyr);
console.log('PASS: current-value/cost weights use current NAV, FX, Maybank loan once, gold/crypto MYR costs, and missing-data guards.');
