# Remediación del QA frontend — FinTrack OS

Actualización posterior: este informe conserva la primera remediación. La revisión independiente detectó FR-01…04; sus correcciones, nuevas pruebas y límites de cierre están en [Cierre técnico del QA frontend](qa-frontend-cierre.md). El Excel original fue proporcionado después y se contrastó en [Paridad financiera](qa-excel-paridad.md); el bloqueo histórico por ausencia del archivo ya no describe el estado actual.

Fecha: 9–10 de octubre de 2026 (Colombia). Informe de origen: [qa-frontend.md](qa-frontend.md) (sin modificar). Este documento registra la corrección local y su verificación para una revisión independiente posterior; **no es un aval** del frontend ni de su despliegue.

## Estado del repositorio

| Dato | Valor |
|---|---|
| Rama | `fix/backend-qa-remediation` |
| SHA inicial | `156323368ff0231d414ea75ffa0d49a088c3ba17` (el mismo que auditó el informe) |
| SHA final | `156323368ff0231d414ea75ffa0d49a088c3ba17`: **sin commits**, no autorizados en esta ronda |
| Working tree | 60 archivos rastreados modificados (+2257/−672) y 17 archivos nuevos de esta ronda (incluido este documento) |
| Huella del diff rastreado | `sha256(git -c core.autocrlf=false diff)` = `d2c462dd504a2161e9c9f4fa06c48b8b4930ac7323df69aacaa6751242838860` |
| Documentos ajenos sin versionar | Se conservaron intactos; mismos SHA-256 al inicio y al final (ver «Material reservado») |

Archivos nuevos de esta ronda (prefijo SHA-256 · líneas):

| Archivo | SHA-256 (16) | Líneas |
|---|---|---:|
| `backend/test/support/frontend-qa-api.ts` | `64074c42be46e81d` | 177 |
| `frontend/qa/browser/cdp.mjs` | `146c622a9919b601` | 408 |
| `frontend/qa/browser/png.mjs` | `90b2622504e055b7` | 95 |
| `frontend/qa/browser/run.mjs` | `e200620e838e1952` | 1015 |
| `frontend/src/modules/auth/auth.storage.test.ts` | `797afeb3c42065af` | 95 |
| `frontend/src/modules/auth/flow-guard.ts` / `.test.ts` | `504124b5ef2fb88a` / `b4ea340b8008ba9d` | 35 / 26 |
| `frontend/src/modules/auth/oauth-callback-result.ts` / `oauth-callback.test.ts` | `8b08c40f1df3937c` / `df26dd1e29e4f5f2` | 81 / 20 |
| `frontend/src/modules/auth/one-time-code.ts` / `.test.ts` | `f500ab3b2f8d7658` / `5e4c1dc5e47bc444` | 35 / 27 |
| `frontend/src/modules/finance/browser-targets.test.ts` | `48bf13b31fbdd869` | 117 |
| `frontend/src/modules/finance/domain/money.test.ts` | `227773462dda502d` | 28 |
| `frontend/src/modules/finance/settings/account-security.ts` / `.test.ts` | `4f4b5c618008c950` / `7d0a3c9b5fd408ab` | 54 / 118 |
| `frontend/src/shared/lib/abort-signals.ts` | `ae3bc1eb552896ee` | 31 |
| `docs/qa-frontend-remediacion.md` | este documento | — |

## Resumen

- **33 defectos:** corregidos en el código local; **verificación local aprobada** para los 33, con regresión permanente (Vitest, `node:test` o arnés de navegador) y rojo observado por el síntoma original antes del fix, salvo lo indicado por ID.
- **4 diferidos a diseño (F-UI-09, F-UI-10, F-UI-11, F-UI-12):** sin cambios; siguen abiertos y bloquean el aval integral del frontend.
- **2 hallazgos nuevos:** F-ENG-04 (`AbortSignal.any` fuera de los navegadores objetivo, corregido) y F-ENG-05 (HTML sin cabeceras de endurecimiento y con `X-Powered-By`, endurecido de forma acotada).
- **Pendientes externos abiertos:** paridad con el Excel original, staging (Vercel → Cloud Run, dominio/TLS, cookies/proxy), OAuth y correo reales, Neon, Safari/Firefox reales, dispositivos físicos, lector de pantalla, rendimiento representativo y la ejecución en Linux del test de SIGTERM.

## Entorno, herramientas y método

