# Product

## Register

product

## Users

FinTrack OS is for young adults and adults who want a professional, guided way to understand their personal finances without feeling like they are using a traditional banking portal. They need to register income, expenses, debt payments, savings goals, and monthly progress with enough clarity to make better decisions.

## Product Purpose

The product helps users build a monthly financial picture: what came in, what went out, what remains available, how debt payments are progressing, and how savings recommendations compare with their real behavior. Success means users can return monthly, understand their numbers quickly, and feel guided toward better financial habits.

## Brand Personality

Confident, clear, and alive. The interface should feel professional and trustworthy, but not cold or old-fashioned. Brand moments can use vivid gradients and energetic chart colors, while task surfaces stay clean, readable, and calm.

## Brand Commitments

- The post-login app follows the category standard for modern personal-finance dashboards (sidebar, white cards, one blue primary, editable tables), executed at the craft level of Monarch Money, YNAB and Copilot Money. The user chose it on 2026-10-07 over a banknote-inspired and a ledger-inspired direction.
- The app mirrors the user's monthly spreadsheet workflow: one sheet per month (incomes, expense rows by account and category, minimum cushion), an annual summary, an avalanche debt plan and a configuration sheet. Its shared formulas and the owner-approved financial contract below are the functional specification.

## Financial Contract

Confirmed by the Project Owner on 2026-10-10 after inspecting the original workbook. The shared monthly, summary and avalanche formulas remain the reference; these explicit rules govern the app where the workbook differs.

- **Monthly debt cap:** an empty value (`null` in the API) means no cap. An explicit `0` assigns no extra payment. A cap below the personal minimum preserves that minimum, bounded by the personal payable balance, as the base payment and displays the incompatibility. A recommendation never exceeds that payable balance. Any additional minimum not already included in current payments is reserved before distributing the extra pool; if it consumes the cushion, the plan shows the actual remaining amount and warns about the shortfall.
- **Monetary precision:** money and monetary intermediate results use two decimal places, with halves rounded away from zero, consistently in frontend calculations and API persistence. The original workbook does not explicitly round monetary formulas to cents; this normalization is an approved app rule. Rate precision remains separate: monthly interest/insurance use six decimal places, the benefits rate four and the shared percentage two.
- **Entry and display:** the current UI captures and displays Colombian pesos as whole pesos; calculations and persisted amounts can still contain cents. Whole-peso formatting does not change the stored precision.
- **Debt minimums:** the user enters the current statement's minimum payment and updates it when it changes. The app does not derive a fixed-principal installment or a payment from an amortization term. The personal minimum defaults to the total minimum minus the partner's monthly contribution, with an explicit manual override for other agreements, including the workbook's half-minimum row.

The financial reference and portable synthetic fixtures are documented in `docs/qa-excel-paridad.md`. No private values from the original workbook belong in fixtures or product documentation. Any future change to these rules requires an explicit product decision and regression coverage through the financial domain's public interfaces.

## Anti-references

Avoid legacy bank dashboards, beige finance templates, crypto-trader aesthetics, gamified money apps, and dark-only "terminal" fintech interfaces. Do not let decorative gradients, oversized metrics, or flashy cards compete with financial clarity.

## Design Principles

- Make the next financial action obvious.
- Treat numbers as content, not decoration.
- Use vivid color to explain progress, status, and emphasis.
- Keep everyday workflows quiet, fast, and repeatable.
- Guide without talking down to the user.

## Accessibility & Inclusion

Target WCAG AA. Maintain readable contrast, visible focus states, keyboard-accessible controls, non-color-only status indicators, reduced-motion support, and clear form labels/errors for finance-critical actions.
