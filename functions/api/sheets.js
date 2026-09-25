import { authorize } from "../_lib/authz.js";
import { canUseDashboardBrand } from "../_lib/registry.js";
import { batchGetValues } from "../_lib/google.js";
import { json, errorJson } from "../_lib/http.js";

const ALLOWED_TABS = new Set([
  "kpis_daily",
  "revenue_share",
  "new_vs_returning",
  "ad_spend",
  "ltv_monthly",
  "smartrr_product_volume",
  "smartrr_subscribers",
]);

export async function onRequestGet(context) {
  try {
    const { user } = await authorize(context);
    const url = new URL(context.request.url);
    const brand = String(url.searchParams.get("brand") || "").trim().toLowerCase();
    if (!canUseDashboardBrand(user, brand)) {
      return errorJson("This email is not allowed to view the requested branch", 403, "branch_not_allowed");
    }

    const tabs = String(url.searchParams.get("tabs") || "")
      .split(",")
      .map(v => v.trim())
      .filter(Boolean);
    if (!tabs.length || tabs.length > 10) return errorJson("No valid tabs requested", 400, "invalid_tabs");
    const invalid = tabs.filter(t => !ALLOWED_TABS.has(t));
    if (invalid.length) return errorJson("One or more requested tabs are not allowed", 403, "tab_not_allowed");

    const sid = brand === "corro" ? context.env.SHEET_ID_CORRO : context.env.SHEET_ID_CAVALI;
    if (!sid) throw new Error(`SHEET_ID_${brand.toUpperCase()} is not configured`);
    const d = await batchGetValues(context.env, sid, tabs);
    return json({ ok: true, valueRanges: d.valueRanges || [] });
  } catch (e) {
    return errorJson(e?.message || "Dashboard data request failed", Number(e?.status || 500), e?.code || "dashboard_data_failed");
  }
}
