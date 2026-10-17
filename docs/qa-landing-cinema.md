# Landing: producto en movimiento — verificación del 16 de octubre de 2026

> **Informe histórico de una composición anterior.** El hero frontal descrito aquí fue sustituido por el hero SkyElite SVG/CSS aprobado posteriormente. Las secciones inferiores también se refinaron después. El estado y la evidencia técnica vigentes se encuentran en [qa-design-release.md](qa-design-release.md), y el diseño en [DESIGN.md](../DESIGN.md). No trasladar las capturas o métricas de este corte a la versión actual.

## Entrega

Implementación del plan aprobado por el Owner, en `feat/landing-design`, sin commits, push, merge ni despliegue. Tareas 7 y 8 implementadas y verificadas localmente; pendientes de revisión visual del Owner. Las tareas 2–6 siguen cerradas: 50% del checklist cerrado, sin contar esta entrega como aprobada automáticamente.

Se combinan la composición editorial de A, la continuidad del recorrido de B y las demostraciones claras de C. El hero conserva «Bienvenido a la app de FinTrack OS», 36/48px y su degradado, con una composición frontal de movimientos alrededor de la hoja. No usa la app isométrica del hero C. Paneles y footer claros/grises; las hojas de datos son blancas. Las cifras proceden de `landing-sample.ts`, calculadas con el dominio existente y marcadas como datos de ejemplo.

Se retiraron el motor de partículas, sus siete archivos y las dependencias `three`/`@types/three`. No se incorporaron librerías. La instalación activa de dependencias se conservó; el lockfile se recalculó en modo offline y lockfile-only. `.pnpm-store/` se ignora como artefacto local.

## Movimiento y rangos

`StoryMotion` mejora el HTML del servidor con Web Animations API pausada; `currentTime`, recortes y progreso dependen de la posición. No hay reproducción continua, temporizadores de escena ni actualizaciones React por frame. Geometría cacheada, listeners pasivos, un frame pendiente como máximo, pausa con pestaña oculta y limpieza al desmontar.

En escritorio (ancho ≥1024 y alto ≥720, movimiento permitido), la escena queda sticky y los cuatro capítulos conservan espacio de lectura de 90svh. El progreso `p` va de 0 a 1 entre el centro del primer y el último capítulo, tomando el centro del viewport como posición. Los recortes complementarios evitan que se transparenten dos textos.

| Momento | Rango aproximado de p |
| --- | --- |
| Hoja mensual, lectura | 0–0,117 |
| Transición hoja → bolsillo | 0,117–0,217 |
| Bolsillo, lectura | 0,217–0,450 |
| Transición bolsillo → deudas | 0,450–0,550 |
| Deudas y colchón, lectura | 0,550–0,783 |
| Transición deudas → resumen | 0,783–0,883 |
| Resumen anual, lectura | 0,883–1 |

Los movimientos del hero se desplazan hasta 24px lateralmente y 24–49px hacia arriba, atenuándose a medida que sale el hero (avance sobre el 85% de su alto). No se animan cifras ni barras para simular valores intermedios.

En móvil, tablet y pantallas bajas las escenas y sus textos alternan en flujo normal, sin sticky. Solo los elementos de las demos recorren hasta 12px y pasan de opacidad 0,8 a 1 al entrar. Sin JavaScript, sin WAAPI o con movimiento reducido, todo queda en flujo y estático. Activar movimiento reducido durante la visita cancela la mejora. El anclaje automático del navegador está desactivado dentro de la landing para evitar que la mejora cambie la posición al recargar.

Las escenas decorativas no tienen controles ni reciben foco; las cifras y tablas pertinentes también están en el contenido semántico. Los accesos siguen usando los componentes existentes de sesión.

## Validaciones ejecutadas

| Comprobación | Resultado |
| --- | --- |
| ESLint de todo el frontend | aprobado |
| TypeScript sin emitir | aprobado |
| Vitest completo | 25 archivos, 241 pruebas aprobadas; incluye 6 nuevas del progreso y reversibilidad |
| Build Next.js | aprobado, copia aislada `.local/build-cinema/frontend`, sin tocar `.next` del dev |
| Contrato del arnés de navegador | 10/10 aprobadas |
| `git diff --check` | aprobado |
| Chrome producción: menú móvil 768/390/375, anclas, CTA con/sin sesión, teclado 1440/390, no-JS móvil, reflow y 320px | 12/12 escenarios aprobados |
| Chrome producción: 1440×900, 1024×768, 768×1024, 390×844, 375×844, 320×740 y 720×450 | sin desbordes horizontales, títulos/enlaces fuera del ancho, imágenes rotas ni excepciones JS en la comprobación acotada |
| Fotogramas de escritorio | mismo estado al bajar/subir en cinco posiciones, incluida transición; misma posición y estado tras recargar a mitad; escenas sin hijos recortados por abajo |
| Movimiento reducido en caliente | sin sticky y cero animaciones en la historia |
| Sin JavaScript | cuatro capítulos, contenido y navegación conservados |
| Contraste sobre superficies sólidas | 16 muestras de sección/ancho a 1440/375, sin fallos en los textos medidos |

