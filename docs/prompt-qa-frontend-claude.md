# Prompt para Claude — corrección y verificación del QA frontend

Copia el contenido siguiente en Claude Code, abierto en el repositorio FinTrack OS.

---

Actúa como ingeniero senior de frontend, QA y seguridad de aplicaciones. Corrige y verifica de principio a fin el QA frontend de FinTrack OS. Tu objetivo es dejar las incidencias técnicas corregidas, con regresiones permanentes y evidencia reproducible, para una revisión independiente posterior. El alcance de este encargo es **solo QA y remediación técnica**. La dirección creativa y la construcción de la landing serán una tarea separada.

## 1. Fuentes, estado inicial y alcance

Antes de editar, inspecciona `git status`, `git diff`, rama y SHA reales. Lee `AGENTS.md`, `CLAUDE.md`, `frontend/AGENTS.md`, `PRODUCT.md`, `DESIGN.md` y **`docs/qa-frontend.md` completo**. Si necesitas modificar backend, lee también `backend/AGENTS.md`. Respeta las instrucciones vigentes y las modificaciones ajenas; no asumas que el checkout coincide con el informe.

El informe original auditó `156323368ff0231d414ea75ffa0d49a088c3ba17`, en `fix/backend-qa-remediation`, y contiene **37 entradas: 33 defectos y 4 pendientes de diseño**. Usa sus IDs estables, reproducciones y criterios de aceptación. Los resultados históricos no cuentan como pruebas ejecutadas por ti.

Corrige los **33 defectos** detallados abajo. Mantén **F-UI-09, F-UI-10, F-UI-11 y F-UI-12 como diferidos a diseño**, sin marcarlos corregidos ni cerrar el aval integral del frontend. No unifiques la familia de botones, redefinas la paleta global, redistribuyas el logo ni construyas una landing nueva.

Sí debes corregir F-UI-14 y F-UI-16 en la interfaz existente: desbordamiento móvil y contraste de acciones. Son cambios mínimos de usabilidad/accesibilidad; conservarás la identidad y el degradado del wordmark. Lo mismo aplica a foco, tamaños táctiles, semántica y legibilidad operativa de los demás defectos.

Preserva intactos el mega prompt, referencias y captura para la futura tarea de landing: `docs/landing-mega-prompt-original.md`, `docs/references/fintrack-os-gradient-reference.png`, `docs/landing-direccion-visual.md`, `docs/landing-direccion-visual.html` y `docs/landing-contenido-legal.md`. Si alguno no existe, registra su ausencia; no lo reconstruyas de memoria. No instales Three.js, postprocessing, GSAP, Lenis, Motion ni librerías creativas. No publiques textos legales ni implementes consentimiento, cobros o infraestructura como parte de este encargo.

## 2. Skills y reglas de implementación

Aplica las skills instaladas y registradas, leyendo sus `SKILL.md` y solo las referencias necesarias:

- `tdd`: incrementos rojo → verde por comportamiento verificable; revisar/refactorizar después y volver a validar.
- `playwright-best-practices`: escenarios, aislamiento, formularios, portales, Next.js y evidencia de navegador. La skill no implica que Playwright esté instalado.
- `vercel-react-best-practices`: React/Next.js, efectos, hidratación, rendimiento y mantenibilidad.
- `impeccable` y `ui-ux-pro-max`: accesibilidad, claridad de errores, contraste, responsive y estados; no dirección creativa nueva.

Conserva Vitest en frontend y `node:test` en backend. No instales runners, navegadores, scanners, servicios, hooks ni skills nuevos sin una decisión explícita del propietario. No ejecutes inicializadores por recomendación de una skill. Se autoriza actualizar dependencias **ya existentes** afectadas por avisos de F-ENG-02 con una versión corregida compatible y una justificación comprobable; documenta cambios de contrato y valida el conjunto. No hagas actualizaciones generales sin relación con el QA.

Las fronteras de prueba acordadas para este encargo son: dominio financiero puro; API/store/cola/sesión por sus interfaces públicas; componentes y flujos por comportamiento observable; y navegador integrado con API y PostgreSQL reales aislados. Esto satisface el acuerdo de interfaces de TDD: no pidas confirmación repetida antes de cada test, fix o validación. Si aparece una decisión funcional realmente nueva, concreta sus alternativas y continúa el trabajo independiente.

Mantén rutas delgadas, módulos por feature, TypeScript estricto, nombres de código en inglés y textos de UI en español es-CO. Respeta el estilo existente. No importes código entre boundaries ni crees una arquitectura compartida nueva. Refactoriza solo lo necesario para resolver causas y mantener comprensible el código. Backend valida autorización y datos; el frontend nunca sustituye esa autoridad.

