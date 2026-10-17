# FinTrack OS — Continuidad de diseño, QA y versionamiento

## Estado vigente

**Cuatro secciones independientes en flujo y `ProductMotion` implementados, QA local final aprobado y aprobación visual nueva del Owner registrada:** «AHORA SI ME ENCANTO LOS SECTIONS QUE LINDOOOO!!!». El hero SkyElite aprobado permanece intacto, con nubes solo dentro del hero.

El showroom y su cierre local anterior quedan sustituidos para producto. Las **252 pruebas frontend, lint, typecheck y build aislado** documentadas pertenecen a ese corte y conservan su alcance; no demuestran todavía el resultado del nuevo diseño.

El versionamiento completo sigue autorizado en `feat/design-qa-release`: corte anterior subido hasta `5b711f5`, con CI `39000831658` en success. El código nuevo ya está en `4dcafee`, pendiente de push, CI e integración. Consultar Actions por cada SHA nuevo y el integrado en main; último main registrado `91d42bd`. No hay despliegue ejecutado ni autorizado.

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

## Contrato visual vigente y cambio en curso

- **Hero SkyElite aprobado e intacto:** H1 exacto «Bienvenido a la app de FinTrack OS», su degradado azul → violeta → rosa/coral y tamaño 96/72/60/48px según ancho; escena propia SVG/CSS con nubes solo dentro del hero.
- Su pausa manual/automática, pestaña oculta, visibilidad, reduced motion y estado sin JavaScript se conservan. Sin partículas, canvas decorativo, WebGL, Three.js ni postprocesado.
- **Producto inferior:** cuatro secciones independientes en flujo: hoja mensual ancha como única gran tarjeta; bolsillos como carpeta con recibos distribuidos; colchón/deudas como ecuación abierta; gráfica anual panorámica sin marco. No reutilizar una escena compartida cambiando solo datos. Conservar ejemplos sintéticos rotulados.
- `ProductMotion` por sección ya sustituye `StoryMotion` y sus tres archivos antiguos. Confirmación final de movimiento y fallbacks aprobada con exit 0.
- **Pasos, acceso, FAQ y cierre:** composición editorial clara, motivos inequívocos de producto, acceso gratuito actual, once FAQ nativas, CTA y footer compactos. H2 de hasta 40px desktop/28px móvil y cuerpos de 16px. No letras gigantes ni bloques oscuros.
- Mantener Geist, logo oficial y familias vigentes de controles. CTA principal azul coherente con el hero; navegación y acciones secundarias claras. Envíos principales de autenticación azules.
- La composición de producto está implementada, confirmada localmente y aprobada visualmente por el Owner. Hero intacto y nubes exclusivamente en él.

## Producto, copy y seguridad

- Mantener el copy aprobado, sus once respuestas, anclas, correo de soporte y destinos reales `/register`, `/login`; con sesión los accesos mantienen su navegación al dashboard.
- Gratis por ahora; SaaS futuro sin precios, planes ni fecha confirmados. No inventar clientes, métricas, testimonios, funciones o garantías.
- Datos de ejemplo sintéticos y rotulados. No usar el Excel personal, credenciales reales, datos de Neon ni proveedores de correo/OAuth reales para las pruebas.
- Conservar el contrato financiero: topes cero/vacío, mínimos manuales, redondeo, bolsillos sin doble conteo y fechas Bogotá. Diseño no cambia cálculos, cuotas, integridad o persistencia.
- Deudas ya incluye búsqueda normalizada y ordenación de la presentación, con once pruebas y cuatro escenarios de navegador; no repetir su implementación ni alterar las prioridades reales del plan.
- Preservar identidad A/B, sesiones multi-tab, refresh/logout, cancelación, seguridad, autosave con revisiones, reintentos/idempotencia y manejo de errores sin diagnósticos internos.

## QA local y límites

- Resultado del corte sustituido: lint, typecheck, **252/252 pruebas** y build de producción aislado aprobados. No atribuir a este documento una ejecución nueva ni trasladar esos resultados a cambios posteriores.
- Corte nuevo: lint, typecheck y build aprobados, **246/246 pruebas en 25 archivos**; se retiraron seis pruebas junto con el motor sustituido, sin presentarlas como omitidas. **4/4 regresiones visuales integradas aprobadas.**
- El primer recorte de reserva móvil de 24px se corrigió ajustando su ancho al 2%. Confirmación final exit 0: siete anchos 320–1440 sin cajas fuera de pantalla, overflow horizontal, imágenes rotas ni nubes bajo el hero; reverse/reload correctos, reduced motion con cero animaciones, sin JS cuatro secciones y cero ocultas, sin excepciones.
- El intento de teclado de FAQ seleccionaba el `summary` del menú; se corrigió el selector del arnés. No fue una corrección de comportamiento de la app.
- El alcance y las fechas de los escenarios integrados/backend/Docker están documentados en [qa-design-release.md](qa-design-release.md). Un log previo no se convierte en un recorrido recién ejecutado.
- Se mantienen semántica HTML, teclado/foco, targets táctiles de 44px, contraste, responsive, SEO y objetivos de rendimiento. Sin gates de GPU exclusivos de motores retirados.
- Safari/Firefox, dispositivos físicos, lectores de pantalla, Lighthouse, staging y proveedores reales conservan sus límites explícitos. No prometer ausencia de todos los defectos.
- No instalar runners o bibliotecas por imitar el mega prompt: Next App Router, módulos existentes, Vitest, arnés CDP y dependencias acordadas permanecen.

## Legales y despliegue

Los textos y el procedimiento se consolidaron con los datos/reglas confirmados, pero **L-01…L-04 siguen abiertos**. No publicar borradores, enlaces legales inexistentes ni declarar cumplidos controles 18+, consentimientos, constancias, atención o supresión que todavía faltan. La autorización de versionar no resuelve esos bloqueos.

No se desplegó ni se usó Neon en esta ronda. Dominio, TLS/cookies/proxy de la topología real, operaciones y proveedores requieren su comprobación externa antes de producción.

## Siguiente trabajo autorizado

1. Conservar la confirmación local y la aprobación visual registradas; preservar hero, copy, cálculos y flujos del producto.
2. Continuar documentación, push y checks del nuevo código `4dcafee`. La CI `39000831658` aprobó el corte previo `5b711f5`: consultar Actions por cada SHA enviado.
3. Integrar en `main` según `AGENTS.md` al satisfacer QA y CI, subir y verificar CI del SHA integrado. **Integración y CI de main están en progreso dentro del encargo; el último main registrado es `91d42bd`.**
4. Mantener registrada la aprobación visual nueva y los bloqueos legales abiertos; completar el versionamiento autorizado sin desplegar.
5. Entregar SHA/commits/checks realmente comprobados y los bloqueos restantes. Sin despliegue, amend, force push ni atribuciones a agentes.

El tracker y [HANDOFF](../HANDOFF.md) registran la continuidad; no empezar otra ronda de propuestas ni recuperar las órdenes históricas de esperar un permiso ya concedido.
