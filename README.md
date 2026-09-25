# Equestrian Labs — Strategic Operating Model v3.0

Complete standalone replacement project built from the latest reviewed requirements for Tabs 1–6.

## Sources
- Corro Shopify: `SHOPIFY_CORRO_STORE` / `SHOPIFY_CORRO_TOKEN`
- Cavali Shopify: `SHOPIFY_CAVALI_STORE` / `SHOPIFY_CAVALI_TOKEN`
- Google Sheets connected actuals: `GOOGLE_CREDENTIALS`, `ADS_SHEET_ID`, `SHEET_ID_CORRO`, `SHEET_ID_CAVALI`
- Smartrr fields are not fabricated. Cavali membership/box fields are read from connected actuals when available and remain editable forecasts otherwise.
- QuickBooks/BILL cash timing is not fabricated. The model keeps the current strategic cash model until a validated QuickBooks/BILL feed is connected.

## Persistence
Every editable forecast cell, funding allocation, initiative and header scenario input is persisted independently by Model Status:
- Draft
- Budget
- Forecast
- Board

Persistence uses browser `localStorage`. It survives reopening the same browser/device. `Download` exports the full saved scenario JSON. Static GitHub Pages cannot write user edits back to GitHub without a backend.

## 2026 Actuals + Forecast
The first forecast year uses closed Shopify actual months plus remaining months at the editable Base Ecommerce monthly run rate. Future forecast inputs are never overwritten by Refresh Actuals.

## Deploy
1. Replace the repository contents with this project, preserving only repository Secrets/Variables.
2. Ensure GitHub Pages uses GitHub Actions.
3. Run `Sync Actuals and Deploy to GitHub Pages`.
4. Hard refresh the deployed page.
5. Open Tab 6 and confirm all formula QA checks are PASS.
6. In the browser console, run `runModelQA()` for full year outputs.

## Required GitHub Secrets
- `SHOPIFY_CORRO_STORE`
- `SHOPIFY_CORRO_TOKEN`
- `SHOPIFY_CAVALI_STORE`
- `SHOPIFY_CAVALI_TOKEN`
- `GOOGLE_CREDENTIALS`
- `ADS_SHEET_ID`
- `SHEET_ID_CORRO`
- `SHEET_ID_CAVALI`

## Important business rules implemented
- $130M Dover market base remains fixed.
- Marketing allocation is phased across years rather than dropped entirely into 2026.
- Funding Inventory is Cash Flow, not an automatic P&L COGS charge.
- Advertising is deducted once at GP3 and is not duplicated in S&M.
- Cavali uses Signature and Premier wording and Boxes per Member / Year.
- Tabs 3 and 5 use the selected Display Year and the complete portfolio.
- Tab 5 has no independent calculations; it reads the same model outputs used by Tabs 1–4.


## v3.2 safe month-filter correction (2026-08-21)
- Restores the last working model logic as the base.
- Corro month selector starts at Jan 2026.
- Cavali month selector starts at the current month.
- Month selectors change Baseline / Current display only; they do NOT replace 2026 Actuals + FCS calculations.
- 2026 FCS remains closed YTD actuals + remaining months at the editable run rate.
- Existing Tabs 1–6, Display Year, scenario persistence, Paid Ads, Dover, COGS/Inventory separation, Cavali and Board logic are preserved.
- Only one GitHub Pages workflow remains and it declares the github-pages environment.