| Elemento | Detalle real |
|---|---|
| Sistema | Windows 11, Node 24.16.0, pnpm 11.27.1, Docker 29.6.1 |
| Navegador | Chrome **154.0.8037.98 headless**, perfil propio en `.local/frontend-qa-remediation/chrome-profile`, manejado por **un arnés propio sobre Chrome DevTools Protocol** (`frontend/qa/browser`, WebSocket nativo de Node). **No se usó Playwright**, Lighthouse, axe, Safari, Firefox, GPU real ni dispositivos físicos. |
| Frontend | `next build` de producción (Next 16.3.8) y `next start` en `127.0.0.1:3300`. Compilado con `NEXT_PUBLIC_BACKEND_URL=''` (mismo origen) solo para el QA; `BACKEND_ORIGIN=http://127.0.0.1:4410` y `EDGE_PROXY_SECRET` efímero de 48 caracteres generado en `.local/` (no versionado, no impreso). No se cambió configuración versionada de entornos. |
| API | Express 5 + Prisma 7 reales (`pnpm qa:frontend-api`, puerto 4410; control 4411), `NODE_ENV=test`, correo en bandeja en memoria (`EMAIL_PROVIDER=outbox`) y Google/GitHub/Resend sustituidos en la frontera HTTP (`fake-providers.ts`). |
| Base de datos | PostgreSQL 18 en Docker, proyecto compose propio `fintrack-frontend-qa`, `TEST_DATABASE_URL=postgresql://fintrack_test:…@127.0.0.1:55433/fintrack_test` (guarda `test-database.ts`: local y nombre con `test`). Migraciones existentes aplicadas con `prisma migrate deploy`. **No se usó Neon** ni `DATABASE_URL` del `.env`. |
| Datos | Usuarios sintéticos `@fintrack.test` creados por la API de control; contraseña de prueba común (sirve para demostrar el impacto real de F-AUTH-01). |

Niveles de evidencia: **Vitest** (dominio, store, cola, sesión y API cliente por interfaces públicas, dobles solo en red/reloj/storage), **`node:test` de integración** (HTTP + Express + Prisma + PostgreSQL reales) y **navegador integrado** (build de producción → proxy → API → PostgreSQL). Un doble de API no se presenta como prueba de autorización ni de persistencia.

Para los defectos de componentes no hay DOM en Vitest (entorno `node`, sin jsdom ni Testing Library) y **no se instalaron** dependencias de prueba nuevas: la lógica se extrajo a módulos puros (primero sin cambiar comportamiento, para observar el rojo) y la interacción se verificó en navegador. Se compiló una **build 1** con las correcciones de datos ya aplicadas pero **antes** de las de autenticación/UI, para registrar los rojos de navegador; la **build final** contiene todas las correcciones.

### Rojos del arnés descartados (no son defectos de producto)

- Primeras regresiones de fecha/rango que llamaban a funciones inexistentes (`businessToday`, `canShiftYearMonth`): reformuladas sobre `toIsoDate`/`isYearMonth`, que fallaron por el síntoma.
- Firmas equivocadas en `browser-targets.test.ts` y respuesta `Response` de Node (undici usa internamente los métodos retirados): sustituida por un objeto con la interfaz que consume el cliente.
- Expectativa `400` en la integración de F-DATA-12: el contrato del proyecto para validación es `422`.
- `fill()` del arnés borraba con Backspace (provocaba un PATCH a 0 que un usuario que escribe encima no provoca); medición de desbordamiento contra `innerWidth` (un viewport móvil se amplía al contenido); locators que apuntaban a «Valor de Arriendo» de la tabla, a un día deshabilitado del calendario o a otro contexto de navegador (F-AUTH-01). Corregidos antes de adjudicar evidencia.

## Procedimiento reproducible

```bash
# 1. PostgreSQL aislado
docker compose -p fintrack-frontend-qa -f backend/test/compose.yaml up -d
export TEST_DATABASE_URL=postgresql://fintrack_test:fintrack_test_only@127.0.0.1:55433/fintrack_test
export EDGE_PROXY_SECRET=$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")

# 2. API real (otra terminal). QA_ACCESS_TTL=40s solo para F-AUTH-01.
cd backend && pnpm prisma:generate && pnpm qa:frontend-api

# 3. Frontend de producción por el proxy (otra terminal)
cd frontend && NEXT_PUBLIC_BACKEND_URL='' pnpm build
BACKEND_ORIGIN=http://127.0.0.1:4410 EDGE_PROXY_SECRET=$EDGE_PROXY_SECRET pnpm start -H 127.0.0.1 -p 3300

# 4. Escenarios (todos, o --only F-UI-02,F-DATA-03)
node qa/browser/run.mjs --out ../.local/frontend-qa-remediation/final
QA_ACCESS_TTL_SECONDS=40 node qa/browser/run.mjs --only F-AUTH-01   # con la API en QA_ACCESS_TTL=40s
```

Salidas (resultados JSON, capturas, logs) en `.local/frontend-qa-remediation/` (ignorado). Los escenarios crean sus propios usuarios; `POST /cleanup` de la API de control y su cierre (`SIGINT`) los borran, y cada arranque limpia restos `@fintrack.test`.

## Validaciones ejecutadas

| Comprobación | Resultado |
|---|---|
| Frontend `pnpm lint` | aprobado |
| Frontend `pnpm typecheck` | aprobado |
| Frontend `pnpm test` | aprobado: **187/187** en 20 archivos (línea base al inicio: 129/129 en 13) |
| Frontend `pnpm build` (producción, mismo origen) | aprobado (build 1, build 2 y build final) |
| `pnpm audit --prod` | aprobado: 0 avisos (antes y después) |
| `pnpm audit` (completo) | fallido con 1 aviso residual justificado (antes: 24 entradas, 2 críticas/17 altas/5 moderadas) — ver F-ENG-02 |
| Backend `pnpm typecheck` | aprobado |
| Backend `pnpm test` (unitarios) | aprobado: 112/112 |
| Backend `pnpm test:integration` (PostgreSQL aislado) | aprobado: 146/147; **1 no ejecutado** (preexistente: SIGTERM no se entrega en Windows; corre en Linux/CI) |
| Backend `pnpm test:migrations` | aprobado: 7/7 |
| `pnpm prisma:validate` y `prisma migrate status` en la base de prueba | aprobado: esquema válido, 6 migraciones, al día. Sin cambios de esquema ni migraciones nuevas |
| Navegador, build 1 (antes de auth/UI) | 24 de 32 escenarios fallidos, reproduciendo los síntomas originales; aprobaron el registro y el recorrido normales y los 6 de datos ya corregidos en esa build (F-DATA-01/02/03/05/07/12) |
| Navegador, build final | **aprobado: 34/34 escenarios** (incluido F-AUTH-01 con TTL de 40 s) |
| `git diff --check` | aprobado |
| Búsqueda de secretos en diff y archivos nuevos | aprobado: solo credenciales sintéticas de prueba ya existentes en el arnés backend |

