# Cierre técnico del QA frontend

Fecha: 10 de octubre de 2026, America/Bogota. Estado: **FR-01…04 corregidos y comprobados localmente; F-DATA-04/06 cerrados bajo contrato aprobado**. La validación global local del ajuste final de cuota base está aprobada; el despliegue en producción requiere las verificaciones externas detalladas abajo.

## Alcance y versión

Esta ronda corrige los cuatro hallazgos de [la revisión independiente](qa-frontend-revision-independiente.md), conserva la remediación anterior y agrega regresiones permanentes. Rama preparada para versionar: `fix/frontend-qa-final`, creada desde `156323368ff0231d414ea75ffa0d49a088c3ba17`. Las correcciones están en el working tree: el SHA de HEAD por sí solo no identifica el código evaluado. El versionamiento y las comprobaciones de CI se registrarán cuando se ejecuten; no se realizó despliegue.

Se aplicaron las skills del proyecto para TDD, React/Next.js y QA de formularios, persistencia y navegador. Se conservan Vitest y el arnés CDP propio, sin incorporar runners ni dependencias nuevas. El entorno integrado usa build de producción Next.js, proxy, API Express/Prisma y PostgreSQL 18 aislado; todos los datos, usuarios, correo y OAuth son de prueba. No se usó Neon.

## Hallazgos y criterios de cierre

| ID | Prioridad / severidad | Corrección | Estado de comprobación |
| --- | --- | --- | --- |
| FR-01 | P1 / Alta | Los PATCH de gastos de bolsillo usan revisiones por campo, respuesta canónica y cancelación por gasto; comparten el orden de trabajo de su fila | Cerrado: unitarias y recorrido integrado aprobados |
| FR-02 | P1 / Media | El input monetario establece `customValidity`; los submits de filas, deudas y gastos comprueban `reportValidity()` | Cerrado: los tres formularios impiden envío inválido y guardan 200 al corregir |
| FR-03 | P2 / Media | Las seis categorías tienen una caja clicable mínima de 44 px en anchos inferiores a 1024 px | Cerrado: seis controles de 44 px de alto en 375 y 768 px |
| FR-04 | P2 / Media | Fallos y bloqueos producen exit distinto de cero; se rechazan navegación fallida, origen ajeno y headings incorrectos; las salidas contienen solo la corrida actual | Cerrado: reejecución de los ocho controles negativos/positivos aprobada |
| F-DATA-04 | P1 / Media | Contrato aprobado: vacío/null sin tope; 0 sin extra, mínima como base acotada al saldo, reserva del presupuesto y aviso de incompatibilidad | Cerrado localmente: regresión observada fallar antes del ajuste de base; casos suficientes/insuficientes aprobados |
| F-DATA-06 | P1 / Media | Contrato aprobado de centavos con mitad alejándose de cero; tasas conservan precisión propia | Cerrado localmente: fórmula de referencia y normalización de app diferenciadas; regresiones de intermediarios aprobadas |

### FR-01: una edición posterior no se pierde al reintentar

La causa era un trabajo `run` que capturaba un PATCH antiguo sin comprobar la revisión vigente de cada campo. `workbook-store.ts` ahora usa `queue.patch` con una clave por gasto y el grupo de orden de su fila. La eliminación cancela su trabajo; las respuestas canónicas actualizan únicamente campos que no tienen una edición posterior. La copia de hoja también conserva gastos tocados durante su respuesta.

Regresiones permanentes en `workbook-store.test.ts`: `100` fallido → `200` guardado → reintento; reintento de campos independientes; respuestas canónicas con edición posterior; eliminación; creación lenta; copia de mes; cancelación/desmontaje. El caso integrado `FR-01-spend-retry` comprueba que API, UI y recarga conservan **200**, y que el fallo deja de aparecer sin reenviar **100**.

### FR-02: el formulario no envía un monto diferente del visible

`aria-invalid` informaba del error pero no bloqueaba el envío. El modelo conservaba el último valor válido para autosave. Ahora el error del parser participa en Constraint Validation del navegador; al intentar enviar se mantiene el formulario y se enfoca el campo. Corregir el texto limpia la restricción. Los guards de submit cubren también un evento sintético que omita la validación nativa inicial.

