---
name: FinTrack OS
description: Personal finance month by month, a monthly sheet rebuilt as a calm workspace that recalculates as you type.
colors:
  action-blue: "#2453d6"
  action-blue-hover: "#1d43b3"
  action-blue-wash: "#eef4ff"
  focus-blue: "#84adff"
  focus-blue-halo: "#d1e0ff"
  positive-ink: "#067647"
  positive-wash: "#ecfdf3"
  positive-edge: "#abefc6"
  positive-signal: "#17b26a"
  negative-ink: "#c01048"
  negative-wash: "#fff1f3"
  negative-edge: "#fecdd6"
  negative-signal: "#f04438"
  caution-ink: "#b54708"
  caution-wash: "#fffaeb"
  caution-edge: "#fedf89"
  caution-signal: "#f79009"
  subscription-violet: "#6941c6"
  subscription-wash: "#f4f3ff"
  subscription-fill: "#7a5af8"
  fixed-sky: "#026aa2"
  fixed-wash: "#f0f9ff"
  fixed-fill: "#0086c9"
  pocket-amber: "#b54708"
  pocket-wash: "#fffaeb"
  pocket-fill: "#dc6803"
  savings-green: "#067647"
  savings-wash: "#ecfdf3"
  savings-fill: "#079455"
  debt-magenta: "#c11574"
  debt-wash: "#fdf2fa"
  debt-fill: "#dd2590"
  other-slate: "#475467"
  other-wash: "#f2f4f7"
  other-fill: "#667085"
  chart-income: "#2453d6"
  chart-expense: "#f63d68"
  desk-gray: "#f5f6f8"
  sheet-white: "#ffffff"
  muted-fill: "#f2f4f7"
  hover-wash: "#f9fafb"
  hairline: "#e4e7ec"
  hairline-soft: "#eef0f3"
  control-edge: "#d0d5dd"
  ink: "#0f172a"
  ink-secondary: "#475467"
  ink-tertiary: "#667085"
  ink-quiet: "#98a2b3"
  brand-ground: "oklch(0.982 0.006 255)"
  brand-ink: "oklch(0.19 0.025 255)"
  brand-blue: "oklch(0.53 0.18 252)"
  brand-rose: "oklch(0.65 0.22 354.5)"
  brand-violet: "oklch(0.67 0.17 305)"
  brand-mint: "oklch(0.72 0.18 168)"
  brand-cyan: "oklch(0.72 0.14 215)"
  brand-coral: "oklch(0.62 0.22 25)"
typography:
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  metric:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.015em"
    fontFeature: "tnum"
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
  caption:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  control: "8px"
  card: "11.2px"
  segment-track: "9px"
  segment: "7px"
  pill: "999px"
spacing:
  gutter-mobile: "16px"
  gutter-tablet: "24px"
  gutter-desktop: "32px"
  panel: "18px"
  section: "18px"
components:
  button-primary:
    backgroundColor: "{colors.action-blue}"
    textColor: "{colors.sheet-white}"
    rounded: "{rounded.control}"
    height: "40px"
    padding: "0 14px"
  button-primary-hover:
    backgroundColor: "{colors.action-blue-hover}"
  button-secondary:
    backgroundColor: "{colors.sheet-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "40px"
    padding: "0 14px"
  button-secondary-hover:
    backgroundColor: "{colors.hover-wash}"
  button-ghost:
    textColor: "{colors.ink-tertiary}"
    rounded: "{rounded.control}"
    height: "40px"
  button-danger:
    backgroundColor: "{colors.sheet-white}"
    textColor: "{colors.negative-ink}"
    rounded: "{rounded.control}"
    height: "40px"
    padding: "0 14px"
  input:
    backgroundColor: "{colors.sheet-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "40px"
    padding: "0 12px"
  card:
    backgroundColor: "{colors.sheet-white}"
    rounded: "{rounded.card}"
    padding: "18px"
  badge-paid:
    backgroundColor: "{colors.positive-wash}"
    textColor: "{colors.positive-ink}"
    rounded: "{rounded.pill}"
    height: "28px"
  badge-pending:
    backgroundColor: "{colors.sheet-white}"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.pill}"
    height: "28px"
  badge-late:
    backgroundColor: "{colors.negative-wash}"
    textColor: "{colors.negative-ink}"
    rounded: "{rounded.pill}"
    height: "28px"
  nav-item:
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.control}"
    height: "40px"
  nav-item-active:
    backgroundColor: "{colors.action-blue-wash}"
    textColor: "{colors.action-blue}"
    rounded: "{rounded.control}"
    height: "40px"
  button-brand-action:
    backgroundColor: "{colors.brand-blue}"
    textColor: "{colors.sheet-white}"
    rounded: "12px"
    height: "44px"
    padding: "0 16px"