## 3. Incidencias obligatorias

La tabla es una guía de trabajo; el informe canónico contiene la reproducción completa y los límites de evidencia. Prioridad y severidad son conceptos distintos.

### Autenticación

| ID | Prioridad / severidad | Corrección que debes demostrar |
|---|---|---|
| F-AUTH-01 | P1 / Alta | Operaciones sensibles ligadas a identidad y ciclo de vida iniciales; nunca enviar el formulario de A autenticado como B tras un refresh/cambio de cuenta. Cubrir contraseña y solicitud/confirmación de correo. |
| F-AUTH-02 | P2 / Media | OTP conserva posiciones al escribir fuera de orden, borrar en medio, usar flechas o pegar; no desplaza huecos con `join`. |
| F-AUTH-03 | P2 / Media | Cancelar, reiniciar, cambiar correo o desmontar invalida respuestas tardías de registro/verificación/recuperación; no revive etapas ni reemplaza una sesión posterior. |
| F-AUTH-04 | P2 / Media | Storage con JSON incompatible, nulo, valores inválidos o expirados se descarta sin romper formularios. |
| F-AUTH-05 | P2 / Media | `getItem`, `setItem` y `removeItem` pueden fallar; persistencia opcional con flujo en memoria. Un éxito del servidor sigue siendo éxito. |
| F-AUTH-06 | P3 / Baja | Callback OAuth sin resultado termina en error recuperable; no queda cargando indefinidamente. |

### Integridad financiera

| ID | Prioridad / severidad | Corrección que debes demostrar |
|---|---|---|
| F-DATA-01 | P1 / Alta | Un reintento viejo no sobrescribe una edición posterior guardada. UI, API y recarga coinciden incluso con respuestas desordenadas. |
| F-DATA-02 | P1 / Alta | Tras creación confirmada en servidor con respuesta perdida, el reintento equivalente conserva identidad y no duplica deuda. Distinguir operación nueva o payload cambiado. |
| F-DATA-03 | P1 / Alta | Copia de mes coordinada con escrituras en vuelo, errores y ediciones durante la copia; respeta salario destino no cero y reconcilia revisiones. |
| F-DATA-04 | P1 / Media | Recomendación respeta tope y saldo liquidable; cero, mínimo y restricción inviable tienen semántica explícita compatible con el contrato. |
| F-DATA-05 | P1 / Media | Parser es-CO interpreta o rechaza formatos claramente; `1.234,56` no se convierte en `123456` ni `-100` en `100`. |
| F-DATA-06 | P2 / Media | Redondeo decimal consistente; cubrir `10.075 → 10.08`, `-1.005 → -1.01`, acumulaciones y límites según contrato documentado. |
| F-DATA-07 | P1 / Media | Reconciliar datos canónicos normalizados de la API sin pisar una edición más reciente; precisión coherente de tasas y porcentajes. |
| F-DATA-08 | P2 / Media | Fecha de negocio `America/Bogota` independiente de zona del dispositivo; probar límites de día/mes/año. |
| F-DATA-09 | P3 / Baja | URL y navegación respetan años `2000..2099`; parámetros inválidos producen fallback/feedback útil. |
| F-DATA-10 | P1 / Media | Trabajos fallidos siguen contando como cambios pendientes; salida/logout ofrece reintento o descarte explícito, sin confirmación falsa. |
| F-DATA-11 | P1 / Media | Rechazo definitivo de creación no deja registros fantasma en totales confirmados. Distinguir error ambiguo/reintentable y rechazo por cuota. |
| F-DATA-12 | P2 / Media | Parte compartida no produce saldo personal negativo ni barras imposibles; validar estado vigente, reducciones de saldo y PATCH parciales también en API. |

### UX y accesibilidad existentes

