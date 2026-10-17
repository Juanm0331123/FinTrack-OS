---
name: FinTrack OS
description: Personal finance month by month. Public surfaces are a bright editorial studio in light grays; the workspace is the monthly sheet rebuilt as a calm tool that recalculates as you type.
colors:
  ground: "#f3f5f8"
  panel: "#ebeef3"
  panel-strong: "#e4e8ef"
  sheet: "#ffffff"
  edge: "#d5dce6"
  edge-soft: "#eef0f3"
  control-edge: "#7d879a"
  muted-fill: "#f2f4f7"
  hover-wash: "#f9fafb"
  ink: "#0f172a"
  ink-secondary: "#475467"
  ink-tertiary: "#667085"
  ink-quiet: "#8a94a6"
  blue: "#2453d6"
  blue-hover: "#1d43b3"
  blue-wash: "#eef4ff"
  focus-halo: "#d1e0ff"
  positive: "#067647"
  positive-wash: "#ecfdf3"
  positive-edge: "#abefc6"
  positive-signal: "#17b26a"
  negative: "#c01048"
  negative-wash: "#fff1f3"
  negative-edge: "#fecdd6"
  negative-signal: "#f04438"
  caution: "#b54708"
  caution-wash: "#fffaeb"
  caution-edge: "#fedf89"
  caution-signal: "#f79009"
  access-edge: "#c5cfe0"
  access-edge-hover: "#98a8c5"
  access-hover: "#f7f9fd"
  access-active: "#eef2fa"
  brand-blue: "#5b89ff"
  brand-violet: "#8c7cff"
  brand-pink: "#cc63c5"
  brand-coral: "#e5665f"
  brand-blue-deep: "#3f6ff0"
  brand-violet-deep: "#7357f0"
  brand-pink-deep: "#b9479f"
  brand-coral-deep: "#d24e48"
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
typography:
  display:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  statement:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  section:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  panel-title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  lead:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "24px"
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
  hero: "32px"
  panel: "28px"
  sheet: "16px"
  access: "14px"
  control: "8px"
  card: "11.2px"
  segment-track: "9px"
  segment: "7px"
  pill: "999px"
spacing:
  container: "1344px"
  gutter-desktop: "32px"
  gutter-tablet: "24px"
  gutter-mobile: "16px"
  section: "112px"
  section-mobile: "64px"
  panel: "32px"
  panel-mobile: "22px"
  panel-gap: "20px"
  workspace-panel: "18px"
components:
  button-access:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.access}"
    height: "52px"
    padding: "0 22px"
  button-access-hover:
    backgroundColor: "{colors.access-hover}"
  button-access-active:
    backgroundColor: "{colors.access-active}"
  button-primary:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.control}"
    height: "40px"
    padding: "0 14px"
  button-primary-hover:
    backgroundColor: "{colors.blue-hover}"
  button-secondary:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "40px"
    padding: "0 14px"
  button-secondary-hover:
    backgroundColor: "{colors.hover-wash}"
  button-ghost:
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.control}"
    height: "40px"
  button-danger:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.negative}"
    rounded: "{rounded.control}"
    height: "40px"
    padding: "0 14px"
  input:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "40px"
    padding: "0 12px"
  panel:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.panel}"
    padding: "32px"
  sheet:
    backgroundColor: "{colors.sheet}"
    rounded: "{rounded.sheet}"
    padding: "20px"
  card:
    backgroundColor: "{colors.sheet}"
    rounded: "{rounded.card}"
    padding: "18px"
  badge-paid:
    backgroundColor: "{colors.positive-wash}"
    textColor: "{colors.positive}"
    rounded: "{rounded.pill}"
    height: "28px"
  badge-pending:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.pill}"
    height: "28px"
  badge-late:
    backgroundColor: "{colors.negative-wash}"
    textColor: "{colors.negative}"
    rounded: "{rounded.pill}"
    height: "28px"
  nav-item:
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.control}"
    height: "40px"
  nav-item-active:
    backgroundColor: "{colors.blue-wash}"
    textColor: "{colors.blue}"
    rounded: "{rounded.control}"
    height: "40px"
---

# Design System: FinTrack OS

## Dirección vigente de la landing — 2026-10-16

La landing vigente conserva el hero aprobado de referencia SkyElite: «Bienvenido a la app de FinTrack OS», degradado de marca, escala responsive 48/60/72/96px y escena financiera propia SVG/CSS. Esta excepción de tamaño pertenece solo al hero. **Las nubes viven exclusivamente en el hero.** No hay partículas, WebGL, canvas decorativo ni hero isométrico.

Cuatro capítulos —hoja mensual, bolsillos, colchón/deudas y resumen anual— usan Web Animations API nativa con progreso por scroll reversible. Sticky solo con ancho ≥ 1024px y alto ≥ 720px; pantallas menores en flujo. Reduced motion, ausencia de JavaScript o de soporte conservan una página estática completa. Las notas de A con Three.js y C con hero isométrico son historial sustituido.

El refinamiento inferior solicitado después de aprobar el hero usa folios blancos grandes sobre suelo gris, sin marco de dashboard: hoja con estados de pago, bolsillo con pestaña y presupuesto, reserva del colchón y ecuación de pago, y barras anuales amplias. Los pasos forman una secuencia conectada; acceso, FAQ nativa y cierre comparten jerarquía editorial y CTA azul. Footer gris claro compacto. No se agregan nubes, fondos oscuros ni animaciones decorativas a estas secciones.

Escala inferior: H2 de 28px móvil hasta 40px escritorio, cuerpo de 16px y etiquetas de demos desde 12px. Las cifras conservan sus valores reales de muestra y no se interpolan. Los envíos principales de autenticación siguen azules y la tipografía operativa no cambia. El refinamiento está implementado para revisión visual del Owner; sus comprobaciones técnicas y límites se registran en `docs/qa-design-release.md`.