Los casos `FR-02-entry-form`, `FR-02-debt-form` y `FR-02-spend-form` introducen **100**, lo reemplazan por **1.234,56** y prueban click, Enter y evento submit: no debe salir un POST. Después corrigen a **200** y verifican por la API pública una única creación con **200**. Los errores siguen asociados al input y anunciados de forma accesible; no se cambiaron fórmulas financieras.

### FR-03: controles de categoría realmente clicables

`FR-03-category-targets` mide las cajas de los labels de Suscripción, Fijo, Bolsillo, Ahorro, Deuda y Otro en **375 × 844** y **768 × 844 CSS px**. Exige al menos **44 × 44 px** y verifica que las seis opciones estén presentes. Se conserva el input radio con su comportamiento nativo de teclado y foco. El criterio de 44 px procede del requisito táctil del proyecto.

### FR-04: el ejecutor puede bloquear una regresión

`qa/browser/runner.test.mjs` comprueba el comando público con escenarios fallidos, aplicación inaccesible, heading ajeno, escenario bloqueado, selección aprobada, salida relativa, selecciones vacías/desconocidas y redirecciones. Una redirección interna de autenticación está permitida; una externa es rechazada. No se reutilizan resultados anteriores como evidencia recién ejecutada.

El nuevo job `frontend-browser` de `.github/workflows/ci.yml` prepara PostgreSQL aislado, API, proxy y Chrome, ejecuta la build y guarda evidencia. La configuración se parseó localmente; **el job todavía no se ejecutó en GitHub**. La [imagen oficial Ubuntu 24.04 del runner](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md) documenta Chrome entre sus herramientas disponibles. Un archivo de CI válido no equivale a una corrida verde.

## Validaciones de esta ronda

| Comprobación | Resultado real |
| --- | --- |
| Cinco escenarios residuales contra la build anterior | Fallaron antes del fix con los síntomas reportados: reintento obsoleto, tres submits inválidos y categorías de 40 px |
| Frontend `pnpm lint` | Aprobado |
| Frontend `pnpm typecheck` | Aprobado |
| Frontend `pnpm test` | 205/205 aprobadas tras el ajuste final: 187 anteriores, 7 nuevas de gastos, 8 de fórmulas compartidas y 3 del contrato aprobado |
| Dominio financiero, selección tras aprobar contrato | 44/44 aprobadas: incluye cuota base con tope incompatible, presupuesto suficiente/insuficiente y precisión intermedia |
| Frontend `pnpm build` | Aprobado |
| Frontend `pnpm qa:runner` | 8/8 aprobadas en la reejecución final; exit 0 |
| Frontend `pnpm audit --prod` | 0 avisos; exit 0 |
| Navegador, selección completa local anterior | 39/39 aprobados contra API y PostgreSQL reales aislados antes del ajuste final de cuota base; la repetición sobre el commit final corresponde al job integrado de CI |
| Backend `pnpm typecheck`, Prisma generate/validate y migrate status | Aprobados; seis migraciones al día en PostgreSQL aislado |
| Backend unitarias / migraciones | 112/112 y 7/7 aprobadas |
| Backend integración | 146 aprobadas de 147; SIGTERM real omitido en Windows, debe ejecutarse en CI Linux |
| Backend auditoría completa | 0 avisos |
| `git diff --check` | Aprobado |
| CI GitHub | No ejecutada en esta ronda |

La primera ejecución después del fix aprobó 38/39: el nuevo caso de bolsillo tenía un locator ambiguo que elegía «Registrar gasto» detrás del drawer en lugar de «Registrar». Se corrigió el locator por rol y nombre exacto, se aprobó el caso y se repitió **la selección completa**, con 39/39. Este fallo del escenario no se ocultó mediante reintentos automáticos ni se contó como aprobación de la primera corrida.

No se ejecutó Playwright, Lighthouse, Safari ni Firefox en esta ronda. El backend se volvió a validar antes del versionamiento con un PostgreSQL 18 propio y aislado, retirado después de comprobar su label. No se ejecutó localmente el smoke Docker en esta revalidación: se comprobará en CI Linux, junto con SIGTERM.

## Excel: fuente encontrada y diferencias explícitas

