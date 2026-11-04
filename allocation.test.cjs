const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const context={};vm.createContext(context);
vm.runInContext(html.split('/* ALLOCATION_DETAIL_START */')[1].split('/* ALLOCATION_DETAIL_END */')[0],context);
const calc=context.allocationBreakdown,near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
// US uses gross market value; MY deducts the assigned loan from its financed stock.
const stocks=[{t:'A',qty:10,px:20},{t:'B',qty:5,px:20}];
const us=calc(stocks,4,1000);near(us.total,1200);near(us.rows[0].groupWeight,200/300*100);near(us.rows[0].netWorthWeight,80);
const my=calc(stocks,1,1000,150,'A');near(my.grossTotal,300);near(my.total,150);near(my.totalWeight,15);
const financed=my.rows.find(r=>r.ticker==='A');near(financed.value,50);near(financed.groupWeight,100/3);near(financed.netWorthWeight,5);near(my.unallocatedLoan,0);
near(my.rows.reduce((a,r)=>a+r.groupWeight,0),100);near(my.rows.reduce((a,r)=>a+r.netWorthWeight,0),my.totalWeight);
// New holdings and price changes flow through without a hardcoded ticker list.
const changed=calc([...stocks,{t:'C',qty:20,px:100}],1,1000,150,'A');assert.equal(changed.rows[0].ticker,'C');near(changed.grossTotal,2300);near(changed.total,2150);
assert.equal(calc(stocks,1,0).rows[0].netWorthWeight,null);assert.equal(calc([],1,1000).totalWeight,0);assert.equal(calc([{t:'A',qty:0,px:20}],1,1000).rows[0].groupWeight,null);
const underwater=calc(stocks,1,1000,500,'A');near(underwater.totalWeight,-20);near(underwater.rows.find(r=>r.ticker==='A').value,-300);assert.equal(underwater.rows[0].groupWeight,null);
// A missing financed ticker leaves the debt visible for reconciliation, never reassigns it to a REIT.
const missing=calc(stocks,1,1000,150,'MAYBANK');near(missing.unallocatedLoan,150);near(missing.rows.reduce((a,r)=>a+r.value,0)-missing.unallocatedLoan,missing.total);
// Even duplicate lots cannot deduct the same loan twice.
const lots=calc([{t:'A',qty:10,px:20},{t:'A',qty:5,px:20}],1,1000,150,'A');near(lots.rows.reduce((a,r)=>a+r.deductedLoan,0),150);
const data=JSON.parse(fs.readFileSync(__dirname+'/portfolio-data.json','utf8'));
const current=calc(data.my,1,data.derived.netWorthMyr,data.constants.marginLoanMyr,'MAYBANK');
near(current.grossTotal,data.my.reduce((a,s)=>a+s.qty*s.px,0));near(current.total,current.grossTotal-data.constants.marginLoanMyr);
const mb=data.my.find(s=>s.t==='MAYBANK');near(current.rows.find(r=>r.ticker==='MAYBANK').value,mb.qty*mb.px-data.constants.marginLoanMyr);
near(current.rows.reduce((a,r)=>a+r.value,0),current.total);if(current.total>0)near(current.rows.reduce((a,r)=>a+r.groupWeight,0),100);
const fixture=calc([{t:'MAYBANK',qty:45300,px:10.04},{t:'IGBREIT',qty:11800,px:2.74},{t:'SUNREIT',qty:10000,px:2.07}],1,1288145,355897.77,'MAYBANK');
near(fixture.rows.find(r=>r.ticker==='MAYBANK').value,98914.23);near(fixture.total,151946.23);
console.log('Allocation market weights, net-asset weights, and loan reconciliation passed.');
