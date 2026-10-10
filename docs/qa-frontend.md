# QA completo de frontend — FinTrack OS

Fecha: 9 de octubre de 2026, Colombia; ejecución extendida al 10 de octubre UTC.

Código auditado: `156323368ff0231d414ea75ffa0d49a088c3ba17`, rama `fix/backend-qa-remediation`. Este informe registra incidencias; no implementa sus correcciones. Los borradores de landing y contenido legal posteriores tampoco son cambios de producto.

## Dictamen

**No aprobado para desplegar.** Hay defectos de integridad de datos, identidad de operaciones sensibles, recuperación y accesibilidad que los tests existentes no detectan. El QA local terminó con **37 entradas técnicas/de diseño: 33 defectos y 4 pendientes de diseño solicitados por el propietario**. La definición legal solicitada durante esta ronda añade condiciones de publicación en su sección independiente. No se encontró una incidencia crítica demostrada en esta ronda; esto no equivale a garantizar que no existan más defectos.

| Clasificación | Cantidad |
|---|---:|
| Alta | 5 |
| Media | 26 |
| Baja | 6 |
| P1 | 16 |
| P2 | 18 |
| P3 | 3 |

La severidad mide impacto; la prioridad indica orden de trabajo. P1: resolver antes del lanzamiento público. P2: siguiente ronda de corrección antes del aval integral de frontend. P3: menor impacto, con decisión explícita si se difiere. No hay P0 demostrado. Las cuatro entradas de diseño no representan vulnerabilidades de seguridad.

### Bloqueadores principales

- **F-AUTH-01:** una operación de seguridad iniciada por A puede enviar su formulario con la sesión de B después de un cambio de cuenta.
- **F-DATA-01:** reintentar un guardado antiguo sobrescribe uno más reciente y exitoso; la interfaz muestra otro valor y afirma que está guardado.
- **F-DATA-02:** perder la respuesta de creación y reintentar duplica deudas persistidas.
- **F-DATA-03:** copiar el mes mientras hay un PATCH pendiente deja pantalla y base con salarios distintos.
- **F-UI-01:** en teléfonos pequeños no se ve el fallo de guardado ni su reintento.

## Método y alcance

Se aplicaron `playwright-best-practices` con sus adaptaciones React/Next.js, `vercel-react-best-practices`, `impeccable` y `ui-ux-pro-max`, junto con `PRODUCT.md`, `DESIGN.md` y los `AGENTS.md`. Se inspeccionaron rutas, formularios, sesión, proxy, contratos HTTP, store, cola de escritura, cálculos, fechas, componentes y estilos. Hubo exploraciones independientes de autenticación, finanzas, ingeniería y UX, consolidadas sin duplicar hallazgos.