## Matriz de incidencias

Estado: «Verificación local» es el resultado de la comprobación ejecutada; «Abierto externo» lista lo que esa verificación no cubre.

| ID | P | Severidad | Verificación local | Rojo observado (antes) → verde (después) | Abierto externo |
|---|---|---|---|---|---|
| F-AUTH-01 | P1 | Alta | aprobado | Vitest: `token-user-b` enviado en contraseña/solicitud/confirmación de correo. Navegador: POST `/api/auth/password` con `sub` de B y **contraseña de B cambiada** → ninguna petición con B, contraseña de B intacta | OAuth/correo reales; staging |
| F-AUTH-02 | P2 | Media | aprobado | `['3','','',…]` y `['1','2','4','5','6','']` → `['','','3',…]` y `['1','2','','4','5','6']` (Vitest y Chrome) | Teclado virtual y autocompletado del sistema en dispositivos |
| F-AUTH-03 | P2 | Media | aprobado | Verificación cancelada adoptaba sesión (`/dashboard`, marca de sesión) y «Volver a empezar» revivía «Nueva contraseña» → sigue en `/register` sin sesión; sigue en el paso de correo | Carreras de login/registro al desmontar solo cubiertas por la guarda común (sin escenario de navegador propio) |
| F-AUTH-04 | P2 | Media | aprobado | `{}` aceptado, `TypeError … split` en `/login` → 5 casos descartados, formulario usable, 0 excepciones | — |
| F-AUTH-05 | P2 | Media | aprobado | `SecurityError` dejaba `/login` inutilizable → login usable y registro exitoso avanza al código sin storage | Modos privados de cada navegador |
| F-AUTH-06 | P3 | Baja | aprobado | Cargando tras 4 s → error recuperable «OAuth no pudo completarse» con enlace a iniciar sesión | Callbacks y proveedores reales |
| F-DATA-01 | P1 | Alta | aprobado | Servidor volvía a `1000` tras «Reintentar» → servidor, UI y recarga en `2.000` | — |
| F-DATA-02 | P1 | Alta | aprobado | Dos deudas tras respuesta perdida; cuenta con falso «ya existe» → una deuda (GET público) y cuenta reconocida como reintento | — |
| F-DATA-03 | P1 | Alta | aprobado | UI `800`, servidor `401`; edición durante la copia perdida → UI = servidor = recarga = `401`; edición conservada y guardada | — |
| F-DATA-04 | P1 | Media | aprobado | Tope 0 tratado como ilimitado (`500`), saldo 100 recomendaba `500`, tope inviable silencioso → `200` con aviso, `100`, `capBelowMinimum` | **Paridad con el Excel original (bloqueado)**; validación financiera externa |
| F-DATA-05 | P1 | Media | aprobado | `1.234,56`→`123456`, `-100`→`100` → rechazo con motivo asociado al campo; servidor sin cambio | — |
| F-DATA-06 | P2 | Media | aprobado | `10.07`, `-0` → `10.08`, `-1.01`, `0` | **Paridad con el Excel original (bloqueado)** |
| F-DATA-07 | P1 | Media | aprobado | Local `0.123456` vs API `0.1235` → la UI adopta el canónico sin pisar ediciones posteriores; inputs con la escala de cada columna | — |
| F-DATA-08 | P2 | Media | aprobado | Dispositivo en UTC/Tokio/Madrid/Los Ángeles daba otro día → fecha de Bogotá en los 4 | Dispositivos reales en otras zonas |
| F-DATA-09 | P3 | Baja | aprobado | `1999-12`, `2100-01`, `0000-01` aceptados y enlace a `1999-12` → aviso, mes actual y sin enlaces fuera de rango | — |
| F-DATA-10 | P1 | Media | aprobado | `hasUnsavedChanges=false` tras fallo; logout cerraba sesión → cuenta como pendiente; logout ofrece «Reintentar y salir» o «Salir sin guardar» | Diálogo nativo `beforeunload` (no se automatiza) |
| F-DATA-11 | P1 | Media | aprobado | Fila fantasma con cuota 300 sin motivo visible → fila retirada, motivo visible, servidor con 300 | — |
| F-DATA-12 | P2 | Media | aprobado | Saldo personal `-100`, API aceptaba `201` → acotado; API `422` en creación y PATCH parciales con lock | Datos inconsistentes ya guardados en Neon (se muestran acotados) |
| F-UI-01 | P1 | Alta | aprobado | A 375 px sin error ni reintento visibles → aviso persistente con «Reintentar» de 44 px dentro del viewport, región `status` | Dispositivos físicos y lector de pantalla |
| F-UI-02 | P1 | Media | aprobado | Foco en `BODY` → vuelve a «Nuevo gasto» con Escape, Cerrar y Cancelar; con el disparador eliminado va a `main` | Lector de pantalla |
| F-UI-03 | P1 | Media | aprobado | 2.37–2.66:1 → 5.31–6.98:1 en las 5 categorías medidas; icono + tachado + «pagado» en la etiqueta | Bolsillos no aparecen como chip con estado pagado |
| F-UI-04 | P2 | Media | aprobado | Decenas de controles de 28–42 px a 375/768 → ninguno bajo 44×44 en 5 rutas × 2 anchos | Prueba táctil física |
| F-UI-05 | P2 | Media | aprobado | Sin `aria-describedby` ni anuncio → descrito por su mensaje en región viva | Lector de pantalla real |
| F-UI-06 | P2 | Media | aprobado | 35 paradas Tab, flechas sin efecto → 1 parada; flechas ±1/±7, Inicio/Fin | Lector de pantalla real |
| F-UI-07 | P2 | Baja | aprobado | 0 `h1` → 1 `h1` en login, registro y recuperación | — |
| F-UI-08 | P2 | Baja | aprobado | Primer Tab en el logo → «Saltar al contenido» visible; Enter enfoca `main` | — |
| F-UI-13 | P2 | Media | aprobado | `$ 919.999.999.999` recortado a 375 px → íntegro a 375 px y con texto al 200 % | Zoom de texto del sistema en dispositivos |
| F-UI-14 | P1 | Media | aprobado | `scrollWidth` 385 y CTA recortado → 375/768/1440 sin desbordamiento, CTA completos de 44 px | — |
| F-UI-15 | P2 | Media | aprobado | «Mercado» recortado (53 px) → completo (67 px) | — |
| F-UI-16 | P1 | Media | aprobado | 4.09 / 3.76 / 4.63:1 (normal/hover/activo) → 5.39 / 6.09 / 6.97:1 sobre píxeles reales del gradiente | Tema oscuro no se aplica en la app (tokens ajustados igualmente) |
| F-ENG-01 | P1 | Media | aprobado | React 418 y handoff perdido → paso de verificación estable, también tras recarga, sin error de hidratación | Strict Mode solo razonado (render puro); no hay ejecución en modo desarrollo |
| F-ENG-02 | P2 | Media | aprobado con residual | 24 entradas (2 críticas) → 1 alta sin parche publicado (`braces` 3.0.3) | Seguimiento del parche de `braces` |
| F-ENG-03 | P3 | Baja | aprobado | `sheets.toSorted is not a function` → código real sin esas APIs + guarda estática | Firefox 111–114 real no ejecutado |
| F-UI-09 | P2 | Media | **diferido a diseño** | — | Abierto |
| F-UI-10 | P2 | Media | **diferido a diseño** | — | Abierto |
| F-UI-11 | P2 | Baja | **diferido a diseño** | — | Abierto |
| F-UI-12 | P1 | Media | **diferido a diseño** | — | Abierto |
| F-ENG-04 (nuevo) | P2 | Media | aprobado | Libro en estado de error sin `AbortSignal.any` → carga con `combineSignals` | Navegadores reales |
| F-ENG-05 (nuevo) | P3 | Baja | aprobado (acotado) | HTML sin `nosniff`/`frame-ancestors` y con `X-Powered-By` → cabeceras presentes; API intacta | CSP de scripts con nonces; HSTS en el dominio |