---

# Design System: FinTrack OS

## Overview

**Creative North Star: "La hoja que se calcula sola"**

FinTrack OS lives in two places. The public surfaces (home and sign-in) are the brand's front door: a bright studio desk with controlled flashes of gradient color. Everything after sign-in is the workspace, where people do their money every month, and that workspace is the monthly spreadsheet rebuilt as a calm, modern tool: one sheet per month, rows of expenses by account and category, a minimum cushion, an annual summary, a debt plan, and every number recalculating the moment a value is typed.

The workspace follows the category standard for personal-finance dashboards (sidebar, white cards, one blue primary, editable tables) executed with the precision of Monarch Money, YNAB and Copilot Money. Density is medium-high and quiet: a cool gray desk, flat white sheets edged by hairlines, Geist with tabular numerals, one blue reserved for action and selection, and color that only ever means status or category. Brand personality lives in precise details (the status words, the cushion meter, the pocket pace), not in decoration.

The workspace rejects the decorative card-soup dashboard the product shipped before (hero metrics, gradients, quick-action tiles), legacy bank chrome, beige finance templates, crypto-trader styling and dark-only terminal aesthetics.

**Key Characteristics:**
- Flat white sheets on a cool gray desk, separated by 1px hairlines, never by resting shadows.
- One action blue for buttons, selection and the current page; everything else is ink, status or category.
- Every amount in tabular numerals, Colombian grouping and no decimals.
- Status is always a word plus a dot or bar, never color alone.
- Edits are inline and instant; panels slide in from the right for detail.

## Colors

A cool neutral desk carries one confident blue, three status families and six category hues that stay inside pills, dots and bars.