## Overview

**Creative North Star: "Estudio claro"**

FinTrack OS lives in two places that share one material. The public surfaces (landing, sign-in, registration and recovery) are a bright editorial studio: a light gray ground, quiet gray panels, white data sheets, dark ink and controlled flashes of the owner's blue → violet → pink/coral gradient. The workspace after sign-in is the monthly spreadsheet rebuilt as a calm tool: one sheet per month, expense rows by account and category, a minimum cushion, an annual summary, a debt plan, and every number recalculating as a value is typed.

Direction C («Estudio claro») remains the approved material for authentication and the workspace (2026-10-14): depth comes from gray tones and white sheets. The landing now combines editorial composition, cinematic product motion and clear demos under the 2026-10-16 contract above. It has no particle engine or isometric hero. There is no dark mode; the use scene is daytime planning at a desk or on a phone, and the `.dark` block in `globals.css` is a legacy shadcn leftover with no consumer.

**Key Characteristics:**
- A light gray ground with two gray panel tones; white is reserved for data sheets, menus and fields.
- Dark ink for everything that must be read; gray-blue secondary text that holds AA on every surface.
- One action blue for actions, links, focus and selection, shared by both worlds.
- The owner's gradient lives in light: the hero mesh, one headline phrase, thin rules. Never fills panels, never colors amounts.
- Clear access controls: white, thin border, rounded, line icon without a circle.
- Every amount in tabular numerals and Colombian grouping; status is always a word plus a dot or bar.

## Colors

All values are defined once as primitives in `:root` (`frontend/src/app/globals.css`). shadcn names and the workspace `ft-*` names point to them; see the token map at the end.

