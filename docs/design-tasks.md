# FinTrack OS — Tareas de diseño

## Estado vigente del cierre — 2026-10-17

**Cuatro secciones independientes y `ProductMotion` implementados; QA local final aprobado.** El Owner aprobó las nuevas secciones: «AHORA SI ME ENCANTO LOS SECTIONS QUE LINDOOOO!!!». El hero SkyElite aprobado permanece intacto, con nubes exclusivamente en el hero.

El corte anterior de showroom y QA local queda **sustituido para producto**. Su evidencia de autenticación, finanzas y Deudas se conserva con el alcance y SHA originales; los resultados actuales se registran por separado.

No se usa un porcentaje global para confundir implementación, revisión visual, legales y despliegue. Los porcentajes que aparecen al desplegar el historial corresponden a sus cortes antiguos y no describen este estado.

| # | Tarea | Estado vigente | Cierre y pendientes |
|---|---|---|---|
| 1 | Cerrar el contenido de la landing | Copy aprobado; cierre legal bloqueado | Textos y procedimiento consolidados, no publicados. L-01…L-04 siguen abiertos; no habilitar enlaces/políticas incompletos. |
| 2 | Aprobar la dirección visual | Hero y nuevas secciones aprobados | Aprobación nueva del Owner registrada; el showroom anterior queda sustituido. |
| 3 | Definir el sistema visual de toda la app | Implementada y validada en su alcance | Tokens y reglas documentados; se conserva la escala funcional del workspace y las excepciones del hero. |
| 4 | Finalizar e integrar el logo | Implementada y validada en su alcance | Marca oficial local, variantes, usos y assets; los pendientes de dominio/compartir conservan su tratamiento antes de desplegar. |
| 5 | Unificar los componentes | Implementada y validada en su alcance | Controles coherentes, estados y foco; envíos principales de autenticación azules. |
| 6 | Aplicar el diseño al producto | Implementada y validada localmente | Auth y finanzas conservan sus regresiones. Deudas incluye búsqueda/ordenación con 11 pruebas puras y cuatro escenarios de navegador. |
| 7 | Construir la landing completa y responsive | Implementada y aprobada por el Owner | Cuatro secciones independientes: hoja mensual ancha, bolsillos como carpeta/recibos distribuidos, colchón como ecuación abierta y gráfica panorámica sin marco. Hero intacto. |
| 8 | Añadir la experiencia de movimiento | Implementada y confirmada localmente | `ProductMotion` sustituye `StoryMotion` y sus tres archivos antiguos. Siete anchos, reversibilidad, recarga, reduced motion y sin JS aprobados; nubes solo en hero. |
| 9 | Hacer QA del diseño y regresiones | QA local final aprobado | Lint, typecheck, build, 246/246 pruebas y 4/4 regresiones visuales integradas aprobados. Confirmación final de navegador exit 0. |
| 10 | Revisión final y versionamiento | Autorizado y en curso | Código nuevo en `4dcafee`, pendiente de push/CI/main. CI anterior `39000831658` aprobada para `5b711f5`; consultar Actions por cada SHA enviado e integrado. |

### Composición vigente y evidencia del corte anterior

- **Producto implementado:** una hoja mensual ancha como única gran tarjeta; bolsillos con carpeta y recibos distribuidos; colchón/deudas mediante ecuación abierta; resumen como gráfica panorámica sin marco. Cada sección tiene espacio y movimiento propios, sin reutilizar el mismo panel con datos diferentes.
- `ProductMotion` ya sustituye el control compartido de producto. Lint, typecheck y build aprobados; **246/246 pruebas en 25 archivos**. La diferencia frente a 252 corresponde a seis pruebas retiradas con el motor sustituido, no a seis pruebas omitidas.
- **4/4 regresiones visuales integradas aprobadas.** Se corrigió un primer recorte móvil de 24px en reserva ajustando su ancho al 2%. Confirmación final exit 0: siete anchos 320–1440 sin cajas fuera de pantalla, overflow horizontal, imágenes rotas ni nubes bajo el hero; reverse/reload correctos, reduced motion con cero animaciones, sin JS cuatro secciones y cero ocultas, sin excepciones.

- Corte anterior: frontend **252/252 pruebas**, lint, typecheck y build aislado aprobados; conservar su alcance original.
- Landing del corte sustituido: siete anchos, reversibilidad, recarga a mitad, movimiento reducido y contenido sin JavaScript comprobados. Repetir las comprobaciones pertinentes sobre las nuevas secciones antes de declarar su cierre. La escala inferior mantiene H2 hasta 40px desktop y 28px móvil.
- Hero SkyElite aprobado: H1 96/72/60/48px según ancho, texto y degradado intactos; nubes y escena SVG/CSS exclusivamente en el hero. Las superficies inferiores no reciben esas nubes.
- Deudas: once regresiones puras y cuatro de navegador, sin cambiar las prioridades, pagos o totales del plan al ordenar/filtrar.
- El selector de teclado de la FAQ elegía el `summary` del menú. Se corrigió el selector del arnés; no era un defecto de la FAQ de la app.
- Los cortes de backend, Docker y del recorrido integrado, sus comandos y límites se consultan en [el informe de cierre](qa-design-release.md). No presentar comprobaciones anteriores como nuevas ni el smoke Linux como la integración Windows omitida.
- Safari/Firefox, dispositivos físicos, lectores de pantalla, Lighthouse, staging, proveedores reales y configuración operativa de Neon mantienen los límites del informe.
- **Nuevas secciones aprobadas visualmente por el Owner. No se desplegó.**

### Versionamiento autorizado activo

El corte anterior subido de `feat/design-qa-release` tiene siete commits hasta `5b711f5`, con CI `39000831658` en success. El código nuevo ya está en `4dcafee`; siguen push, CI de rama, integración y CI de main conforme a `AGENTS.md`. Consultar Actions por cada SHA nuevo; el último main registrado es `91d42bd`. QA local y aprobación visual del Owner ya están confirmados. No se usan amend, force push ni atribuciones a agentes.

La autorización para versionar permanece activa. El proceso no despliega ni publica los borradores legales L-01…L-04.

### Fuentes actuales

- [QA de cierre](qa-design-release.md), [handoff general](../HANDOFF.md) y [continuidad de agentes](claude-design-handoff.md).
- [Sistema visual](../DESIGN.md), [copy aprobado](landing-content.md), [borrador legal](landing-contenido-legal.md) y [procedimiento de datos](procedimiento-datos-personales.md).
- [Mega prompt original íntegro](landing-mega-prompt-original.md), [captura del degradado](references/fintrack-os-gradient-reference.png) y [captura de controles](references/fintrack-os-button-reference.png), conservados sin reactivar instrucciones visuales o motores sustituidos.

## Historial de decisiones y verificaciones

<details>
<summary>Consultar registros anteriores: estados y porcentajes históricos, no instrucciones activas</summary>

> Todo lo que sigue documenta cortes anteriores. Las menciones a tareas pendientes, esperas, porcentajes y autorizaciones de esos cortes están sustituidas por la tabla y el estado vigente de arriba. No reabren trabajo terminado ni revocan el versionamiento autorizado.

## Historial — Ajuste de las secciones inferiores solicitado por el Owner — 2026-10-16

El Owner considera que las secciones posteriores al hero no alcanzan su nivel visual. Se reabre su composición: producto más protagonista, mejor ritmo editorial, pasos, acceso, FAQ y footer más cuidados. **Las nubes permanecen exclusivamente en el hero.** El hero aprobado no cambia. Las mejoras de Deudas y los textos legales se conservan.

El corte de QA descrito debajo corresponde a la versión anterior de las secciones inferiores. Sigue siendo evidencia de autenticación, finanzas y Deudas, pero las secciones rehechas requieren su propia confirmación visual, responsive y de regresiones antes de completar el versionamiento. Dos unidades independientes ya están comprometidas en `feat/design-qa-release`: higiene local y protección de errores; todavía no se han subido ni integrado.

## Historial — Corte previo: QA local terminado y versionamiento autorizado — 2026-10-16

El Owner encargó terminar Deudas, los legales y el QA, y versionar. **Deudas está implementado; el QA técnico local de ese corte está aprobado.** El detalle verificable está en [qa-design-release.md](qa-design-release.md): 252 pruebas frontend, 117 backend, 43 escenarios integrados, migraciones, integración aislada y smoke Docker. El ajuste posterior de las secciones inferiores se registra arriba.

**Legales: texto y procedimiento consolidados, publicación bloqueada.** El Owner confirmó nombre/Cali/correo, no dispone de dirección/teléfono y aprobó 18+, ausencia de anuncios/analítica opcional, consentimientos separados y solicitudes por correo. L-01…L-04 siguen sin resolverse por completo: no se ocultan ni se convierten en una aprobación de producción. Ver [borrador](landing-contenido-legal.md) y [procedimiento](procedimiento-datos-personales.md).

Se cierra la tarea 9 en su alcance de QA local; la tarea 1 conserva el bloqueo legal y la 10 el proceso de versionamiento/CI hasta verificar main. **Avance histórico previo a CI: 8/10 (80%).** Versionar estos cambios no despliega ni habilita los textos legales pendientes.

## Historial — Corte previo: landing aprobada por el Owner — 2026-10-16

El Owner confirmó: «Listo landing lista». En ese corte se cerraron las tareas 7 (landing) y 8 (movimiento) en su revisión visual, incluido el hero de la referencia SkyElite documentado debajo. La revisión posterior de las secciones inferiores prevalece sobre ese cierre. **El 70% era un avance del checklist de ese momento, no un porcentaje de preparación para producción.**

