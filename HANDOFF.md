# Handoff — FinTrack OS

## Estado vigente

El Owner autorizó completar Deudas, consolidar borradores legales, terminar QA y versionar el working tree según `AGENTS.md`. **Cuatro secciones independientes y `ProductMotion` implementados; QA local final aprobado.** El Owner aprobó visualmente las nuevas secciones: «AHORA SI ME ENCANTO LOS SECTIONS QUE LINDOOOO!!!». El hero SkyElite aprobado permanece intacto. No hay autorización de despliegue ni de escribir datos reales en Neon.

El showroom y su cierre técnico anterior quedan sustituidos para producto. Se conserva su evidencia histórica con su alcance original; no valida automáticamente esta nueva composición.

- **Hero:** escena propia SVG/CSS y nubes exclusivamente dentro del hero. H1 «Bienvenido a la app de FinTrack OS», degradado y escala 96/72/60/48px según ancho. No volver al hero frontal anterior ni modificarlo por la escala del resto de la página.
- **Producto implementado:** hoja mensual ancha como única gran tarjeta; bolsillos como carpeta y recibos distribuidos; colchón/deudas como ecuación abierta; resumen anual como gráfica panorámica sin marco. Cada sección tiene composición independiente. Pasos/acceso/FAQ/CTA/footer conservan el ritmo editorial; superficies claras, sin nubes fuera del hero ni partículas. H2 hasta 40px escritorio/28px móvil.
- **Movimiento implementado:** `ProductMotion` por sección sustituye `StoryMotion` y sus tres archivos antiguos. Reversibilidad, recarga y fallbacks confirmados con exit 0. El hero y su pausa manual/automática se conservan.
- **Deudas:** búsqueda normalizada por nombre/entidad, orden numérico/textual y controles desktop/móvil implementados. Solo cambia la presentación del plan calculado; prioridades, pagos, totales e identidad permanecen.
- **Producto:** sistema visual, marca, componentes y autenticación conservan sus cierres; envíos principales de autenticación azules. Errores inesperados de API y logs de Prisma no exponen diagnósticos internos.

## Evidencia anterior y QA del cambio en progreso

Consultar [docs/qa-design-release.md](docs/qa-design-release.md) para comandos, cortes, resultados y límites. El tracker es [docs/design-tasks.md](docs/design-tasks.md).

- Corte anterior: lint, typecheck, **252/252 pruebas** y build aislado aprobados; no atribuir esos resultados a cambios posteriores.
- Corte nuevo: lint, typecheck y build aprobados; **246/246 pruebas en 25 archivos**, con seis pruebas retiradas junto al motor sustituido. **4/4 regresiones visuales integradas aprobadas.** El primer recorte móvil de reserva de 24px se corrigió ajustando su ancho al 2%.
- Confirmación final exit 0: siete anchos 320–1440 sin cajas fuera de pantalla, overflow horizontal, imágenes rotas ni nubes bajo el hero; reverse/reload correctos, reduced motion con cero animaciones, sin JS cuatro secciones y cero ocultas, sin excepciones.
- Deudas: **11 pruebas puras y cuatro escenarios de navegador**, incluidos en las suites documentadas.
- El selector de teclado del arnés tomaba el `summary` del menú en lugar de la FAQ. Se corrigió la selección del arnés; no era un defecto de la FAQ.
- Backend y recorrido integrado conservan sus resultados y alcance en el informe. No convertir evidencia anterior en una ejecución nueva ni el smoke Linux en la prueba de integración Windows omitida.
- Safari/Firefox, dispositivos físicos, lectores de pantalla, Lighthouse y staging conservan los límites allí registrados.

## Legales

Responsable confirmado: Juan Miguel Leon Gomez, Santiago de Cali, Valle del Cauca, Colombia. Correo: fintrackos.auth@gmail.com. No se proporcionan dirección ni teléfono. Reglas aceptadas: 18+, sin publicidad/analítica opcional, consentimientos separados y solicitudes de derechos/cierre por correo.

[El texto legal](docs/landing-contenido-legal.md) y [el procedimiento](docs/procedimiento-datos-personales.md) son borradores no publicados. **L-01…L-04 siguen abiertos.** No publicar páginas/enlaces legales incompletos ni afirmar aceptación registrada, control 18+, exportación completa o supresión integral sin implementar y probar. La consolidación documental no equivale a cumplimiento o autorización de producción.

## Versionamiento activo

- Rama: `feat/design-qa-release`, corte anterior subido hasta `5b711f5`; código nuevo ya comprometido en `4dcafee`, pendiente de push y checks.
- Autorización de versionamiento vigente: completar commits `[TIPO]`, push de rama, verificar CI, integrar de forma no interactiva en `main`, subir y verificar su CI. Sin atribuciones a agentes, amend o force push.
- **CI `39000831658` en success para `5b711f5`, corte anterior.** No valida los cambios locales posteriores. Consultar Actions por cada SHA enviado y por el integrado en main; el último main registrado es `91d42bd`.
- Versionamiento/integración continúan autorizados y en progreso: QA local y aprobación visual confirmados; faltan push/checks de los SHA nuevos e integración según `AGENTS.md`. No se despliega ni se habilitan los legales L-01…L-04.
- No tocar servidores del Owner en 3000/4000. QA usa build aislada `.local/release-final/frontend`, API 4420/control 4421/frontend 3300 y PostgreSQL sintético 55433 del proyecto `fintrack-release-qa`.
- No versionar `.env`, expedientes, tokens, dependencias o evidencia local. Preservar íntegros mega prompt y referencias. Los encargos y porcentajes antiguos del tracker son historial, no estado actual.
