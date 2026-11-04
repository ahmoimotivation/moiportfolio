const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const context={};vm.createContext(context);
vm.runInContext(html.split('/* ALLOCATION_DETAIL_START */')[1].split('/* ALLOCATION_DETAIL_END */')[0],context);
const calc=context.allocationBreakdown,near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
// Each market uses its own gross stock value, while portfolio weights use net assets.
const stocks=[{t:'A',qty:10,px:20},{t:'B',qty:5,px:20}];
const us=calc(stocks,4,1000);near(us.total,1200);near(us.rows[0].groupWeight,200/300*100);near(us.rows[0].netWorthWeight,80);
const my=calc(stocks,1,1000,210);near(my.totalWeight,30);near(my.loanWeight,-21);near(my.netWeight,9);near(my.totalWeight+my.loanWeight,my.netWeight);
near(my.rows.reduce((a,r)=>a+r.groupWeight,0),100);near(my.rows.reduce((a,r)=>a+r.netWorthWeight,0),my.totalWeight);
// New holdings and price changes flow through without a hardcoded ticker list.
const changed=calc([...stocks,{t:'C',qty:20,px:100}],1,1000,210);assert.equal(changed.rows[0].ticker,'C');near(changed.total,2300);near(changed.netEquity,2090);
assert.equal(calc(stocks,1,0).rows[0].netWorthWeight,null);assert.equal(calc([],1,1000).totalWeight,0);assert.equal(calc([{t:'A',qty:0,px:20}],1,1000).rows[0].groupWeight,null);
near(calc(stocks,1,1000,500).netWeight,-20);
const data=JSON.parse(fs.readFileSync(__dirname+'/portfolio-data.json','utf8'));
const current=calc(data.my,1,data.derived.netWorthMyr,data.constants.marginLoanMyr);
near(current.total,data.my.reduce((a,s)=>a+s.qty*s.px,0));near(current.netEquity,current.total-data.constants.marginLoanMyr);
console.log('Allocation market weights, net-asset weights, and loan reconciliation passed.');
