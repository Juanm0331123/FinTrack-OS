# Revisión independiente de la remediación frontend

Fecha: 10 de octubre de 2026, America/Bogota.

Este documento conserva el resultado de la auditoría **anterior a sus correcciones**. El estado posterior, con nuevas regresiones y validaciones, se registra en [Cierre técnico del QA frontend](qa-frontend-cierre.md). La revisión del Excel original, encontrado después de esta auditoría, está en [Paridad financiera](qa-excel-paridad.md).

## Dictamen

**Remediación todavía no aprobada.** Se confirmaron tres defectos residuales de producto y un defecto de la herramienta de QA. Las pruebas existentes pasan, pero no cubren los casos reproducidos aquí. No corresponde cerrar las 33 incidencias por el resultado verde de esas pruebas.

Esta revisión audita el código local sin aplicar correcciones de producto, crear commits, subir ramas, integrar ni desplegar. El informe original `docs/qa-frontend.md` y la matriz del implementador `docs/qa-frontend-remediacion.md` se conservan; este documento registra la revisión posterior.

## Código y método

- Rama: `fix/backend-qa-remediation`.
- HEAD: `156323368ff0231d414ea75ffa0d49a088c3ba17`.
- Las correcciones auditadas están en el working tree, incluidos archivos nuevos; el SHA de HEAD por sí solo no identifica esas correcciones.
- SHA-256 del diff de archivos tracked, obtenido con `git -c core.autocrlf=false diff`: `d2c462dd504a2161e9c9f4fa06c48b8b4930ac7323df69aacaa6751242838860`. Se verificó sin cambios durante la revisión. Este hash no incluye archivos untracked.
- Se inspeccionaron sesión, formularios, cola/store/API, copia e idempotencia, montos/fechas/cálculos, drawers, calendario, estilos, cabeceras y arnés de pruebas. Se aplicaron las skills del proyecto para QA React/Next, ingeniería React y pruebas de API, con las adaptaciones de sus `AGENTS.md`.
- Navegador: Chrome 154 headless mediante el CDP del proyecto, con perfil de prueba. **No se ejecutó Playwright, Lighthouse, Safari ni Firefox.**
- Entorno integrado: build de producción Next.js → proxy → Express real → Prisma → PostgreSQL 18 aislado en Docker. Frontend `127.0.0.1:3300`, API `127.0.0.1:4420`, control de fixtures `127.0.0.1:4421`. Correo/OAuth falsos; usuarios y contraseñas sintéticos.
- No se accedió a Neon, proveedores reales ni recursos cloud. Los fallos HTTP 503 descritos son inyecciones controladas, identificadas como tales.

## Validaciones reejecutadas por el auditor

| Comprobación | Resultado observado |
|---|---|
| Frontend `pnpm lint` | Aprobado |
| Frontend `pnpm typecheck` | Aprobado |
| Frontend `pnpm test` | 187/187, 20 archivos |
| Frontend `pnpm build` | Aprobado, Next.js 16.3.8 |
| Frontend `pnpm audit --prod --json` | 0 avisos, exit 0 |
| Frontend `pnpm audit --json` | 1 aviso alto de desarrollo |
| Backend `pnpm typecheck` | Aprobado |
| Backend `pnpm test` | 112/112 |
| Backend `pnpm test:integration` | 146 aprobadas, 0 fallidas, 1 omitida; 147 totales |
| Backend `pnpm test:migrations` | 7/7 |
| Backend `pnpm prisma:validate` | Aprobado |
| Backend `pnpm exec prisma migrate status` | 6 migraciones; base local al día |
| Arnés permanente `qa/browser/run.mjs` | 34/34 escenarios aprobados contra la aplicación real |
| Pruebas adicionales de auditoría | Reprodujeron FR-01, FR-02, FR-03 y FR-04 |