La secuencia prevista era **buscar y ordenar Deudas**, después el QA integral de diseño y regresiones (tarea 9) y la revisión final/versionamiento con CI (tarea 10). Los borradores legales de la tarea 1 siguen pendientes antes del despliegue. Posteriormente el Owner autorizó el versionamiento completo y solicitó el ajuste visual de las secciones inferiores; ese encargo continúa activo.

## Historial — Hero nuevo con la estructura de la referencia SkyElite, implementado por Claude — 2026-10-16

El Project Owner rechaza el hero de la dirección «producto en movimiento» («Qué hero de mierda tenemos») y pide hacerlo **tal cual** como la referencia SkyElite de motionsites.ai, cambiando solo producto/servicio y colores, **sin tocar las demás secciones**. Después pide sustituir el video del avión («no tiene nada que ver con FinTrack») por una animación propia de esa calidad, y que «Bienvenido a la app de» no vaya en gris. **Implementado, sin commits; pendiente de la revisión del Owner.**

- **Estructura de la referencia:** hero de alto de pantalla (`h-svh`, mínimo 600px), barra con marca a la izquierda y destinos a la derecha desde 768px (Producto, Cómo funciona, Preguntas, Iniciar sesión), menú hamburguesa ↔ X con desplegable blanco translúcido en teléfonos, rótulo en mayúsculas, titular de dos líneas superpuestas (−12px desde 640px) a 48/60/72/96px y peso normal, subtítulo y dos accesos en píldora: «Ver cómo funciona» (gris) y «Crear mi cuenta» (azul de acción, con el comportamiento de sesión existente).
- **Nuestro contenido:** titular «Bienvenido a la app de» en tinta oscura y «FinTrack OS» con el degradado de marca; rótulo «Finanzas personales, mes a mes»; subtítulo «Registra tus ingresos y gastos, organiza tu mes y revisa tus deudas.» (del mensaje aprobado de la primera vista). Se mantiene Geist en lugar de Inter para no cambiar la tipografía del resto del sitio.
- **Escena propia en lugar del video** (`hero-scene.tsx` + `hero-scene.css`): cielo gris claro, nubes con volumen hechas con filtros SVG `feTurbulence` + `feDisplacementMap` sobre sombras difusas, en capa lejana y capa cercana que derivan a distinta velocidad; tres barras ascendentes oscuras y mate que emergen de las nubes, y una estela de luz con el degradado de marca que sube como una flecha, con un pulso que la recorre y brillo en la punta. Solo SVG y CSS: sin video, canvas, WebGL ni dependencias. No usa el logo oficial deformado (DESIGN.md › Logo). El video de la referencia se probó solo de forma provisional y se retiró.
- **Accesibilidad y movimiento:** botón para pausar la animación (WCAG 2.2.2, `aria-pressed`); con movimiento reducido la escena queda quieta y el botón no aparece; escena `aria-hidden`; espacio real entre las dos líneas del titular para lectores y buscadores.
- **Alcance:** solo `landing-hero.tsx`, `landing-header.tsx`, `landing-mobile-menu.tsx` (barra del hero) y los archivos nuevos de la escena. Se retiraron `hero-orbit-motion.tsx` y las 66 reglas de `landing-cinema.css` que solo usaba el hero anterior; se conservan `.ft-receipt-dot` y `.ft-tone-*`, que usan los capítulos. `StoryMotion` y los cuatro capítulos de producto no cambian (sin piezas del hero, su desplazamiento simplemente no las anima).
- **Verificación (resultados reales):** `pnpm lint` y `pnpm typecheck` aprobados; `pnpm test` 25 archivos y 241 pruebas aprobadas; `pnpm build` aprobado en `.local/build-t7`; `git diff --check` limpio. QA propia en Chrome con GPU sobre la build, API bloqueada o simulada y sin Neon: **16/16** (menú móvil 390 y 375, barra de escritorio en una fila a 768/1024/1440, accesos sin sesión → `/register` y con sesión → `/dashboard`, orden de teclado y foco visible a 1440 y 390, pausa, movimiento reducido, capítulos con movimiento activo y sin errores, sin JavaScript, zoom 200 % y 320px). Hero exactamente del alto de pantalla y sin solaparse con la barra en 1440×900, 1280×720, 1024×768, 768×1024, 390×844 y 375×667. Contraste por píxeles: 0 fallos en 1440/768/390/375; el tramo más claro del degradado del titular mide 3,29:1 (texto grande, mínimo 3:1).
- **No ejecutado:** Lighthouse, lectores de pantalla, Firefox/Safari, dispositivos físicos y la suite integrada completa.
- **Evidencia:** `.local/qa-hero-video/` (`final/` capturas por tamaño, `qa/resultados.json`, `contraste/`, `escena-1` a `escena-5` con las rondas de ajuste, `tools/`).

## Historial — Dirección anterior: producto en movimiento, implementación por Codex — 2026-10-16

El Project Owner rechaza la landing con partículas y autoriza a **Codex** a implementar la dirección que combina la composición editorial de A, el recorrido cinematográfico al hacer scroll de B y las demostraciones claras de C. **Sin partículas, Canvas/WebGL ni app isométrica en el hero.** La propuesta A con Three.js y la composición C anteriores quedan como historial sustituido; sus resultados no validan esta nueva implementación.

- Hero con el texto exacto «Bienvenido a la app de FinTrack OS», su degradado y tamaño 36/48px. Se muestran piezas frontales del producto que se componen con el scroll; no letras gigantes ni fondos oscuros.
- Cuatro capítulos de producto: hoja mensual, bolsillos, colchón/deudas y resumen anual. HTML/SVG y Web Animations API nativa; animaciones pausadas cuyo avance depende de la posición, reversible y sin bibliotecas nuevas. Las cifras sintéticas permanecen constantes y rotuladas.
- Sticky solo con ancho ≥ 1024px, alto ≥ 720px, soporte de WAAPI y movimiento permitido. En móvil, tablet y pantallas bajas el contenido sigue en flujo. Sin JavaScript, sin soporte o con movimiento reducido, la página permanece completa y estática.
- Superficies claras/grises, hojas de datos blancas y tipografía contenida; autenticación y workspace conservan los cierres anteriores y los envíos principales azules.
- **Tareas 7 y 8: implementación en progreso, pendiente de revisión del Owner.** La verificación integrada de esta dirección todavía no se declara aprobada. **Avance histórico: 5 de 10 (50% del checklist, no del tiempo).**
- Después de la revisión de la landing: búsqueda y ordenación de Deudas → QA integral (9) → revisión final y versionamiento/CI (10). Los legales siguen pendientes. No se autorizan commits, push ni despliegue.

Los registros fechados anteriores se conservan como evidencia histórica; la sección vigente y la tabla de seguimiento prevalecen sobre sus encargos y afirmaciones de estado.

## Historial sustituido: landing con la propuesta A y motor Three.js — 2026-10-15

**Decisión del Owner tras revisar la landing C: «Me gusta más el estilo de A, apliquémoslo».** Se rehízo la landing (tareas 7 y 8) con A «Claridad editorial», sin commits. **Pendiente de la revisión de Codex y del Owner; no está aprobada.** Sustituye la composición C de la sección siguiente, que queda como registro histórico; autenticación y espacio de trabajo siguen con C (tarea 6) sin cambios.

