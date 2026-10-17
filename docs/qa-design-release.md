# Cierre de QA de diseño y Deudas

Fecha local: 2026-10-16. Base: `91d42bd` más los cambios locales de diseño, landing, privacidad de errores y Deudas versionados en esta entrega. El alcance técnico es frontend y regresiones de la API existente, con datos sintéticos. No es un aval de producción ni un cierre de los requisitos legales o de infraestructura externos.

## Resultado

- **Deudas: implementado y probado.** Búsqueda por nombre/entidad sin distinguir tildes ni mayúsculas; encabezados ordenables en escritorio, controles equivalentes en móvil, restablecimiento del orden de la estrategia y estado sin resultados. Filtrar/ordenar conserva los objetos del plan calculado, sus prioridades, recomendaciones y totales completos.
- **Landing y sistema visual: QA local aprobado.** Se conserva el hero SVG/CSS vigente aprobado por el Owner. Se corrigió su pausa fuera de pantalla y con pestaña oculta, manteniendo la pausa manual. Sin JavaScript queda estático y el control no aparece.
- **Legales: borradores consolidados, publicación bloqueada.** Se incorporaron identidad, Cali, correo y reglas aprobadas 18+, sin publicidad/analítica opcional, consentimientos separados y solicitudes por correo. No se inventaron dirección ni teléfono ni se publicaron páginas legales incompletas. Véanse L-01…L-04 en [el borrador](landing-contenido-legal.md) y [el procedimiento](procedimiento-datos-personales.md).

## Validaciones ejecutadas

### Refinamiento posterior de las secciones inferiores

Después del corte integrado de 43 escenarios, el Owner pidió elevar las secciones inferiores al nivel del hero y mantener las nubes solo en este. Se rehízo la composición de producto, pasos, acceso, FAQ y cierre. El hero aprobado quedó intacto.

- Nueva ejecución de lint, typecheck, **252/252 pruebas** y build aislado: aprobados.
- Nuevo barrido de siete tamaños, cinco estados de scroll de escritorio con ida/vuelta y recarga intermedia, reduced motion y fallback sin JavaScript: aprobados contra el diseño nuevo.
- Inspección de capturas desktop y móvil: folios grandes, cifras completas, composición editorial y footer gris claro; sin nubes fuera del hero. Medición de nueve bloques en seis tamaños desde 320px: sin overflow de página ni textos fuera del ancho, once FAQ conservadas y sin controles inferiores de menos de 44px en la medición.
- Regresiones integradas `F-UI-14`, `CABECERAS`, `RENDIMIENTO` y `BARRIDO`: **4/4** aprobadas contra esta build. Las 43 de la tabla siguen siendo el corte funcional anterior; no se presentan como una nueva ejecución completa de este refinamiento visual.
- El primer script local de teclado seleccionaba el `summary` del menú; se corrigió el selector y se activó explícitamente el foco de Chrome antes de enviar teclas nativas. FAQ confirmada con Enter para abrir y Espacio para cerrar a 1440, 768, 375 y 320px; no se modificó la app para acomodar el arnés. Los informes iniciales de layout conservan ese intento fallido del arnés y `faq-keyboard.json` contiene la confirmación corregida.

Evidencia nueva: `.local/qa-release/lower-final/` (capturas y mediciones, incluida `faq-keyboard.json`), `.local/qa-release/lower-regression/results.json` y `.local/qa-landing-cinema/report.json`. La nueva composición queda para revisión visual del Owner; las comprobaciones técnicas no sustituyen esa elección estética.

| Área | Comprobación | Resultado |
| --- | --- | --- |
| Frontend | `pnpm lint`, `pnpm typecheck` | aprobado |
| Frontend | `pnpm test` | 26 archivos, **252/252** |
| Frontend | Build de producción en copia aislada | aprobado; no se alteró `.next` del servidor del Owner |
| Frontend | `pnpm audit --prod --audit-level high` | cero avisos conocidos |
| Ejecutor de QA | `pnpm qa:runner` | **10/10** |
| Navegador integrado | Chrome + API Express/Prisma real + PostgreSQL 18 aislado | **43/43**; incluye autenticación, sesiones, guardado y fallos/reintentos, importes/fechas, teclado, formularios, cabeceras y recorrido final |
| Deudas | Once regresiones puras con TDD | **11/11**, incluidas dentro de las 252 |
| Deudas en navegador | Cuatro regresiones permanentes `F-DEBT-VIEW-*` | **4/4**, incluidas dentro de las 43: orden, filtro, identidad al editar y móvil |
| Backend | Typecheck y unitarias | aprobado; **117/117** |
| Backend | Migraciones e integración | **7/7** migraciones; **146 aprobadas de 147**, una omitida en Windows porque no entrega SIGTERM real |
| Backend | Prisma generate/validate/status y auditoría | aprobado; seis migraciones al día, cero avisos conocidos |
| Docker | Smoke de producción con PostgreSQL TLS aislado | `SMOKE OK`: migraciones, verify-full, salud, protección de origen, logs y SIGTERM Linux, salida 0 en 0 s según el log |
| Git | Diff check y exclusión de temporales/secretos | aprobado; sin coincidencias de los patrones de credenciales inspeccionados en los archivos candidatos |

El log final del smoke sobrevivió a una interrupción de créditos. Se verificó su marcador final y el estado de los recursos; no se recuperó el código de salida de aquella sesión ya cerrada. La prueba de SIGTERM del smoke no se confunde con la integración de Windows omitida. La CI Linux vuelve a ejecutar sus propias puertas.