## Detalle por incidencia

Comandos comunes: `cd frontend && pnpm test` (Vitest), `node qa/browser/run.mjs --only <ID>` (navegador), `cd backend && pnpm test:integration` (API real). Los rojos citados son la salida real de la primera ejecución contra el código sin corregir.

### Autenticación

**F-AUTH-01.** *Causa:* el panel de seguridad pedía el token sin identidad (`ensureAccessToken()`); si la renovación de A quedaba retenida y otra pestaña adoptaba B, el gestor devolvía la sesión vigente (B). *Fix:* `account-security.ts` exige `ensureAccessToken({ userId })` (lanza `SessionChangedError`), también en la renovación posterior a confirmar el correo; el panel se monta con `key={userId}` y cancela lo que está en vuelo al desmontarse. *Archivos:* `finance/settings/account-security.ts`, `account-security-panel.tsx`, `settings-page.tsx`, `auth/auth.api.ts`. *Pruebas:* `account-security.test.ts` (gestor de sesión real, dos «pestañas» por canal en memoria, refresh retenido; 3 operaciones + caso positivo) y escenario de navegador `F-AUTH-01` (TTL 40 s, refresh retenido por CDP, segunda pestaña del mismo contexto difunde la sesión B por `BroadcastChannel('fintrack-auth')` con un login real de B). El backend sigue exigiendo la contraseña actual; no se debilitó.