La omisión de integración corresponde a SIGTERM real en Windows; **no se ejecutó una nueva CI Linux en esta revisión**. El nuevo caso de integración de F-DATA-12 sí pasó: creación y PATCH parciales con parte compartida superior al saldo se rechazan con 422 y preservan los valores guardados. No se volvió a ejecutar el smoke de la imagen Docker; el contenedor usado aquí es PostgreSQL de prueba.

Las pruebas unitarias y los 34 recorridos permanentes son evidencia positiva para sus escenarios, no una demostración de cobertura exhaustiva. La revisión no asigna un porcentaje de seguridad ni certifica ausencia de otros fallos.

## Hallazgos que impiden el cierre

La severidad expresa impacto; P1 exige corregir antes del lanzamiento público y P2 antes del aval integral de frontend. No se demostró un P0 en esta ronda.

| ID de revisión | Relación original | Prioridad | Severidad | Hallazgo |
|---|---|---|---|---|
| FR-01 | F-DATA-01; afecta la garantía de F-DATA-07 | P1 | Alta | Reintento de gasto de bolsillo sobrescribe una edición posterior y deja UI/base divergentes |
| FR-02 | F-DATA-05 | P1 | Media | Formulario con monto inválido permite enviar el último valor válido, distinto del visible |
| FR-03 | F-UI-04 | P2 | Media | Los seis selectores de categoría siguen con objetivo táctil de 40 px en móvil |
| FR-04 | Nuevo; ingeniería de QA | P2 | Media | El arnés devuelve éxito con casos fallidos y puede aprobar una página de error del navegador |

### FR-01 — Reintento antiguo de gasto de bolsillo

**Evidencia integrada:** partiendo de un gasto de bolsillo de 50:

1. Editar a 100 y provocar un 503 únicamente en ese PATCH.
2. Editar de nuevo a 200 y dejar que el PATCH real termine correctamente.
3. Consultar el libro por la API pública: el gasto vale 200.
4. Cerrar el drawer y pulsar «Reintentar» en el aviso de guardado.
5. Consultar de nuevo: el gasto vale **100**. La UI aún anuncia «Editar gasto de $ 200» y ya no muestra el reintento pendiente.
6. Recargar y abrir el gasto: la UI pasa a anunciar **100**.

También se reprodujo con el store real y una API sustituida en su frontera: secuencia de PATCH `[100, 200, 100]`; al terminar `server=100`, `ui=200`, `failed=0`, `pending=0`, `unsaved=false`.

**Causa:** `src/modules/finance/store/workbook-store.ts:542` usa `queue.run` en `updateSpend`; en la línea 551, el job captura el `cleaned` antiguo. `save-queue.ts:281` vuelve a encolar sin filtrar el job de tipo `run`. El control por revisión de campo solo se aplica al otro camino de escrituras, `patch`.

**Impacto:** pérdida de una edición financiera ya guardada, confirmación engañosa y divergencia de totales hasta recargar. El caso permanente F-DATA-01 pasa porque no demuestra este comportamiento de `updateSpend`.

**Criterio de cierre:** aplicar una política de revisión vigente también a estos PATCH de gastos; descartar campos obsoletos y reconciliar la respuesta sin pisar cambios posteriores. Añadir regresión permanente para 100 fallido → 200 exitoso → reintento, comprobando API, pantalla tras recarga y estado de guardado. Verificar además que la eliminación o cancelación del gasto no permita resucitar un trabajo antiguo.

### FR-02 — Guardar un valor diferente mientras el campo muestra un error

**Evidencia integrada:** abrir «Nuevo gasto», escribir un concepto, introducir `100` y reemplazarlo por `1.234,56`. El input conserva ese texto y tiene `aria-invalid="true"`, pero «Agregar gasto» está habilitado. Al pulsarlo, se cierra el drawer y la API confirma una fila nueva por **100**, sin exigir corregir el monto.