### Comprobaciones adicionales de interfaz

- Landing a 1440×900, 1024×768, 768×1024, 390×844, 375×844, 320×740 y 720×450: sin scroll horizontal de página, títulos/enlaces fuera del ancho, imágenes rotas ni excepciones en la medición acotada. La tabla de Deudas tiene desplazamiento horizontal propio y accesible cuando su contenido lo necesita.
- Se esperó explícitamente la activación de la mejora de escritorio antes de comprobarla: cinco posiciones de scroll, incluida transición, conservan el mismo progreso, recorte y estado al bajar/subir. Recarga a mitad conserva posición y estado. Movimiento reducido desactiva la mejora y deja cero animaciones en la historia.
- Hero a 1440 y 375: movimiento visible, pausa manual, pausa fuera del viewport, preferencia manual conservada al volver y movimiento reducido en caliente. Sin JavaScript, animaciones pausadas y control oculto.
- Capturas de Deudas desktop/móvil inspeccionadas. Se retiró la cancelación nativa duplicada del input de búsqueda, conservando el botón de limpiar accesible de 44px. Sus escenarios de filtro y móvil se confirmaron contra el build actualizado.
- Muestra de rendimiento local, informativa: home LCP 148ms y CLS 0; login LCP 124ms y CLS 0 en el escenario integrado. No son métricas de usuarios reales ni resultados con throttling o Lighthouse.

## Entorno y reproducción

- Node 24.16.0, pnpm 11.27.1, Chrome instalado en modo headless y automatización propia por CDP; no es Playwright.
- PostgreSQL de prueba: proyecto Docker `fintrack-release-qa`, puerto local 55433, datos sintéticos. `TEST_DATABASE_URL` apunta solo a esa base.
- API de prueba 4420/control 4421 y frontend de producción 3300 con proxy; correo y OAuth falsos. La clave de borde es efímera y queda solo en `.local/qa-release/config.json`, ignorado.
- Build aislado en `.local/release-final/frontend`, sin `.env` del Owner y con raíz temporal de Turbopack que permite resolver las dependencias existentes. `NEXT_PUBLIC_BACKEND_URL` vacío usa el proxy del entorno de prueba.
- Procedimientos existentes: [QA frontend](qa-frontend-remediacion.md), [cierre anterior](qa-frontend-cierre.md) y [QA backend](qa-backend-remediacion.md).
- La ronda no modificó esquema ni datos de Neon y no envió correos reales. No detuvo los servidores del Owner en 3000/4000.

## Evidencia

- `.local/qa-release/browser/results.json` y sus capturas: 43 escenarios integrados.
- `.local/qa-release/browser-final/`: confirmación específica después del ajuste del input.
- `.local/qa-release-backend/`: unitarias, migraciones, integración, Prisma, auditoría y smoke Docker.
- `.local/qa-release/hero/report.json` y capturas: pausa y fallback del hero.
- `.local/qa-landing-cinema/report.json` y capturas: barrido responsive y progreso reversible de la versión final; las evidencias anteriores del mismo directorio son históricas.
- Regresiones permanentes: `frontend/qa/browser/debt-list-scenarios.mjs`, `frontend/src/modules/finance/debts/debt-list-view.test.ts` y suites existentes.

## Hallazgos cerrados en esta ronda

| Importancia | Hallazgo | Reproducción / observado | Corrección y criterio de cierre |
| --- | --- | --- | --- |
| Media | Escena del hero se movía sin control funcional sin JavaScript y no se pausaba al salir del viewport | Desactivar JS o bajar hasta FAQ; los keyframes seguían en ejecución | Mejora progresiva con marcadores de visibilidad y control hidratado; pausa manual/automática, reduced motion y cleanup comprobados |
| Baja | Dos controles de limpiar visibles en el buscador móvil | Escribir texto en Chrome: cancelación nativa y botón propio | Ocultar solo la cancelación nativa WebKit; se conserva búsqueda semántica y botón propio con foco/área táctil |

La búsqueda y ordenación pendientes eran una mejora solicitada, no una corrección de fórmulas. Los defectos de exposición de errores de la ronda previa se incluyen en el versionamiento con sus regresiones: [detalle](qa-runtime-errors.md).

## Cobertura pendiente y límites de aprobación

1. **Legal:** los cuatro bloqueos L-01…L-04 siguen abiertos. Aceptar una regla en el chat no crea una constancia por usuario ni implementa 18+, consentimiento de datos sensibles, supresión o contratos de proveedores. No declarar cerrado el punto legal ni habilitar esas afirmaciones públicamente.
2. **Externo:** staging y cadena real de dominios/TLS/cookies, OAuth/correo reales, arranques en frío, mantenimiento, respaldos/restauración y configuración operativa de Neon requieren el entorno de despliegue.
3. **Navegadores y rendimiento:** no se ejecutaron Safari/Firefox, lectores de pantalla, dispositivos físicos ni Lighthouse. El QA cubre Chrome, automatización, inspección de capturas y pruebas de código; no garantiza ausencia de todos los defectos.
4. **CI/versionamiento:** el proceso autorizado incluye commits por unidad lógica, push de rama, CI verde, integración no interactiva en main, push y comprobación de CI de main. Los resultados exactos se consultan por SHA en [GitHub Actions](https://github.com/Juanm0331123/FinTrack-OS/actions/workflows/ci.yml); no se despliega con esta entrega.
