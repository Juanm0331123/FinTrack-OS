# FinTrack OS — Continuidad de diseño, QA y versionamiento

## Estado vigente

La implementación de producto y de las nuevas secciones inferiores está terminada. Lint, typecheck, **252 pruebas frontend y build aislado** están aprobados. El QA técnico local de la tarea 9 está cerrado en su alcance; **la nueva revisión visual del Owner sigue pendiente**. El hero SkyElite previamente aprobado no se ha modificado.

El versionamiento completo ya está autorizado y activo en `feat/design-qa-release`: cinco commits creados (`8e37c7e`, `76acc4f`, `2b9fca6`, `615d360`, `821327d`); quedan QA/documentación, push, CI e integración/main pendientes al preparar este corte. No hay despliegue ejecutado ni autorizado. No presentar CI futura como aprobada.

Este archivo conserva su nombre por continuidad; es un handoff para Claude y Codex. Sustituye los encargos anteriores de generar alternativas, refinar C o esperar permiso para iniciar el versionamiento ya autorizado.

## Lectura y precedencia

1. [AGENTS.md](../AGENTS.md), [CLAUDE.md](../CLAUDE.md) y los de [frontend](../frontend/AGENTS.md).
2. [PRODUCT.md](../PRODUCT.md), [DESIGN.md](../DESIGN.md).
3. [Estado de tareas](design-tasks.md), [QA vigente](qa-design-release.md) y [HANDOFF](../HANDOFF.md).
4. [Copy aprobado](landing-content.md), con la excepción posterior del H1 que se conserva en el hero.
5. [Borrador legal](landing-contenido-legal.md) y [procedimiento](procedimiento-datos-personales.md): no publicados; L-01…L-04 abiertos.
6. [Mega prompt íntegro](landing-mega-prompt-original.md), [degradado](references/fintrack-os-gradient-reference.png) y [controles](references/fintrack-os-button-reference.png): preservar las fuentes sin reactivar requisitos sustituidos.
7. [QA financiero](qa-excel-paridad.md), [cierre frontend](qa-frontend-cierre.md) y [errores runtime](qa-runtime-errors.md): conservar sus contratos y regresiones.

Los registros de A/B/C y porcentajes anteriores se consultan como historial en el tracker. Las decisiones posteriores del Owner y el estado vigente prevalecen; no generar nuevas propuestas ni recuperar diseños descartados.

## Contrato visual implementado

- **Hero SkyElite aprobado e intacto:** H1 exacto «Bienvenido a la app de FinTrack OS», su degradado azul → violeta → rosa/coral y tamaño 96/72/60/48px según ancho; escena propia SVG/CSS con nubes solo dentro del hero.
- Su pausa manual/automática, pestaña oculta, visibilidad, reduced motion y estado sin JavaScript se conservan. Sin partículas, canvas decorativo, WebGL, Three.js ni postprocesado.
- **Producto inferior:** showroom con datos sintéticos, jerarquía editorial, geometría de producto y transiciones reversibles. Nada de nubes fuera del hero o hero isométrico descartado.
- **Pasos, acceso, FAQ y cierre:** composición editorial clara, motivos inequívocos de producto, acceso gratuito actual, once FAQ nativas, CTA y footer compactos. H2 de hasta 40px desktop/28px móvil y cuerpos de 16px. No letras gigantes ni bloques oscuros.
- Mantener Geist, logo oficial y familias vigentes de controles. CTA principal azul coherente con el hero; navegación y acciones secundarias claras. Envíos principales de autenticación azules.
- La nueva composición inferior está implementada y verificada localmente; falta revisión estética del Owner. La aprobación previa del hero no se extiende por deducción a esos cambios.

## Producto, copy y seguridad

- Mantener el copy aprobado, sus once respuestas, anclas, correo de soporte y destinos reales `/register`, `/login`; con sesión los accesos mantienen su navegación al dashboard.
- Gratis por ahora; SaaS futuro sin precios, planes ni fecha confirmados. No inventar clientes, métricas, testimonios, funciones o garantías.
- Datos de ejemplo sintéticos y rotulados. No usar el Excel personal, credenciales reales, datos de Neon ni proveedores de correo/OAuth reales para las pruebas.
- Conservar el contrato financiero: topes cero/vacío, mínimos manuales, redondeo, bolsillos sin doble conteo y fechas Bogotá. Diseño no cambia cálculos, cuotas, integridad o persistencia.
- Deudas ya incluye búsqueda normalizada y ordenación de la presentación, con once pruebas y cuatro escenarios de navegador; no repetir su implementación ni alterar las prioridades reales del plan.
- Preservar identidad A/B, sesiones multi-tab, refresh/logout, cancelación, seguridad, autosave con revisiones, reintentos/idempotencia y manejo de errores sin diagnósticos internos.

## QA local y límites

- Resultado actual: lint, typecheck, **252/252 pruebas** y build de producción aislado aprobados. No atribuir a este documento una ejecución nueva.
- Nueva landing: siete anchos, reversibilidad, recarga a mitad, reduced motion y contenido sin JavaScript aprobados en la comprobación local actual. Consultar el informe para evidencias y configuración.
- El intento de teclado de FAQ seleccionaba el `summary` del menú; se corrigió el selector del arnés. No fue una corrección de comportamiento de la app.
- El alcance y las fechas de los escenarios integrados/backend/Docker están documentados en [qa-design-release.md](qa-design-release.md). Un log previo no se convierte en un recorrido recién ejecutado.
- Se mantienen semántica HTML, teclado/foco, targets táctiles de 44px, contraste, responsive, SEO y objetivos de rendimiento. Sin gates de GPU exclusivos de motores retirados.
- Safari/Firefox, dispositivos físicos, lectores de pantalla, Lighthouse, staging y proveedores reales conservan sus límites explícitos. No prometer ausencia de todos los defectos.
- No instalar runners o bibliotecas por imitar el mega prompt: Next App Router, módulos existentes, Vitest, arnés CDP y dependencias acordadas permanecen.

## Legales y despliegue

Los textos y el procedimiento se consolidaron con los datos/reglas confirmados, pero **L-01…L-04 siguen abiertos**. No publicar borradores, enlaces legales inexistentes ni declarar cumplidos controles 18+, consentimientos, constancias, atención o supresión que todavía faltan. La autorización de versionar no resuelve esos bloqueos.

No se desplegó ni se usó Neon en esta ronda. Dominio, TLS/cookies/proxy de la topología real, operaciones y proveedores requieren su comprobación externa antes de producción.

## Siguiente trabajo autorizado

1. Completar QA/documentación por unidad lógica `[TIPO]`, conservando todos los cambios del Owner y las exclusiones de secretos/temporales.
2. Subir `feat/design-qa-release` y esperar sus checks; corregir fallos con commits nuevos. Los cinco commits ya creados no equivalen al cierre de la rama.
3. Registrar la revisión visual nueva del Owner cuando la realice; no afirmar que ya ocurrió.
4. Integrar en `main` según `AGENTS.md`, subir y verificar CI de ese SHA. **Push, CI y main siguen pendientes en este corte.**
5. Entregar SHA/commits/checks realmente comprobados y los bloqueos restantes. Sin despliegue, amend, force push ni atribuciones a agentes.

El tracker y [HANDOFF](../HANDOFF.md) registran la continuidad; no empezar otra ronda de propuestas ni recuperar las órdenes históricas de esperar un permiso ya concedido.
