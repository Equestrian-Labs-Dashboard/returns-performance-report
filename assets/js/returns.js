(() => {
"use strict";
const $=s=>document.querySelector(s);
const n=v=>Number.isFinite(Number(v))?Number(v):0;
const valid=v=>v!==null&&v!==undefined&&v!==""&&Number.isFinite(Number(v));
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const fmtMoney=v=>{v=n(v);if(Math.abs(v)<.5)return "$0";const s=v<0?"-":"";v=Math.abs(v);return `${s}$${Math.round(v).toLocaleString("en-US")}`};
const fmtNum=v=>n(v).toLocaleString("en-US");
const fmtPct=v=>valid(v)?`${(n(v)*100).toFixed(1).replace(".0","")}%`:"0%";
const monthName=p=>{const [y,m]=String(p||"").split("-");const names=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];return `${names[n(m)-1]||m} ${y}`};
let DATA={brands:{}};

function allRows(){
  return Object.values(DATA.brands||{}).flatMap(brand => Array.isArray(brand.kpis_daily) ? brand.kpis_daily : []);
}
function months(){
  return [...new Set(allRows().map(r=>r.period).filter(Boolean))].sort();
}
function selectedRange(){
  const mode=$("#periodMode").value, ms=months();
  const latest=ms.at(-1)||"2026-09";
  if(mode==="monthly"){
    const m=$("#monthSelect").value||latest;
    return {start:m,end:m,label:monthName(m)};
  }
  if(mode==="q3") return {start:"2026-07",end:"2026-09",label:"Q3 2026"};
  if(mode==="custom") return {start:$("#startMonth").value||"2026-01",end:$("#endMonth").value||latest,label:`${monthName($("#startMonth").value)} - ${monthName($("#endMonth").value)}`};
  return {start:"2026-01",end:latest,label:`YTD through ${monthName(latest)}`};
}
function previousRange(r){
  const shift=m=>{const [y,mo]=m.split("-").map(Number);const d=new Date(y,mo-2,1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`};
  if(r.start===r.end) return {start:shift(r.start),end:shift(r.end),label:"Previous Month"};
  const len=(Number(r.end.slice(0,4))*12+Number(r.end.slice(5)))-(Number(r.start.slice(0,4))*12+Number(r.start.slice(5)))+1;
  let [y,mo]=r.start.split("-").map(Number);
  mo-=len;
  while(mo<=0){mo+=12;y-=1}
  const start=`${y}-${String(mo).padStart(2,"0")}`;
  let ey=y,em=mo+len-1;
  while(em>12){em-=12;ey+=1}
  return {start,end:`${ey}-${String(em).padStart(2,"0")}`,label:"Previous Period"};
}
function periodRows(r){
  return allRows().filter(x=>x.period&&x.period>=r.start&&x.period<=r.end);
}
function summary(rs){
  const returnedUnits=rs.reduce((s,x)=>s+n(x.returned_units||x.nb_returns||x.return_units),0);
  const unitsSold=rs.reduce((s,x)=>s+n(x.nb_units||x.units_sold||x.units),0);
  const returnValue=rs.reduce((s,x)=>s+n(x.total_returns||x.return_value||x.refunds),0);
  const grossSales=rs.reduce((s,x)=>s+n(x.gross_sales),0);
  return {
    returnedUnits,
    unitsSold,
    returnValue: Math.abs(returnValue),
    grossSales,
    returnRate: unitsSold ? returnedUnits/unitsSold : (grossSales ? Math.abs(returnValue)/grossSales : 0)
  };
}
function productReturns(){
  const buckets=[];
  Object.entries(DATA.brands||{}).forEach(([brandKey,brand])=>{
    ["returns","returns_detail","returned_products","return_products"].forEach(key=>{
      if(Array.isArray(brand[key])) buckets.push(...brand[key].map(x=>({...x,brandKey})));
    });
  });
  const r=selectedRange();
  return buckets.filter(x=>{
    const p=String(x.period||x.month||x.date||"").slice(0,7);
    return !p || (p>=r.start&&p<=r.end);
  }).map(x=>({
    sku:x.sku||x.SKU||x.variant_sku||"",
    product:x.product_name||x.productName||x.title||x.name||"Unknown Product",
    vendor:x.vendor||x.Vendor||"Unknown Vendor",
    category:x.category||x.product_type||x.productType||"Uncategorized",
    quantity:n(x.quantity||x.returned_units||x.units||x.qty||1),
    grossSale:n(x.gross_sale||x.gross_sales||x.gross||x.value||0),
    reason:x.reason||x.return_reason||x.note||"No Reason Provided"
  })).sort((a,b)=>b.quantity-a.quantity||b.grossSale-a.grossSale);
}
function group(items,key){
  const m=new Map();
  items.forEach(x=>m.set(x[key]||"Unknown",(m.get(x[key]||"Unknown")||0)+n(x.quantity)));
  return [...m.entries()].map(([name,qty])=>({name,qty})).sort((a,b)=>b.qty-a.qty);
}
function fallbackGroup(rs,labelKey){
  const total=Math.abs(rs.reduce((s,x)=>s+n(x.total_returns||x.return_value),0));
  return total ? [{name:`${labelKey} not available in current export`,qty:total}] : [];
}
function bars(rows,total){
  if(!rows.length)return `<div class="empty-state">No return detail is available for this period.</div>`;
  return `<div class="bars">${rows.slice(0,6).map(x=>`<div class="bar-row"><strong>${esc(x.name)}</strong><div class="track"><span style="width:${Math.max(2,(x.qty/(total||1))*100)}%"></span></div><span>${fmtPct(x.qty/(total||1))}</span></div>`).join("")}</div>`;
}
function kpi(label,value,sub=""){return `<div class="kpi"><div class="label">${label}</div><div class="value">${value}</div><div class="sub">${esc(sub)}</div></div>`}
function table(headers,rows){return `<div class="table-wrap"><table class="grid"><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div>`}
function render(){
  const r=selectedRange(), pr=previousRange(r), rs=periodRows(r), ps=periodRows(pr), s=summary(rs), prev=summary(ps);
  const deltaRate=s.returnRate-prev.returnRate;
  $("#sourceStatus").textContent=r.label;
  $("#kpiSummary").innerHTML=[
    kpi("Return Rate",fmtPct(s.returnRate),`${deltaRate>=0?"+":""}${fmtPct(deltaRate)} vs ${pr.label}`),
    kpi("Returned Units",fmtNum(s.returnedUnits),`${fmtNum(prev.returnedUnits)} ${pr.label.toLowerCase()}`),
    kpi("Units Sold",fmtNum(s.unitsSold),`${fmtNum(prev.unitsSold)} ${pr.label.toLowerCase()}`),
    kpi("Return Value",fmtMoney(s.returnValue),`${fmtMoney(prev.returnValue)} ${pr.label.toLowerCase()}`),
    kpi("Gross Sales",fmtMoney(s.grossSales),`${fmtMoney(prev.grossSales)} ${pr.label.toLowerCase()}`)
  ].join("");
  const products=productReturns();
  const autoLimit=products.length<=10?10:products.length<=20?20:50;
  const limit=$("#rankLimit").value==="auto"?autoLimit:Number($("#rankLimit").value);
  $("#productTable").innerHTML=products.length?table(["SKU","Product Name","Vendor","Quantity","Gross Sale","Reason"],products.slice(0,limit).map(x=>`<tr><td>${esc(x.sku||"-")}</td><td>${esc(x.product)}</td><td>${esc(x.vendor)}</td><td>${fmtNum(x.quantity)}</td><td>${fmtMoney(x.grossSale)}</td><td>${esc(x.reason||"No Reason Provided")}</td></tr>`).join("")):`<div class="empty-state">Product-level returns are not present in the current Shopify export. Add SKU/product/vendor/reason fields to the export and this ranking will populate automatically.</div>`;
  const totalProducts=products.reduce((a,x)=>a+x.quantity,0)||s.returnedUnits||s.returnValue;
  $("#categoryBars").innerHTML=bars(products.length?group(products,"category").slice(0,3):fallbackGroup(rs,"Category"),totalProducts);
  $("#vendorBars").innerHTML=bars(products.length?group(products,"vendor"):fallbackGroup(rs,"Vendor"),totalProducts);
  $("#reasonBars").innerHTML=bars(products.length?group(products,"reason"):fallbackGroup(rs,"Reason"),totalProducts);
}
async function init(){
  const d=await DataService.loadAll();
  DATA=d.shopify||{brands:{}};
  const opts=months();
  $("#monthSelect").innerHTML=opts.map(m=>`<option value="${m}">${monthName(m)}</option>`).join("");
  $("#monthSelect").value=opts.at(-1)||"2026-09";
  $("#endMonth").value=opts.at(-1)||"2026-09";
  ["periodMode","monthSelect","startMonth","endMonth","rankLimit"].forEach(id=>$("#"+id).addEventListener("change",render));
  if(localStorage.getItem("eqlabs-theme")==="dark"){document.documentElement.dataset.theme="dark";$("#themeBtn").textContent="☾"}
  $("#themeBtn").onclick=()=>{const dark=document.documentElement.dataset.theme==="dark";document.documentElement.dataset.theme=dark?"":"dark";$("#themeBtn").textContent=dark?"☀":"☾";localStorage.setItem("eqlabs-theme",dark?"light":"dark")};
  render();
}
init().catch(e=>{console.error(e);document.body.insertAdjacentHTML("beforeend",`<pre class="fatal">${esc(e.stack||e.message)}</pre>`)});
})();
