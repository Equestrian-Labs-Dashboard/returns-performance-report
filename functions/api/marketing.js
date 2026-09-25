import { authorize } from "../_lib/authz.js";
import { canUseDashboardBrand } from "../_lib/registry.js";
import { getValues } from "../_lib/google.js";
import { json, errorJson } from "../_lib/http.js";

export async function onRequestGet(context) {
  try {
    const { user } = await authorize(context);
    const url = new URL(context.request.url);
    const brand = String(url.searchParams.get("brand") || "").trim().toLowerCase();
    if (!canUseDashboardBrand(user, brand)) {
      return errorJson("This email is not allowed to view the requested branch", 403, "branch_not_allowed");
    }
    const sid = String(context.env.MARKETING_SHEET_ID || "").trim();
    const tab = String(context.env.MARKETING_SHEET_TAB || "Total Shopify").trim();
    if (!sid) throw new Error("MARKETING_SHEET_ID is not configured");
    const escapedTab = tab.replace(/'/g, "''");
    const d = await getValues(context.env, sid, `'${escapedTab}'!A:Z`);
    return json({ ok: true, values: d.values || [] });
  } catch (e) {
    return errorJson(e?.message || "Marketing data request failed", Number(e?.status || 500), e?.code || "marketing_data_failed");
  }
}