**F-AUTH-02.** *Causa:* `join('')` eliminaba huecos. *Fix:* `one-time-code.ts` con posiciones fijas (hueco = espacio), pegado desde la casilla, multi-dígito tratado como pegado, selección al enfocar; los formularios validan con `isCompleteCode`. *Archivos:* `auth/one-time-code.ts`, `one-time-code-input.tsx`, `email-verification-form.tsx`, `forgot-password-flow.tsx`. *Pruebas:* `one-time-code.test.ts`, escenario `F-AUTH-02` (fuera de orden, borrado intermedio, flechas, pegado) y `AUTH-registro` (registro → código de la bandeja → dashboard).

**F-AUTH-03.** *Causa:* las respuestas tardías se aplicaban sin comprobar si el flujo seguía vigente. *Fix:* `flow-guard.ts` (generación + `AbortController`): cancelar, «Usar otro correo», «Volver a empezar» o desmontar invalida y aborta; los resultados obsoletos no cambian de paso ni adoptan sesión. Aplicado a verificación de correo, registro, login, recuperación y panel de seguridad; las funciones de `auth.api.ts` aceptan `signal`. *Pruebas:* `flow-guard.test.ts` y escenarios `F-AUTH-03-verificacion` y `F-AUTH-03-recuperacion`. *Nota:* el abort es la primera barrera (en la recuperación el navegador ya había cancelado la petición retenida); la comprobación de vigencia cubre la respuesta que llega antes de abortar.

**F-AUTH-04 y F-AUTH-05.** *Causa:* `JSON.parse` sin validar forma y operaciones de storage fuera del `try`. *Fix:* `auth.storage.ts` valida email, fuente, fecha finita y vigencia; descarta lo inválido; toda operación es opcional y nunca lanza (`save*` devuelve `false`), así un registro exitoso en servidor avanza aunque no se pueda persistir. *Pruebas:* `auth.storage.test.ts` (10 casos) y escenarios `F-AUTH-04`, `F-AUTH-05`.

**F-AUTH-06.** *Causa:* hash vacío = «cargando» también después de hidratar. *Fix:* `oauth-callback-result.ts` distingue hidratación (`useSyncExternalStore` cliente/servidor) y, ya en el navegador, convierte la ausencia de resultado en error recuperable. *Pruebas:* `oauth-callback.test.ts`, escenario `F-AUTH-06`.

**F-ENG-01.** *Causa:* el handoff se consumía en el inicializador de estado durante el primer render del cliente, distinto del SSR. *Fix:* lectura por `useSyncExternalStore` (servidor e hidratación: `null`; cliente: snapshot cacheado), render puro sin borrar; el handoff se borra al reiniciar o completar el flujo, por lo que una recarga conserva el paso. *Pruebas:* `auth.storage.test.ts` (handoff inválido/vencido) y escenario `F-ENG-01` (carga, recarga y ausencia de errores 418/hidratación en consola). Strict Mode: la lectura es idempotente; no se ejecutó la app en modo desarrollo.

### Integridad financiera

**F-DATA-01.** *Causa:* el reintento reenviaba el parche capturado al fallar. *Fix:* `save-queue.ts` asigna una revisión a cada campo escrito; reintentar solo reenvía campos cuya escritura sigue siendo la última. *Prueba:* `workbook-store.test.ts` «never lets a retried stale patch…» (rojo: servidor `1000`) y escenario `F-DATA-01` (503 controlado, edición nueva guardada, Reintentar, GET público y recarga).

**F-DATA-02.** *Causa:* cada guardado generaba un UUID nuevo. *Fix:* `createDebt(draft, clientId)` con id estable por formulario; si el contenido cambió tras una respuesta perdida, el `IDEMPOTENCY_CONFLICT` se concilia con PATCH de la misma deuda. Las cuentas reutilizan el id por nombre (`withOperationId`), evitando el falso «Ya tienes una cuenta con ese nombre». *Pruebas:* tres casos en `workbook-store.test.ts` y escenario `F-DATA-02` (respuesta del POST perdida en etapa de respuesta por CDP; conteo por GET público y recarga).

**F-DATA-03.** *Causa:* `flushAll()` no esperaba y `upsertSheet` sustituía la hoja. *Fix:* la copia envía y espera los guardados en vuelo, se niega si hay fallos sin resolver y fusiona la respuesta conservando campos y filas escritos durante la copia (`touchedSince`). El salario destino distinto de cero lo respeta el contrato backend existente. *Pruebas:* tres casos en `workbook-store.test.ts` (incluye el orden dañino: copia ejecutada antes del PATCH con respuesta posterior) y escenario `F-DATA-03`.

**F-DATA-04.** *Causa:* tope `0` como ilimitado y techo sin saldo. *Fix y semántica explícita:* `null` = sin tope; `0` es un tope; el techo de cada deuda es `max(cuota mínima acotada al saldo, min(tope, mi saldo))`; si el tope es menor que la mínima, se recomienda la mínima (pagar menos sería mora) y la fila lo declara (`capBelowMinimum`) con aviso en la tarjeta; el copy del campo «Mi tope al mes» se ajustó. *Pruebas:* 4 casos nuevos en `debt-plan.test.ts`; los 26 existentes siguen verdes. **No es una comparación con el Excel original.**