| ID | Prioridad / severidad | Corrección que debes demostrar |
|---|---|---|
| F-UI-01 | P1 / Alta | Estado de guardado, error y reintento visible y accesible en móvil pequeño; anuncio útil sin saturación. |
| F-UI-02 | P1 / Media | Drawer/dialog devuelve foco al invocador o fallback deliberado; cubrir Escape, cerrar, cancelar y trigger eliminado. |
| F-UI-03 | P1 / Media | Chips pagados conservan contraste AA en todas las categorías; estado pagado no depende solo de opacidad/color. |
| F-UI-04 | P2 / Media | Controles cumplen política del proyecto de 44 px táctiles en móvil; no atribuyas ese mínimo genérico a todo WCAG AA. |
| F-UI-05 | P2 / Media | Error de cuenta asociado al campo y anunciado mediante semántica accesible. |
| F-UI-06 | P2 / Media | Calendario cumple interacción de teclado del patrón semántico elegido; si mantiene grid, implementar navegación y foco coherentes. |
| F-UI-07 | P2 / Baja | Encabezado semántico de página en autenticación conservando presentación. |
| F-UI-08 | P2 / Baja | Skip link visible al foco y acceso real al contenido principal. |
| F-UI-13 | P2 / Media | Montos grandes íntegros o detalle explícito accesible; salario `999999999999` a 375 px y ampliación de texto. |
| F-UI-14 | P1 / Media | Header público sin desbordamiento horizontal ni CTA recortado a 375/768/1440 px; arreglo mínimo sin nueva landing. |
| F-UI-15 | P2 / Media | Bolsillo «Mercado», monto y estado identificables en móvil; no truncar un nombre ordinario a «Me…». |
| F-UI-16 | P1 / Media | Contraste AA del texto de acciones en normal, hover, activo y temas soportados, medido en posición real sobre gradientes. |

### Ingeniería

| ID | Prioridad / severidad | Corrección que debes demostrar |
|---|---|---|
| F-ENG-01 | P1 / Media | Handoff de recuperación no se consume en render ni causa React 418; SSR/hidratación estable, recarga y Strict Mode seguros. |
| F-ENG-02 | P2 / Media | Revisar y actualizar tooling vulnerable conservando runner; auditar producción/desarrollo por separado y justificar avisos residuales. |
| F-ENG-03 | P3 / Baja | APIs Array compatibles con targets soportados; evitar depender de `toSorted`/`toReversed` donde no existen, sin subir silenciosamente requisitos. |

## 4. TDD y cierre por evidencia

Trabaja por incrementos verticales: reproducción → regresión roja → fix mínimo → verde. Después revisa/refactoriza cuando corresponda y vuelve a validar; no atribuyas a la skill un ciclo de refactor dentro de cada incremento. La prueba debe fallar por **el síntoma original**, no por import inexistente, selector roto o infraestructura ausente. Si tu primer rojo era del arnés, corrígelo y reproduce el defecto antes de adjudicarlo como evidencia. Registra resultado anterior y posterior. Si el defecto ya no reproduce en el HEAD actual, no fuerces un rojo artificial ni reintroduzcas el bug: verifica requisitos, identifica el cambio que lo resolvió y documenta la evidencia antes de cerrarlo o reclasificarlo.

Los tests permanentes deben reproducirse desde un checkout limpio con comandos documentados. No dependan de `.local/`, datos manuales, credenciales reales ni scripts ignorados. Puedes usar evidencia previa ignorada como orientación; traduce su comportamiento al repositorio. Prueba funciones reales y observables; dobles solo en límites de red/reloj/storage/proveedores. Un doble de API no prueba autorización ni persistencia PostgreSQL.

Para fixes de CSS/semántica de bajo impacto no fuerces tests que copien clases. Conserva evidencia de navegador/DOM/contraste y usa regresiones significativas de interacción cuando corresponda. No conviertas skips, timeouts o falta de servicios en verdes. Usa esperas por resultados observables y locators por rol/label; no ocultes intermitencia con reintentos indiscriminados.

No cambies expectativas para adaptarlas al bug. No debilites reautenticación, cuotas, cookies, rate limit, autorización ni validación financiera para pasar tests. No afirmes que un fallo desapareció solo porque la suite existente sigue verde.

## 5. Entorno seguro y pruebas integradas

Usa PostgreSQL aislado de prueba, preferentemente el mecanismo ya documentado en `backend/test/compose.yaml`, con `TEST_DATABASE_URL` explícita y comprobada. API Express y Prisma reales; usuarios sintéticos A/B y datos propios. No conectes a Neon ni uses `DATABASE_URL` del `.env`, credenciales, cuentas, buzones o recursos de producción. OAuth y correo se sustituyen por proveedores de prueba y bandeja controlada; no envíes mensajes reales.

Aplica migraciones existentes a esa base. Si necesitas cambios de esquema para una corrección autorizada, crea migración nueva y aplícala únicamente en la base aislada; no edites migraciones aplicadas. Modificar backend queda autorizado solo cuando sea necesario para cerrar el contrato de un defecto frontend, como F-DATA-12, preservando las garantías de las rondas anteriores y validando el boundary afectado. Lee su `AGENTS.md`, coordina el cambio mínimo con tests y no amplíes el trabajo a una revisión general o rediseño del backend.

Ejecuta el frontend **compilado en producción**, conectado por la API/proxy de prueba. No hagas build con dev corriendo. Registra origen y variables de configuración sin secretos. Utiliza automatización instalada/disponible; declara su nombre real y conserva un arnés reproducible. No afirmes haber usado Playwright, Lighthouse, GPU real o Safari si no se ejecutaron.

