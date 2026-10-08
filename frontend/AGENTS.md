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
| `playwright-best-practices` ([fuente](https://github.com/currents-dev/playwright-best-practices-skill/tree/main/playwright-best-practices)) | QA de React y Next.js: recorridos E2E, persistencia, formularios, accesibilidad, responsive, regresión visual y errores de navegador/red. | Leer `frameworks/nextjs.md`; de `frameworks/react.md`, aplicar estado visible, formularios y portales. Next.js App Router prevalece sobre ejemplos Vite/CRA o React Router; la autenticación usa la API del proyecto, no NextAuth. Vitest conserva los tests unitarios. `@playwright/test` no está adoptado: usar la automatización de navegador disponible o acordar explícitamente su incorporación. Los ejemplos no autorizan instalar paquetes, ejecutar inicializadores, adoptar Currents/axe/Lighthouse ni versionar `.env` o estados de sesión. |
| `web-animation-framer-motion` | Implementación de motion con Motion (`motion/react`): presencia, variants, layout, scroll, gestos y reduced motion. | Motion no está adoptado: por defecto se usan transiciones CSS. Incorporarlo es una decisión de dependencia que se justifica con el criterio "When Motion earns its place" de la propia skill. |

Solapamientos y resolución:

- **Dirección visual:** `impeccable` decide dirección, craft y calidad; `ui-ux-pro-max` aporta guías verificables. Si sus propuestas estéticas difieren, prevalecen `PRODUCT.md`, `DESIGN.md` y el criterio de `impeccable`. Los mínimos de accesibilidad de cualquiera de las dos no son negociables.
- **Motion:** `impeccable` (`animate`) decide qué se anima y por qué; `web-animation-framer-motion` decide cómo se implementa.
- **Rendimiento:** en código React prevalece `vercel-react-best-practices`; `impeccable optimize` y `ui-ux-pro-max` cubren el rendimiento percibido de la UI.
- **QA:** `playwright-best-practices` guía escenarios, aislamiento y evidencia en navegador; `impeccable` y `ui-ux-pro-max` conservan el criterio visual y de UX. La paridad financiera se demuestra con Vitest y valores del Excel, además del recorrido de usuario.
- **TDD:** `tdd`, instalada en la raíz del proyecto, guía el ciclo de desarrollo por comportamiento; Vitest prueba funciones puras y `playwright-best-practices` guía los recorridos de navegador. Aplicar las adaptaciones del `AGENTS.md` raíz.

Carga contextual:

- tarea visual o de UX: `impeccable` + `ui-ux-pro-max`, y además `web-animation-framer-motion` si hay motion;
- implementación, refactor o rendimiento React: `vercel-react-best-practices`;
- TDD, nueva lógica verificable o regresión de un bug: `tdd` desde `.agents/skills/tdd/` de la raíz, usando Vitest para el dominio;
- QA frontend, E2E, regresión o preparación para desplegar: `playwright-best-practices`, cargando solo sus referencias pertinentes; para hallazgos de UX, las guías visuales anteriores;
- decisión de diseño que el Project Owner quiere poner a prueba: `grill-me`.

Las skills del backend no se usan en este boundary.

## QA frontend antes del despliegue

Aplicar esta lista cuando se solicite QA completo o preparación para desplegar; en cambios rutinarios, validar en proporción al alcance como indica el `AGENTS.md` raíz.

1. Ejecutar `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm build`. Después usar `pnpm start` y verificar en navegador la compilación de producción conectada al backend de prueba. Registrar herramientas o entornos faltantes como bloqueos; no afirmar que se ejecutó Playwright si se usó otra automatización.
2. Recorrer autenticación según las páginas y contratos implementados: registro, login, recuperación de contraseña, callback OAuth, cierre y expiración de sesión; comprobar validación, errores y protección de rutas. Servicios externos se sustituyen en pruebas controladas; un flujo externo sin comprobar se reporta como pendiente.
3. Recorrer hoja del mes, resumen anual, deudas, calendario y configuración. Verificar ingresos/gastos por cuenta y categoría, estados de pago, colchón, navegación entre meses y copia de hoja cuando aplique. Comparar totales y avalancha con fixtures del Excel, incluidos ceros, límites y redondeo.
4. Editar rápidamente varios campos y comprobar recálculo inmediato, escrituras agrupadas y persistencia tras recarga. Probar navegación con guardados pendientes, respuestas fuera de orden y fallos/reintentos de red: detectar pérdidas, duplicados o confirmaciones falsas. La desconexión prueba manejo de errores; no presupone soporte offline.
5. Revisar anchos de 375, 768 y 1440px: números legibles, contenido accesible y scroll intencional. Verificar teclado, foco visible y su retorno al cerrar dialogs/drawers, nombres accesibles, contraste AA, estados distinguibles sin color, objetivos táctiles de 44px y `prefers-reduced-motion`.
6. Comprobar textos y formatos `es-CO`, montos y fechas con zona `America/Bogota`, incluidos cambios de día, mes y año. Vigilar excepciones de JavaScript, errores de hidratación y solicitudes HTTP fallidas durante los recorridos; distinguir los fallos provocados de los inesperados.
7. Comparar capturas con `DESIGN.md` y con baselines revisadas cuando existan. Sin baseline, documentar la inspección visual y la cobertura faltante; una captura nueva no demuestra ausencia de regresión. Usar locators por rol/nombre o label y esperas por estados observables; reintentos no ocultan un fallo reproducible.

Entregar el reporte con estados, evidencia y reproducción definidos en el `AGENTS.md` raíz. Las capturas, trazas y logs deben excluir credenciales, tokens y datos personales reales.
