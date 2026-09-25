(() => {
  "use strict";
  async function getJson(path, fallback={}) {
    try {
      const r = await fetch(`${path}?v=${Date.now()}`, {cache:"no-store"});
      return r.ok ? await r.json() : fallback;
    } catch { return fallback; }
  }
  function rows(brand){ return Array.isArray(brand?.kpis_daily) ? brand.kpis_daily : []; }
  function currentPeriod(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; }
  function latestClosedMonth(rs){
    const cur=currentPeriod();
    return [...new Set((rs||[]).map(x=>x.period).filter(p=>p && p<cur))].sort().at(-1)||null;
  }
  function sum(rs,key){ return (rs||[]).reduce((s,x)=>s+(Number(x?.[key])||0),0); }
  function aggregateRows(rs){
    const orders=sum(rs,"nb_orders"), grossSales=sum(rs,"gross_sales"), netSales=sum(rs,"net_sales");
    return {
      grossSales, netSales, orders, units:sum(rs,"nb_units"),
      discounts:sum(rs,"total_discounts"), returns:sum(rs,"total_returns"),
      shippingIncome:sum(rs,"shipping_income"), cogs:sum(rs,"cogs"),
      costedUnits:sum(rs,"costed_units"), uniqueCustomers:sum(rs,"unique_customers")
    };
  }
  function aggregateClosed(brand,year=2026){
    const last=latestClosedMonth(rows(brand));
    const rs=rows(brand).filter(x=>String(x.period||"").startsWith(`${year}-`) && (!last || x.period<=last));
    const a=aggregateRows(rs);
    a.monthsClosed=new Set(rs.map(x=>x.period)).size;
    a.lastClosedMonth=last;
    return a;
  }
  function channelRows(brand, channel){
    return (Array.isArray(brand?.revenue_share)?brand.revenue_share:[]).filter(x=>String(x.channel||"").toLowerCase()===String(channel).toLowerCase());
  }
  function channelClosed(brand,channel,year=2026){
    const last=latestClosedMonth(rows(brand));
    const rs=channelRows(brand,channel).filter(x=>String(x.period||"").startsWith(`${year}-`) && (!last || x.period<=last));
    return aggregateRows(rs);
  }
  function monthRange(start,end){
    const out=[]; let [y,m]=start.split("-").map(Number); const [ey,em]=end.split("-").map(Number);
    while(y<ey || (y===ey && m<=em)){ out.push(`${y}-${String(m).padStart(2,"0")}`); if(++m>12){m=1;y++;} }
    return out;
  }
  function availableMonths(brand,start="2026-01"){
    const all=[...new Set(rows(brand).map(x=>x.period).filter(Boolean))].sort();
    return all.filter(x=>x>=start);
  }
  function aggregateMonth(brand,period){ return aggregateRows(rows(brand).filter(x=>x.period===period)); }
  function channelMonth(brand,channel,period){ return aggregateRows(channelRows(brand,channel).filter(x=>x.period===period)); }
  // YTD / cutoff helpers: the selected month is a THROUGH date, never an isolated month.
  function aggregateThrough(brand,period,year=2026){
    const start=`${year}-01`;
    const rs=rows(brand).filter(x=>x.period && x.period>=start && x.period<=period);
    const a=aggregateRows(rs);
    a.monthsClosed=new Set(rs.map(x=>x.period)).size;
    a.lastClosedMonth=period;
    return a;
  }
  function channelThrough(brand,channel,period,year=2026){
    const start=`${year}-01`;
    const rs=channelRows(brand,channel).filter(x=>x.period && x.period>=start && x.period<=period);
    const a=aggregateRows(rs);
    a.monthsClosed=new Set(rs.map(x=>x.period)).size;
    a.lastClosedMonth=period;
    return a;
  }
  async function loadAll(){
    const [assumptions,shopify,connected,smartrr]=await Promise.all([
      getJson("data/assumptions.json",{}),
      getJson("data/shopify_actuals.json",{brands:{}}),
      getJson("data/connected_actuals.json",{}),
      getJson("data/cavali_smartrr_actuals.json",{})
    ]);
    return {assumptions,shopify,connected,smartrr};
  }
  window.DataService={loadAll,currentPeriod,latestClosedMonth,aggregateClosed,channelClosed,monthRange,availableMonths,aggregateMonth,channelMonth,aggregateThrough,channelThrough};
})();