Prueba al menos:

- Registro, OTP, login, recuperación, correo/contraseña, logout, expiración, callback controlado y rutas protegidas.
- Identidad A/B, dos pestañas, refresh simultáneo, refresh retenido y respuestas tardías tras cancelación/desmontaje/cambio de cuenta.
- Storage corrupto y operaciones que lanzan excepciones; recarga con handoff; hidratación y navegación directa.
- Ediciones rápidas, PATCH retenidos, respuestas desordenadas, 503, 401 y reintentos; ningún trabajo obsoleto modifica identidad o dato nuevo.
- POST persistido cuya respuesta se pierde; comprobar por GET público el número de registros y el resultado tras recarga de UI. SQL diagnóstica puede complementar la evidencia, pero no será el único assert ni acoplará tests a detalles internos de persistencia.
- Copia de mes con escrituras en vuelo y nuevos cambios; salario destino no cero; rechazo definitivo por cuota real; normalización canónica y carrera posterior.
- Hoja mensual, cuentas, bolsillos, gastos, pago en calendario, deudas, resumen anual, restauración y configuración; comprobar persistencia real.
- Fechas Bogotá, importes es-CO, ceros, extremos aceptados, tasas, signos y redondeo. Las fórmulas del Excel gobiernan: si falta el original, documenta bloqueo de paridad completa; no inventes valores ni aval. Puedes corregir y probar la norma decimal documentada, el contrato backend y casos independientes, sin presentarlos como una comparación realizada con ese Excel.
- Anchos 375/768/1440, teclado, foco/retorno, lectores/semántica disponibles, contraste, texto ampliado, reduced motion y compatibilidad de navegadores. Distingue viewport CSS de dispositivo físico.

Revisa además los pendientes de cabeceras/configuración del informe: políticas HTML compatibles con Next, imágenes y OAuth; cache sin datos privados; variables de origen, proxy y secreto. Verifica efectos antes de endurecer. No atribuyas explotación a una cabecera ausente ni configuración errónea al despliegue no observado. No cambies infraestructura remota.

## 6. Validaciones, documentación y entrega

Crea `docs/qa-frontend-remediacion.md` sin sobrescribir el informe original. Mantén matriz de **33 defectos + 4 diferidos a diseño**, con ID, prioridad, severidad, causa, fix, archivos, rojo observado, verde, comandos, evidencia, cobertura faltante y estado. Añade nuevos hallazgos con IDs separados y su justificación; no renumeres ni escondas los anteriores.

Registra SHA inicial/final real, rama, estado del working tree y huella del diff sin commits cuando corresponda; incluye cambios nuevos no rastreados en el inventario. Todo resultado debe ser `aprobado`, `fallido`, `bloqueado` o `no ejecutado`. Los bloqueos externos siguen abiertos aunque el fix local esté implementado.

Ejecuta desde frontend `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, auditoría de producción y completa. Si backend cambia, ejecuta typecheck, tests pertinentes, integración real y validaciones Prisma/migraciones afectadas. Comprueba `git diff --check`, archivos nuevos, ausencia de secretos y compilación de producción. Mide rendimiento con entorno/metodología declarados; muestra local sin throttling no acredita métricas de producción ni INP.

Conserva logs/capturas/trazas sanitizados y procedimientos permanentes suficientes para que otro agente reproduzca. Al terminar, libera solo contenedores, procesos y recursos creados por ti, verificando nombre/label/PID/perfil; no borres recursos ajenos ni documentación previa.

**No hagas commits, push, merge en `main` ni despliegue hasta nueva autorización explícita del propietario.** Una autorización histórica no autoriza esta ronda. Prepara todas las correcciones y validaciones locales sin pedir permiso por pasos rutinarios. Mantén los archivos y trabajo ajenos existentes, incluidos documentos aún no versionados. Respeta Engram y guarda decisiones, descubrimientos y resumen de sesión.

Entrega un resumen autosuficiente: matriz completa de IDs y estados, defectos corregidos y causa, regresiones antes/después, comandos realmente ejecutados, cambios de contrato, riesgos y bloqueos. Separa las cuatro tareas de diseño y los pendientes externos: Excel, staging, OAuth/correo reales, Neon/TLS y dispositivos no disponibles. Deja el resultado listo para un auditor independiente; no te concedas su aval ni declares «100% seguro» o «todos los defectos posibles encontrados».

El cierre de este encargo es QA técnico local verificable sobre el código modificado. La nueva landing, su mega prompt, la referencia Lumora/Vesper/New Era y la captura de marca se mantienen reservados para la siguiente tarea.