Herramienta: Chrome instalado, headless, controlado por scripts propios de Node/CDP. No es Playwright, axe ni Lighthouse. Las peticiones a la API se interceptaron: sesión sintética para el CTA autenticado y bloqueo del resto. No se accedió a Neon ni se crearon cuentas reales.

El contraste utiliza colores calculados y el fondo sólido ancestro; excluye texto en degradado y estados parcialmente transparentes. No es una nueva medición por píxeles de todos los fondos. Se inspeccionaron capturas del hero desktop/móvil y de las escenas, incluyendo la transición. El título conserva el degradado previamente verificado.

## Evidencia local y reproducción

- `.local/qa-landing-cinema/report.json`: tamaños, modo, reversibilidad, recarga, movimiento reducido, no-JS y excepciones.
- `.local/qa-landing-cinema/interactions/resultados.json`: doce escenarios de interacción, todos aprobados.
- `.local/qa-landing-cinema/contrast.json`: medición acotada de contraste.
- `.local/qa-landing-cinema/`: capturas `hero-*`, `sheet-*`, `sequence-*`, `no-js`, `reduced`; subcarpeta `interactions/` con menú, foco y reflow.
- Scripts locales: `audit.mjs`, `interactions.mjs`, `contrast.mjs`. Usaron la build aislada en el puerto 3377, detenido al terminar. `audit.mjs` admite `QA_URL`; `interactions.mjs` admite URL y directorio de salida.

Los comandos de validación usaron los binarios ya instalados (`node node_modules/eslint/bin/eslint.js`, `node node_modules/typescript/bin/tsc --noEmit --incremental false`, `node node_modules/vitest/vitest.mjs run`, `node --test qa/browser/runner.test.mjs`). La compilación aislada usó `node node_modules/next/dist/bin/next build` y una raíz de Turbopack temporal que incluye la unión a dependencias. No se modifica la configuración real para ese procedimiento.

## Pendientes y límites

- Revisión visual del Owner; después, búsqueda y ordenación de Deudas, QA integral y versionamiento/CI autorizado.
- No se repitieron en esta entrega las operaciones financieras autenticadas ni toda la suite API/PostgreSQL: el alcance de navegador fue la landing y sus destinos.
- Sin Lighthouse, Safari/Firefox, dispositivos físicos, lector de pantalla ni medición de rendimiento representativa de producción.
- El build avisa que falta `metadataBase` mientras no se defina `NEXT_PUBLIC_SITE_URL` con el dominio de despliegue. No se inventó un dominio.
- Legales y verificaciones externas de despliegue siguen pendientes. No se publicaron enlaces legales vacíos ni nuevas promesas comerciales.
- Se preservaron el mega prompt, las referencias originales y los cambios previos de autenticación y errores.
## Ajuste del hero: tarjetas flotantes — 2026-10-16

Por petición del Owner, las tarjetas pequeñas del hero ahora recorren órbitas elípticas cortas e inclinan suavemente su contenido, con la hoja central estable. Es una animación ambiental independiente del progreso por scroll de los cuatro capítulos; estos conservan su reversibilidad. Nuevo componente `hero-orbit-motion.tsx`, sin dependencias adicionales ni un bucle JavaScript por frame.

- Radios de 24×14px en escritorio y 6×4px por debajo de 768px; inclinación ±2,4° y periodos de 11–16 segundos, con fases diferentes.
- Control «Pausar animación» / «Reanudar animación», área mínima de 44px y estado `aria-pressed` de pausa manual. Sin JavaScript o con movimiento reducido, la escena queda estática y el control no se muestra.
- Pausa automática cuando el visual sale de pantalla o la pestaña queda oculta. Al desmontar se cancelan las animaciones y se limpian los observadores.
- Nueva verificación en Chrome contra el dev: 1440, 768, 375 y 320px; movimiento visible, hoja central estable, pausa y reanudación, cinco fases sin tarjetas fuera del viewport, pausa al salir del viewport, movimiento reducido en caliente, cero excepciones y fallback sin JavaScript. Evidencia en `.local/qa-hero-orbit/` (`report.json`, `audit.mjs`, capturas).
- Typecheck, lint de los componentes y build aislado aprobados. No se repitió la suite financiera ni se usó Neon. El build conserva el aviso conocido del dominio sin definir. No hubo commits ni despliegue.