**Navegador usado:** Chrome 154.0.8037.98 headless con perfil propio, mediante Chrome DevTools Protocol. No se ejecutó Playwright ni se instaló un runner nuevo. Las herramientas de navegador integradas no pudieron iniciar su runtime; se usó Chrome ya instalado. [Documentación del protocolo](https://chromedevtools.github.io/devtools-protocol/).

**Entorno integrado:** build de producción de Next.js 16.3.8, proxy del frontend → Express real → Prisma → PostgreSQL 18 local aislado en Docker. Frontend en `127.0.0.1:3300`; API en un puerto local efímero. `NEXT_PUBLIC_BACKEND_URL=''` se estableció solo para compilar el recorrido por el proxy local; no se cambió la configuración versionada. Google/GitHub y correo usaron proveedores falsos y una bandeja de prueba. No se usaron Neon, cuentas reales, correo real ni recursos de nube.

**Tres niveles de evidencia:**

- **Navegador integrado:** interacción real con React/Next, API y base aislada; en pruebas negativas se retuvo una petición, se perdió una respuesta o se devolvió un 503 identificado.
- **Prueba de código:** módulos reales sin modificar, con dobles de API, reloj, almacenamiento o hooks en el límite indicado. No se presenta como E2E ni como montaje completo de React.
- **Inspección/medición:** código, HTML/CSS, cálculo de contraste, dependencias o compatibilidad. Se indican las comprobaciones de navegador que faltan.

Las pruebas de comportamiento temporales no son regresiones permanentes. Los scripts, capturas y logs están ignorados en `.local/frontend-qa/`; los hechos necesarios para reproducir se incluyen aquí para que el informe no dependa de esos archivos. No hubo una baseline visual previamente aprobada contra la que certificar ausencia de regresiones.

## Validaciones ejecutadas

| Comprobación | Resultado y límite |
|---|---|
| `pnpm.cmd lint` | Aprobado |
| `pnpm.cmd typecheck` | Aprobado |
| `pnpm.cmd test` | 129/129, 13 archivos |
| `pnpm.cmd build` | Aprobado; también se compiló para el proxy local de QA |
| Tests existentes de dominio/store/API financieros | 103/103; son un subconjunto de las 129, no pruebas adicionales |
| `pnpm.cmd audit --prod --json` | 0 avisos |
| `pnpm.cmd audit --json` | 24 entradas de avisos de desarrollo: 2 críticas, 17 altas, 5 moderadas según registro; 17 avisos distintos |
| Barrido responsive | 9 rutas × 375/768/1440 CSS px, 27 capturas; sin errores de consola en el barrido inicial |
| Recorridos normales integrados | Registro/verificación, login, recuperación, restauración de cuenta, dos pestañas, protección anónima, gasto, pago, bolsillo, resumen y logout completados |
| Recorridos negativos | Reprodujeron las divergencias y fallos indicados en cada incidencia |

Las capturas de anchos CSS no equivalen a dispositivos móviles físicos, teclado virtual ni prueba táctil. Los fallos provocados de red y las excepciones de los escenarios negativos no se mezclan con el resultado limpio del barrido inicial.

Durante la preparación se corrigieron selectores y supuestos del arnés: el OTP admite un dígito por input, el día es un select, la copia preserva un salario destino no cero y la ruta anónima redirige a `/`. Algunos intentos quedaron inconclusos por esos motivos o por un `beforeunload` de datos sintéticos pendiente. Solo se da por aprobado el caso posteriormente completado con su condición observable. No se registraron esos fallos del arnés como defectos de producto.

## Matriz de incidencias

Todas están abiertas al cierre de este QA. Los IDs son estables para la corrección y la segunda revisión.

| ID | Prioridad | Severidad | Incidencia |
|---|---|---|---|
| F-AUTH-01 | P1 | Alta | Operaciones sensibles no ligadas a la cuenta que las inició |
| F-DATA-01 | P1 | Alta | Reintento antiguo sobrescribe un guardado nuevo |
| F-DATA-02 | P1 | Alta | Reintento de creación duplica deudas |
| F-DATA-03 | P1 | Alta | Copia de mes compite con guardados pendientes |
| F-UI-01 | P1 | Alta | Error y reintento de guardado ocultos en móvil |
| F-DATA-04 | P1 | Media | Recomendaciones de deuda exceden topes o saldo |
| F-DATA-05 | P1 | Media | Importes decimales y signos se reinterpretan silenciosamente |
| F-DATA-07 | P1 | Media | Se ignoran valores normalizados de respuestas exitosas |
| F-DATA-10 | P1 | Media | Guardados fallidos no cuentan como cambios pendientes |
| F-DATA-11 | P1 | Media | Registros rechazados permanecen en los totales |
| F-ENG-01 | P1 | Media | Recuperación pierde el paso por hidratación y consumo de storage |
| F-UI-02 | P1 | Media | Drawer pierde el foco al cerrarse |
| F-UI-03 | P1 | Media | Pagos del calendario pierden contraste al marcarse pagados |
| F-UI-12 | P1 | Media | Landing incompleta; pendiente de diseño solicitado |
| F-UI-14 | P1 | Media | Header público desborda y recorta CTA en móvil |
| F-UI-16 | P1 | Media | Texto de botones públicos no alcanza contraste AA |
| F-AUTH-02 | P2 | Media | Edición del OTP desplaza posiciones vacías |
| F-AUTH-03 | P2 | Media | Flujos cancelados aceptan respuestas tardías |
| F-AUTH-04 | P2 | Media | Estado persistido mal formado bloquea autenticación |
| F-AUTH-05 | P2 | Media | Excepciones de storage interrumpen autenticación |
| F-DATA-06 | P2 | Media | Redondeo binario difiere de la regla decimal |
| F-DATA-08 | P2 | Media | Fecha de negocio depende de zona del dispositivo |
| F-DATA-12 | P2 | Media | Parte compartida superior al saldo produce balance negativo |
| F-ENG-02 | P2 | Media | Avisos conocidos en herramientas de desarrollo |
| F-UI-04 | P2 | Media | Controles incumplen política táctil de 44 px |
| F-UI-05 | P2 | Media | Error de cuenta sin descripción accesible asociada |
| F-UI-06 | P2 | Media | Calendario declara grid sin su navegación de teclado |
| F-UI-09 | P2 | Media | Unificar botones; pendiente de diseño solicitado |
| F-UI-10 | P2 | Media | Definir paleta común; pendiente de diseño solicitado |
| F-UI-13 | P2 | Media | Montos grandes truncados en indicadores móviles |
| F-UI-15 | P2 | Media | Nombre de bolsillo común truncado excesivamente |
| F-UI-07 | P2 | Baja | Autenticación carece de encabezado semántico de página |
| F-UI-08 | P2 | Baja | Sin acceso directo de teclado al contenido principal |
| F-UI-11 | P2 | Baja | Distribuir logo oficial; pendiente de diseño solicitado |
| F-AUTH-06 | P3 | Baja | Callback OAuth sin resultado queda cargando |
| F-DATA-09 | P3 | Baja | Navegación permite años fuera del contrato API |
| F-ENG-03 | P3 | Baja | Métodos Array exceden el target Firefox por defecto |

## Autenticación y seguridad de la cuenta

### F-AUTH-01 — P1 / Alta

**Ubicación:** `frontend/src/modules/finance/settings/account-security-panel.tsx:19,73,148,166`; `frontend/src/modules/auth/session-manager.ts:251,264`.

**Reproducción:** iniciar actualización de contraseña o solicitud de cambio de correo como A con token vencido; retener el refresh; otra pestaña cambia la sesión a B; completar el refresh antiguo. El gestor conserva correctamente B, pero el caller del panel no exige la identidad inicial. La prueba de handlers reales capturó el formulario de A enviado con Bearer de B para ambos endpoints.

**Impacto:** escritura sensible dirigida a otra cuenta. La modificación efectiva requiere que la contraseña actual enviada sea válida para B; si A y B tienen contraseñas distintas, la reautenticación del backend la rechaza. No se demostró apropiación de una cuenta sin credenciales. **Corrección/aceptación:** ligar solicitud y respuesta al `userId` inicial y al ciclo de vida; cancelar si cambia la identidad. Regresiones permanentes de contraseña, solicitud y confirmación de correo. Evidencia de código con HTTP/refresh controlados; mutación real de B no ejecutada.

### F-AUTH-02 — P2 / Media

**Ubicación:** `frontend/src/modules/auth/one-time-code-input.tsx:27,33,92`.

**Reproducción:** escribir `3` en la tercera casilla vacía. En Chrome termina en la primera: `["3","","","","",""]`. Con `123456`, borrar la tercera produce `12456` y mueve las siguientes. `join('')` destruye los huecos. **Impacto:** código inesperado, intentos consumidos y posible invalidación. **Corrección/aceptación:** posiciones independientes o un input accesible único; probar escribir fuera de orden, borrar en medio, flechas y pegado completo. Confirmado en navegador y handlers.

### F-AUTH-03 — P2 / Media

**Ubicación:** `email-verification-form.tsx:104,135,315`, `register/register-form.tsx:61,70,112`, `login/login-form.tsx:60,69,135` y `forgot-password/forgot-password-flow.tsx:203,286,312,648`, bajo `frontend/src/modules/auth/`.

**Reproducción:** retener respuesta de verificación válida, cancelar mediante «Usar otro correo» y después resolverla; el padre real de registro adopta la sesión A aunque ahora esté B. En recuperación, «Volver a empezar» no impide que una verificación tardía reponga el paso anterior. **Impacto:** reemplazo inesperado de sesión o resurrección de un flujo cancelado. No se demostró persistencia financiera de A bajo B. **Corrección/aceptación:** generación de flujo y cancelación; invalidar al cancelar, cambiar correo, reiniciar o desmontar; respuestas obsoletas sin efectos. Confirmado con handlers/padre reales y dobles, pendiente E2E de estas carreras específicas.

### F-AUTH-04 — P2 / Media

**Ubicación:** `frontend/src/modules/auth/auth.storage.ts:18,26,37,68`; formularios login/registro al inicializar.

**Reproducción:** guardar `{}` en `sessionStorage['fintrack.auth.pending-verification']` y abrir `/login`. Chrome mostró `TypeError ... reading 'split'` y la pantalla de error de Next. El objeto se acepta sin validar su forma. **Impacto:** acceso bloqueado hasta quitar el estado; no bypass de autorización. **Corrección/aceptación:** validar email, enum y fechas finitas; descartar estado inválido con retorno al formulario útil. Cubrir JSON válido pero incompatible, valores nulos y expirados. Navegador integrado y prueba de código.

### F-AUTH-05 — P2 / Media

**Ubicación:** `frontend/src/modules/auth/auth.storage.ts:10,19,28,34,42,57,63`.

**Reproducción:** storage accesible cuyo `getItem` lanza `SecurityError`, o `setItem` lanza `QuotaExceededError`. Las llamadas escapan del guard que solo protege obtener `window.sessionStorage`. **Impacto:** lectura puede romper el formulario; escritura puede mostrar registro fallido después de crear la cuenta en servidor. **Corrección/aceptación:** persistencia opcional, operaciones protegidas y estado en memoria independiente del storage; el éxito API debe avanzar aun sin persistencia local. Excepciones simuladas en el límite real; no se certificó comportamiento de todos los modos privados.

### F-AUTH-06 — P3 / Baja

**Ubicación:** `frontend/src/modules/auth/oauth-callback-page.tsx:47,49,115,155,163`.

**Reproducción:** abrir `/auth/oauth/callback` sin fragmento de resultado. Permanece cargando; ningún evento lo transforma en error recuperable. **Corrección/aceptación:** separar inicialización SSR de resultado ausente; ofrecer reinicio de autenticación tras inicializar. Confirmado por parser y recorrido de navegador. Los callbacks válidos y proveedores reales requieren cobertura independiente.

## Integridad financiera, escritura y cálculos

### F-DATA-01 — P1 / Alta

**Ubicación:** `frontend/src/modules/finance/store/save-queue.ts:67,96,157`; `workbook-store.ts:340`.

**Reproducción integrada:** escribir salario `1000` → PATCH 503 controlado; escribir `2000` → guardado real exitoso; pulsar «Reintentar». Sale otro PATCH `{salary:1000}`, PostgreSQL vuelve a `1000`, el input sigue `2.000` y aparece «Cambios guardados». **Impacto:** pérdida silenciosa de una edición confirmada. **Corrección/aceptación:** invalidar trabajos fallidos superados por nuevas revisiones; reintentar el estado vigente y reconciliar respuestas sin pisar ediciones nuevas. La pantalla, API y recarga deben coincidir bajo fallos y respuestas desordenadas. Evidencia: `browser-functional.json`, además de prueba de cola/store.

### F-DATA-02 — P1 / Alta

**Ubicación:** `frontend/src/modules/finance/store/workbook-store.ts:257,455`; `debts/debt-drawer.tsx:302`; contrato backend de creación por ID.

**Reproducción integrada:** crear deuda `Deuda respuesta perdida`, saldo `100000`; dejar que POST termine con 201 pero perder la respuesta en red; volver a guardar. Se enviaron dos UUID distintos; PostgreSQL contiene dos deudas con ese nombre y la UI una sola. El backend deduplica correctamente por UUID, no por nombre arbitrario. Crear cuentas también cambia el UUID al reintentar, pero la unicidad del nombre causa un conflicto 409 en vez de duplicar.

**Corrección/aceptación:** conservar identidad de operación en fallos ambiguos y reintentos equivalentes; distinguir una creación nueva o cambio de payload. Una respuesta perdida debe terminar en una deuda y una confirmación consistente tras recarga. Evidencia: `browser-flows.json`, HTTP/API/base reales; también prueba de store.

### F-DATA-03 — P1 / Alta

**Ubicación:** `frontend/src/modules/finance/store/workbook-store.ts:326,327,333`; `month/month-sheet-page.tsx:130`.

**Reproducción integrada:** septiembre existe; octubre tiene salario persistido `800`. Editar octubre a `401`, retener ese PATCH y confirmar «Copiar mes anterior». La copia devuelve el salario destino `800` que el contrato conserva por ser no cero. Resolver el PATCH: PostgreSQL queda `401`, la UI `800`, con estado guardado. `flushAll()` programa escrituras, no espera su finalización, y `upsertSheet` sustituye la edición optimista.

**Corrección/aceptación:** serializar copia y guardados afectados o reconciliar por revisiones; resolver errores previos y conservar modificaciones hechas durante la operación. La copia respeta el contrato actual y deja UI/base iguales. Evidencia: `browser-copy-confirmed.json`; prueba de código independiente con otro snapshot.

### F-DATA-04 — P1 / Media

**Ubicación:** `frontend/src/modules/finance/domain/debt-plan.ts:176,182,194`; `debts/debt-drawer.tsx:228`.

**Reproducción:** saldo `1000`, mínimo `200`, tope `100`, redirección activada → recomienda `200`; tope explícito `0` se considera ilimitado → recomienda `500`; saldo `100`, tope `2000` → recomienda `500` en el fixture. Contradice «El plan nunca recomienda pagar más que esto». **Corrección/aceptación:** definir cero y conflictos mínimo/tope; validar y mostrar restricciones inviables; limitar asignación al saldo liquidable con semántica financiera explícita. Pruebas puras reales y copy del editor; no certificación contra Excel original ni asesoría financiera externa.

### F-DATA-05 — P1 / Media

**Ubicación:** `frontend/src/modules/finance/lib/format.ts:57`; `ui/fields.tsx:88`.

**Reproducción integrada:** introducir `1.234,56` en salario. Se muestra `123.456` y se persiste `123456`, eliminando separadores en lugar de interpretar o rechazar el decimal. La prueba pura también convierte `-100` en `100`. **Impacto:** valores hasta cien veces mayores y signo invertido sin feedback. **Corrección/aceptación:** parser es-CO con política explícita de precisión; rechazar formatos/signos no permitidos y explicar pesos enteros si esa es la decisión. Cubrir pegado, agrupaciones, coma decimal, vacío y límites. Evidencia de navegador/API real y función pura.

### F-DATA-06 — P2 / Media

**Ubicación:** `frontend/src/modules/finance/domain/money.ts:1`; consumidores en `month-sheet.ts:59` y `debt-plan.ts:117`.

**Reproducción:** `roundMoney(10.075)` devuelve `10.07`; `roundMoney(-1.005)` devuelve `-1`. La regla decimal half-up documentada y aplicada por backend da `10.08` y `-1.01`. `Number.EPSILON` no elimina todos los errores binarios. **Corrección/aceptación:** redondeo decimal consistente dentro del boundary; casos positivos/negativos y acumulaciones. No importar código del backend. La paridad completa sigue pendiente del Excel original. Confirmado con función real.

### F-DATA-07 — P1 / Media

**Ubicación:** `frontend/src/modules/finance/store/workbook-store.ts:241,246,470`; `ui/fields.tsx:127`; escala del contrato/columnas backend.

**Reproducción:** prestaciones `12.3456%` → estado local `0.123456`; API normaliza a `0.1235` y devuelve el dato canónico, pero el store ignora la respuesta. Para salario `1000000`, calcula `123456` antes de recargar y `123500` después. Hay riesgo equivalente con porcentajes compartidos cuya columna tiene escala 2.

**Corrección/aceptación:** precisión de inputs alineada al contrato y reconciliación por campo/revisión para no sustituir una edición más reciente. Confirmado con store real y respuesta normalizada controlada; normalización del backend inspeccionada y cubierta en la ronda anterior. La carrera de reconciliación necesita regresión integrada permanente.

### F-DATA-08 — P2 / Media

**Ubicación:** `frontend/src/modules/finance/domain/year-month.ts:42,46`; `hooks/use-today.ts:9`; `hooks/use-selected-month.ts:21`.

**Reproducción:** reloj `2026-07-01T03:00:00Z`, dispositivo UTC. Devuelve día `2026-07-01` y mes julio; en Bogotá aún es `2026-06-30`. Los getters locales determinan mes, gasto y vencimientos. **Corrección/aceptación:** fecha de negocio explícita `America/Bogota`, con límites día/mes/año en varias zonas de dispositivo. Confirmado por reloj/zona controlados y función real; falta recorrido en dispositivos de otras zonas.

### F-DATA-09 — P3 / Baja

**Ubicación:** `frontend/src/modules/finance/domain/year-month.ts:1`; `hooks/use-selected-month.ts:33`; `month/month-sheet-page.tsx:37`; `summary/summary-page.tsx:22`.

**Reproducción:** `?month=1999-12`, `2100-01` o `0000-01` se aceptan; anterior desde `2000-01` y siguiente desde `2099-12` salen del rango API `2000..2099`. Crear esos meses falla por validación backend. **Corrección/aceptación:** constantes locales del contrato, URL validada, límites de navegación y fallback/feedback útil. Pruebas de funciones y contraste de schemas, no ataque de autorización.

### F-DATA-10 — P1 / Media

**Ubicación:** `frontend/src/modules/finance/store/save-queue.ts:139`; `workbook-store.ts:212`; `workbook-context.tsx:43`; `shell/finance-shell.tsx:131`.

**Reproducción:** tras PATCH fallido, `save.error` existe, `pending=0` y `hasUnsavedChanges()` es falso. `beforeunload` depende de ese flag; `settle` no resuelve trabajos fallidos y logout acaba limpiando la sesión. **Impacto:** cambios recuperables se descartan sin aviso. **Corrección/aceptación:** estado sucio/fallido independiente de solicitudes activas; salida con reintento o descarte explícito cuando no se persiste. Flag confirmado por store real; la ausencia de aviso y descarte se derivan de los handlers inspeccionados. No se afirma haber completado todo el escenario de cierre con fallo en navegador.

### F-DATA-11 — P1 / Media

**Ubicación:** `frontend/src/modules/finance/store/workbook-store.ts:345,366,383`; `save-queue.ts:65`.

**Reproducción:** API de creación responde rechazo definitivo `409 LIMIT_REACHED`. La fila optimista sigue en el libro y los totales; `hasUnsavedChanges=false`; recargar la elimina. Reintentar no resuelve una cuota y editar el ID inexistente puede dar 404. **Corrección/aceptación:** distinguir fallos ambiguos/reintentables de rechazos definitivos; rollback o borrador fallido explícito excluido de totales confirmados, con corrección accionable. Prueba de store real con API 409; recorrido de cuota real en navegador pendiente.

### F-DATA-12 — P2 / Media

**Ubicación:** `frontend/src/modules/finance/domain/debt-plan.ts:115,150`; `debts/debt-drawer.tsx:159`; `debts/debts-page.tsx:143`; `backend/src/modules/finance/finance.schemas.ts:296`.

**Reproducción:** saldo total `100`, parte compartida fija `200`: mi saldo `-100`, barras `-100%` y `200%`. Los campos son válidos individualmente; falta relación cruzada. Una reducción posterior del saldo también puede provocarlo. **Corrección/aceptación:** definir semántica, validar edición y API contra estado vigente, incluidos PATCH parciales; render defensivo. Requiere coordinación con backend, no solo CSS. Confirmado por cálculo y schemas reales, sin escritura de este caso en Neon.

## UX, accesibilidad y diseño

### F-UI-01 — P1 / Alta

**Ubicación:** `frontend/src/modules/finance/shell/mobile-bars.tsx:158`; `sidebar.tsx:55`; `save-indicator.tsx:28`.

**Reproducción integrada:** a 375 px provocar 503 al editar salario. El sidebar está oculto bajo 1024 y el indicador móvil usa `hidden sm:block`; los nodos de error/reintento no son visibles bajo 640. Chrome confirmó el fallo y capturó la pantalla sin feedback. **Corrección/aceptación:** un estado persistente de guardado/error/reintento accesible en todos los anchos; anunciar cambios sin saturar y respetar área táctil. Evidencia: `mobile-save-error.png`, `browser-functional.json`.

### F-UI-02 — P1 / Media

**Ubicación:** `frontend/src/modules/finance/ui/drawer.tsx:27,81`.

**Reproducción:** abrir «Nuevo gasto» y cerrar con Escape. Chrome deja `document.activeElement` en `BODY`. No hay trigger ref ni restauración de foco; la misma integración de confirmaciones necesita comprobarse. **Corrección/aceptación:** devolver foco al invocador o fallback deliberado si se eliminó; cubrir teclado, cierre, cancelar y apertura por URL. Confirmación de navegador para drawer; extensión a cada confirmación pendiente de regresión específica.

### F-UI-03 — P1 / Media

**Ubicación:** `frontend/src/modules/finance/calendar/calendar-page.tsx:180`.

**Reproducción integrada:** marcar gasto pagado y ver chip del calendario. Su `opacity:0.55` afecta texto y fondo. Chrome midió 12 px, tinta `rgb(2,106,162)` sobre `rgb(240,249,255)` antes de compositar; los seis pares de categorías compositados sobre blanco dan aproximadamente **2.33–2.60:1**, por debajo de 4.5:1. El importe lleva además opacidad 0.85. No es un control deshabilitado.

**Corrección/aceptación:** mantener tinta legible y expresar pagado con texto/icono/tachado sin apagar todo el chip; contraste AA en cada categoría. Evidencia: medición CSS, cálculo sRGB y `calendar-paid-1440.png`.

### F-UI-04 — P2 / Media

**Ubicación:** `frontend/src/modules/finance/ui/fields.tsx:153`; `home/home-page.tsx:63`; `auth/auth-shell.tsx:47`; tamaños de botones/badges financieros.

**Reproducción:** controles segmentados de 38 px en teléfono y 32 px desde 640; acciones públicas de 40 px; varios controles se achican a 640 aunque el sidebar aparece a 1024. **Corrección/aceptación:** área táctil mínima 44 px según política del proyecto, incluidos tablets; comprobar separación y extensiones reales del hit area. **44 px es la política del proyecto, no el mínimo general de WCAG 2.2 AA.** Inspección CSS/DOM; prueba táctil física pendiente.

### F-UI-05 — P2 / Media

**Ubicación:** `frontend/src/modules/finance/settings/settings-page.tsx:89,98`.

**Reproducción:** renombrar una cuenta a vacío o nombre duplicado y salir del campo. `aria-invalid` existe, pero el mensaje no tiene ID/`aria-describedby` ni anuncio. **Corrección/aceptación:** vincular explicación a su campo y anunciarla de forma controlada; comprobar lector de pantalla. Confirmado por markup/código; no se ejecutó lector de pantalla real.

### F-UI-06 — P2 / Media

**Ubicación:** `frontend/src/modules/finance/calendar/calendar-page.tsx:123,144,211,227`.

**Reproducción:** entrar al grid y usar flechas; no hay roving tabindex ni handlers de navegación, y los 31 días son paradas Tab. **Corrección/aceptación:** implementar modelo de teclado del grid con un punto de entrada, o usar semántica sencilla que represente el comportamiento real. Confirmado por código y tabIndex/roles; recorrido exhaustivo con lector pendiente.

### F-UI-07 — P2 / Baja

**Ubicación:** `frontend/src/modules/auth/auth-shell.tsx:77`; `frontend/src/shared/ui/card.tsx` (`CardTitle`).

**Reproducción:** login/registro/recuperación tienen título visual, pero `CardTitle` renderiza `div`, sin h1. Chrome confirmó cero encabezados h1 en esas páginas. **Corrección/aceptación:** encabezado semántico de página conservando el estilo; jerarquía comprensible para navegación asistida.

### F-UI-08 — P2 / Baja

**Ubicación:** `frontend/src/modules/finance/shell/finance-shell.tsx`; `shell/sidebar.tsx:64`.

**Reproducción:** teclado desde el inicio del documento debe recorrer navegación principal y meses antes del editor; no hay skip link ni destino de foco directo. **Corrección/aceptación:** «Saltar al contenido» visible al enfocarse y ancla principal útil. Hay landmarks; esta ausencia por sí sola no certifica incumplimiento total de los mecanismos WCAG para evitar bloques. Hallazgo de facilidad de uso por teclado e inspección de estructura.

### F-UI-09 — P2 / Media — diseño solicitado

**Ubicación:** `frontend/src/shared/ui/button.tsx:7`; `frontend/src/modules/finance/ui/button.tsx:7`; `shell/sidebar.tsx:74`.

Hay dos familias independientes `Button`/`FtButton` y navegación con clases propias: tamaños, peso, radio, foco y estados divergen. **Aceptación:** una familia contractual reutilizable con variantes de acción, navegación y peligro, y estados normal/hover/foco/loading/disabled. Una navegación sigue siendo enlace cuando corresponde; igualdad visual no debe cambiar su semántica. `DESIGN.md` hoy permite diferencias entre superficies; redefinir esa regla es parte de la decisión solicitada.

### F-UI-10 — P2 / Media — diseño solicitado

**Ubicación:** `frontend/src/app/globals.css:51,371`; `DESIGN.md:230`.

**Ya existe una paleta:** tokens públicos OKLCH y sistema financiero hex, con separación deliberada. Pendiente la coherencia solicitada para toda la app. **Aceptación:** roles canónicos de marca, superficies, texto, foco, error/éxito y categorías; mapa público/dashboard; contrastes medidos y reglas documentadas. Conservar el significado financiero. La nueva dirección de landing mantiene el degradado azul → violeta → rosa de la captura del propietario.

### F-UI-11 — P2 / Baja — diseño solicitado

**Ubicación:** `frontend/src/shared/ui/brand-logo.tsx:20`; `home/home-page.tsx:59`; `auth/auth-shell.tsx:61`; `finance/shell/sidebar.tsx:31`.

**Ya hay logo funcional** en landing y autenticación, mediante Cloudinary con dimensiones y alt; la app privada usa un cuadrado `FT`. **Aceptación:** variantes oficial, compacta y wordmark en shell desktop/móvil, favicon y metadata de compartir coherentes; validar fallo del recurso remoto. No hace falta inventar otro logo. Logo público observado cargado; contenido del favicon y resiliencia sin Cloudinary quedan por verificar.

### F-UI-12 — P1 / Media — diseño solicitado

**Ubicación:** `frontend/src/modules/home/home-page.tsx:96,105,128`.

La landing mantiene «Primera base visual», hero genérico y paneles de muestra 50/30/20 que no explican el flujo real de hoja, colchón, bolsillos y deudas. Hay texto sin tildes y falta desarrollo final de secciones/footer. **Aceptación:** propuesta visual aprobada antes de implementar; narrativa del producto, demo identificada, CTA a registro repetido, funcionalidades reales, FAQ, disponibilidad/precio y footer con destinos existentes. No inventar usuarios, clientes, cifras ni testimonios.

El propietario amplió el brief durante el QA: **FinTrack OS gratis por ahora**, futuro SaaS de pago; referencia editorial Lumora y partículas inspiradas en Vesper/New Era, animación reversible ligada al scroll, fallback y reduced motion. La dirección y sus límites están en [landing-direccion-visual.md](landing-direccion-visual.md). No se implementó WebGL ni se instalaron las librerías. Los borradores legales están en [landing-contenido-legal.md](landing-contenido-legal.md), pendientes de datos y revisión antes de publicar.

### F-UI-13 — P2 / Media

**Ubicación:** `frontend/src/modules/finance/month/kpi-card.tsx:30,62`.

**Reproducción integrada:** salario `999999999999`, dentro del límite API `999999999999.99`, a 375 px. El ingreso neto `$ 920.000.099.999` y el disponible tienen 176 px de contenido en una celda de 131 px, con ellipsis y sin `title` ni expansión visible. El `dd` usa `truncate` y dos columnas. **Corrección/aceptación:** mostrar monto íntegro mediante distribución, wrapping o detalle explícito. Confirmado en Chrome y API real (`browser-last-checks.json`, `mobile-large-kpis.png`); 200% de texto sigue pendiente de la regresión.

### F-UI-14 — P1 / Media

**Ubicación:** `frontend/src/modules/home/home-page.tsx:65`.

**Reproducción:** `/` a 375 px. `scrollWidth=385`; header apretado y CTA derecho recortado. **Corrección/aceptación:** layout móvil del logo/acciones que no produzca scroll horizontal ni corte CTA; verificar 375/768/1440 y texto ampliado. Confirmado en captura/DOM Chrome. Resolver con landing conservando regresión independiente.

### F-UI-15 — P2 / Media

**Ubicación:** `frontend/src/modules/finance/month/pockets-card.tsx:34`.

**Reproducción:** bolsillo `Mercado`, presupuesto `400000`, sin gastos, a 375 px. Se ve «Me…» porque importe y estado consumen su fila. El texto completo permanece en DOM, pero la identificación visual es pobre incluso para un nombre ordinario. **Corrección/aceptación:** reservar ancho o repartir filas móviles; concepto, monto y estado legibles. Confirmado por captura real.

### F-UI-16 — P1 / Media

**Ubicación:** `frontend/src/shared/ui/button.tsx:14`; `frontend/src/app/globals.css:77,175` y clase `.brand-action`.

**Reproducción/medición:** `/login`, botón «Acceder a FinTrack OS», Chrome a 1440×900. Tinta blanca, 14 px, peso 500, botón 44 px. Se muestreó el fondo del gradiente vertical a la misma altura que el texto, en zona lateral sin glifos: contraste central **4.307:1 normal** y **3.953:1 hover**; alturas vecinas 4.254–4.425 y 3.905–4.100. Son inferiores a 4.5:1 para texto de ese tamaño. No se infirió la falla solo de los extremos del gradiente.

**Corrección/aceptación:** oscurecer la rampa de acción o cambiar combinación de texto/fondo; verificar contraste en posición real para normal, hover, activo y ambos temas que se soporten. Conservar el degradado del wordmark según el brief sin obligar a usarlo como fondo de botones. Evidencia: `browser-contrast.json`, capturas normal/hover. [Criterio de contraste de texto WCAG](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

## Ingeniería, dependencias y operación del frontend

### F-ENG-01 — P1 / Media

**Ubicación:** `frontend/src/modules/auth/forgot-password/forgot-password-flow.tsx:127`; `auth.storage.ts:63`; `forgot-password-page.tsx:21`.

**Reproducción integrada:** sembrar handoff válido `fintrack.auth.password-reset-required` con email y expiración futura; cargar/recargar recuperación. SSR emite solicitud de email; el primer render cliente consume y borra storage para mostrar verificación. Chrome muestra error de hidratación React 418 y vuelve a solicitud, con handoff eliminado. **Corrección/aceptación:** snapshot inicial estable y consumo post-mount; lecturas de render sin efectos; cubrir recarga, navegación directa, hidratación y Strict Mode. Los gates de login/registro evitan el caso SSR general: esa hipótesis se descartó.

### F-ENG-02 — P2 / Media

**Ubicación:** `frontend/package.json:38`; `frontend/pnpm-lock.yaml:84`; `frontend/vitest.config.ts:12`.

Auditoría completa: **24 entradas**, **17 avisos distintos**, todos de desarrollo; etiquetas del registro 2 críticas/17 altas/5 moderadas. Producción: **0**. Tinypool 1.1.1/Vitest 3.2.7 y herramientas de lint/CSS necesitan revisión compatible.

**Impacto contextual:** exposición de herramientas de desarrollador/CI. Los gadgets RCE de Tinypool requieren otra primitiva de prototype pollution y opciones/módulos maliciosos; no se demostró aquí. El aviso de lectura de archivos de Vitest requiere superficie de servidor/mock específica, no demostrada en este runner de entorno Node. No son 24 vulnerabilidades de la app desplegada.

**Corrección/aceptación:** actualizar dependencias afectadas conservando el runner y validar lint/typecheck/tests/build; documentar excepciones residuales con contexto. Fuentes primarias: [Tinypool GHSA-5gmw-xhrv-c9v3](https://github.com/tinylibs/tinypool/security/advisories/GHSA-5gmw-xhrv-c9v3), [Tinypool GHSA-85c8-ppgw-ccpr](https://github.com/tinylibs/tinypool/security/advisories/GHSA-85c8-ppgw-ccpr), [Vitest GHSA-82fw-gwwq-j7x9](https://github.com/vitest-dev/vitest/security/advisories/GHSA-82fw-gwwq-j7x9). La gravedad de proyecto es media por el alcance confirmado de tooling.

### F-ENG-03 — P3 / Baja

**Ubicación:** `frontend/src/modules/finance/domain/annual-summary.ts:38`; `store/workbook-store.ts:42`; `month/pocket-spends.tsx:137`.

La instalación Next usa Firefox 111 como target por defecto; no hay otra matriz del proyecto. `toSorted`/`toReversed` requieren Firefox 115 y no están en el polyfill instalado. Quitar la funcionalidad en un probe de `computeSummaryRows` causa `TypeError ... toSorted is not a function`. **Corrección/aceptación:** copias con sort/reverse soportados, o política explícita más reciente y prueba de navegadores mínimos. No se ejecutó Firefox histórico. Fuentes: [navegadores Next.js](https://nextjs.org/docs/architecture/supported-browsers), [toSorted](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/toSorted), [compatibilidad primaria MDN](https://github.com/mdn/browser-compat-data/blob/main/javascript/builtins/Array.json).

## Cobertura y resultados correctos

| Área | Evidencia obtenida | Resultado/límite |
|---|---|---|
| Landing, login, registro, recuperación | Producción, 375/768/1440, DOM/capturas | Renderizados; logo remoto cargó; incidencias arriba |
| Hoja mensual, resumen, deudas, calendario, configuración | Mismos tres anchos y base aislada | Renderizados; revisión de capturas representativas, sin baseline aprobada |
| Registro → código → sesión | UI, API real, código de bandeja falsa | Completado; storage solo hint de sesión, sin tokens persistidos |
| Login y ruta protegida | UI/API real; contexto de navegador anónimo independiente | Login completado; sin sesión `/dashboard` vuelve a `/` |
| Recuperación → código → nueva contraseña | UI/API real y bandeja falsa | Completado; login API acepta la contraseña nueva |
| Dos pestañas y recarga simultánea | Mismo contexto aislado, cookie real | Ambas vuelven a dashboard con libro |
| Seguridad de cuenta | Inspección y handlers reales con dobles | Reautenticación backend presente; F-AUTH-01; recorrido normal de cambio de correo/contraseña en UI pendiente |
| OAuth | Source y callback vacío en Chrome | Sin tokens aceptados de URL; proveedores reales no ejecutados |
| Crear gasto → pago en calendario → gasto de bolsillo → resumen → logout | UI/API/Prisma/PG reales | Cada escritura comprobada persistida; resumen renderiza; logout vuelve al inicio |
| Restauración de cuenta archivada | UI/API/PG real | Conserva ID canónico y persiste `archived=false`; se esperó a la escritura |
| Cola, errores, reintentos, copia y respuesta perdida | Probes y casos integrados descritos | Fallos de integridad reproducidos; prioridad alta |
| Cálculos/fechas/avalancha | Funciones reales, fixtures existentes, límites y reloj controlado | 103 tests existentes verdes; defectos fuera de esos fixtures; Excel original ausente |
| Calendario/bolsillos | Código y tests existentes | Fin de mes/día 31, estados de bolsillos y totales de spends revisados sin nueva incidencia en esos casos |
| Teclado/semántica/contraste | Código/DOM, Escape real, CSS y screenshots | Incidencias registradas; lector de pantalla y matriz completa de zoom pendientes |
| Tokens/identidad/SSR | Código, storage y pruebas de sesión existentes | Tokens actuales en memoria/cookie, hint local; provider por cuenta y API financiera con identidad protegida presentes |
| Inyección de texto | Inspección React/renderer | Texto de errores/proveedor no se inserta como HTML crudo; no se probó un corpus completo de ataques |
| Proxy | Prueba del helper real con cabeceras controladas | Allowlist y sobrescritura de secreto/IP correctas; cadena de confianza real pendiente de staging |
| Cabeceras y cache | HTTP del servidor de producción local | API conserva `no-store` y Helmet; HTML cacheado contiene shell anónimo, sin libro personalizado SSR |
| Bundles/rendimiento | Chunks del build | 29 JS, 1,520,417 bytes sin comprimir; suma gzip 454,961. No representa transferencia de una navegación ni LCP/INP |
| Referencia de rendimiento local | Una muestra por `/` y `/login`, Chrome 1440, cache de navegador deshabilitada, servidor caliente, sin throttling | LCP 116/140 ms; CLS 0.00063/0.00103. No es un aval de producción ni medición de INP, carga, percentiles o dispositivos reales |
| Error pages/SEO | Source/metadata | Hay títulos por rutas principales; error de Next por defecto en inglés y recuperación hereda título raíz; mejoras de contenido a incluir en landing |

### Endurecimiento y decisiones pendientes sin explotación demostrada

El HTML local no configura CSP, X-Frame-Options, `nosniff` ni Referrer-Policy; la API sí conserva Helmet. Revisar una política compatible con Next/Cloudinary/OAuth y la topología antes de producción. No se demostró clickjacking ni fuga de libro en caché, y no se presenta la ausencia de cada header como una vulnerabilidad explotada.

Probes de configuración comprobaron el fallback a localhost cuando falta URL pública y el 503 si falta secreto del proxy. Verificar las variables documentadas en despliegue y feedback de fallo; no hay evidencia de que el despliegue real esté mal configurado. También se encontró contexto de herramienta `impeccable` desactualizado respecto a la copia canónica: no altera el runtime; mantenerlo alineado antes de futura dirección visual.

### Condiciones de publicación surgidas del borrador legal

El propietario confirmó operación como persona natural en Colombia y el canal `fintrackos.auth@gmail.com`. Se prepararon términos y política de tratamiento en [landing-contenido-legal.md](landing-contenido-legal.md), con fuentes primarias y una matriz completa de pendientes. Estas condiciones se registran aparte de los 37 hallazgos técnicos/de diseño; el documento todavía es un borrador y las decisiones no están implementadas.

| Prioridad | Condición | Evidencia y cierre necesario |
|---|---|---|
| P1, antes del registro público | Autorización/aceptación verificable y textos vigentes | Registro y OAuth actuales no guardan versión ni prueba del acto de aceptación; definir finalidades, publicar textos aprobados y cubrir ambos recorridos sin controles preseleccionados |
| P1, antes de publicar políticas | Identidad y atención de derechos | Faltan nombre legal completo y datos de contacto requeridos; aprobar procedimientos de consultas/reclamos y verificar que el correo se atienda |
| P1, antes de recoger esas categorías | Minimización de datos de salud/terceros y admisión de menores | `disabilityIncome`, notas y `sharedWith` pueden revelar información adicional; definir tratamiento y autorizaciones pertinentes, sin afirmar que todos los datos financieros sean jurídicamente sensibles |
| P1, antes de prometer cierre/borrado | Retención y supresión operativas | `DELETE /users/:id` desactiva y sustituye email, pero conserva nombres/hash/OAuth/finanzas; no hay UI de borrado integral ni exportación descargable. Definir plazos, solicitudes y manejo de respaldos/restauración |
| P1, antes de activar nube pública | Proveedores y flujos internacionales | Confirmar entidades, contratos, ubicaciones y roles de los proveedores realmente elegidos; infraestructura prevista no equivale a operación comprobada |
| Antes de uso comercial | Elegibilidad de alojamiento y contratación futura | Revisar condiciones de planes gratuitos; servicio gratis no acredita uso no comercial. No activar cobro sin aceptación y condiciones propias del futuro plan |

La documentación legal detalla otras decisiones y sus fuentes; publicar el texto por sí solo no cierra esos procedimientos.

## Orden propuesto de corrección

1. **Identidad y persistencia:** F-AUTH-01, F-DATA-01/02/03/07/10/11, F-UI-01. TDD por comportamiento público, con regresión roja que reproduzca cada defecto y recorridos reales de respuesta perdida/fallos/identidad.
2. **Entradas y cálculos:** F-DATA-04/05/06/08/09/12, usando contratos explícitos y fixtures del Excel original cuando esté disponible.
3. **Autenticación e hidratación:** resto F-AUTH y F-ENG-01; casos de recarga, cancelación, storage y expiración. No debilitar reautenticación ni límites backend para evitar errores de UI.
4. **Accesibilidad y claridad operativa:** foco, contraste, grid, errores, tamaños, etiquetas e importes; validar teléfonos/tablets y teclado.
5. **Sistema visual solicitado:** aprobar roles de paleta → familia de botones → variantes de logo → landing completa. El landing tiene un gate de propuesta visual previa; el copy aprobado y los enlaces legales deben existir antes de publicar.
6. **Dependencias, compatibilidad y rendimiento:** cerrar avisos de tooling, matriz de navegadores y presupuestos reales; la nueva animación debe medirse sobre su propia implementación.

## Qué falta para el aval final

- Corregir las incidencias y volver a revisar el SHA exacto con regresiones permanentes y navegación real. Tests verdes actuales no cierran esta matriz.
- Excel original y casos de referencia para paridad de fórmulas, redondeo y plan de deudas; no está disponible en repo/equipo.
- Staging según `docs/despliegue.md`: cadena Vercel → Cloud Run, dominio/HTTPS/TLS, cookies/proxy, OAuth/correo reales y Neon. Continúan las verificaciones externas de backend; este QA no las sustituye.
- Safari/Firefox soportados, dispositivos móviles físicos, teclado virtual, lector de pantalla, zoom/text scaling y escenarios exhaustivos de expiración/cambio de cuenta.
- Rendimiento con presupuesto y entorno representativos: INP, percentiles de LCP/CLS, navegación fría/caliente, redes limitadas y volumen realista. La muestra local anterior no sustituye estas pruebas. No se ejecutó Lighthouse ni se da una puntuación inventada.
- La futura landing WebGL: GPU real, scroll reversible, recargas en puntos intermedios, context loss, fallback sin WebGL, reduced motion, pausa/cleanup y presupuestos del brief. El Chrome de esta auditoría no certifica ese motor todavía inexistente.
- Completar datos del operador y contenido legal, política de retención y mecanismo verificable de solicitudes. El despliegue actual será gratuito; dominio/VPS y SaaS de pago son planes futuros, no cambios ya realizados.

**Criterio de cierre:** cada ID conserva reproducción, corrección y evidencia de aceptación en una segunda matriz sobre el nuevo commit. No declarar «100% seguro» o «todos los defectos posibles encontrados»; emitir un aval limitado a evidencia, cobertura y condiciones externas efectivamente verificadas.