**F-DATA-05.** *Contrato:* montos en **pesos enteros es-CO**; el punto agrupa miles en grupos de tres; la coma inicia decimales (`,00` se acepta); centavos, signos, separadores mal puestos, otros caracteres y valores sobre 999.999.999.999 se rechazan con motivo. Mientras se edita, el texto no se reformatea a cada tecla. *Archivos:* `lib/format.ts`, `ui/fields.tsx` (`useAmountDraft`, `FieldError`), `entries-card.tsx`. *Pruebas:* `format.test.ts` y escenario `F-DATA-05`.

**F-DATA-06.** *Fix:* `roundHalfUp(valor, decimales)` con la regla documentada en `backend/src/modules/finance/money.ts` (ROUND de Excel, mitad lejos de cero sobre la representación decimal), sin importar código del backend y sin BigInt (el target de TypeScript es ES2017). *Pruebas:* `money.test.ts` (incluye acumulaciones y −0). **Paridad con el Excel original: bloqueada.**

**F-DATA-07.** *Fix:* la cola entrega al store la respuesta de cada PATCH y los campos que ninguna edición posterior superó; solo esos adoptan el valor canónico. Los porcentajes se capturan con la escala de su columna (prestaciones 4 decimales, tasas 6, porcentaje compartido 2). *Pruebas:* `workbook-store.test.ts` (respuestas retenidas y desordenadas), `format.test.ts` y escenario `F-DATA-07` (UI `12,35`, API `0.1235`).

**F-DATA-08.** *Fix:* `toIsoDate`/`toYearMonth` usan `Intl` con `America/Bogota`. *Pruebas:* `year-month.test.ts` con el proceso en 4 zonas y límites de día, mes, año y bisiesto.

**F-DATA-09.** *Fix:* `isYearMonth` aplica el contrato 2000–2099; los enlaces de mes y año (hoja, calendario, resumen, sidebar, selector móvil) no se generan fuera de rango; un `?month=` inválido cae al mes actual con aviso. *Pruebas:* `year-month.test.ts` y escenario `F-DATA-09`.

**F-DATA-10.** *Fix:* los fallos cuentan como cambios sin guardar (`beforeunload` los protege); `settle()` informa `{ saved }`; el cierre de sesión con fallos abre «Hay cambios sin guardar» con Cancelar, Salir sin guardar y Reintentar y salir; «Descartar cambios» recarga el libro del servidor. *Pruebas:* `workbook-store.test.ts` y escenario `F-DATA-10` (503 persistente y logout).

**F-DATA-11.** *Fix:* un rechazo definitivo (4xx) de una creación retira la fila o el gasto optimista y se informa con `SaveRejectedError` (sin ofrecer un reintento inútil); un fallo ambiguo conserva la fila y el id para reintentar; un PATCH encolado tras la creación rechazada no sale. *Pruebas:* dos casos en `workbook-store.test.ts` y escenario `F-DATA-11` con la cuota real de 300 filas del backend.

**F-DATA-12.** *Contrato nuevo (backend):* con valor fijo, `sharedAmount ≤ totalBalance`; se valida en la creación y, en PATCH que toquen saldo, parte o porcentaje, contra el estado vigente leído bajo el lock financiero del usuario (`updateDebtChecked`). Respuesta `422 VALIDATION_ERROR` con el campo movido (`sharedAmount` o `totalBalance`). Editar otros campos de una deuda antigua inconsistente sigue permitido. *Frontend:* `sharedPortionOf` acota la parte al saldo (sin saldo personal negativo ni barras imposibles) y el drawer retiene combinaciones inválidas con su error asociado. *Archivos:* `backend/src/modules/finance/finance.service.ts`, `finance.repository.ts`, `test/integration/finance.test.ts`; `frontend/.../debt-plan.ts`, `debt-drawer.tsx`. *Pruebas:* integración real (rojo `201` con el código original, comprobado con `git stash` del fix) y escenario `F-DATA-12`.

### UX y accesibilidad

**F-UI-01.** `SaveErrorNotice` persistente en todos los anchos (sobre la barra inferior en móvil, abajo a la derecha desde 1024 px), con el motivo real y acciones de 44 px, en una región `status` que se anuncia al aparecer el error; «Guardando…» no se anuncia. Indicador compacto visible también bajo 640 px. Archivos: `shell/save-indicator.tsx`, `finance-shell.tsx`, `mobile-bars.tsx`.

**F-UI-02.** `Drawer` y `ConfirmDialog` recuerdan el elemento enfocado al abrir y le devuelven el foco al cerrar; si ya no existe, el foco va a `main#main-content`. Archivo: `ui/drawer.tsx`.

**F-UI-03.** El chip pagado conserva la tinta de su categoría (sin `opacity`), añade icono de check y tachado, y la etiqueta del día dice «pagado». Archivo: `calendar/calendar-page.tsx`.

**F-UI-04.** Política del proyecto (no mínimo WCAG 2.2 AA): 44 px bajo 1024 px, donde no hay sidebar (antes bajaban a 32–40 px desde 640). Controles, segmentos (también 44 px de ancho), campos, búsqueda, celdas de monto, filas de la tabla, enlaces del resumen e insignias de estado (área ampliada con `::after`); la caja completa de cada campo de monto enfoca su input. Archivos: `ui/button.tsx`, `ui/fields.tsx`, `ui/status-badge.tsx`, `month/pocket-parts.tsx`, `month/entries-card.tsx`, `summary/summary-page.tsx`, `debt-drawer.tsx`, `auth-shell.tsx`, `home-page.tsx`.

