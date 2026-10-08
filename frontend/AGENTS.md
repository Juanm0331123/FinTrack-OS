# Frontend — Agent Instructions

Especializa el `AGENTS.md` raíz para `frontend/` sin contradecirlo.

## Alcance

- Stack: Next.js 16 (App Router) + React 19 + TypeScript estricto + Tailwind CSS v4 + componentes shadcn (Radix) en `src/shared/ui` + iconos `lucide-react`.
- Organización por feature: `src/app` solo declara rutas, layouts y metadata e importa páginas de `src/modules/<feature>`; la lógica de cada feature vive en su módulo; lo transversal va en `src/shared` (`ui`, `lib`, `config`).
- El frontend consume solo la API pública del backend (`NEXT_PUBLIC_BACKEND_URL`). Su validación es orientativa: el backend decide autorización y validez de los datos.
- La app post-login replica el libro de Excel mensual. Las fórmulas viven como funciones puras en `src/modules/finance/domain/` sin dependencias de React, y se prueban con `pnpm test` contra los valores del Excel de referencia.
- Las ediciones de la hoja del mes son optimistas: la UI recalcula al instante y persiste en segundo plano con escrituras agrupadas, sin bloquear la edición.

## Dirección de producto

- `PRODUCT.md` (usuarios, principios) y `DESIGN.md` (sistema visual) viven en la raíz del repositorio y gobiernan toda decisión visual.
- La superficie post-login es una herramienta operativa: claridad de números, estados explícitos (pagado, pendiente, vencido, meta cumplida) y flujos rápidos y repetibles por encima de la decoración.
- El motion comunica estado o jerarquía, respeta `prefers-reduced-motion` y nunca bloquea la edición.
- Accesibilidad WCAG AA: foco visible, controles usables con teclado, estados que no dependen solo del color y objetivos táctiles de al menos 44px en móvil.

## Skills

Instaladas en `frontend/.agents/skills/`, con espejo en `frontend/.claude/skills/`.

| Skill | Rol en FinTrack OS | Límites y adaptaciones |
|---|---|---|
| `impeccable` | Dirección y craft visual: shape, critique, audit, polish, bolder/quieter, harden, clarify y animate. Fija la barra de calidad final de la interfaz. | Su setup ejecuta `scripts/impeccable context` (en Windows sin `sh`, `impeccable.cmd`), que puede descargar un binario en `~/.impeccable`. Lee `PRODUCT.md` y `DESIGN.md` de la raíz del repositorio. `impeccable hooks on` requiere autorización del Project Owner porque escribe configuración de agentes y `.impeccable/`. |
| `ui-ux-pro-max` | Referencia consultable de UX: accesibilidad, interacción, layout, tipografía, color, design systems y charts. | El script está en `frontend/.agents/skills/ui-ux-pro-max/scripts/search.py` (la ruta `${CLAUDE_PLUGIN_ROOT}` del `SKILL.md` no aplica) y requiere Python. `--persist` siempre usa `--output-dir frontend`, nunca la raíz del repositorio; `--force` exige autorización. Sus presets GSAP no implican adoptar GSAP. |
| `vercel-react-best-practices` | Ingeniería React y Next.js: waterfalls, bundle, re-renders, rendering, efectos y eficiencia de runtime. | Aplica completa porque el proyecto usa Next.js App Router. Las vistas financieras son Client Components porque dependen de la sesión del navegador; las reglas `server-*` aplican a rutas, layouts y metadata. |
| `web-animation-framer-motion` | Implementación de motion con Motion (`motion/react`): presencia, variants, layout, scroll, gestos y reduced motion. | Motion no está adoptado: por defecto se usan transiciones CSS. Incorporarlo es una decisión de dependencia que se justifica con el criterio "When Motion earns its place" de la propia skill. |

Solapamientos y resolución:

- **Dirección visual:** `impeccable` decide dirección, craft y calidad; `ui-ux-pro-max` aporta guías verificables. Si sus propuestas estéticas difieren, prevalecen `PRODUCT.md`, `DESIGN.md` y el criterio de `impeccable`. Los mínimos de accesibilidad de cualquiera de las dos no son negociables.
- **Motion:** `impeccable` (`animate`) decide qué se anima y por qué; `web-animation-framer-motion` decide cómo se implementa.
- **Rendimiento:** en código React prevalece `vercel-react-best-practices`; `impeccable optimize` y `ui-ux-pro-max` cubren el rendimiento percibido de la UI.

Carga contextual:

- tarea visual o de UX: `impeccable` + `ui-ux-pro-max`, y además `web-animation-framer-motion` si hay motion;
- implementación, refactor o rendimiento React: `vercel-react-best-practices`;
- decisión de diseño que el Project Owner quiere poner a prueba: `grill-me`.

Las skills del backend no se usan en este boundary.
