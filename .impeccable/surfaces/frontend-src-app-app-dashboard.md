---
version: 1
slug: "frontend-src-app-app-dashboard"
primary_target: "frontend/src/app/(app)/dashboard"
related_targets: ["frontend/src/modules/finance"]
---

## Scope

Post-login app under `/dashboard` (Hoja del mes, Resumen, Deudas, Calendario, Configuración), desktop and mobile. Visitor mode: Operate.

## Audience and job

Salaried young adults in Colombia who plan each month in a spreadsheet: salary minus prestaciones plus auxilio de transporte, rows of expenses by account (Rappi, Nequi, Bancolombia, Efectivo) and category, a minimum cushion, and several debts paid with the avalanche method. Job: fill the month as fast as the spreadsheet, know immediately whether the cushion is met, tick payments as they happen, register what they spend from each pocket (food, gasoline, outings) as the month goes, and decide which debt gets the extra money with the strategy they choose.

## Constraints

- Every figure follows the user's Excel formulas exactly (month sheet, Resumen, Deudas, Config); calculations are covered by tests with synthetic data.
- Spanish (es-CO) copy for every user, never mentioning a spreadsheet or a personal file; COP without decimals, tabular numerals.
- Pockets are budgets spent gradually: they show used, remaining and pace, never a paid toggle.
- WCAG AA, visible focus, keyboard-operable table editing, 44px touch targets on mobile, reduced motion respected.

## Memorable moment

Typing a value in the Gastos table and watching Disponible, the cushion meter and the status pill update instantly, exactly like the spreadsheet.

## Direction contract

THESIS: The monthly Excel rebuilt as a calm, modern fintech workspace where every number recalculates as you type. It refuses the decorative card-soup dashboard the previous version shipped: hero metrics, gradients and quick-action tiles.

OWN-WORLD: The category standard executed at Monarch, YNAB and Copilot Money craft. White cards with an 11.2px radius (8px controls) and a 1px #E4E7EC hairline on a #F5F6F8 ground, Geist with tabular numerals, one blue primary (#2453D6) reserved for actions and selection, semantic pills (Pagado green, Pendiente gray, Vencido rose) and six category hues used only in pills and bars.

STORY: The user opens the month, sees at once whether the cushion is met, fills or edits rows like the spreadsheet, ticks payments and registers pocket spends as they happen, then checks which debt to kill first and when each one ends.

FIRST VIEWPORT: Left sidebar with navigation, "Meses de 2026" with status dots and the user. Content: month title with status pill, previous and next month, "Copiar mes anterior" and the primary "Nuevo gasto"; one KPI card with five metrics and a cushion meter on Disponible; the Bolsillos tiles (what remains, pace and "Registrar gasto"); below them the Gastos table (search, category filter, editable Valor, status badges) beside the Ingresos form, the Por categoría bars and the Por cuenta list.

FORM: Canon, the category standard. The user chose it from real interactive screens over the assigned banknote direction and the ledger alternative. Seed key 4ddf8e46.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Resolved

- 2026-10-07: the owner loads July to November by hand from a private local guide; their account stays empty and no workbook is imported.

## Finish review

Verdict (2026-10-07): ship. Desktop (1440 px) reviewed screen by screen and re-checked after the fix batch; tablet (1024 and 768 px) and phone (390 px) audited for horizontal overflow, panel overflow and touch targets; first run with "Primer mes" reviewed on a phone. Mechanical detector: 0 findings.

Fixed in the finish pass: Ingresos fields overflowing their column, pockets turned from orphan-prone tiles into compact rows sharing columns through subgrid, duplicated month title on phones, category filter as a single scrollable row, 44 px phone targets on buttons, fields, segments and badges, leftover hint limited to closed months, calendar singular/plural and three-column totals, sticky month column in the annual table, chart opening on the latest month, aligned category descriptions and debt figures.

Follow-up: re-check the data screens on a phone with a test account once the owner's own session is not active in the shared browser.