**F-UI-05.** Error del nombre de cuenta con id, `aria-describedby` y región viva; la etiqueta incluye el nombre de la cuenta. Archivo: `settings-page.tsx`.

**F-UI-06.** Se conserva el patrón `grid`: roving tabindex (solo el día seleccionado es parada Tab), flechas ±1/±7, Inicio/Fin de semana, sin salir del mes (`moveCalendarDay`, probado en `calendar.test.ts`).

**F-UI-07.** El título del shell de autenticación es `h1` con el mismo estilo. **F-UI-08.** Enlace «Saltar al contenido» visible al enfocarse y `main` enfocable.

**F-UI-13.** Los montos KPI envuelven (`overflow-wrap:anywhere`) en lugar de truncarse. **F-UI-15.** El nombre del bolsillo no se trunca; el estado baja de línea si no cabe.

**F-UI-14.** Arreglo mínimo del header público: las acciones bajan a su propia fila en móvil y miden 44 px; no se rediseñó la landing.

**F-UI-16.** Rampa `brand-action` oscurecida (0.54→0.49 L en OKLCH, hover y activo más oscuros, nunca más claros) y `--primary` público a `oklch(0.53 0.18 252)` para enlaces de acción (≈5.26:1 sobre blanco). El wordmark y su degradado no cambian. Solo el tema claro está activo (`.dark` no se aplica en la app); la variante oscura se ajustó con el mismo criterio. `DESIGN.md` actualizado.

### Ingeniería y dependencias

**F-ENG-02.** `vitest` 3.2.7 → **4.1.11** (primer parche del aviso GHSA-82fw-gwwq-j7x9, publicado el 18-08-2026; ya no depende de `tinypool`, que traía GHSA-5gmw-xhrv-c9v3 y GHSA-85c8-ppgw-ccpr). `overrides` de pnpm acotados al mismo mayor: `brace-expansion` 1.1.21 y 5.0.12, `js-yaml` 4.3.2, `nanoid` 3.3.18, `postcss` 8.5.28. Runner, configuración y tests sin cambios de contrato (salvo el objeto de respuesta del test de compatibilidad). **Residual:** `braces` 3.0.3 (GHSA-vfj7-8cjw-p6xm, DoS por agotamiento de pila con patrones muy anidados, CWE-674) sin versión corregida publicada; llega por `eslint-config-next › @next/eslint-plugin-next › fast-glob › micromatch` y por `shadcn`, herramientas de desarrollo que expanden patrones del propio repositorio, no entradas de usuarios. Producción: 0 avisos.

**F-ENG-03 y F-ENG-04 (nuevo).** Next 16.3.8 compila para Chrome/Edge/Firefox 111 y Safari 16.4 (`modern-browserslist-target.js`) y no incluye polyfills de `toSorted`/`toReversed`/`toSpliced`/`with` (Firefox 115) ni de `AbortSignal.any` (Chrome 116, Firefox 124, Safari 17.4). Se usan copias con `sort`/`reverse` y `combineSignals` (`shared/lib/abort-signals.ts`, que además retira sus listeners al terminar cada petición). `browser-targets.test.ts` ejecuta el código real sin esas APIs y una guarda estática impide reintroducirlas. La regla `js-tosorted-immutable` de `vercel-react-best-practices` cede ante la compatibilidad del proyecto (precedencia: requisitos del repositorio sobre la skill).

**F-ENG-05 (nuevo).** El HTML no enviaba `nosniff`, `frame-ancestors` ni `Referrer-Policy` y exponía `X-Powered-By: Next.js` (ya anotado como pendiente en el informe, sin ID ni explotación demostrada). `next.config.ts` añade `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Content-Security-Policy: frame-ancestors 'none'; base-uri 'self'; object-src 'none'` y `Permissions-Policy` mínimo, y `poweredByHeader: false`; `/api/*` queda fuera porque el backend fija las suyas (`no-store`, Helmet). Efectos verificados en el barrido (sin errores de consola, logo de Cloudinary y OAuth por enlace intactos) y en el escenario `CABECERAS`. **No se añadió CSP de scripts** (requiere nonces por petición en Next): decisión pendiente. El HTML conserva `s-maxage` porque es un shell anónimo prerenderizado sin datos del libro.

## Cambios de contrato

| Contrato | Antes | Después |
|---|---|---|
| Captura de montos | Dígitos extraídos de cualquier texto | Pesos enteros es-CO validados; rechazo explicado |
| Redondeo frontend | `Math.round` binario con `EPSILON` | ROUND de Excel sobre la representación decimal (igual que el backend) |
| Fecha de negocio | Zona del dispositivo | `America/Bogota` |
| Mes válido | `\d{4}-MM` | `20\d{2}-MM` (2000–2099, igual que el API) |
| Plan de deudas | Tope 0 = sin tope; sin techo de saldo | `null` = sin tope; techo = min(tope, saldo) con mínima obligatoria y `capBelowMinimum` |
| Parte compartida (API) | Campos válidos por separado | `sharedAmount ≤ totalBalance` con valor fijo; `422` en creación y PATCH parcial con estado vigente |
| Estado de guardado | `{ error, pending }` | `{ error, failed, pending }`; `settle()` → `{ saved }`; `dismissSaveError`, `discardFailedSaves` |
| Creación de deuda | `createDebt(draft)` | `createDebt(draft, clientId)` |
| Llamadas de auth | Sin cancelación | `signal` opcional en cada función de `auth.api.ts` |
| Storage de auth | `save*` podía lanzar | Nunca lanza; `save*` devuelve `boolean`; `takePasswordResetHandoff` → `peekPasswordResetHandoff` + `clearPasswordResetHandoff` |
| Tamaño de controles | 40 px desde 640 px | 40 px desde 1024 px; 44 px por debajo (`DESIGN.md`) |
| Tooling | Vitest 3.2.7 | Vitest 4.1.11 + overrides acotados |