**Causa:** `src/modules/finance/ui/fields.tsx:45`, `useAmountDraft`, mantiene el texto/error local. Al fallar el parser no actualiza el valor del padre ni propaga su invalidez. `month/entry-drawer.tsx:289` habilita el envío por el concepto, sin comprobar ese error. La misma separación aparece en `debts/debt-drawer.tsx:340` y `month/pocket-spends.tsx:49`; la reproducción integrada de esta ronda se hizo en creación de fila, no en esos dos formularios.

**Impacto:** aunque el parser rechaza el formato, la acción de guardar persiste un monto que no corresponde al texto visible. El usuario puede creer que su entrada quedó aceptada o que no hubo cambios.

**Criterio de cierre:** comunicar la validez de cada borrador al formulario y comprobarla en el envío real. Mostrar el motivo asociado al campo y llevar el foco al error; no enviar mientras haya un borrador inválido. Añadir casos de formulario, no solo de parser: valor válido → texto inválido → submit; corregir después y demostrar que solo se persiste el valor correcto. Revisar filas, deudas y gastos de bolsillo que usan el mismo componente.

### FR-03 — Objetivos táctiles incompletos

**Evidencia:** en viewport de **375 × 844 CSS px**, los labels de Suscripción, Fijo, Bolsillo, Ahorro, Deuda y Otro miden **164 × 40 px**, todos. También se midieron 40 px de alto en escritorio. Los 44 px de otros botones no corrigen estos controles.

**Causa:** `src/modules/finance/month/entry-drawer.tsx:100` usa `min-h-10`, sin ajuste móvil a 44 px.

**Impacto:** la selección de categoría sigue incumpliendo el mínimo táctil de `frontend/AGENTS.md`. Este hallazgo se refiere al requisito de 44 px del proyecto; no pretende identificarlo como el mínimo de todos los criterios WCAG AA.

**Criterio de cierre:** hacer clicable al menos una caja de 44 px de alto por opción en anchos inferiores a 1024 px, mantener foco/teclado y comprobar su geometría en 375 y 768 px. Incluir radios/toggles en la cobertura de F-UI-04, además de botones e inputs.

### FR-04 — Resultados verdes que no pueden usarse como gate

Se probaron dos controles negativos con `QA_BASE=http://127.0.0.1:33998`, puerto local sin aplicación, manteniendo disponible el control de fixtures:

- `node qa/browser/run.mjs --only F-UI-02 --out <directorio-nuevo>` registra `status: "fallido"` por no encontrar el formulario de acceso. **El proceso termina con exit 0.**
- `node qa/browser/run.mjs --only F-UI-07 --out <otro-directorio-nuevo>` registra `status: "aprobado"` para `/login`, `/register` y `/forgot-password`. Los tres h1 observados son **«No se puede acceder a este sitio»**, la página de error de Chrome. El proceso también termina con exit 0.

**Causa:** `qa/browser/run.mjs:727` solo comprueba que haya un h1, sin confirmar página/origen/contenido de la aplicación. El bloque de ejecución, desde la línea 973 hasta el final, captura fallos y escribe JSON pero no establece un código de salida de error. `qa/browser/cdp.mjs` permite continuar después de la navegación fallida.

**Impacto:** una automatización que se guíe por el exit code puede aceptar una regresión; una assertion demasiado amplia puede aceptar una página ajena. Esto no invalida los 34 recorridos observados contra la aplicación disponible: demuestra que el ejecutor y sus precondiciones requieren corrección.

**Criterio de cierre:** exit distinto de cero ante cualquier caso fallido; estados bloqueados explícitos que no cuenten como aprobación; verificar navegación/origen y contenido esperado antes de assertions. En F-UI-07 comprobar el heading concreto de cada página real. Incorporar una prueba negativa con aplicación inaccesible y otra con assertion forzada a fallar. Evitar que resultados antiguos mezclados con la corrida actual se presenten como verificaciones recién ejecutadas.

## Estados restantes y límites del aval