### Primary
- **Action Blue** (#2453d6): primary buttons, links, the selected segment outline, the active navigation item, today's date in the calendar, and income bars in charts. Hover deepens to **Action Blue Deep** (#1d43b3); selected navigation and soft selection use **Blue Wash** (#eef4ff).
- **Focus Blue** (#84adff) with **Focus Halo** (#d1e0ff): the 2px focus outline and the 3px halo around focused fields. Text selection uses the halo.

### Secondary
Status families, each as ink for words, wash for backgrounds, edge for borders and signal for dots and bars.
- **Paid Green** (#067647 ink, #ecfdf3 wash, #abefc6 edge, #17b26a signal): Pagado, Meta cumplida, Vas bien, the cushion meter.
- **Alarm Rose** (#c01048 ink, #fff1f3 wash, #fecdd6 edge, #f04438 signal): Vencido, Excedido, Gastos superan el ingreso, destructive actions.
- **Caution Amber** (#b54708 ink, #fffaeb wash, #fedf89 edge, #f79009 signal): Por debajo del colchón, Vas rápido.

### Tertiary
The six expense categories, validated together for color-vision deficiency. Ink colors text in pills; washes fill pills; fills color dots and bars.
- **Subscription Violet** (#6941c6 / #f4f3ff / #7a5af8), **Fixed Sky** (#026aa2 / #f0f9ff / #0086c9), **Pocket Amber** (#b54708 / #fffaeb / #dc6803), **Savings Green** (#067647 / #ecfdf3 / #079455), **Debt Magenta** (#c11574 / #fdf2fa / #dd2590), **Other Slate** (#475467 / #f2f4f7 / #667085).
- **Chart pair:** income in Action Blue (#2453d6), expenses in **Chart Rose** (#f63d68).

### Neutral
- **Desk Gray** (#f5f6f8): the workspace background behind every sheet.
- **Sheet White** (#ffffff): cards, drawers, menus, inputs.
- **Muted Fill** (#f2f4f7) and **Hover Wash** (#f9fafb): segmented tracks, table headers, row hover.
- **Hairline** (#e4e7ec) and **Soft Hairline** (#eef0f3): card edges, table and list dividers.
- **Control Edge** (#d0d5dd): switch tracks and unchecked boxes.
- **Ink** (#0f172a), **Ink Secondary** (#475467), **Ink Tertiary** (#667085), **Ink Quiet** (#98a2b3): headings and figures, body copy, metadata and placeholders, disabled and inactive marks.

### Public brand palette
The home and sign-in surfaces keep the original OKLCH brand: **Brand Ground** (oklch(0.982 0.006 255)) and **Brand Ink** (oklch(0.19 0.025 255)), **Brand Blue** (oklch(0.53 0.18 252), the `--primary` of public surfaces: white text and blue links reach at least 4.5:1) for links and the gradient brand-action button, and **Brand Rose**, **Violet**, **Mint**, **Cyan** and **Coral** for the wordmark gradient (`text-brand-gradient`), soft radial backdrops (`bg-auth-soft`, `bg-app-gradient`) and celebratory moments. These tokens are canonical in OKLCH and have dark variants under `.dark`.

### Named Rules
**The One Blue Rule.** Action Blue means "you can act here" or "this is selected". It never marks a category, decorates a card, or colors a number.

**The Contained Hue Rule.** Category hues live only inside pills, dots, bars and calendar chips. Amounts, panel backgrounds and headings stay in ink.

**The Two Worlds Rule.** Brand gradients, radial backdrops and the gradient brand-action button belong to public surfaces. The workspace never uses them.

## Typography

**Body Font:** Geist (with ui-sans-serif, system-ui)
**Figures:** Geist with tabular numerals (`font-variant-numeric: tabular-nums`)

**Character:** One neutral grotesk does everything; hierarchy comes from size, weight and ink, not from a second family. Numbers are the content, so they are set tabular and aligned right in tables.

### Hierarchy
- **Headline** (600, 24px mobile to 26px, line-height 1.2, -0.02em): page titles such as "Octubre 2026" or "Deudas".
- **Metric** (600, 20px mobile to 22px, -0.015em, tabular): the five KPI figures and the drawer's pocket headline.
- **Title** (600, 16px): panel titles; drawer titles use 18px.
- **Body** (400, 14px, line-height 1.5): table cells, form values, list rows, explanations.
- **Label** (500, 13px): field labels, segmented options, panel asides.
- **Caption** (400 to 500, 12.5px): table headers, pills and badges, metadata under a row, hints.

### Named Rules
**The Tabular Rule.** Every amount uses tabular numerals and Colombian grouping with no decimals ($ 1.234.567), with a true minus sign for negatives. Money is never set in a display size or a gradient inside the workspace.

## Layout

The workspace is a sidebar shell. From 1024px a sticky 252px sidebar holds the brand mark, five navigation items and the months of the year with status dots; the content column centers up to 1400px with 32px side gutters. Below 1024px the sidebar becomes a top bar with a month switcher plus a bottom tab bar and a floating "Nuevo gasto" button, and content uses 16px gutters (24px from 640px) with bottom padding that clears the bar.

Panels stack and wrap with an 18px gap. The month view reads top to bottom: the KPI strip (two columns on phones, five from 1024px), the Bolsillos tiles (auto-fill, 236px minimum), then the Gastos panel (grows from 560px) beside a 320 to 372px column with Ingresos, Por categoría and Por cuenta that drops below when space runs out. Tables switch to stacked list rows below 768px. Panel content is inset 16px on phones and 18px from 640px. Nothing scrolls horizontally on a phone; wide tables and the calendar grid scroll inside their own panel.

## Elevation & Depth

The workspace is flat by default: depth comes from the gray desk showing between white sheets and from 1px hairlines. Shadows exist only for layers that float above the page or for micro-lifts on controls.

### Shadow Vocabulary
- **Drawer** (`box-shadow: 0 20px 48px -16px rgba(16,24,40,0.28)`): the right-hand detail sheet and the confirmation dialog, over a rgba(15,23,42,0.32) scrim.
- **Menu** (`box-shadow: 0 12px 32px -12px rgba(16,24,40,0.24)`): dropdowns and the account menu.
- **Tooltip** (`box-shadow: 0 8px 24px -12px rgba(16,24,40,0.3)`): chart tooltips.
- **Floating action** (`box-shadow: 0 8px 16px -8px rgba(36,83,214,0.6)`): the mobile "Nuevo gasto" button.
- **Micro-lift** (`box-shadow: 0 1px 2px rgba(16,24,40,0.08)`): primary buttons and the selected segment.

### Named Rules
**The Hairline Rule.** Cards are separated by 1px Hairline edges on Desk Gray, never by resting shadows. If something casts a shadow, it floats.

## Shapes

Gently rounded and consistent. Controls (buttons, inputs, selects, navigation items, tiles inside panels) use an 8px radius; cards and the KPI strip use 11.2px (1.4 times the 8px base); segmented controls nest a 7px segment inside a 9px track. Pills, badges, avatars, dots and progress bars are fully round. The drawer is a square-edged full-height sheet. Category dots are 6px circles; month status dots are 8px, with planned months drawn as a ring instead of a fill.

## Components

### Buttons
Quiet, compact and unmistakable.
- **Shape:** 8px radius; 40px tall from 1024px (36px small, 40px square icon buttons) and 44px below 1024px, phones and tablets alike; 14px semibold label with optional 16px icon.
- **Primary:** Action Blue fill, white label, micro-lift shadow; hover deepens to #1d43b3. One primary per view.
- **Secondary:** white with a Hairline edge and Ink label; hover Hover Wash.
- **Ghost:** no fill, Ink Tertiary icon or label; hover Muted Fill and Ink.
- **Danger:** white with a rose edge and Alarm Rose label; hover rose wash.
- **Focus / Disabled:** 2px Focus Blue outline offset 2px; disabled at 50% opacity without pointer events.
- **Brand action (public surfaces only):** the 44px vertical blue gradient button (`brand-action`, 12px radius) with a hairline stroke, a lift that grows on hover and a 4px focus halo. The ramp runs oklch(0.54 0.15 249) → oklch(0.49 0.14 250) and only darkens on hover and press, so white text stays at or above 4.5:1 at every point of the gradient (measured over the rendered pixels).

### Status badges and category pills
- **Payment badge:** 28px pill with a 6px dot and a word: Pagado (green), Pendiente (white with hairline), Vencido (rose). The badge is the toggle; its accessible name states the current state and the action.
- **Pocket badge:** the same pill showing what remains ("Quedan 245k", "Excedido 30k", "Sin gastos"), colored by pace; it opens the pocket to register a spend. Pockets never show a paid toggle.
- **Category pill:** 24px pill with the category wash, ink text and a 6px fill dot.
- **Status pill:** 26px pill next to the month title: Meta cumplida, Por debajo del colchón, Gastos superan el ingreso, each with an icon.

### Cards / Containers
- **Corner Style:** 11.2px.
- **Background:** Sheet White on Desk Gray.
- **Shadow Strategy:** none at rest (see the Hairline Rule).
- **Border:** 1px Hairline.
- **Internal Padding:** header 16px (18px from 640px) with a 16px semibold title and a 13px aside; content inset to match.
- **KPI strip:** one card divided into cells by 1px Soft Hairline gaps; Disponible carries the cushion meter, a 6px bar in Paid Green.

### Inputs / Fields
- **Style:** 40px from 1024px and 44px below, 8px radius, 1px Hairline stroke, white fill, 14px value; money inputs carry a muted "$" or "−$" prefix and tabular digits, take whole pesos and explain a rejected format under the field.
- **Focus:** stroke turns Focus Blue with a 3px Focus Halo.
- **Inline cells:** amounts in the Gastos table are transparent until hover (hairline) or focus (white with halo); Enter moves to the next amount.
- **Segmented control:** Muted Fill track with 3px padding; the selected option is white with a micro-lift.
- **Switch:** 40 by 24 track in Control Edge, Action Blue when on, white knob sliding 16px.
- **Error / Disabled:** errors in Alarm Rose text under the field, announced as alerts; disabled fields on Hover Wash with Ink Tertiary text.

### Navigation
- **Sidebar:** 40px items with an 18px icon and 14px medium label in Ink Secondary; hover Muted Fill; the current page in Blue Wash with semibold Action Blue. Below, "Meses de 2026" lists months with status dots (green met, rose below the cushion, ring for planned) and a "Crear [mes]" link.
- **Mobile:** a top bar with the month switcher (44px targets) and a bottom tab bar using short labels, plus the floating "Nuevo gasto" button.

### Drawer
Detail and editing happen in a right-hand sheet up to 460px wide that slides in over 220ms with cubic-bezier(0.22, 1, 0.36, 1) and out over 160ms; the scrim fades in 200ms. Changes save as they are made ("Los cambios se guardan solos"). Motion respects reduced-motion preferences.

### Pocket tiles
The signature of the month view. Each pocket is a bordered tile with its name and a pace pill (Vas bien, Vas rápido, Excedido, Sin gastos aún), the remaining amount as a metric ("Quedan $ 244.500 de $ 400.000"), a 6px usage bar (green on track, amber when spending faster than the month, rose when exceeded), the used amount with the daily allowance for the rest of the month, and a "Registrar gasto" affordance. The whole tile opens the pocket with the spend field focused.

### Calendar
Day cells at least 124px tall on desktop with payment chips in category washes; paid chips are struck through at 55% opacity, overdue chips carry an inset rose ring, today's number sits in an Action Blue circle, holidays are marked "Festivo" in rose, and pocket spends appear as a dashed amber "Bolsillos" chip with the day's total. On phones the grid collapses to numbered days with category dots.

## Do's and Don'ts

### Do:
- **Do** reserve Action Blue (#2453d6) for actions, selection, the current page, today and income in charts.
- **Do** separate workspace surfaces with 1px Hairline (#e4e7ec) edges on Desk Gray (#f5f6f8) and keep cards flat.
- **Do** pair every status color with a word and a dot or bar (Pagado, Pendiente, Vencido, Vas bien, Excedido).
- **Do** set every amount in tabular numerals with Colombian grouping and no decimals.
- **Do** keep category hues inside pills, dots, bars and calendar chips.
- **Do** keep controls at 8px radius and cards at 11.2px, with 40px controls from 1024px and 44px touch targets below 1024px (project policy, stricter than the WCAG 2.2 AA minimum).
- **Do** keep brand gradients, radial backdrops and the gradient brand-action button on public surfaces only.

### Don't:
- **Don't** add resting shadows, gradients, glass or glow to workspace cards.
- **Don't** bring back hero metrics, oversized numbers or quick-action tiles in the workspace.
- **Don't** color amounts, headings or panel backgrounds with category hues.
- **Don't** let color carry a status alone.
- **Don't** give pockets a paid toggle; they show used, remaining and pace.
- **Don't** use dark-only terminal styling, legacy bank chrome, beige finance templates or crypto-trader aesthetics.