## Rendimiento (muestra local declarada)

Chrome 154 headless, 1440×900, caché del navegador deshabilitada, servidor local caliente, sin throttling de CPU ni red, una muestra por ruta: `/` LCP 96 ms, CLS 0.0006, 328 KB transferidos; `/login` LCP 256 ms, CLS 0.001, 445 KB. **No acredita métricas de producción, INP, percentiles ni dispositivos reales**; no se ejecutó Lighthouse.

## Cobertura faltante, riesgos y bloqueos

- **Bloqueado — paridad con el Excel original:** sigue sin estar en el repositorio ni en el equipo. F-DATA-04 y F-DATA-06 se corrigieron contra la norma decimal documentada, el contrato del backend y casos independientes; no se presentan como comparación con el Excel.
- **Bloqueado — staging:** Vercel → Cloud Run, dominio/HTTPS/TLS, cookies first-party a través del proxy real, OAuth de Google/GitHub y correo reales, Neon (incluidos datos ya guardados con parte compartida mayor que el saldo, que ahora se muestran acotados y bloquean solo los cambios de saldo/parte hasta corregirse).
- **No ejecutado:** Safari y Firefox reales (incluido Firefox 111–114), dispositivos físicos, teclado virtual, lectores de pantalla (NVDA/VoiceOver), zoom de texto del sistema (se simuló con `font-size: 200%`), Strict Mode en desarrollo, diálogo nativo de `beforeunload`, test de SIGTERM del backend en Linux (CI).
- **Cobertura parcial en navegador:** carreras de login y registro al desmontar (cubiertas por la misma guarda, sin escenario propio); refresh simultáneo en dos pestañas y expiración se apoyan en las pruebas del gestor de sesión existentes y en F-AUTH-01; restauración de cuenta archivada y pago desde el calendario no se repitieron en esta ronda (el recorrido normal cubre gasto, resumen, logout y ruta protegida).
- **Sin baseline visual aprobada:** las capturas de `.local/frontend-qa-remediation/final` documentan el estado; no prueban ausencia de regresiones visuales.
- **Riesgos residuales:** un PATCH rechazado de forma definitiva (no una creación) queda como fallo con «Reintentar» o «Descartar cambios» (que recarga el libro) en lugar de revertirse campo a campo; el aviso de guardado flota sobre el contenido hasta resolverse; `braces` 3.0.3 en tooling.

## Diferidos a diseño (siguen abiertos)

F-UI-09 (familia de botones), F-UI-10 (paleta común), F-UI-11 (logo oficial distribuido) y F-UI-12 (landing completa). No se unificaron botones, no se redefinió la paleta global (solo se ajustaron dos tokens para contraste AA, documentados), no se redistribuyó el logo y no se construyó landing. No se instalaron Three.js, postprocessing, GSAP, Lenis, Motion ni librerías creativas; no se publicaron textos legales ni se implementaron consentimiento, cobros o infraestructura.

## Material reservado para la landing

Intactos, con el mismo SHA-256 al inicio y al final de la sesión: `docs/landing-mega-prompt-original.md` (`1f6e545a…916134a`), `docs/references/fintrack-os-gradient-reference.png` (`360af65b…a7e6`), `docs/landing-direccion-visual.md` (`e6d5cc3e…4561d1`), `docs/landing-direccion-visual.html` (`f6b67fa7…c6184`) y `docs/landing-contenido-legal.md` (`69870099…d8b5`). También `docs/qa-frontend.md` y `docs/prompt-qa-frontend-claude.md` sin cambios.

## Recursos y limpieza

Creados en esta sesión: contenedor `fintrack-frontend-qa-postgres-1` (proyecto compose `fintrack-frontend-qa`), procesos `next start` (puerto 3300) y `frontend-qa-api.ts` (4410/4411), y Chrome headless con el perfil `.local/frontend-qa-remediation/chrome-profile` (el arnés lo cierra en cada ejecución). Al terminar se detuvieron solo esos procesos, verificando PID y línea de comando, y se bajó solo ese proyecto compose. No se tocaron otros contenedores, procesos ni la documentación previa.

## Criterio para el auditor

Revisar sobre el working tree descrito (sin commits): ejecutar `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm build` en `frontend`; las suites del backend con `TEST_DATABASE_URL`; y el procedimiento de navegador. Cada ID conserva causa, fix, prueba y límites de evidencia. No se declara «100 % seguro» ni que se hayan encontrado todos los defectos posibles.