- **Decisiones del Owner en esta ronda:** hero del mismo alto que la pantalla; demás secciones del alto de la pantalla y sin separadores entre ellas; titular «Bienvenido a la app de FinTrack OS» intacto (36/48px y degradado); tipografía editorial de A solo en la landing; alcance solo landing. Las partículas se resolvieron primero como dibujo estático y el Owner pidió después **«No lo hagas estático, mejor con Three.js»**: queda el motor WebGL con el dibujo 2D como reserva. Esto levanta para la landing la regla anterior «C sin partículas ni WebGL».
- **Dependencias nuevas autorizadas por esa instrucción:** `three` 0.186.1 y `@types/three` 0.186.0 (desarrollo), versiones exactas publicadas hace más de tres semanas. No se instalaron `postprocessing`, GSAP ni Lenis: el avance es función directa del scroll nativo y el brillo está en el shader.
- **Composición A:** suelo continuo Access Hover (#F7F9FD) del hero al footer, sin paneles ni bordes entre secciones, footer en el mismo suelo y sin borde superior. Cada sección mide al menos una pantalla y centra su contenido; a 1440×900 las nueve miden exactamente 900px. El hero mide exactamente el alto de pantalla a 1440, 768, 390 y 375 (en teléfonos la nube toma el alto restante, mínimo 160px). Escala editorial de A en `landing-styles.ts`. Demos de A: hoja del mes con KPI, píldoras de categoría y estado; bolsillo con totales por cuenta; colchón y deuda (tasa M.V. y E.A.); resumen con gráfica y tabla.
- **Motor de partículas (`modules/home/particles/`):** una sola nube `THREE.Points` con shaders propios en un canvas fijo detrás del contenido. Las seis formaciones de A (nube, hoja, bolsillos, escalera, columnas, marca) se calculan con la misma geometría sembrada del artifact (`formation-geometry.ts`). Cada hueco decorativo es un ancla `data-formation-anchor`; `resolveScrollBlend` decide qué formaciones mezclar según el centro del viewport, y cada partícula viaja de un hueco al siguiente con su propio desfase, atenuándose en el trayecto para no competir con el texto. Todo es función pura de la posición (salvo un temblor de 1–2px). DPR fijado una vez, 5.200 partículas (3.600 con ≤ 4 núcleos, 2.600 en teléfonos), pausa con pestaña oculta y liberación de geometría, material y renderer. Three.js se carga por import dinámico después de pintar: 133 KB comprimidos fuera del primer render.
- **Reserva:** los mismos dibujos en canvas 2D (`ParticleFormation`) se ven hasta que la nube WebGL pinta cuatro frames, y vuelven sin WebGL, con movimiento reducido (también al activarlo en caliente) o si se pierde el contexto.
- **Datos:** la muestra sigue calculándose con el dominio; se añadieron los totales por cuenta (2.050.000 y 200.000) y la tasa efectiva anual (26,8 %), con pruebas.
- **Verificación (comandos y resultados reales):** `pnpm lint` y `pnpm typecheck` aprobados; `pnpm test` 245 pruebas aprobadas (10 nuevas: geometría determinista y mezcla por scroll con TDD, y las dos cifras nuevas de la muestra); `pnpm build` aprobado en `.local/build-t7`; `git diff --check` limpio. QA propia en Chrome con GPU real (ANGLE Direct3D11, AMD Radeon 860M), sin Neon y con la API bloqueada o simulada: **18/18** (menú móvil 768/390/375, anclas, CTA sin y con sesión, teclado y salto al contenido a 1440 y 390, motor activo con reservas ocultas, bajar y volver difiere en 0,18 % de píxeles y recargar a mitad en 0,002 %, movimiento reducido y sin WebGL con reservas visibles y sin excepciones, hero del alto de pantalla en los cuatro anchos, sin JavaScript, zoom 200 % y 320px). Capturas sin scroll horizontal, excepciones ni errores de consola en 1440/768/390/375. Arnés integrado con PostgreSQL aislado y API de QA: F-UI-14, BARRIDO, RENDIMIENTO y CABECERAS aprobados; `/` con CLS 0 y LCP 300 ms (local, informativo). Contraste por píxeles: 0 fallos a 1440, 390 y 375; a 768 y 820 la herramienta marca «Pagado»/«Pendiente» contra el punto decorativo de la píldora (geometría verificada sin solape; colores declarados 5,4:1 y 7,7:1).
- **No ejecutado:** Lighthouse, lectores de pantalla, Firefox/Safari, dispositivos físicos y la suite integrada completa (solo los escenarios que tocan la home; el resto del código no cambió desde la corrida completa de C: 38 + F-AUTH-01 con TTL).
- **Evidencia:** `.local/qa-landing-a/` (`entrega/`, `final/`, `secuencia/` y `secuencia-390/` con el recorrido de partículas, `qa/resultados.json`, `contraste/`, `regresion/`, `ref/` con la muestra A renderizada).
- **Pendientes:** revisión de Codex y del Owner; los pendientes de dominio, legales y `next-cloudinary` de la sección siguiente siguen vigentes; la mejora de ordenar y buscar deudas sigue fuera de esta entrega.

## Historial — Tareas 7 y 8 implementadas por Claude (composición C, sustituida) — 2026-10-15

**Landing completa (tarea 7) y movimiento del hero (tarea 8) implementados, sin commits. Pendientes de la revisión de Codex y de la revisión del Project Owner; no están aprobados.** El avance cerrado sigue en 5 de 10 hasta esas revisiones. La mejora de ordenar y buscar deudas (sección siguiente) no forma parte de esta entrega.

- **Dónde:** `frontend/src/modules/home/` (la ruta `src/app/(public)/page.tsx` solo declara metadata e importa `HomePage`). Secciones en archivos propios: `landing-header`, `landing-mobile-menu` (único cliente de la página junto con los accesos), `landing-hero` + `hero-app-preview`, `landing-product` + `landing-demos`, `landing-steps`, `landing-access`, `landing-faq`, `landing-footer` (CTA final y footer), `landing-structured-data`. Copy aprobado en `landing-content.ts`. Se retira `home-summary-card.tsx` (sin consumidores).
- **Titular:** «Bienvenido a la app de FinTrack OS» con su texto, `text-4xl sm:text-5xl`, peso y degradado en «FinTrack OS» intactos, único H1; sustituye el H1 de C por instrucción del Owner (reiterada durante esta sesión con captura). El H1 alternativo «Organiza tu dinero…» no se muestra.
- **Composición de C:** navbar sencilla (desde 1024px enlaces y accesos; debajo, «Menú» con `details` nativo que se cierra al elegir destino, con Escape devolviendo el foco o al tocar fuera), hero con malla del degradado, velo y la app en vista isométrica con datos sintéticos (`role="img"` con descripción), declaración, cuatro paneles Panel/Panel Strong alternos con hojas blancas, cómo funciona, «Gratis por ahora», FAQ de 11 preguntas, CTA final y footer gris con marca de agua.
- **Datos de ejemplo calculados con el dominio:** `landing-sample.ts` construye las hojas sintéticas de agosto–octubre de 2026 de `landing-content.md` §3 y obtiene las cifras con `computeMonthSheet`, `pocketProgress`, `computeDebtPlan` y `summarizeYear`. TDD: `landing-sample.test.ts` (4 pruebas) falló antes de existir el módulo y pasa ahora; confirma 3.000.000 / 2.250.000 / 750.000, el bolsillo contado una sola vez (320.000 restantes), la recomendación de deuda 550.000 en 6 meses por mayor interés y el resumen 8.700.000 / 6.550.000 / 850.000 / 3 de 3. Todas las demos dicen «Datos de ejemplo» y la hoja indica «Ejemplo estático; no se guarda».
- **Accesos:** todos los «Crear mi cuenta»/«Crear cuenta» van a `/register` y los «Iniciar sesión» a `/login`, como enlaces reales. `home-auth-actions.tsx` extrae el comportamiento de sesión a `useAuthNavigation` y añade `HomeAuthLink` para menú y footer: con sesión, el clic lleva al dashboard (sin cambio funcional).
- **Legales y soporte:** `mailto:fintrackos.auth@gmail.com` en FAQ y footer. Privacidad y Términos no se enlazan ni se publican (siguen en borrador; dependencia anotada en `landing-content.ts`). Sin precios, métricas, clientes ni testimonios.
- **Movimiento (tarea 8):** solo la malla del hero, con animación CSS ligada a la view timeline del hero (`exit-crossing`), sin JavaScript ni librerías; dentro de `prefers-reduced-motion: no-preference` y `@supports (animation-timeline: view())`, así que sin soporte o con movimiento reducido queda estática. Las capas decorativas llevan `overflow-anchor: none`: sin eso, recargar a 400px restauraba en 470px (hallazgo de esta verificación, corregido). Microinteracciones existentes sin cambios.
- **SEO:** `lang="es-CO"`; título y descripción alineados al contenido; `src/shared/config/site.ts` centraliza `NEXT_PUBLIC_SITE_URL`. Con ella hay canonical, `sitemap.xml` (inicio, registro, login), línea Sitemap en `robots.txt` y URL en el JSON-LD `WebApplication`; sin ella se omiten (sitemap vacío) y no se inventa dominio. `robots.txt` excluye `/dashboard` y `/auth/`. La imagen para compartir se regeneró con el titular vigente (fuente `og-image.source.html` actualizada; la anterior en `.local/qa-task7/og/`). `.env.example` y `DESIGN.md` actualizados.
- **Diferencias justificadas frente a C:** titular de bienvenida en lugar del H1 de C; títulos de sección a 24–28px, de panel a 20–24px y pasos a 20–24px (C usaba 34–72px) por la tipografía contenida de `DESIGN.md`; iconos lineales de lucide en lugar de glifos ✓/○; el CTA final queda dentro de `<main>` y comparte la superficie con el footer (en C estaba dentro del footer); la tabla del mes en teléfonos pasa a filas apiladas como la muestra móvil de C; los divisores del footer usan el token Access Edge en lugar del literal `#cbd3df`; columna «Información» del footer omitida hasta aprobar los legales; la estimación de deuda se redacta como cálculo con supuestos («el cálculo estima 6 meses») y no como promesa.
- **Verificación (comandos y resultados reales):** `pnpm lint` y `pnpm typecheck` aprobados; `pnpm test` 24 archivos y 235 pruebas aprobadas; `pnpm build` aprobado en la copia aislada `.local/build-t7/frontend` (además, una build con `NEXT_PUBLIC_SITE_URL=https://fintrack.example`, solo en esa copia, para comprobar canonical, sitemap, robots y JSON-LD absolutos); `pnpm qa:runner` 10/10; `git diff --check` limpio. Arnés integrado con build de producción, PostgreSQL aislado (`fintrack-frontend-qa`) y API de QA: 38 aprobados y F-AUTH-01 bloqueado en la corrida completa; F-AUTH-01 aprobado en su corrida separada con TTL de 40 s. En BARRIDO, `/` sin desbordamiento, un H1 y consola limpia; RENDIMIENTO local de `/`: CLS 0, LCP 172 ms (medición informativa). QA propia de la landing en Chrome por CDP, con la API bloqueada o simulada y sin Neon: 13/13 escenarios aprobados (menú móvil a 768/390/375, anclas, CTA sin y con sesión, teclado y salto al contenido a 1440 y 390 con 69 paradas con foco visible, FAQ con Enter, movimiento reversible al bajar y subir, recarga a mitad exacta, reducido sin animación, animación solo bajo `@supports`, JavaScript desactivado, zoom 200 % en 720 y 640px y 320px sin desbordamiento). Contraste por píxeles en 1440/768/390/375: 0 fallos reales (el único marcado es «Ir al contenido» oculto con `sr-only`; visible mide 44px con tinta sobre blanco). Capturas a 1440×900, 768, 390×844 y 375×844 sin scroll horizontal, excepciones ni errores de consola. Detector de Impeccable sobre los archivos: 1 aviso, el texto con degradado `text-brand-gradient` exigido por el Owner.
- **No ejecutado:** Lighthouse, lectores de pantalla, Firefox/Safari (el fallback estático se comprobó por la estructura `@supports`, no en un navegador sin soporte), dispositivos físicos, escaneo por URL de Impeccable (requiere puppeteer, no instalado).
- **Evidencia:** `.local/qa-task7/` (`entrega/` capturas seleccionadas, `ronda-1/` y `ronda-2/`, `qa/resultados.json`, `contraste/`, `regresion/`, `regresion-ttl/`, `og/`, `tools/`).
- **Pendientes del Owner:** dominio final para `NEXT_PUBLIC_SITE_URL` (canonical, sitemap, URLs absolutas de compartir); aprobar los legales y crear `/privacidad` y `/terminos` antes de enlazarlos; retirar `next-cloudinary`; el año del footer se fija en cada build (página estática).

## Historial — Encargo inicial de buscar y ordenar deudas (ya implementado) — 2026-10-15

Petición del Project Owner mientras Claude construye la landing. **Pendiente de implementación**, prioridad media de usabilidad. Se incorpora al roadmap después de terminar y revisar la landing (tareas 7/8) y antes del QA integral (tarea 9) y del versionamiento (tarea 10). La landing continúa con su encargo actual. Esta ampliación no reabre lo validado de la tarea 6 ni cuenta como trabajo ya terminado.

- [x] **Ordenación por encabezado:** al pulsar una columna ordenable de Deudas, alternar ascendente/descendente. Importes y tasas se ordenan por su valor numérico, no por el texto formateado; el nombre admite A–Z/Z–A. Mostrar qué columna y sentido están activos. Reutilizar los campos actuales (saldo, cuota, pagos y tasas) al definir las columnas ordenables.
- [x] **Búsqueda:** barra para encontrar deudas por nombre o acreedor, combinable con la ordenación; sin distinguir mayúsculas ni tildes. Permitir limpiar la búsqueda y mostrar un estado claro cuando no haya coincidencias.
- [x] **Integridad financiera:** ordenar y filtrar únicamente la presentación de las filas del plan ya calculado. No cambiar la estrategia elegida, las prioridades reales, la asignación de pagos ni los totales del plan completo. Conservar una opción de volver al orden de la estrategia y mantener desempates deterministas.
- [x] **Responsive y accesibilidad:** encabezados accionables con teclado y estado de orden accesible; alternativa clara de ordenación en móvil si se conservan tarjetas. La vista actual renderiza `plan.rows` como tarjetas: al implementar habrá que integrar los encabezados/controles solicitados, sin suponer que ya existe una tabla ordenable.
- [x] **Verificación:** casos ascendente/descendente numéricos, búsqueda combinada, ausencia de resultados, limpieza, retorno al orden estratégico y edición sin cambiar cálculos o identidad de sesión. Incluir esta capacidad en el QA anterior al versionamiento.

**Secuencia actualizada:** landing y movimiento → revisión del Owner → búsqueda y ordenación de Deudas → QA integral → revisión final, versionamiento y CI. El porcentaje del checklist original sigue describiendo sus diez fases; esta mejora adicional permanece visible como pendiente y se reportará junto al avance.

## Historial — Encargo de landing para revisión final del Owner — 2026-10-15

El Owner autoriza continuar con la landing y revisarla cuando esté terminada. Se prepara el encargo para Claude de implementar la tarea 7 y luego el movimiento acotado de la tarea 8 en una entrega conjunta, siguiendo C y las correcciones vigentes. No implica que esas tareas ya estén implementadas ni cambia el avance cerrado de **50%**. La construcción sigue a cargo de Claude; no se inicia una nueva fase de propuestas ni se pide otra selección visual.

El titular «Bienvenido a la app de FinTrack OS» conserva texto, tamaño y degradado por instrucción posterior del Owner; el H1 alternativo de `landing-content.md` es histórico frente a esa excepción. Ver el encargo vigente en `docs/claude-design-handoff.md`. Los legales continúan pendientes y las tareas 9/10 conservan QA integral, revisión y versionamiento con autorización.

## Historial — Cierre técnico de la tarea 6 — 2026-10-15

**Tarea 6 validada técnicamente en su alcance. Avance de ese corte: 5 de 10 tareas cerradas (50% por checklist, no por tiempo). Sigue la tarea 7: landing completa a cargo de Claude conforme al artifact C elegido.** Los registros de revisión anteriores conservan su valor histórico; no reabren las tareas cerradas. Los pendientes legales de la tarea 1 y el QA integral de las tareas 9/10 siguen abiertos.

Codex revisó con dos exploraciones acotadas autenticación/contraseña/carga/arnés e integración financiera (sidebar, campos, diálogo de salida, calendario y deudas). No se encontraron bloqueadores nuevos. Comparó capturas de login y hoja mensual de escritorio, calendario móvil y la muestra del sistema C. Los cuatro informes de `despues/informe-*.json` contienen 13 pantallas cada uno, sin overflow horizontal ni excepciones. Los doce informes de contraste de autenticación no registran fallos. Son evidencias de Claude inspeccionadas; no una nueva ejecución por Codex de las 52 combinaciones autenticadas.

Nueva verificación independiente: **12/12 pruebas de botones, typecheck, 10/10 pruebas del contrato del arnés y diff check aprobados**. Se revisó que `cdp.mjs` excluye descendientes `aria-hidden` del nombre utilizado por sus locators sin cambiar las aserciones. Ese helper es una aproximación para los controles del proyecto, no el algoritmo completo de nombres accesibles ni una prueba con lector de pantalla. La corrida integrada final de Claude tiene 38 escenarios aprobados y F-AUTH-01 bloqueado; su corrida separada con TTL corto aprueba F-AUTH-01.

**Decisión explícita del Owner aplicada:** «Azul sólido en todos los envíos principales». Cinco acciones de registro, verificación y recuperación pasan a `variant="default"`; el login ya lo usaba. Los accesos de navegación y las acciones secundarias conservan su familia clara. `DESIGN.md` y el handoff reflejan la regla. Lint de los tres archivos modificados y typecheck aprobados; no se repitieron el build ni toda la suite integrada después de este cambio de variante existente.

Chrome local de Codex a 1440 y 375px comprobó login, registro, solicitud de recuperación y una vista sintética de verificación: azul `#2453D6`, texto blanco de 14px y sin overflow horizontal. También comprobó en login el área 44×44 del toggle, su posición estable al mantener pulsado, el cambio password/text y el foco interior de 2px. Evidencia y capturas nuevas en `.local/qa-task6/codex-review/`. Las rutas API estuvieron bloqueadas durante esta comprobación; no se enviaron formularios ni se usó Neon.

Límites conservados: estados posteriores de recuperación revisados por código en el cambio de color; no se repitió el fallo real de guardado ni la cancelación tras ese fallo. Las barras de 13px de la gráfica anual son informativas, no cambiaron en esta ronda y sus valores están en la tabla semántica de la misma pantalla. No se certifican lectores de pantalla, dispositivos físicos ni todos los navegadores con este cierre. Sin commits, push, merge ni despliegue.

## Historial — Cierre técnico de la tarea 5 — 2026-10-14

**Tarea 5 validada en su alcance. Avance de ese corte: 4 de 10 tareas cerradas (40% por checklist, no por tiempo). Sigue la tarea 6, aplicación del diseño al producto a cargo de Claude.** La tarea 1 conserva sus pendientes legales. Los registros de revisión que siguen son históricos y no reabren los dos defectos ya corregidos.

Codex revisó las dos primitivas, `LoadableContent`, sus consumidores pertinentes, las regresiones y el cambio de F-UI-16 con una exploración delegada. Confirmó que `disabled` llega al hijo botón nativo, que las dos capas reservan el ancho del indicador y que la capa visual duplicada no duplica el nombre accesible. Los hijos actuales inspeccionados son texto e iconos. F-UI-16 conserva sus tres estados, muestreo y umbral; el nuevo recorrido excluye las capas invisibles.

Las mediciones de Claude en `hallazgos-despues/escritorio.json` y `movil-375.json` muestran dimensiones estables en los seis casos (con icono, sin icono y ancho completo); Codex inspeccionó las capturas del botón de contraseña en ambos estados. Nueva ejecución independiente: **10/10 pruebas de botones, typecheck y diff check aprobados**. Se inspeccionaron las salidas de las corridas de Claude: 37 escenarios aprobados en `regresion-hallazgos`, más F-UI-16 aprobado en su corrida posterior y F-AUTH-01 aprobado con TTL corto. No se afirma que los 39 pasaran juntos en una sola corrida, ni que Codex repitiera toda la suite, lint, build o recorrido integrado.

La estabilidad de tamaño se refiere a alternar `loading` con el mismo contenido. Algunos consumidores ya cambian también la etiqueta (por ejemplo «Copiar mes anterior» / «Copiando…»); ese cambio de copy puede cambiar su ancho y se revisará durante la integración de pantallas de la tarea 6. No es la regresión del espacio añadido por el indicador. El flujo de fallo de guardado de `save-indicator.tsx` no se volvió a provocar en navegador. Los restantes pendientes de composición de pantallas conservan su asignación a la tarea 6.

Sin cambios de backend, Neon, commits, push, merge ni despliegue con este cierre. La revisión final del Project Owner y el QA integral permanecen en las tareas 9 y 10.

## Historial — Tipografía contenida y excepción de bienvenida — 2026-10-14

El Project Owner rechaza letras gigantes en la app y confirma que Claude sigue a cargo del diseño conforme al artifact C elegido. Se ajustan los títulos de autenticación y la primitiva de títulos del workspace a 22px móvil / 24px desde 640px; métricas de muestra hasta 22px; texto de botones grandes a 14px. El apoyo del formulario usa 14px y los campos móviles conservan 16px. No se cambia el tamaño raíz, el zoom ni los objetivos táctiles.

**Excepción explícita del Owner:** «Bienvenido a la app de FinTrack OS» queda como siempre, con `text-4xl sm:text-5xl` (36/48px), peso y degradado originales. La reducción provisional de ese titular se revirtió. `DESIGN.md` y `docs/claude-design-handoff.md` recogen la excepción y la continuidad del artifact para Claude; el mega prompt y las capturas originales permanecen intactos.

Verificación nueva: lint, typecheck, seis pruebas de botones y build en copia aislada aprobados. El primer intento de build de la copia falló por una raíz de Turbopack demasiado estrecha para la unión a `node_modules`; se corrigió solo la configuración temporal de `.local/typography-build/` y el segundo terminó bien, sin tocar el dev. Chrome midió los tamaños reales de home, login, registro y recuperación en 1440, 390, 375, 720 y 320px (20 combinaciones), sin overflow horizontal ni controles recortados según la comprobación acotada. Capturas y mediciones en `.local/qa-task5/typography-review/`; inspección visual de login móvil y escritorio. No equivale a un nuevo recorrido autenticado ni a QA completo. La tarea 5 conserva los dos pendientes técnicos descritos debajo. Sin commits ni despliegue.

## Historial — Revisión de la tarea 5 y ajuste del login — 2026-10-14

La tarea 5 sigue pendiente de cierre técnico. Codex revisó primitivas y consumidores con una exploración delegada, los informes locales y capturas seleccionadas. Los nueve informes de contraste de `.local/qa-task5/contraste/` no registran fallos. El arnés principal registra 38 escenarios aprobados y F-AUTH-01 bloqueado; la corrida separada con TTL registra ese escenario aprobado. Son evidencias de Claude inspeccionadas, no una nueva ejecución del recorrido completo por Codex.

Pendientes concretos para cerrar esta tarea:

- **Media — tamaño durante la carga:** el indicador se añade al flujo de `Button` y `FtButton`; los botones de ancho intrínseco sin icono inicial crecen al cargar. Hay consumidores en `account-security-panel.tsx` y `save-indicator.tsx`. Mantener sus dimensiones y comprobar ambos estados; el login con icono y ancho completo no demuestra ese caso.
- **Baja — contrato de `asChild`:** ambas primitivas extraen `disabled`, pero lo descartan en la rama `Slot.Root`. Restaurar el contrato para un hijo `<button disabled>`; no se identificó un consumidor actual que combine estas props. No tratar un atributo `disabled` en un enlace como bloqueo nativo de navegación.

El Project Owner rechazó el envío blanco del login por falta de énfasis. Se cambió solo «Acceder a FinTrack OS» a la variante azul sólida existente, con texto blanco, conservando los accesos claros de navegación y el estado de carga. La excepción queda en `DESIGN.md`. Chrome local contra el dev a 1440 y 375px: fondo `#2453D6`, hover `#1D43B3`, texto blanco, 52px de alto, foco sólido de 2px y sin overflow horizontal. Evidencia: `.local/qa-task5/codex-review/`. No se enviaron formularios ni se usó Neon.

Validaciones nuevas de Codex: typecheck y las seis pruebas de botones aprobadas; inspección visual de la captura móvil; `git diff --check` aprobado. No se repitieron lint, build ni la suite completa para este cambio de variante. Sin commits, push ni despliegue. Los pendientes de composición de pantallas permanecen en la tarea 6.

Checklist de seguimiento acordada con el Project Owner el 2026-10-11. Se actualiza al avanzar; una casilla marcada significa que el entregable está terminado y tiene la aprobación que corresponda.

**Dirección de ese corte: composición editorial, recorrido cinematográfico y demos claras, implementados por Codex según la decisión del 2026-10-16.** Sin partículas/WebGL ni hero isométrico; superficies grises claras. Las elecciones C y A anteriores conservan su historial. Los pendientes legales de la tarea 1 mantienen su estado independiente.

| # | Tarea | Estado | Entregable y criterio de cierre |
|---|---|---|---|
| 1 | Cerrar el contenido de la landing | Copy aprobado; legales pendientes | Copy por sección, CTA y destinos reales, FAQ, gratuidad actual, soporte y footer en `landing-content.md`. Completar y aprobar los borradores legales con los datos y decisiones pendientes del responsable. |
| 2 | Aprobar la dirección visual antes de programar | Plan editorial y cinematográfico aprobado el 2026-10-16 | Combinar composición de A, recorrido de B y demos claras de C, sin partículas/WebGL ni hero isométrico; conservar marca, contenido y controles aceptados. |
| 3 | Definir el sistema visual de toda la app | Implementada por Claude y validada técnicamente por Codex en su alcance | `DESIGN.md` y tokens de C revisados; no supone aprobar todos los componentes ni el dashboard autenticado. |
| 4 | Finalizar e integrar el logo | Implementada por Claude y validada técnicamente por Codex en su alcance | Versiones completa y compacta, ubicación en superficies públicas y privadas, favicon e imagen para compartir. Reglas e inventario en `DESIGN.md` (Logo and brand assets). |
| 5 | Unificar los componentes | Implementada por Claude y validada técnicamente por Codex en su alcance | Familia coherente de botones, enlaces, inputs, tarjetas, pestañas y diálogos, con variantes por función y estados completos; dos hallazgos de revisión corregidos. |
| 6 | Aplicar el diseño al producto | Implementada por Claude y validada técnicamente por Codex en su alcance | Autenticación, dashboard, hoja mensual, deudas, resumen y configuración coherentes con el sistema aprobado; envíos principales de autenticación azules por decisión del Owner. |
| 7 | Construir la landing completa y responsive | Implementada por Codex y verificada localmente; pendiente de revisión del Owner | HTML semántico, navegación, hero frontal, demos claras, pasos, FAQ, CTA, footer y SEO; enlaces reales, legales solo tras aprobación; contenido completo sin JavaScript. |
| 8 | Añadir la experiencia de movimiento | Implementada por Codex y verificada localmente; pendiente de revisión del Owner | Cuatro capítulos con WAAPI nativa reversible; sticky solo ≥ 1024×720, móvil en flujo, reduced motion/sin JavaScript estáticos y cleanup completo. Sin partículas ni WebGL. |
| 9 | Hacer QA del diseño y regresiones funcionales | Pendiente, después de la mejora de Deudas | Evidencia de responsive, teclado, contraste, formularios, navegadores y rendimiento, junto con las regresiones existentes. Los gates exclusivos de WebGL no aplican a la nueva dirección. |
| 10 | Revisión del Project Owner y versionamiento | Pendiente | Ajustes finales aprobados; con autorización, commits por unidad lógica, rama y main con CI en verde según `AGENTS.md`. |

## Historial — Checklist

- [ ] 1. Cerrar el contenido de la landing.
- [x] 2. Aprobar la dirección visual antes de programar: plan editorial y cinematográfico del 2026-10-16, sin partículas ni WebGL.
- [x] 3. Definir el sistema visual de toda la app: implementación y revisión técnica del alcance terminadas.
- [x] 4. Finalizar e integrar el logo: implementación y revisión técnica del alcance terminadas; la revisión final del Project Owner se conserva en la tarea 10.
- [x] 5. Unificar los componentes: implementación y revisión técnica del alcance terminadas.
- [x] 6. Aplicar el diseño al producto: implementación y revisión técnica del alcance terminadas.
- [ ] 7. Construir la landing completa y responsive: implementada y verificada localmente; pendiente de revisión visual del Owner.
- [ ] 8. Añadir la experiencia de movimiento: implementada y verificada localmente; pendiente de revisión visual del Owner.
- [ ] 9. Hacer QA del diseño y regresiones funcionales.
- [ ] 10. Revisión del Project Owner y versionamiento.

## Historial — Material canónico y dependencias

- [Mega prompt original](landing-mega-prompt-original.md): se conserva íntegro.
- [Referencia de color del Project Owner](references/fintrack-os-gradient-reference.png): degradado azul, violeta y rosa/coral.
- [Referencia de botón del Project Owner](references/fintrack-os-button-reference.png): fondo claro, borde fino, esquinas redondeadas e icono de acceso.
- [Propuesta visual](landing-direccion-visual.md) y [artifact de revisión](landing-direccion-visual.html).
- [Copy completo propuesto](landing-content.md): secciones, FAQ, demostración sintética, destinos y trazabilidad de afirmaciones.
- [Continuidad del diseño](claude-design-handoff.md): encargo vigente de implementación por Codex y, debajo, historial de propuestas e instrucciones anteriores para Claude.
- [Borradores legales y sus pendientes](landing-contenido-legal.md).
- Referencia principal: [Lumora](https://www.getlayers.ai/templates?layer=lumora). Dirección de partículas: Vesper y New Era, conservadas en el mega prompt.

La dirección aprobada el 2026-10-16 sustituye las implementaciones anteriores de C y A con partículas; no requiere generar otra terna. Se conserva el mega prompt original íntegro como referencia visual y fuente de los requisitos aún aplicables. Quedan retirados los requisitos de Three.js, partículas, shaders y postprocesado WebGL; se mantienen contenido, SEO, accesibilidad, responsive, rendimiento y QA, y la reversibilidad de cualquier movimiento ligado al scroll. La tarea 1 mantiene abierta su parte legal: los textos permanecen como borradores hasta completar sus decisiones y aprobación; no se crean enlaces públicos a rutas inexistentes. El versionamiento de este trabajo requiere la confirmación indicada en la tarea 10.

## Historial — Registro de avance

- **2026-10-11:** lista creada; tarea 1 iniciada. Se prepara el copy con funciones comprobadas en el repositorio. Pendientes de confirmar nombre del responsable y municipio; el resto de decisiones legales se conserva en su borrador.
- **2026-10-11:** feedback de la tarea 2: simplificar la navbar y cambiar «Crear mi cuenta» a la familia de botón claro con borde fino y esquinas redondeadas mostrada por el Project Owner. Se ajusta la maqueta; Three.js y las animaciones de scroll siguen pendientes de implementación tras el OK visual.
- **2026-10-11:** copy completo preparado en `landing-content.md`; revisión documental y aritmética de los ejemplos aprobadas. La tarea 1 permanece abierta para aprobación del contenido y pendientes legales. Actualizada la trazabilidad del borrador legal sobre la verificación del Excel ya terminada.
- **2026-10-11:** maqueta de navbar y CTA revisada en Chrome a 1440×900, 390×844, 375×844 y 768×900, sin overflow horizontal ni solapamientos de controles. Evidencia local en `.local/landing-proposal-feedback/`. Detector Impeccable ejecutado: diferencias propuestas de colores, radios y tamaños frente a `DESIGN.md`, y advertencias genéricas sobre Geist/degradado; se conserva la dirección pedida por el Project Owner. Su índice `.impeccable/design.json` está desactualizado respecto de `DESIGN.md`; se puede sincronizar al definir el sistema visual, con autorización.
- **2026-10-11:** feedback favorable del Project Owner sobre la revisión: «Ahora sí me cuadra un poco más». La navbar sencilla y los botones claros con borde fino quedan como base de refinamiento. La propuesta completa continúa en revisión; este comentario no cierra la tarea 2 ni inicia la implementación de Three.js.
- **2026-10-12:** el Project Owner aprueba continuar tras la revisión del contenido y establece que Claude realizará el diseño. Copy aprobado y base revisada aceptada. La tarea 1 permanece parcialmente abierta por los pendientes legales. Se prepara el handoff con el mega prompt original y todas las referencias.
- **2026-10-12:** el Project Owner concreta el siguiente paso: usar `/design` en Claude para crear un artifact con tres diseños y elegir el mejor. La tarea 2 continúa abierta para esa elección; no se implementa la app ni se fija el sistema visual definitivo antes de ella.
- **2026-10-14:** tarea 3 implementada por Claude, sin commits, en espera de la revisión del Project Owner. Se reescribe `DESIGN.md` como fuente canónica de C, con colores por función y matriz de contraste, tipografía, espaciados, radios, sombras, estados, componentes, accesibilidad, responsive, movimiento y mapa de tokens. `frontend/src/app/globals.css` define los primitivos de C una sola vez en `:root`, y los nombres de shadcn y los `ft-*` del espacio de trabajo apuntan a ellos. Cambios con efecto visible:
  - Fondo #F3F5F8 y paneles #EBEEF3/#E4E8EF.
  - Bordes #D5DCE6.
  - Foco #2453D6 (antes #84ADFF, 2,2:1).
  - Borde de control #7D879A (antes #D0D5DD, 1,47:1).
  - Destructivo público #C01048.
  - Degradado del propietario en los fondos públicos y en `text-brand-gradient`, que pasa a las paradas profundas; las claras quedan en `text-brand-gradient-light`.
  - En `auth-shell.tsx`, las manchas decorativas dejan menta y cian.
  - Radio público de 14px.

  Verificación:
  - `pnpm lint`, `pnpm typecheck` y `pnpm test` (22 archivos, 219 pruebas) pasan.
  - `pnpm build` pasa en una copia aislada (`.local/build-c`), sin detener el dev activo.
  - `git diff --check` limpio.
  - Contraste medido sobre píxeles en Chrome para `/`, `/login` y `/register` a 1440×900, 390×844 y 375×844, comparado con una copia del tema anterior: de 12 fallos a 6, sumando los nueve informes `*-legibilidad.json` de cada fase en `.local/qa-design-tokens/antes/` y `despues/`.
  - Los 6 casos restantes ya existían: las insignias de 12px de home, login y registro en los dos anchos móviles, en azul sobre su propio lavado (4,17–4,33:1 según el percentil de la medición). Corresponden a las tareas 5 y 6. Por separado, los informes de layout conservan el desborde de las descripciones de Google y GitHub en móvil; este problema preexistente no forma parte de los seis casos de contraste.
  - Un espécimen de superficies con el CSS compilado (`.local/qa-design-tokens`) da 0 fallos.
  - No se verificó el dashboard autenticado: requiere sesión y no se crearon cuentas contra la API activa.
  - Pendientes para la tarea 5: retirar `brand-action` y `--chart-1…5` heredados, aplicar el borde de control a los campos del espacio de trabajo y el estado deshabilitado sin opacidad.

Esta sesión no dispone de la herramienta para fijar un panel nativo de tareas en Codex CLI. Este archivo es el seguimiento persistente del trabajo; no equivale a haber fijado ese panel.

- **2026-10-14:** tarea 4 implementada por Claude, sin commits, en espera de revisión. El logo oficial era un PNG de 1600×1600 alojado en Cloudinary, solo el símbolo, sin fuente vectorial; el nombre ya se escribía como texto junto a la imagen. Cambios:
  - **Fuente canónica local:** `frontend/src/shared/brand/fintrack-os-symbol.png` (el PNG oficial recortado a su caja de contenido, 1030×934, sin tocar color ni geometría). `BrandLogo` deja de depender de Cloudinary y de `next-cloudinary`; usa `next/image` con importación estática.
  - **Variantes:** `full` (símbolo + «FinTrack OS» como texto) y `compact` (solo símbolo, por defecto, compatible con los consumidores previos), tamaños `sm`/`md`/`lg`, dimensiones reservadas, `href` opcional con enlace de 44px mínimo y foco azul de 2px. Reglas de tamaño mínimo, separación y superficies en `DESIGN.md`.
  - **Usos:** home (enlace a `/`), tarjeta de autenticación (sin enlace; «Volver al inicio» ya cubre el destino; la descripción pasa debajo del logo en móvil), barra lateral y barra superior móvil del espacio de trabajo (enlaces al dashboard). Se retira el cuadrado `FT` (`BrandMark`). En móvil, las páginas con selector de mes siguen sin logo (comportamiento previo).
  - **Iconos y compartir:** `favicon.ico` propio (sustituye el predeterminado de Next, 25.931 bytes), `icon.png` 512, `apple-icon.png` 180 y `opengraph-image.png` 1200×630 con su alt, más metadata `openGraph`/`twitter` en `layout.tsx`. Las URLs absolutas de la imagen dependen del dominio final: variable opcional `NEXT_PUBLIC_SITE_URL` (documentada en `frontend/.env.example`); sin ella el build avisa y usa localhost.
  - **Verificación:** `pnpm lint`, `pnpm typecheck` y `pnpm test` (22 archivos, 219 pruebas) pasan; `pnpm build` pasa en una copia aislada (`.local/build-brand`) con las rutas `/icon.png`, `/apple-icon.png` y `/opengraph-image.png`. Chrome real: home, login y registro a 1440×900, 390×844 y 375×844 sin desbordes ni imágenes rotas; con la build de producción, PostgreSQL aislado y un usuario sintético, el shell del espacio de trabajo a 1440×900 y las barras móviles a 390 y 375. Recursos servidos (favicon, icon, apple-icon, imagen OG y logo) responden 200 con su tipo. CLS 0 al cargar la home. Foco por teclado comprobado con Tab real (contorno sólido 2px #2453D6). Evidencia local en `.local/qa-brand-logo/`.
  - **Pendientes y hallazgos:** (1) la dependencia `next-cloudinary` y las variables `CLOUDINARY_*` de `frontend/.env` ya no se usan; retirar la dependencia requiere tocar `package.json` y el lockfile, y la sección de proveedores de `landing-contenido-legal.md` aún menciona a Cloudinary: ambas cosas quedan para el Project Owner. (2) 23 usos de `outline-none focus-visible:outline-2` en el espacio de trabajo no muestran el anillo de foco en Tailwind v4 (`outline-none` fija `outline-style: none`); es previo, corresponde a las tareas 5 y 6 y no se corrigió aquí. (3) No hay fuente vectorial: decidir si se traza un SVG. (4) Regenerar `opengraph-image.png` si cambia el copy del hero.

- **2026-10-14:** tarea 5 implementada por Claude, sin commits, pendiente de revisión técnica.
  - **Foco:** `outline-none` + `focus-visible:outline-2` dejaba `outline-style: none` en el CSS compilado (confirmado en `.next/static`). Se añaden en `globals.css` las utilidades `focus-ring`, `focus-ring-inset` y `focus-field`, y se sustituyen en `FtButton`, campos, segmentado, interruptor, `PaidCheck`, `StatusBadge`, insignia de bolsillo y en sus consumidores directos (barra lateral, barras móviles, calendario, deudas, filas de gastos y bolsillos, resumen, menú de usuario) y en los botones públicos.
  - **Botones:** variante `access` de C para los accesos públicos y los envíos de autenticación (52px en contenido, 44px en cabecera); `brand-action`, `--brand-action-*` y `--chart-1…5` retirados tras migrar sus consumidores (los iconos de muestra de la home usan azul, Negative, Positive y Caution). `Button` y `FtButton` ganan `loading` (deshabilita, `aria-busy`, indicador en lugar del icono inicial, mismo tamaño) y deshabilitado sin opacidad. La home navega con enlaces (`HomeAuthButton` es un `<a>` que conserva la comprobación de sesión); «Entrar a mi cuenta» pasa a discreta para no competir con el acceso principal.
  - **Campos y mensajes:** borde de control, hover, foco con halo, inválido, deshabilitado y solo lectura en `Input` público y `inputClassName`/cajas con prefijo del espacio de trabajo; errores con icono (`FieldError`, `FormAlert`) asociados por `aria-describedby`. Las descripciones de Google y GitHub ya no se truncan en móvil (corregido en `auth-social-buttons.tsx`). `TextLink` y `ftInlineActionClassName` dan 44px de objetivo a enlaces y acciones en línea.
  - **Insignias:** variante `accent` opaca (7.6:1) para «Primera base visual», «Acceso seguro» y «Crear cuenta».
  - **Verificación:** `pnpm lint`, `pnpm typecheck` y `pnpm test` (23 archivos, 225 pruebas, 6 nuevas de `loading` que fallan contra los botones anteriores) pasan; `pnpm build` pasa en `.local/build-t5`. Con PostgreSQL aislado, API de QA y usuario sintético: foco sin estilo visible en los 12 primeros Tab de mes, deudas, calendario, resumen y ajustes pasa de 9–10 a 0 (`.local/qa-task5/antes` y `despues`); 39 tabulaciones del mes a 1440 y 33 a 375 sin fallos; colores forzados con contorno de sistema; drawer abierto con Enter, foco inicial dentro, 30 Tab sin salir, Shift+Tab dentro, Escape cierra y devuelve el foco (1440 y 375); Espacio y Enter en segmentado e interruptor; envío de login retenido: deshabilitado, `aria-busy`, 510×52 sin cambio y ningún segundo envío; errores con icono y `aria-describedby`; contraste de píxeles en home, login y registro 6 → 0 fallos; zoom 200 % (720×450) y 320px sin desbordamiento horizontal. Arnés `qa/browser/run.mjs`: 39 de 39 escenarios aprobados (F-AUTH-01 con la API en TTL de 40 s).
  - **Pendientes para la tarea 6:** los inputs internos de las cajas con prefijo miden 42px dentro de una caja de 44px que recibe el toque (el medidor los marca); `Card` pública y `Panel` no cambian; el `AlertDialog` de `finance-shell.tsx` duplica el estilo de `ConfirmDialog` porque tiene tres acciones; `select.tsx`, `tabs.tsx`, `checkbox.tsx` y `skeleton.tsx` de `shared/ui` no tienen consumidores y conservan estilos shadcn (opacidad al deshabilitar), candidatos a retirarse; la barra lateral sigue sobre Sheet (DESIGN.md pide Panel).

- **2026-10-14:** correcciones de Claude a los dos hallazgos de Codex en la tarea 5, sin commits, pendientes del cierre de la revisión de Codex.
  - **Tamaño durante `loading`:** el indicador se añadía al flujo y ensanchaba los botones de ancho intrínseco sin icono inicial. Reproducido en navegador antes del arreglo: «Actualizar contraseña» (`account-security-panel.tsx`) pasaba de 177,7×40 a 201,7×40 px a 1440 y de 177,7×44 a 201,7×44 a 375. Nueva pieza `shared/ui/loadable-content.tsx`, usada por `Button` y `FtButton`: la etiqueta real (nombre accesible) y una capa de carga `aria-hidden` con indicador y etiqueta legible comparten celda, así que reposo y carga miden igual; sin icono inicial se reserva el espacio del indicador en reposo. Después: 201,7×40 y 201,7×44 en reposo y en carga; «Agregar» con icono inicial 108,1 px estable; login a ancho completo 510×52 y 285×52 estables. En los tres casos hay `disabled` y `aria-busy`, y la petición retenida no se duplica. `save-indicator.tsx` usa la misma primitiva y queda cubierto por el mismo contrato; su estado de fallo de guardado no se provocó en navegador. Evidencia: `.local/qa-task5/hallazgos-antes/` y `hallazgos-despues/` (JSON y capturas de reposo y carga), herramienta `.local/qa-task5/tools/loading-size.mjs`.
  - **`disabled` con `asChild`:** ambas primitivas lo extraían sin pasarlo a `Slot.Root`. Ahora llega al hijo cuando es un `<button>` nativo. Un enlace no se bloquea con `disabled`: queda documentado en `DESIGN.md`, sin suponer lo contrario.
  - **TDD:** `src/shared/ui/button.test.ts` añade 4 pruebas de `asChild` (con y sin `disabled`, en ambas primitivas); las de `disabled` fallaron antes del arreglo (2 rojas) y pasan después. El nombre accesible se comprueba excluyendo los subárboles `aria-hidden`. El defecto de tamaño se reprodujo y se verificó en Chrome real, porque Vitest corre en node sin layout.
  - **Arnés:** F-UI-16 de `qa/browser/run.mjs` buscaba la etiqueta como texto hijo directo del botón; ahora toma el primer texto visible descendiente. No cambia lo que mide.
  - **Verificación:** `pnpm lint` y `pnpm typecheck` pasan; `pnpm test` pasa con 23 archivos y 229 pruebas; `pnpm build` pasa en `.local/build-t5`; `pnpm qa:runner` pasa 10 de 10; `git diff --check` limpio. Navegador con build de producción, PostgreSQL aislado y usuario sintético: arnés completo 37 aprobados, F-UI-16 aprobado tras el ajuste y F-AUTH-01 aprobado con TTL de 40 s. Sin Neon ni cambios en el backend.
  - **Correcciones del Project Owner conservadas:** «Bienvenido a la app de FinTrack OS» mantiene `text-4xl sm:text-5xl` y su degradado; el envío del login sigue en azul sólido (`variant="default"`); los accesos de navegación siguen claros; C gris claro, sin partículas ni WebGL.

- **2026-10-15:** tarea 6 implementada por Claude, sin commits, pendiente de revisión de Codex. Referencia: muestras de autenticación y dashboard del artifact C (`.local/landing-abc/project/SystemC.dc.html` y `qa/capturas/c-final/C-sistema-*`), con las correcciones vigentes del Project Owner.
  - **Shell:** barra lateral sobre Panel como en la muestra C (hover Panel Strong, página actual Blue Wash, mes actual en chip Sheet, punto de mes planificado con borde de control); toda la tinta de la barra pasa a secundaria (la terciaria no alcanza 4,5:1 sobre Panel), igual que el indicador «Cambios guardados». El esqueleto de carga usa la misma superficie. Barras móviles sin cambios (Sheet).
  - **Autenticación:** tarjeta sólida (sin vidrio) con logo compacto como en C; recuperación sin pasos truncados («Nueva contraseña») y paso actual marcado con `aria-current`; callback OAuth con marca, acceso principal claro y salida discreta. El botón «Mostrar contraseña» se rehízo (`PasswordToggle`, 5 usos): antes saltaba ~25 px al pulsarlo (el `translate-y-px` de `active` anulaba `-translate-y-1/2`), mostraba un bloque gris pegado al borde en hover y el anillo de foco montado sobre el borde; ahora ocupa el alto del campo, solo cambia la tinta del icono y su foco es interior. Se conservan «Acceder a FinTrack OS» azul sólido y «Bienvenido a la app de FinTrack OS» intacto.
  - **Espacio de trabajo:** campos a 16 px en móvil y 14 px desde 1024 px; inputs con prefijo de 44 px reales; buscador de Gastos en su propia fila por debajo de 1024 px (antes recortaba el placeholder a 768); métricas de Deudas junto a su etiqueta (antes quedaban al fondo de la celda) y sin la píldora que repetía el titular; chips del calendario en dos líneas y próximos pagos sin truncar; etiquetas progresivas («Copiando…», «Creando…», «Guardando…») vía `loadingLabel` sin saltos de tamaño; el aviso de cambios sin guardar comparte estilo y devolución de foco con `ConfirmDialog`.
  - **Arnés:** `qa/browser/cdp.mjs` calcula el nombre accesible sin los subárboles `aria-hidden` (antes concatenaba la capa de carga y FR-02-debt-form fallaba con «Guardar deuda» como nombre exacto).
  - **Verificación:** `pnpm lint` y `pnpm typecheck` pasan; `pnpm test` pasa con 23 archivos y 231 pruebas (2 nuevas de `loadingLabel`); `pnpm build` pasa en `.local/build-t5`; `pnpm qa:runner` pasa 10 de 10; `git diff --check` limpio; detector de Impeccable con 0 hallazgos. Navegador con build de producción, PostgreSQL aislado y usuarios sintéticos: 13 pantallas (login, error de login, registro, recuperación, callback, mes, drawer de gasto, deudas, drawer de deuda, calendario, resumen, configuración y mes vacío) a 1440, 768, 390 y 375 sin scroll horizontal ni excepciones; foco visible en todas las paradas Tab auditadas (mes 39/36/33 a 1440/768/375, colores forzados y zoom 200 %); drawer con foco inicial dentro, 30 Tab sin salir, Escape y devolución de foco a 1440, 768 y 375; errores con icono y `aria-describedby`; carga del login 510×52 estable sin segundo envío; contraste de píxeles 0 fallos en login, registro, recuperación y callback a 1440/768/375. Arnés completo: 38 aprobados y F-AUTH-01 aprobado en su corrida separada con TTL de 40 s. Evidencia en `.local/qa-task6/` (`antes/`, `despues/`, `auditoria/`, `contraste/`, `toggle-antes/`, `toggle-despues/`, `regresion-final/`, `regresion-ttl/`).
  - **Pendientes y límites:** las barras de la gráfica anual son paradas de teclado de 13 px de ancho (sus cifras están en la tabla mensual de la misma pantalla); la verificación de correo tras registrarse y los estados de error de guardado se revisaron por código y por el arnés, no con capturas propias; los envíos de registro, verificación y recuperación siguen en la familia Access (la corrección del Owner solo nombra el login): conviene confirmar si deben pasar a azul sólido; los componentes sin uso de `shared/ui` (`select`, `tabs`, `checkbox`, `skeleton`) no se tocaron.

## Historial — Elección anterior de B — 2026-10-12

Registro histórico, sustituido por la preferencia posterior por C al final de este documento.

El Project Owner elige **B**, conservando su composición y dirección editorial. Pide que la landing no esté hecha enteramente de partículas y rechaza los diseños extraños y paneles oscuros de la C revisada («Estudio claro»).

- Concentrar la escena de partículas en el hero, con cualquier uso posterior como acento puntual que no compita con el contenido.
- Mostrar hoja mensual, bolsillos, deudas, pasos y FAQ con HTML, demos y capturas claras; el protagonismo en esas secciones es del producto.
- Usar fondos claros, superficies blancas y tinta oscura, también en el footer; evitar los grandes paneles oscuros de C y el footer en tinta propuesto originalmente para B.
- Conservar el degradado de marca, la navbar sencilla y los botones claros con borde fino e icono sin círculo.
- Mantener las transiciones discretas y accesibles. La elección de B no elimina Three.js ni permite fingir una escena WebGL con un dibujo Canvas 2D.
- Claude actualiza B en el artifact y muestra escritorio y móvil; esta selección no demuestra que el ajuste esté aplicado ni que el QA móvil/GPU haya pasado.

Esta instrucción del Project Owner prevalece sobre el objetivo histórico de producir tres alternativas y sobre cualquier reparto de partículas o panel oscuro en la propuesta inicial. El mega prompt original se conserva íntegro como fuente técnica.

### Revisión del reporte de B ajustada

Claude informa que B ya concentra partículas en hero y un único acento de `#acceso`, usa demos en las demás secciones y conserva superficies/footer claros. Es un reporte de propuesta, no una inspección visual independiente ni evidencia de WebGL de producción.

Antes de cerrar la revisión del artifact quedan dos comprobaciones:

- Verificar en navegador real escritorio 1440×900 y móviles 390×844 y 375×844; registrar capturas y overflow, recortes, controles y legibilidad reales.
- Corregir la tabla que define demos con aparición «una sola vez»: la regla principal del mega prompt exige scroll reversible con `scrub: 1`, sin `once`, `toggleActions` ni callbacks que escriban estado. Los reveals de 16px deben depender de posición o permanecer estáticos. El ejemplo Lumora incluye reveals once, pero no sustituye esta regla principal específica.

El pin y el motor Three.js se verifican al implementarlos; una maqueta con Canvas 2D no prueba esos gates.

## Historial — Preferencia anterior por C con paneles gris claro — 2026-10-12

El Project Owner indica: «Me gusta C ahora más con los paneles no oscuros, más bien grises en vez de blancos».

- Tomar C como base de refinamiento visual, con paneles gris claro y diferencias de tono suaves respecto al fondo; evitar paneles negros y bloques blancos dominantes.
- Conservar la navbar sencilla, la familia de botones clara, el degradado azul → violeta → rosa/coral y el contenido aprobado.
- Mantener contraste, tipografía y jerarquía verificables sobre las nuevas superficies; las mediciones de B no aprueban automáticamente C.
- Decisión resuelta explícitamente por el Project Owner: **«C sin partículas ni WebGL»**. No instalar Three.js, `@types/three` ni `postprocessing` para esta landing, ni arrastrar el contrato de GPU/shaders/bloom de las propuestas anteriores.
- La revisión independiente de la evidencia de B se detuvo al cambiar la dirección; no se otorgó un aval final de esa revisión ni se modificó el artifact desde Codex.
- Claude refina C en el artifact con paneles gris claro y después prepara el sistema visual y la implementación elegida. Las capturas y mediciones de B no sustituyen la verificación de C.

### C refinada y revisión de continuidad

Claude entrega C con fondo `#F3F5F8`, paneles `#EBEEF3` y `#E4E8EF`, hojas de datos blancas, footer gris y cero partículas/canvas. Propone únicamente movimiento reversible del fondo del hero mediante CSS, con fallback estático y reduced motion; el resto permanece estático. No se requieren Three.js, GSAP ni Lenis para esta dirección.

Codex inspeccionó las capturas locales de primera vista de escritorio 1440×900 y del recorrido inicial móvil 375×844, además del informe móvil correspondiente. La composición y los paneles son coherentes con la elección; no se observaron bloqueos visuales en esas capturas. El JSON de 375px marca dos candidatos de solapamiento entre cajas de spans del titular, aunque los glifos se leen separados en la captura. No se convierte esa marca automática en un fallo visual ni se afirma que todo el artifact se haya inspeccionado en vivo.

Las capturas/reportes completos de Claude están en `.local/landing-abc/qa/capturas/c-final/`. Su comprobación sigue limitada al prototipo/exportación estática; no certifica SEO, rendimiento, menú con teclado ni comportamiento dentro de la app.

**Siguiente trabajo a cargo de Claude:** trasladar esta dirección a `DESIGN.md` y tokens, componentes, superficies del producto y landing; conservar las correcciones de errores y migraciones realizadas durante esta sesión. La autorización de implementación la da el Project Owner al encargar ese paso a Claude. La selección visual no autoriza commits, push ni despliegue.

### Revisión técnica de la tarea 3 — 2026-10-14

Codex revisó el diff, aliases y reglas de uso con una exploración delegada, inspeccionó capturas del espécimen y login móvil, recalculó contrastes clave y sumó los nueve informes de legibilidad por fase. El alcance de sistema visual/tokens queda validado técnicamente; no es un aval de accesibilidad de todas las pantallas.

Se corrigieron dos precisiones documentales: la comparación de píxeles reales es **12 → 6**; los rellenos de degradado profundo con texto blanco solo admiten texto grande de al menos 24px o uso decorativo, porque no garantizan 4,5:1 para texto normal. No se alteraron colores ni comportamiento al corregir esas reglas.

Los seis casos restantes son las insignias de home/login/registro en dos anchos móviles, ya presentes antes del cambio y asignadas a tareas 5/6. El recorte de las descripciones OAuth es un hallazgo independiente. Se mantienen las restricciones de tinta terciaria sobre paneles y de controles directamente sobre Panel Strong. Los aliases revisados corresponden a los nuevos roles compartidos; esto no implica que no existan literales heredados en todo el CSS.

No se repitieron suites/build para estas correcciones de documentación y un comentario CSS. Dashboard autenticado, interacciones reales de todos los componentes y QA integral siguen pendientes de las tareas posteriores. La siguiente tarea es la 4, integración de marca.

### Revisión técnica de la tarea 4 — 2026-10-14

Codex revisó el componente y sus consumidores, los recursos locales de marca, la metadata generada en la build y la evidencia local de navegador; inspeccionó la imagen para compartir y la captura de foco móvil. No encontró bloqueadores en este alcance. El PNG oficial es suficiente: crear un SVG no es requisito para continuar. Se precisó en `DESIGN.md` que un `width` explícito no recalcula la altura del símbolo; los usos actuales con tamaños predefinidos conservan su proporción.

Esta revisión no repitió las suites ni los recorridos de navegador reportados por Claude. Se conservan para después la limpieza coordinada de Cloudinary (dependencia, configuración y borrador de proveedores), el dominio final para `NEXT_PUBLIC_SITE_URL` antes del despliegue y la regeneración de la imagen OG si cambia el copy. La ausencia del logo en las barras con selector de mes es previa y se revisa en la tarea 6.

**Avance histórico por checklist: 3 de 10 tareas cerradas técnicamente o por elección visual (30%); no es una estimación del tiempo restante.** La tarea 1 mantiene sus pendientes legales. Sigue la tarea 5: componentes coherentes, corrección del foco invisible heredado, insignias con contraste suficiente, bordes de controles y estados completos. La landing completa corresponde a la tarea 7. No se autorizan commits, push, merge ni despliegue con este cierre técnico.

## Historial — Entrega de Codex — 2026-10-16

Tareas 7 y 8 implementadas y verificadas localmente. Hero frontal, cuatro capítulos de producto con transiciones reversibles, móvil en flujo y fallback estático; sin partículas, WebGL ni dependencias de animación nuevas. Lint, typecheck, 241 pruebas, build aislado, contrato del arnés 10/10 e interacciones de landing 12/12 aprobados. Responsive en siete tamaños y estados de recarga, reversibilidad y movimiento reducido comprobados en Chrome. Evidencia, rangos y límites en [QA de la landing](qa-landing-cinema.md). Las casillas 7/8 conservan la revisión visual del Owner pendiente; no se declara aprobación de producción. Sin commits, push, merge ni despliegue.


</details>
