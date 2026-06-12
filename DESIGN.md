# Design

## Product

FinTrack OS is a product UI for personal finance tracking. The visual system serves dashboards, onboarding, finance forms, charts, and monthly summaries.

## Visual Direction

The mood is a bright studio desk with a modern finance dashboard open: clean white-gray surfaces, sharp financial data, and controlled flashes of color where the user needs momentum. The default theme is light. The system is restrained for task screens, with committed brand moments for onboarding, empty states, and welcome copy.

## Color System

Use OKLCH tokens only. The app background is a cool white-gray, cards are white, and text is a deep blue-black. Primary actions use a confident blue. The brand gradient combines blue, rose, violet, and mint for names and selected hero moments.

- Background: `oklch(0.982 0.006 255)`
- Foreground: `oklch(0.19 0.025 255)`
- Surface/Card: `oklch(1 0 0)`
- Muted: `oklch(0.94 0.012 255)`
- Border: `oklch(0.88 0.018 255)`
- Primary: `oklch(0.58 0.19 252)`
- Brand rose: `oklch(0.65 0.22 354.5)`
- Accent mint: `oklch(0.72 0.18 168)`
- Accent violet: `oklch(0.67 0.17 305)`
- Destructive: `oklch(0.62 0.22 25)`

## Typography

Use Geist Sans for all UI and Geist Mono for numbers, deltas, and compact financial metadata. Keep headings strong but not oversized. Use tabular numerals for balances, percentages, and chart labels.

## Components

Use shadcn/ui New York components as the base vocabulary. Buttons, inputs, cards, tabs, progress bars, badges, tooltips, selects, checkboxes, and skeletons must inherit semantic tokens. All interactive components need visible hover, focus, active, disabled, and loading states.

## Charts

Use chart colors semantically: savings and positive progress use mint; expenses use blue; debt or risk uses coral; categories can use violet, amber, and cyan. Charts must include labels or legends and never rely on color alone.

## Motion & Accessibility

Motion should explain state changes in 150-250ms. Respect reduced motion. All text and controls must meet WCAG AA, avoid horizontal scrolling on mobile, and keep touch targets at least 44px high.