- **F-DATA-01, F-DATA-05 y F-UI-04 siguen parcialmente corregidas**, con contraejemplos anteriores. F-DATA-07 tampoco puede considerarse una garantía general de reconciliación de todos los tipos de edición mientras persista FR-01.
- El resto de resultados locales positivos de la matriz del implementador se respalda con revisión y suites reejecutadas para el alcance descrito. No se convierte en «30 cierres exhaustivos» por resta: cada cierre final debe conservar evidencia de su comportamiento y sus límites.
- **F-DATA-04 y F-DATA-06:** los tests de cálculos pasan; la paridad con el Excel original continúa bloqueada por falta del libro. No se certificó esa paridad.
- **F-ENG-02:** permanece un aviso alto de `braces` en herramientas de desarrollo. La [advisory oficial GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) incluye versiones hasta 3.0.3 y no publica una versión corregida a la fecha de consulta. El audit de producción de esta revisión da cero avisos. El residual necesita seguimiento o una excepción explícita documentada; no se presenta como audit completo limpio.
- **F-UI-09/10/11/12:** botones, paleta, logo y landing permanecen en la tarea de diseño separada. No fueron implementados ni cerrados aquí.
- Se descartó una hipótesis de hidratación en login/register con verificación pendiente: tras cargar almacenamiento de sesión y recargar ambas rutas, aparecieron seis inputs OTP sin React 418 ni excepciones. No se registra como defecto.
- Falta staging con Vercel → Cloud Run, dominios, TLS/cookies/proxy reales; comprobaciones de Neon; correo/OAuth reales; Safari/Firefox, dispositivos físicos y lectores de pantalla; rendimiento representativo con throttling. La muestra local del arnés no constituye un aval de Core Web Vitals.
- La CSP actual aporta restricciones de framing, base y objetos; no se probó una política completa de scripts con nonces. Ese pendiente del implementador se conserva.

## Material de landing preservado

Se comprobaron los hashes de los dos originales sin cambios:

| Archivo | SHA-256 |
|---|---|
| `docs/landing-mega-prompt-original.md` | `1f6e545a36e076c380c925913559ac0242a2a5dfb60b711889ff3c1bc916134a` |
| `docs/references/fintrack-os-gradient-reference.png` | `360af65b47af89ccf1b98903f4d9600a976c8187bf45ccdc38e7b44d51f7a7e6` |

El mega prompt conserva Lumora, Vesper, New Era y el ejemplo completo. Los borradores de dirección visual y términos/privacidad siguen pendientes de aprobación; esta auditoría no los publica ni altera.

## Reproducción y siguiente revisión

El procedimiento permanente para preparar API de prueba, PostgreSQL, proxy y variables está en `docs/qa-frontend-remediacion.md`. Ejecutar las suites de cada boundary con `pnpm`; para el recorrido usar `node qa/browser/run.mjs --out <directorio-nuevo>`. Hasta corregir FR-04, inspeccionar también el JSON de **cada escenario**, sin confiar únicamente en el exit code.

La evidencia temporal de esta revisión está en `.local/frontend-qa-audit-2/`: logs de comandos, `browser/results.json`, `browser-independent.json`, `spend-probe.json`, capturas `spend-stale.png`/`mobile-categories.png` y controles negativos `runner-failure-proof`/`runner-exit-proof`. Estos artefactos están ignorados; las reproducciones y resultados necesarios se describen arriba para no depender de ellos.

La próxima ronda debe corregir FR-01…04 con regresiones permanentes, reejecutar las suites y los contraejemplos, y presentar el nuevo diff para revisión independiente. El aval local técnico y el aval para producción deben expresar por separado las verificaciones externas pendientes. La landing continúa como tarea posterior de diseño.

Al cerrar esta revisión se eliminaron únicamente el contenedor PostgreSQL propio, identificado por su etiqueta de auditoría, y los procesos propios de API/frontend/Chrome. Los puertos de prueba quedaron libres. `git diff --check` pasó y el hash del diff tracked permaneció igual; el único entregable añadido por el auditor es este documento.
