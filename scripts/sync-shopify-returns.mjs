import { writeFile, mkdir } from "node:fs/promises";

const API_VERSION = process.env.SHOPIFY_API_VERSION || "2026-01";
const SINCE = process.env.RETURNS_SYNC_START || "2026-01-01T00:00:00Z";

const STORES = [
  {
    key: "corro",
    label: "Corro",
    store: process.env.CORRO_SHOPIFY_STORE,
    token: process.env.CORRO_SHOPIFY_TOKEN,
  },
  {
    key: "cavali",
    label: "Cavali",
    store: process.env.CAVALI_SHOPIFY_STORE,
    token: process.env.CAVALI_SHOPIFY_TOKEN,
  },
];

function cleanStore(store) {
  return String(store || "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
}

function monthKey(value) {
  return String(value || "").slice(0, 7);
}

function money(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function addMetric(map, period, patch) {
  if (!map.has(period)) {
    map.set(period, {
      period,
      gross_sales: 0,
      nb_units: 0,
      total_returns: 0,
      returned_units: 0,
      nb_orders: 0,
    });
  }
  const row = map.get(period);
  Object.entries(patch).forEach(([key, value]) => {
    row[key] = money(row[key]) + money(value);
  });
}

function parseNext(linkHeader) {
  const link = String(linkHeader || "");
  const match = link.match(/<([^>]+)>;\s*rel="next"/);
  return match ? match[1] : null;
}

async function shopifyGet(url, token) {
  const response = await fetch(url, {
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Shopify ${response.status}: ${text.slice(0, 500)}`);
  }
  return {
    data: await response.json(),
    next: parseNext(response.headers.get("link")),
  };
}

async function fetchOrders({ store, token }) {
  const host = cleanStore(store);
  if (!host || !token) return [];
  let url = `https://${host}/admin/api/${API_VERSION}/orders.json?status=any&limit=250&created_at_min=${encodeURIComponent(SINCE)}&fields=id,name,created_at,currency,total_price,line_items,refunds`;
  const orders = [];
  while (url) {
    const { data, next } = await shopifyGet(url, token);
    orders.push(...(Array.isArray(data.orders) ? data.orders : []));
    url = next;
  }
  return orders;
}

function summarizeStore(storeConfig, orders) {
  const metrics = new Map();
  const details = [];

  for (const order of orders) {
    const orderPeriod = monthKey(order.created_at);
    const orderUnits = (order.line_items || []).reduce((sum, item) => sum + money(item.quantity), 0);
    addMetric(metrics, orderPeriod, {
      gross_sales: money(order.total_price),
      nb_units: orderUnits,
      nb_orders: 1,
    });

    for (const refund of order.refunds || []) {
      const period = monthKey(refund.created_at || order.created_at);
      for (const refundItem of refund.refund_line_items || []) {
        const line = refundItem.line_item || {};
        const quantity = money(refundItem.quantity);
        const grossSale = money(refundItem.subtotal || line.price) * (quantity || 1);
        const reason = refund.note || refundItem.restock_type || "No Reason Provided";
        addMetric(metrics, period, {
          total_returns: grossSale,
          returned_units: quantity,
        });
        details.push({
          period,
          brand: storeConfig.label,
          sku: line.sku || "",
          product_name: line.title || line.name || "Unknown Product",
          vendor: line.vendor || "Unknown Vendor",
          category: line.product_type || "No Category Provided",
          quantity,
          gross_sale: grossSale,
          reason: reason || "No Reason Provided",
          order_name: order.name || "",
        });
      }
    }
  }

  return {
    kpis_daily: [...metrics.values()].sort((a, b) => a.period.localeCompare(b.period)),
    returns_detail: details.sort((a, b) => b.quantity - a.quantity || b.gross_sale - a.gross_sale),
  };
}

async function main() {
  const output = {
    generated_at: new Date().toISOString(),
    source: "shopify_admin_api_returns",
    api_version: API_VERSION,
    brands: {},
  };

  for (const store of STORES) {
    const orders = await fetchOrders(store);
    output.brands[store.key] = summarizeStore(store, orders);
    console.log(`${store.label}: ${orders.length} orders scanned`);
  }

  await mkdir("data", { recursive: true });
  await writeFile("data/shopify_actuals.json", `${JSON.stringify(output, null, 2)}\n`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
