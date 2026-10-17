# Handoff — FinTrack OS

## Estado vigente

El Owner autorizó completar Deudas, consolidar los borradores legales, terminar el QA y versionar el working tree según `AGENTS.md`. Después pidió mejorar las secciones inferiores. **Esa implementación está terminada y su QA local está aprobado; la nueva revisión visual del Owner sigue pendiente.** El hero SkyElite ya aprobado se conserva intacto. No hay autorización de despliegue ni de escribir datos reales en Neon.

- **Hero:** escena propia SVG/CSS y nubes exclusivamente dentro del hero. H1 «Bienvenido a la app de FinTrack OS», degradado y escala 96/72/60/48px según ancho. No volver al hero frontal anterior ni modificarlo por la escala del resto de la página.
- **Secciones inferiores:** producto como showroom, ritmo editorial en pasos/acceso/FAQ/CTA/footer; superficies claras, sin nubes ni partículas. H2 hasta 40px en escritorio y 28px en móvil; cuerpo legible y controles existentes. Sin wordmark gigante.
- **Movimiento:** historia de producto reversible; fallback completo con movimiento reducido, sin JavaScript o sin soporte. El hero pausa fuera del viewport, con pestaña oculta y por acción del usuario.
- **Deudas:** búsqueda normalizada por nombre/entidad, orden numérico/textual y controles desktop/móvil implementados. Solo cambia la presentación del plan calculado; prioridades, pagos, totales e identidad permanecen.
- **Producto:** sistema visual, marca, componentes y autenticación conservan sus cierres; envíos principales de autenticación azules. Errores inesperados de API y logs de Prisma no exponen diagnósticos internos.

## QA actual y evidencia

Consultar [docs/qa-design-release.md](docs/qa-design-release.md) para comandos, cortes, resultados y límites. El tracker es [docs/design-tasks.md](docs/design-tasks.md).

- Frontend: lint, typecheck, **252/252 pruebas** y build aislado aprobados.
- Landing inferior final: siete anchos, reversibilidad, recarga, reduced motion y ausencia de JavaScript comprobados localmente. Esto no implica una nueva aprobación estética del Owner.
- Deudas: **11 pruebas puras y cuatro escenarios de navegador**, incluidos en las suites documentadas.
- El selector de teclado del arnés tomaba el `summary` del menú en lugar de la FAQ. Se corrigió la selección del arnés; no era un defecto de la FAQ.
- Backend y recorrido integrado conservan sus resultados y alcance en el informe. No convertir evidencia anterior en una ejecución nueva ni el smoke Linux en la prueba de integración Windows omitida.
- Safari/Firefox, dispositivos físicos, lectores de pantalla, Lighthouse y staging conservan los límites allí registrados.

## Legales

Responsable confirmado: Juan Miguel Leon Gomez, Santiago de Cali, Valle del Cauca, Colombia. Correo: fintrackos.auth@gmail.com. No se proporcionan dirección ni teléfono. Reglas aceptadas: 18+, sin publicidad/analítica opcional, consentimientos separados y solicitudes de derechos/cierre por correo.

[El texto legal](docs/landing-contenido-legal.md) y [el procedimiento](docs/procedimiento-datos-personales.md) son borradores no publicados. **L-01…L-04 siguen abiertos.** No publicar páginas/enlaces legales incompletos ni afirmar aceptación registrada, control 18+, exportación completa o supresión integral sin implementar y probar. La consolidación documental no equivale a cumplimiento o autorización de producción.

## Versionamiento activo

- Rama: `feat/design-qa-release`. Al preparar este corte hay cinco commits locales: `8e37c7e` (higiene de pnpm), `76acc4f` (privacidad de errores), `2b9fca6` (sistema visual), `615d360` (landing) y `821327d` (Deudas). Resta versionar QA y documentación.
- Autorización de versionamiento vigente: completar commits `[TIPO]`, push de rama, verificar CI, integrar de forma no interactiva en `main`, subir y verificar su CI. Sin atribuciones a agentes, amend o force push.
- **Push, CI de esta rama, integración y CI de main todavía pendientes.** Un check verde de un SHA anterior no valida este corte.
- Pendiente la revisión visual nueva de las secciones inferiores; registrar su respuesta sin inventar aprobación. El proceso de versión no despliega ni habilita los legales.
- No tocar servidores del Owner en 3000/4000. QA usa build aislada `.local/release-final/frontend`, API 4420/control 4421/frontend 3300 y PostgreSQL sintético 55433 del proyecto `fintrack-release-qa`.
- No versionar `.env`, expedientes, tokens, dependencias o evidencia local. Preservar íntegros mega prompt y referencias. Los encargos y porcentajes antiguos del tracker son historial, no estado actual.