### Surfaces
- **Ground** (#f3f5f8): the page on public surfaces and the workspace desk.
- **Panel** (#ebeef3) and **Panel Strong** (#e4e8ef): large public panels alternate between them so sections read as separate rooms without borders; Panel Strong also carries the access panel and the footer. In the workspace they are reserved for the sidebar and shell chrome.
- **Sheet** (#ffffff): data sheets, demos, cards, drawers, menus and fields. White never becomes the dominant page color.
- **Edge** (#d5dce6) and **Edge Soft** (#eef0f3): 1px dividers and card edges. Decorative: they never carry meaning alone.
- **Muted Fill** (#f2f4f7) and **Hover Wash** (#f9fafb): segmented tracks, table headers and row hover inside sheets.

### Ink
- **Ink** (#0f172a): headings, figures, body text on panels, control labels.
- **Ink Secondary** (#475467): body copy, eyebrows, labels and metadata on any surface (≥ 6.25:1 everywhere).
- **Ink Tertiary** (#667085): metadata and placeholders only on Sheet, Ground, Hover Wash and Muted Fill. It fails on Panel (4.28:1) and Panel Strong (4.05:1); use Ink Secondary there.
- **Ink Quiet** (#8a94a6): non-text marks (planned-month rings, empty chart bars, decorative icons) and inactive calendar days; 3.06:1 on Sheet.

### Action, focus and states
- **Blue** (#2453d6): primary product buttons, links, current navigation item, today, income in charts, and the 2px focus outline everywhere. **Blue Hover** (#1d43b3) on hover; **Blue Wash** (#eef4ff) for selected navigation and soft selection; **Focus Halo** (#d1e0ff) for the 3px field halo and text selection.
- **Control Edge** (#7d879a): the 1px boundary that identifies a field or a control state (unchecked box, switch off, input). ≥ 3:1 on Sheet, Ground and Panel.
- **Positive** (#067647 ink · #ecfdf3 wash · #abefc6 edge · #17b26a signal): Pagado, Meta cumplida, Vas bien, saved confirmations.
- **Negative** (#c01048 · #fff1f3 · #fecdd6 · #f04438): Vencido, Excedido, errors and destructive actions. It is also the public `--destructive`.
- **Caution** (#b54708 · #fffaeb · #fedf89 · #f79009): Por debajo del colchón, Vas rápido, review notes.

### Access controls
- **Access Edge** (#c5cfe0), **Access Edge Hover** (#98a8c5), **Access Hover** (#f7f9fd), **Access Active** (#eef2fa): the clear button family from the owner's reference. The edge is decorative (1.57:1); the label and icon identify the action, and the text stays ≥ 14.5:1 in every state.

### Brand gradient
- **Light stops** (#5b89ff → #8c7cff → #cc63c5 → #e5665f): the hero mesh, soft radial backdrops (`bg-app-gradient`, `bg-auth-soft`) and thin rules.
- **Deep stops** (#3f6ff0 → #7357f0 → #b9479f → #d24e48): decorative backgrounds, fills with large white labels (≥ 24px; contrast ≥ 4.27:1 at every stop), and the general gradient text utility (`text-brand-gradient`). These fills do not guarantee the 4.5:1 required for normal-size white text.
- **Gradient text:** `text-brand-gradient` (deep) for large text (≥ 24px) on any light surface, ≥ 3.47:1 even on Panel Strong. The retained `text-brand-gradient-light` utility requires 42px or larger over Access Hover (#f7f9fd) or lighter, where its stops give 3.03–3.24:1; on Ground they drop to 2.97:1 and fail. The current compact scale tops out at 40px, so use the deep utility for headline text and reserve the light stops for decoration.

### Categories (workspace)
The six expense categories keep their validated trios (ink for pill text, wash for pill fill, fill for dots and bars): **Subscription Violet** (#6941c6 / #f4f3ff / #7a5af8), **Fixed Sky** (#026aa2 / #f0f9ff / #0086c9), **Pocket Amber** (#b54708 / #fffaeb / #dc6803), **Savings Green** (#067647 / #ecfdf3 / #079455), **Debt Magenta** (#c11574 / #fdf2fa / #dd2590), **Other Slate** (#475467 / #f2f4f7 / #667085). **Chart pair:** income in Blue (#2453d6), expenses in **Chart Rose** (#f63d68).

### Contrast matrix
Measured WCAG ratios (normal text needs 4.5:1, large text and control boundaries 3:1).

| Token | Sheet | Hover Wash | Ground | Muted Fill | Panel | Panel Strong |
|---|---|---|---|---|---|---|
| Ink #0f172a | 17.85 | 17.08 | 16.35 | 16.20 | 15.35 | 14.53 |
| Ink Secondary #475467 | 7.69 | 7.36 | 7.04 | 6.98 | 6.61 | 6.25 |
| Ink Tertiary #667085 | 4.97 | 4.76 | 4.55 | 4.51 | 4.28 ✕ | 4.05 ✕ |
| Ink Quiet #8a94a6 (marks) | 3.06 | 2.93 | 2.80 | 2.78 | 2.63 | 2.49 |
| Blue #2453d6 | 6.40 | 6.12 | 5.86 | 5.80 | 5.50 | 5.20 |
| Control Edge #7d879a (boundary) | 3.62 | 3.46 | 3.31 | 3.28 | 3.11 | 2.94 ✕ |
| Positive #067647 | 5.69 | 5.45 | 5.21 | 5.16 | 4.89 | 4.63 |
| Negative #c01048 | 6.16 | 5.89 | 5.64 | 5.59 | 5.30 | 5.01 |
| Caution #b54708 | 5.43 | 5.19 | 4.97 | 4.93 | 4.67 | 4.42 ✕ |

White text: 6.40:1 on Blue, 8.38:1 on Blue Hover, 6.16:1 on Negative. Controls are never placed directly on Panel Strong; Caution text on Panel Strong uses Ink with a caution dot instead.

### Named Rules
**The One Blue Rule.** Blue means "you can act here", "this is selected" or "focus is here". It never marks a category, decorates a card or colors a number.

**The Contained Hue Rule.** Category and status hues live inside pills, dots, bars and calendar chips. Amounts, panel backgrounds and headings stay in ink.

**The Two Worlds Rule.** Both worlds share ground, sheets, ink, blue and status colors. The gradient, the mesh backdrops and gradient text belong to public surfaces only; the workspace never uses them.

**The Light Gradient Rule.** The gradient is light, not paint: it may glow behind content, underline a moment or color one headline phrase, but never fills a panel, a button with dark text or an amount.

## Typography

**Family:** Geist (with ui-sans-serif, system-ui), loaded by `next/font` as `--font-geist-sans`.
**Figures:** Geist with tabular numerals (`tabular-nums`, `.finance-number`, `.tabular`).

**Character:** one neutral grotesk does everything; hierarchy comes from size, weight and ink, never from a second family. Authentication and workspace use compact functional typography. The owner explicitly preserves the existing size of «Bienvenido a la app de FinTrack OS». Codex implements the current editorial and cinematic direction; historical artifacts inform the work without overriding the current contract.

### Public hierarchy (landing and auth)
- **Current landing scale (2026-10-16):** product headings 32px desktop / 28px phones; block headings 36 / 28px; conversion headings 40 / 32px; lead 16px; access buttons 52px tall with a 14px label. The welcome H1 exception stays 36/48px. Classes live in `frontend/src/modules/home/landing-styles.ts`; do not restore oversized headings from proposal A.
- **Historical, superseded A scale (2026-10-15):** product headings 48px desktop / 40px tablet / 34px phones; block headings («Empieza con tu próximo mes.», «Antes de empezar.») 56 / 44 / 36px; conversion headings («Gratis por ahora.», «Haz espacio para un mes más claro.») 72 / 56 / 40px; eyebrow 15px; lead 18px (16px phones); landing access buttons 56px tall with a 16–17px label. Retained as history only; not the current specification.
- **Display** (600, 40px desktop → 32px phones, line-height 1.2, −0.02em): reserved ceiling for a future hero H1. The landing hero keeps the welcome headline exception below (owner decision, 2026-10-15); the approved alternative H1 «Organiza tu dinero…» is not on the page.
- **Existing welcome headline exception:** «Bienvenido a la app de FinTrack OS» retains its original `text-4xl sm:text-5xl` (36px phones / 48px from 640px), existing gradient and weight. Do not reduce it with the functional typography scale or reuse its size for form/page headings.
- **Section** (600, 28px desktop → 24px phones, line-height 1.2): section H2 such as «Empieza con tu próximo mes.».
- **Panel title** (500, 24px desktop → 20px phones, line-height 1.25): H2 inside product panels.
- **Statement** (500, 28px desktop → 24px phones, line-height 1.25): the two-tone statement; its second half in Ink Tertiary on Ground (large text, 4.55:1).
- **Auth headline** (600, 24px from 640px → 22px phones, line-height 1.25, −0.02em): the authentication page H1.
- **Lead / Body** (400, 16px maximum, line-height 1.6–1.75, measure ≤ 60ch): landing descriptions, panel copy and FAQ answers.
- **Auth support copy** (400, 14px, line-height 22px): the short description below the authentication H1; keeps dense forms compact without reducing their controls.
- **Eyebrow / Label** (500, 12–13px, Ink Secondary): approved antetítulos and auxiliary labels. Public field and action labels may use 14–16px for clarity.
- **Floor:** nothing public under 12px; tracking never tighter than −0.04em.

### Workspace hierarchy
- **Headline** (600, 22px phones to 24px desktop, line-height 1.2, −0.02em): page titles such as «Octubre 2026».
- **Metric** (600, up to 22px, −0.015em, tabular): KPI figures and the drawer's pocket headline.
- **Title** (600, 16px): panel titles; drawer titles use 18px.
- **Body** (400, 14px, line-height 1.5): table cells, form values, list rows.
- **Label** (500, 13px) and **Caption** (400–500, 12.5px): field labels, segmented options, table headers, pills, hints.

### Named Rules
**The Compact Scale Rule.** Functional headings stay within 24px and metrics within 22px. Landing secondary headings use the current contained scale above, up to 40px; its one H1 exception is the welcome headline at 36/48px. The oversized A scale is superseded. Use weight, ink and spacing to separate roles. Keep ordinary landing copy at 16px maximum, short auth support copy and workspace body at 14px, and auxiliary copy at 12–13px. Never reduce the root font size, browser zoom or 44px mobile targets to make the interface look smaller. Editable inputs remain at least 16px on phones; do not shrink their text with the supporting copy.

**The Tabular Rule.** Every amount uses tabular numerals and Colombian grouping with no decimals ($ 1.234.567) and a true minus sign. Money is never set in a gradient, and display sizes are for the landing only.

## Layout and spacing

### Public surfaces
- **Container:** 1344px max, 32px gutters (24px from 640px, 16px on phones), 12-column grid.
- **Rhythm:** sections 112px apart on desktop, 64px on phones; panels 32px inside (22px on phones) and 20px apart; more space above a heading than below it.
- **Current landing:** container 1280px with 48/32/20px gutters; clear gray surfaces and white product sheets. The frontal hero uses real HTML product pieces and retains the welcome H1. A four-chapter product area combines readable copy with a sticky visual stage only from 1024×720; smaller or reduced-motion views keep every chapter and demo in flow. Do not leave empty particle anchors or force every section to occupy one screen.
- **Historical layout, proposal A (superseded 2026-10-16):** container 1280px with 48/32/20px gutters, background Access Hover (#F7F9FD) from hero to footer, no panels, borders or separators between sections. Every section was at least one screen tall (`min-h-svh`) and centered its content; the previous report measured all nine at 900px in 1440×900. The hero had overlaid header, text in 7/12, particle cloud in 5/12 and a bottom strip. Product sections alternated text and white sheet, with decorative particle anchors. This is history, not a layout requirement.
- **Current verification:** pending the checks for the 2026-10-16 implementation. Previous breakpoint results belong to their historical proposal; do not transfer them to the new layout.

### Workspace
A sidebar shell: from 1024px a sticky 252px sidebar with the `full` logo, five navigation items and the months of the year with status dots; content centers up to 1400px with 32px gutters. Below 1024px the sidebar becomes a top bar with a month switcher, a bottom tab bar and a floating «Nuevo gasto» button; content uses 16px gutters (24px from 640px). Panels stack with an 18px gap; tables become stacked rows below 768px; wide tables and the calendar scroll inside their own panel.

## Elevation and depth

Depth comes from tone first: Ground under Panel under Sheet. Each element declares one elevation, a border or a shadow, never both.

### Shadow vocabulary
- **Floating app view** (`0 30px 60px -30px rgba(15,23,42,0.30)`): the hero isometric view and its cards.
- **Menu** (`0 16px 32px -16px rgba(15,23,42,0.35)`): the public mobile menu; workspace dropdowns keep `0 12px 32px -12px rgba(16,24,40,0.24)`.
- **Drawer** (`0 20px 48px -16px rgba(16,24,40,0.28)`): the right-hand sheet and confirmation dialogs, over a rgba(15,23,42,0.32) scrim.
- **Tooltip** (`0 8px 24px -12px rgba(16,24,40,0.3)`): chart tooltips.
- **Floating action** (`0 8px 16px -8px rgba(36,83,214,0.6)`): the mobile «Nuevo gasto» button.
- **Micro-lift** (`0 1px 2px rgba(16,24,40,0.08)`): primary buttons and the selected segment.

### Named Rules
**The Tone Rule.** Public panels separate by tone, without borders or resting shadows. Workspace cards separate by a 1px Edge on Ground. If something casts a shadow, it floats.

## Shapes

- **Public:** hero bottom corners 32px, panels 28px, sheets and demos 16px, access controls and fields 14px (`--radius`), pills 999px.
- **Workspace:** controls 8px (`--radius` inside `.finance-theme`), cards and the KPI strip 11.2px, segmented controls 7px inside a 9px track, pills, dots and bars fully round; the drawer is square-edged.
- Category dots 6px; month status dots 8px, planned months as a ring in Ink Quiet.

## Logo and brand assets

The identity is the official FinTrack OS symbol: a rounded square frame crossed by a rising arrow over three bars, in one flat dark navy (≈ #001024) on transparency. Its geometry, color and proportion (1030 × 934, ratio 1.103) are never altered. The wordmark «FinTrack OS» is real text in Geist Bold, not part of the image. The symbol is a raster: no vector source exists, so tracing it into an SVG is a pending decision for the Project Owner and would change the asset's source, not its design.

### Canonical source and inventory

| Asset | File | Use |
|---|---|---|
| Symbol (canonical) | `frontend/src/shared/brand/fintrack-os-symbol.png` | The official 1600 × 1600 PNG cropped to its content box (lossless; transparency kept). Imported statically by `BrandLogo`, so `next/image` serves each size from this one file. Every other asset derives from it. |
| Component | `frontend/src/shared/ui/brand-logo.tsx` | The only place the symbol and wordmark are drawn in the product. |
| Favicon | `frontend/src/app/favicon.ico` | 16, 32 and 48px on a Ground tile; replaces the default Next.js icon. |
| Browser icon | `frontend/src/app/icon.png` | 512px, rounded Ground tile (22% radius), symbol at 64%. |
| Apple icon | `frontend/src/app/apple-icon.png` | 180px, square (iOS masks it), Ground fill, symbol at 62%. |
| Share image | `frontend/src/app/opengraph-image.png` + `.alt.txt` | 1200 × 630: lockup, the hero headline «Bienvenido a la app de FinTrack OS» with its deep gradient on «FinTrack OS», the symbol on a Panel tile over the owner's gradient washes. No figures, no domain. Regenerated on 2026-10-15 when the landing replaced the home. |
| Share image source | `frontend/src/shared/brand/og-image.source.html` | Only to regenerate the share image (command in its header); never served. |

Icons sit on a Ground tile because the symbol is dark and would disappear on a dark browser tab. The share image is a static file, so a copy change in the hero requires regenerating it. `frontend/src/app/layout.tsx` adds `openGraph` and `twitter` (`summary_large_image`) metadata; the image URLs become absolute with `NEXT_PUBLIC_SITE_URL` (the final domain, documented in `frontend/.env.example`). Without it Next resolves them against localhost and warns at build time: set it at deploy time.

### Variants

| Variant | Content | Where |
|---|---|---|
| `full` | Symbol + «FinTrack OS» wordmark, 10px gap (`gap-2.5`) | Public navbar, authentication card header, workspace sidebar, workspace top bar on pages without a month switcher |
| `compact` (default) | Symbol only, `alt="FinTrack OS"` | Tight spaces and icon contexts; the default keeps the previous single-image behavior of `BrandLogo` |

Sizes (symbol height / wordmark): `sm` 28px / 16px, `md` 36px / 18px, `lg` 44px / 22px. For custom sizing, prefer `height`: when `width` is omitted it follows the official ratio. An explicit `width` does not recalculate the height and must match that ratio. Dimensions are always reserved (`width`, `height` and an inline size), so the logo never shifts layout; header logos use `priority`.

### Rules

- **Minimum size:** symbol 24px tall (the bars and the arrow shaft stay distinct); with the wordmark, 28px. Below 24px use the favicon tile instead (it is tuned for 16px).
- **Clear space:** at least 25% of the symbol height on every side. The `full` gap and the link's padding provide it; never crowd the logo against a border or another control.
- **Surfaces:** the dark symbol is for Ground, Panel, Panel Strong and Sheet (contrast ≥ 15:1 on all four). No dark panel exists in C. It is never placed over the gradient washes without a Ground or Sheet behind it, and never recolored, outlined, shadowed, rotated or filled with the gradient.
- **Link:** when it navigates, `href` renders a real link (public home → `/`, workspace → the dashboard) with at least 44px height and width, a 2px Blue (`--ring`) focus outline offset 2px, and no hover decoration. A logo beside an explicit «Volver al inicio» (authentication) is not a link.
- **Accessible name:** `full` marks the image decorative (`alt=""`) because the wordmark is visible text, so the link reads «FinTrack OS» once; `compact` names the image. Never add a second «FinTrack OS» label next to a `full` logo.
- **Taglines** («Control mensual inteligente», «Tu acceso mensual…») are separate text beside the logo, outside the link.
- **Mobile workspace:** on month pages the top bar holds the month switcher instead of the logo; the tab bar and the sidebar (from 1024px) carry navigation.

## Components

### Buttons
- **Access (public navigation CTA):** links such as «Crear mi cuenta», «Iniciar sesión» and «Volver a iniciar sesión» use the clear navigation family (`Button variant="access"`; `size="lg"` in content). Sheet fill, 1px Access Edge, 14px radius, 52px tall in content (44px in headers), 14px medium Ink label, 20px lucide icon at 1.7 stroke with no circle. Hover: Access Edge Hover border and Access Hover fill. Active: Access Active fill. Focus: 2px Blue outline offset 3px. Loading: the spinner replaces the leading icon, Panel fill, Ink Secondary text, `aria-busy`, same size. Disabled: Panel fill, Ink Secondary text, no pointer events, never opacity.
- **Primary authentication submit:** all principal actions in login, registration, email verification and password recovery use solid Blue with a white 14px label (`Button variant="default"`, `size="lg"`, full width). This includes requesting the initial recovery code, validating it and saving the new password. The Project Owner extended the login emphasis to every principal authentication submit on 2026-10-15. Hover uses Blue Hover; keyboard focus retains the shared outline. Loading and disabled states retain the shared button contract. Navigation links stay clear Access; OAuth, resend, cancel and back actions retain their secondary variants.
- **Public secondary:** `outline` (Sheet, 1px Edge, Ink, hover Hover Wash) for a second action in a form; `ghost` (Ink, hover Muted Fill) for a quiet action next to an Access button, such as «Entrar a mi cuenta» in the hero.
- **Text link (public secondary):** `TextLink` (`shared/ui/text-link.tsx`): Blue, medium, underline offset 4px on hover, 44px target below 1024px. Navigation is always a link, never a button that routes.
- **Primary (workspace action):** Blue fill, white label, micro-lift; hover Blue Hover. One per view.
- **Secondary:** Sheet with a 1px Edge and Ink label; hover Hover Wash.
- **Ghost:** no fill, Ink Secondary label or icon; hover Muted Fill and Ink.
- **Inline action:** `ftInlineActionClassName` for actions inside a sentence or hint («Ajustar a mano»): Blue, medium, underline on hover; a pseudo-element grows the target to 44px below 1024px without moving the text.
- **Danger:** Sheet with Negative Edge and Negative label; hover Negative Wash.
- **Sizes:** 40px from 1024px (36px small, 40px icon), 44px below 1024px.
- **States:** normal, hover, active (pressed), focus, disabled and loading on every variant. `loading` (on `Button` and `FtButton`) disables the control so a second click sends nothing, sets `aria-busy` and keeps the label as the accessible name; decorative icons are `aria-hidden`. A button that accepts `loading` keeps the same width and height at rest and while loading for unchanged content (`LoadableContent`): the spinner takes the leading icon's place, and a button without a leading icon reserves the spinner's space at rest. A progressive label goes in `loadingLabel` («Copiar mes anterior» → «Copiando…»): both labels share the same cell, so the button takes the wider one and never jumps; only the visible label is the accessible name. With `asChild`, `disabled` reaches a native `<button>` child; a link child is not blocked by `disabled` and must handle its own state.
- **Retired:** the gradient `brand-action` button (variant `brand`) and its `--brand-action-*` tokens no longer exist.

### Fields
- 44px public / 40px workspace from 1024px (44px below), Sheet fill, 16px value on phones and 14px desktop, 1px **Control Edge** boundary, radius 14px public and 8px workspace.
- **Hover:** Ink Tertiary border. **Focus:** Blue border plus a 3px Focus Halo; a transparent outline (`focus-field`) keeps focus visible in forced colors.
- **Prefix and suffix boxes** (money, percent, search): the inner input spans the whole box including its border, so the touch target is the full 44px; the box carries the state (`affixBoxClassName`, `affixInputClassName`).
- **Password visibility:** `PasswordToggle` (`shared/ui/password-toggle.tsx`), a 44×44 icon button flush with the field's right edge (the field keeps `pr-12`). No fill and no movement on hover or press: only the icon ink changes. Focus is an inset outline that follows the field's rounded corner.
- **Error:** Negative border, message in Negative under the field with an icon, announced (`role="alert"` or `aria-describedby`); never color alone. Public forms use `FieldError` (per field) and `FormAlert` (whole form) from `shared/ui/form-message.tsx`; the workspace uses `FieldError` from `finance/ui/fields.tsx`.
- **Disabled:** Hover Wash fill, Edge border, Ink Secondary text, never opacity. **Read-only** (calculated values such as Prestaciones): Hover Wash fill.
- **Money inputs:** muted «$» or «−$» prefix in Ink Secondary, tabular digits, whole pesos, rejected formats explained under the field.
- **Inline cells:** amounts in the Gastos table are transparent until hover (Edge) or focus (Sheet with halo); Enter moves to the next amount.
- **Segmented control:** Muted Fill track with 3px padding; the selected option is Sheet with a micro-lift and semibold label (`aria-pressed`), so selection does not rely on the lift alone. **Switch:** 40×24, Control Edge when off, Blue when on.

### Cards and containers
- **Public panel:** Panel or Panel Strong, 28px radius, 32px padding (22px phones), no border, no shadow; holds an approved eyebrow, an H2 and a white demo sheet.
- **Demo sheet:** Sheet, 16px radius, 20px padding; inner dividers in Edge Soft; always labeled «Datos de ejemplo» when it shows figures.
- **Workspace card:** Sheet on Ground, 1px Edge, 11.2px radius, header 16px (18px from 640px), no resting shadow. The KPI strip is one card divided by 1px Edge Soft gaps; Disponible carries the cushion meter in Positive Signal.

### Status badges and category pills
- **Payment badge:** 28px pill with a 6px dot and a word: Pagado (Positive), Pendiente (Sheet with Edge), Vencido (Negative). The badge is the toggle; its accessible name states the state and the action.
- **Pocket badge:** remaining amount and pace («Quedan 245k», «Excedido 30k», «Sin gastos»); pockets never show a paid toggle.
- **Category pill:** 24px pill with the category wash, ink text and a 6px fill dot. **Status pill:** 26px next to the month title with an icon.
- **Informative badge (public):** `Badge variant="accent"`: opaque Blue Wash fill and Blue Hover text (7.6:1) at 12px, so it holds AA over the gradient washes («Primera base visual», «Acceso seguro»). Never a translucent `bg-primary/10`.

### Navigation
- **Public navbar:** logo and wordmark, three links (Producto, Cómo funciona, Preguntas), «Crear cuenta» as a quiet ghost link and «Iniciar sesión» as an Access button, both keeping the session-aware behavior (a visitor with a session goes straight to the dashboard). On phones: logo plus a «Menú» disclosure (native `details`) with the same destinations and both accesses, 48px rows, Ground panel with the Menu shadow.
- **Workspace sidebar:** 40px items with an 18px icon and a 14px medium label in Ink Secondary; hover Panel Strong; current page Blue Wash with semibold Blue. Months listed with status dots (planned months as a Control Edge ring); the current month is a Sheet chip. The C sidebar surface is Panel; Ink Tertiary is not allowed on it.
- **Mobile workspace:** top bar with the month switcher (44px targets), bottom tab bar with short labels and the floating «Nuevo gasto» button.

### Dialogs and drawers
- **Drawer:** right-hand Sheet up to 460px, slides in 220ms and out 160ms with cubic-bezier(0.22, 1, 0.36, 1); scrim fades 200ms in and 150ms out. Changes save as they are made.
- **Confirmation dialog:** centered Sheet, 11.2px radius, Drawer shadow, the destructive action in Danger style.
- **Both:** focus moves inside on open, is trapped, returns to the trigger on close; Escape closes; the title names the task.

### Pocket tiles and calendar
Calendar chips use two lines: the concept takes the full cell width and the compact amount sits below, so names are not cut to a few letters. Upcoming-payment rows wrap the concept and detail instead of truncating them.

Pocket tiles keep their signature anatomy: name and pace pill, remaining amount as a metric, a 6px usage bar (Positive on track, Caution when fast, Negative when exceeded), used amount with the daily allowance, and a «Registrar gasto» affordance. Calendar day cells are at least 124px tall on desktop with category chips; paid chips struck through at 55% opacity, overdue chips with an inset Negative ring, today in a Blue circle, holidays «Festivo» in Negative, pocket spends as a dashed amber chip; phones collapse to numbered days with category dots.

## States

| State | Visual | Requirement |
|---|---|---|
| Focus | 2px Blue outline, 2–3px offset; fields add a 3px Focus Halo | Visible on every control, ≥ 3:1 against adjacent colors |
| Hover | Access Edge Hover + Access Hover (access), Blue Hover (primary), Hover Wash (secondary, rows) | Pointer only; never the only cue |
| Active | Access Active (access), deeper Blue (primary), selected segment Sheet + micro-lift | — |
| Loading | Progressive label and `aria-busy`; skeletons in Muted Fill | Keeps size; no layout jump |
| Error | Negative border and message with an icon | Text explains problem and recovery |
| Success | Positive word with dot or icon («Guardado», «Meta cumplida») | Never color alone |
| Disabled | Panel or Hover Wash fill with Ink Secondary text, no pointer events | Still readable; not announced as an action |

## Accessibility

- WCAG 2.2 AA: normal text ≥ 4.5:1, large text and control boundaries ≥ 3:1, measured on the real surface (see the contrast matrix). Ink Tertiary never sits on Panel or Panel Strong.
- 44px minimum touch targets below 1024px (project policy); visible focus on every interactive element; status always a word plus a dot, bar or icon.
- One `h1` per page, an `h2` per section, real lists and tables, a skip link, native `details` for FAQ and the mobile menu, dialogs with focus trap and return.
- Zoom to 200% and forced colors keep navigation and content usable; focus outlines use `outline`, not only `box-shadow`.
- The animated product stage is decorative (`aria-hidden`); chapter copy and HTML figures preserve the semantic information independently of motion. Data sheets carry «Datos de ejemplo» and charts have an equivalent textual/table representation. No essential content waits for an animation.

## Motion

- **Durations:** micro-interactions 150ms; shell enter 220ms and exit 170ms (`--motion-shell-*`); drawer 220/160ms; overlay 200/150ms; easing `cubic-bezier(0.22, 1, 0.36, 1)` (`--ease-shell`).
- **Current landing (2026-10-16):** native Web Animations API, paused animations positioned from scroll, no new animation library. The hero's frontal product pieces move without particles. Four story layers crossfade near chapter midpoints with restrained, sequential item movement; figures do not count through false intermediate values. Desktop sticky enhancement requires at least 1024×720 and motion allowed. Mobile/tablet and low-height viewports keep normal flow with small optional item movement.
- **Determinism and lifecycle:** cache chapter geometry on resize/fonts/layout changes; derive progress from position rather than elapsed time or accumulated events. Scroll up, reload mid-page and restored navigation must produce the corresponding frame. Use passive listeners, schedule work only when dirty, pause when hidden and cancel animations/observers/listeners on cleanup.
- **Hero ambient orbit (2026-10-16):** six desktop cards (four on phones) float around the stable central sheet on short elliptical WAAPI loops, 24×14px desktop / 6×4px phones, with a ±2.4° tilt and varied 11–16s periods. Ambient `transform` is independent of the scroll-driven individual `translate` and the CSS base `rotate`; it is the intentional time-based exception to scroll determinism. Pause automatically offscreen or when the tab is hidden, disable under reduced motion (including preference changes), and cancel on unmount. A 44px «Pausar animación» / «Reanudar animación» control appears only when the enhancement is available; `aria-pressed` means manual pause. Without JavaScript or with reduced motion the cards remain static and no dead control appears.
- **Current fallback:** without JavaScript, WAAPI support or with reduced motion, every chapter and demo remains complete and static. No WebGL, particle or canvas fallback. Integrated visual, accessibility and performance checks remain pending for this implementation.

### Historical particle implementation — superseded 2026-10-16

The following records the previous proposal and its implementation details only. It must not reactivate dependencies, particle assets or GPU-specific acceptance gates in the current landing.

- **Landing particle engine (owner decision, 2026-10-15):** one `THREE.Points` cloud (`three` 0.186.1) on a fixed canvas behind the content (`modules/home/particles/`). Each decorative space is an anchor (`data-formation-anchor`: cloud, sheet, pockets, stairs, columns, mark — the formations of proposal A, same seeded geometry). The cloud mixes the formation of the anchor above and below the viewport center (`resolveScrollBlend`), each particle with its own staggered smoothstep, flying between both spaces and fading while it travels. Everything that moves is a pure function of scroll position: scrolling up reverses it and a reload mid-page lands on the same frame; only a 1–2px organic tremor uses the clock. DPR fixed once (`min(dpr, 2, √(4.2e6 / area))`), 5,200 particles (3,600 with ≤ 4 cores, 2,600 on phones), render paused with the tab hidden, all GPU resources released on unmount. Three.js loads with a dynamic import after the page paints; the LCP is text. No postprocessing, GSAP or Lenis: native scroll is kept.
- **Fallback:** the same formations drawn once in 2D canvas (`ParticleFormation`) stay visible until the WebGL cloud has painted four frames, and come back without WebGL, with reduced motion or if the context is lost. Without JavaScript the spaces stay empty; content never depends on them.
- **Reduced motion:** the global `prefers-reduced-motion` rule collapses animations and transitions, and the landing does not start (or stops) the particle engine, leaving the static 2D formations; content and navigation stay complete without motion or JavaScript.

## Token map

Documented token → CSS variable in `globals.css` → Tailwind utility.

| Token | Primitive | Public alias | Workspace alias | Utility |
|---|---|---|---|---|
| Ground | `--ground` | `--background` | `--ft-canvas` | `bg-background`, `bg-ft-canvas` |
| Panel | `--panel` | `--secondary`, `--muted`, `--accent`, `--sidebar` | `--ft-panel` | `bg-panel`, `bg-secondary`, `bg-ft-panel` |
| Panel Strong | `--panel-strong` | — | `--ft-panel-strong` | `bg-panel-strong`, `bg-ft-panel-strong` |
| Sheet | `--sheet` | `--card`, `--popover` | `--ft-card` | `bg-card`, `bg-ft-card` |
| Edge | `--edge` | `--border`, `--sidebar-border` | `--ft-line` | `border-border`, `border-edge`, `border-ft-line` |
| Edge Soft | `--edge-soft` | — | `--ft-line-soft` | `border-ft-line-soft` |
| Control Edge | `--control-edge` | `--input` | `--ft-control` | `border-input`, `border-ft-control` |
| Ink | `--ink` | `--foreground`, `--*-foreground` | `--ft-ink` | `text-foreground`, `text-ft-ink` |
| Ink Secondary | `--ink-secondary` | `--muted-foreground` | `--ft-ink-2` | `text-muted-foreground`, `text-ink-secondary`, `text-ft-ink-2` |
| Ink Tertiary | `--ink-tertiary` | — | `--ft-ink-3` | `text-ink-tertiary`, `text-ft-ink-3` |
| Ink Quiet | `--ink-quiet` | — | `--ft-ink-4` | `text-ft-ink-4` |
| Blue / Hover / Wash | `--blue`, `--blue-hover`, `--blue-wash` | `--primary`, `--ring`, `--sidebar-primary` | `--ft-primary`, `--ft-primary-hover`, `--ft-primary-soft`, `--ft-focus` | `bg-primary`, `ring-ring`, `bg-ft-primary`, `outline-ft-focus` |
| Focus Halo | `--focus-halo` | `::selection` | `--ft-focus-soft` | `ring-ft-focus-soft` |
| Positive / Negative / Caution | `--positive*`, `--negative*`, `--caution*` | `--destructive` = Negative | `--ft-pos*`, `--ft-neg*`, `--ft-warn*` | `text-destructive`, `text-ft-pos`, `bg-ft-neg-soft`… |
| Access family | `--access-edge`, `--access-edge-hover`, `--access-hover`, `--access-active` | — | — | `border-access-edge`, `bg-access-hover`… |
| Brand gradient | `--brand-blue`, `--brand-violet`, `--brand-pink`, `--brand-coral` (+ `-deep`) | `text-brand-gradient` (deep), `text-brand-gradient-light`, `bg-app-gradient`, `bg-auth-soft` | not allowed | `bg-brand-blue`… |
| Radii | `--radius` (14px public, 8px workspace), `--radius-sheet` 16px, `--radius-panel` 28px | — | `.finance-theme` sets `--radius: 0.5rem` | `rounded-lg`, `rounded-sheet`, `rounded-panel` |
| Categories | — | — | `--cat-*` (workspace only) | `bg-cat-*`, `text-cat-*` |

`--brand-action-*` and `--chart-1…5` were removed in task 5; the home sample tiles use Blue (income), Negative (expenses), Positive (savings) and Caution (debt payments). The `.dark` block has no consumer.

**Focus utilities** (`globals.css`): `focus-ring` (2px `--ring` outline, offset `--focus-offset`, 2px by default; Access sets 3px), `focus-ring-inset` (rows and cells that fill their container) and `focus-field` (transparent outline for fields, visible only in forced colors). Never combine `outline-none` with `focus-visible:outline-*`: in Tailwind v4 `outline-none` leaves `outline-style: none` and the focus disappears.

## Do's and Don'ts

### Do:
- **Do** build authentication pages on Ground with Panel surfaces and white sheets; keep the current landing's gray ground, white product folios and gray footer. Clouds belong only to the hero.
- **Do** use Ink Secondary for any text on a panel; keep Ink Tertiary for Sheet and Ground.
- **Do** use clear Access controls for secondary navigation. The approved hero and lower landing primary registration CTAs use Blue pills; authentication primary submissions also use Blue.
- **Do** keep the gradient to the hero mesh, thin rules and one headline phrase: deep stops for large text anywhere, light stops only at 42px or more on the hero veil.
- **Do** pair every status color with a word and a dot, bar or icon, and set every amount in tabular numerals.
- **Do** keep 44px touch targets below 1024px and a visible Blue focus outline everywhere.
- **Do** draw the logo only through `BrandLogo`, with the `full` variant in navigation and the official proportions.

### Don't:
- **Don't** add dark panels, a dark footer or dominant white backgrounds.
- **Don't** add particles, canvas scenes or WebGL to the current landing or workspace. Do not install postprocessing, GSAP, Lenis or another animation library by copying a historical prompt.
- **Don't** fill panels, buttons with dark text or amounts with the gradient; don't set gradient text under 24px, or light-stop gradient text under 42px or on Ground.
- **Don't** add resting shadows, gradients, glass or glow to workspace cards, or bring back hero metrics and quick-action tiles in the workspace.
- **Don't** color amounts, headings or panel backgrounds with category hues, or let color carry a status alone.
- **Don't** invent metrics, testimonials, logos, ratings or prices; synthetic figures always say «Datos de ejemplo».
- **Don't** recolor, redraw, crop or place the logo on the gradient washes, and don't ship a second copy of the symbol or a remote logo host: the canonical file is `frontend/src/shared/brand/fintrack-os-symbol.png`.