El libro original se inspeccionó en **solo lectura**, sin copiarlo al repositorio ni publicar datos personales. Se revisaron ocho hojas y 240 fórmulas; ocho pruebas permanentes con datos sintéticos comprobaron las fórmulas compartidas. El detalle y los límites están en [Paridad financiera con el Excel original](qa-excel-paridad.md).

La falta del archivo está resuelta. El propietario aprobó ambas recomendaciones el 2026-10-10 y quedaron en `PRODUCT.md` e instrucciones de agentes. Sus diferencias frente al libro permanecen explícitas:

- **F-DATA-04 — cerrado bajo contrato aprobado:** vacío/null significa sin tope; cero no asigna extra y conserva la mínima acotada al saldo, con aviso de incompatibilidad. Una mínima pendiente se reserva antes de repartir la bolsa. Si no alcanza el excedente, se muestra el disponible real por debajo del colchón. El libro trata cero como sin tope y no acota la base; no se copiaron esos bordes.
- **F-DATA-06 — cerrado bajo contrato aprobado:** la app/API normalizan dinero e intermediarios a centavos con mitad alejándose de cero; las tasas conservan su precisión propia. El libro no aplica `ROUND(...,2)` monetario y no se afirma que esta regla provenga de sus fórmulas.

Se observó fallar antes del fix la regresión de mínima con tope cero sin redirección: la mínima se etiquetaba como extra. Se corrigió su clasificación como base y se descontó del presupuesto su diferencia frente al pago actual. La nueva prueba de presupuesto insuficiente y la de precisión son caracterizaciones del contrato, no reproducciones ficticias. Los 44 casos financieros seleccionados pasan y la corrida completa posterior aprobó 205/205, lint, typecheck y build.

## Qué falta para desplegar con evidencia real

| Pendiente | Motivo / comprobación necesaria |
| --- | --- |
| Versionar y ejecutar CI | El working tree aún no es un commit desplegable; el nuevo job integrado debe correr sobre el código que se publique |
| Staging Vercel → Cloud Run | Verificar la cadena real, dominio, HTTPS/TLS, cookies, proxy, límites y arranques en frío según `docs/despliegue.md` |
| Neon y operación | Probar su certificado con `verify-full`, configuración de timeouts, migraciones/preflight y backup/restauración antes de usar datos reales |
| Correo y OAuth reales | Probar entrega, callback, errores y revocación contra los proveedores configurados |
| Navegadores y rendimiento | Safari/Firefox, dispositivos físicos, lector de pantalla y mediciones representativas; los recorridos locales de Chrome no certifican estas superficies |
| Dependencias de desarrollo | El aviso alto residual de `braces` del informe anterior requiere seguimiento o excepción explícita; no convertir un audit de producción limpio en audit completo limpio |
| Política CSP de scripts | La CSP existente restringe framing/base/objetos; los nonces y una política de scripts completa siguen siendo una decisión aparte |

Estos pendientes no se sustituyen por tests locales. El cierre técnico de los defectos reproducidos y la autorización para producción deben expresar su alcance por separado.

## Diseño y material preservados

F-UI-09/10/11/12 — unificación visual de botones, paleta, logo y landing — continúan en la tarea de diseño separada. Este cierre no los implementa ni publica borradores legales.

Se conservan `docs/landing-mega-prompt-original.md`, las referencias Lumora/Vesper/New Era, el ejemplo completo y `docs/references/fintrack-os-gradient-reference.png`; la propuesta visual y el borrador legal mantienen su estado pendiente de aprobación.

## Reproducción

Preparar los servicios aislados y variables según [el procedimiento de remediación](qa-frontend-remediacion.md). Desde `frontend/`, ejecutar:

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm qa:runner
node qa/browser/run.mjs --out ../.local/frontend-qa-cierre/browser
```

Para repetir únicamente las cinco regresiones integradas:

```text
node qa/browser/run.mjs --only FR-01-spend-retry,FR-02-entry-form,FR-02-debt-form,FR-02-spend-form,FR-03-category-targets --out ../.local/frontend-qa-cierre/regresiones
```

La build y `pnpm start` usan el proxy/API de prueba; no mantener el servidor de desarrollo activo durante el build. Los tests y sus reproducciones son permanentes y no dependen de resultados previamente guardados en `.local/`. Los logs y capturas generados se ignoran y contienen solo datos sintéticos.
