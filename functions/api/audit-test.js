import { appendValues } from "../_lib/google.js";
import { json, errorJson } from "../_lib/http.js";

export async function onRequestGet(context) {
  try {
    const env = context.env || {};
    const spreadsheetId = String(env.ACCESS_LOG_SHEET_ID || env.USER_REGISTRY_SHEET_ID || "").trim();
    const tab = String(env.ACCESS_LOG_TAB || "Access Logs").trim();
    if (!spreadsheetId) {
      return errorJson("Missing ACCESS_LOG_SHEET_ID or USER_REGISTRY_SHEET_ID", 500, "missing_sheet_id");
    }

    const url = new URL(context.request.url);
    const row = [
      new Date().toISOString(),
      "Audit Test",
      "audit_test",
      "test",
      "allowed",
      "diagnostic",
      "diagnostic",
      "",
      "",
      url.hostname,
      url.pathname,
      url.search,
      context.request.headers.get("cf-connecting-ip") || "",
      context.request.cf?.country || "",
      context.request.headers.get("user-agent") || "",
    ];

    const result = await appendValues(env, spreadsheetId, `${tab}!A:O`, [row]);
    console.log("Audit test write ok", JSON.stringify(result));
    return json({ ok: true, tab, spreadsheetIdEnding: spreadsheetId.slice(-6), result });
  } catch (error) {
    console.warn("Audit test write failed", error?.message || error);
    return errorJson(error?.message || "Audit test failed", 500, "audit_test_failed");
  }
}
