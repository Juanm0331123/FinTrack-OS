# FinTrack OS — Dirección visual de la landing

**Estado: propuesta del paso 1, pendiente del OK del Project Owner.**

Fecha: 10 de octubre de 2026. Base evaluada: `1563233`. Este documento define la dirección y el contenido antes de programar. No modifica la landing, instala dependencias, cambia `DESIGN.md`, cierra incidencias del QA ni autoriza commits o despliegues.

## 1. Idea central

**«Tu dinero deja de ser piezas sueltas y se convierte en un mes que puedes entender».**

La landing presenta FinTrack OS como una herramienta de finanzas personales: una hoja por mes, ingresos y gastos por cuenta y categoría, bolsillos con presupuesto, colchón mínimo, resumen anual y planificación de deudas. Su objetivo es que una persona entienda el producto y pueda crear su cuenta o entrar a la que ya tiene.

**Modelo confirmado por el Project Owner:** el uso es gratuito por el momento, con intención de cobrar como SaaS en el futuro. La propuesta comunica **«Gratis por ahora»**, sin prometer gratuidad permanente, anunciar una fecha de cobro ni inventar planes o precios.

La composición toma la escala, el espacio y la presencia editorial de Lumora. El protagonista visual será un campo de partículas propio que se ordena con el scroll para explicar ese paso de dispersión a claridad. La marca conserva el azul, violeta y rosa pedidos, un fondo claro y el logo existente. Los importes y las demostraciones del producto siguen siendo legibles, en HTML, con datos de ejemplo identificados como tales.

El resultado buscado es una página de producto completa, con una experiencia expresiva en la entrada y una explicación concreta durante el recorrido. El dashboard conserva su función operativa y no recibe esta escena WebGL.

## 2. Moodboard y referencias comprobadas

Las referencias se consultaron el 10 de octubre de 2026. Se inspeccionaron sus **imágenes públicas de vista previa**, no se reprodujeron sus animaciones ni se verificó su código completo. Los enlaces de imágenes se obtuvieron de la biblioteca pública de GetLayers.

| Referencia | Evidencia visual inspeccionada | Qué aporta a FinTrack OS |
|---|---|---|
| [Lumora, referencia principal](https://www.getlayers.ai/layer/lumora) · [entrada solicitada](https://www.getlayers.ai/templates?layer=lumora) · [vista previa](https://www.getlayers.ai/_next/image?q=45&url=https%3A%2F%2Fstorage.getlayers.ai%2Ftemplates%2Flumora.webp&w=3840) | Hero de fondo gris claro, retrato central de gran escala, título fuerte a la izquierda, navegación superior y dos acciones; un acento naranja acompaña la composición. | Jerarquía editorial, protagonista visual de gran escala, espacio negativo y lectura inmediata. El campo de partículas ocupa el papel del retrato; no se copia una marca, un rostro ni sus cifras. |
| [Vesper](https://www.getlayers.ai/layer/vesper) · [vista previa](https://www.getlayers.ai/_next/image?q=45&url=https%3A%2F%2Fstorage.getlayers.ai%2Ftemplates%2Fvesper-06e69bbad0.webp&w=3840) | Superficie oscura y formación toroidal de puntos con transición menta, azul y violeta; el titular y la forma componen una escena asimétrica. | Densidad de puntos, continuidad de una superficie orgánica y una forma que conserva volumen. El movimiento real de la referencia queda sin verificar. |
| [New Era](https://www.getlayers.ai/layer/new-era) · [vista previa](https://www.getlayers.ai/_next/image?q=45&url=https%3A%2F%2Fstorage.getlayers.ai%2Ftemplates%2Fnew-era.webp&w=3840) | Gran anillo de trazos y puntos que rodea una zona central de texto; color azul y violeta abajo, rosa y coral arriba. | Gradiente espacial y un centro libre para contenido. El contorno de la escena nunca invade la lectura ni los controles. |

**Límite de la investigación:** la URL con `templates?layer=lumora` no fue accesible mediante el lector web; las rutas `/layer/...` entregaron principalmente la biblioteca. Una descripción indexada de Lumora habla de una superficie oscura, mientras su vista previa actual es clara. Para esta propuesta prevalece la imagen inspeccionada y, sobre todo, el brief de FinTrack OS. Las descargas directas del almacenamiento dieron 403; las tres imágenes pudieron consultarse mediante el optimizador público del mismo sitio. No se extrajeron ni copiaron prompts premium.

### Síntesis del moodboard

- **Composición:** texto protagonista y una escena amplia; alternancia entre explicación editorial y demostraciones reales del producto.
- **Material:** superficie clara, tinta azul muy oscura, puntos luminosos contenidos y trazos finos. Sin convertir los módulos de producto en una colección repetida de tarjetas decorativas.
- **Color:** azul → violeta → rosa para la marca y las partículas. Verde, ámbar y rojo conservan su significado financiero.
- **Ritmo:** la escena se transforma; las cifras, capturas, títulos y CTAs permanecen estables y disponibles.
- **Prueba del producto:** una hoja del mes con datos sintéticos y su lectura anual. No se usarán testimonios, sellos, número de usuarios ni promesas de resultados sin evidencia.

## 3. Paleta propuesta

Se conserva la identidad reconocible y se propone una relación explícita entre la landing y el azul de acción del dashboard. Estos valores son una propuesta, no una nueva paleta aprobada ni tokens ya implementados.

| Rol | Propuesta | Uso |
|---|---|---|
| Fondo principal | `#F7F9FD` | Entrada y secciones de lectura; próximo al fondo público vigente. |
| Superficie | `#FFFFFF` | Demostración de producto y controles secundarios. |
| Tinta principal | `#0F172A` | Titulares sin gradiente, cifras y contenido. |
| Tinta secundaria | `#475467` | Descripciones y ayudas. |
| Acción | `#2453D6` | Crear cuenta, enlaces y selección; continuidad con el dashboard. |
| Acción hover | `#1D43B3` | Estado de interacción, sin aclarar el texto de los botones. |
| Azul de marca | `#2563EB` | Inicio del gradiente de marca y partículas. |
| Violeta de marca | `#7C3AED` | Centro del gradiente y profundidad de la escena. |
| Rosa de marca | `#DB2777` | Final del gradiente y acentos de partículas. |
| Borde de control | `#667085` | Contornos que deban comunicar la existencia de un control. |
| Separador decorativo | `#E4E7EC` | Separación de contenido; no sustituye un borde accesible de control. |
| Foco | `#2453D6` | Indicador claramente visible; el halo claro puede acompañarlo. |
| Estado positivo / alerta / precaución | Roles vigentes `#067647` / `#C01048` / `#B54708` | Estados de las demostraciones financieras, siempre acompañados de texto. |

**Titular en gradiente:** la frase «tu mes, con claridad» podrá usar azul → violeta → rosa, como pidió el Project Owner. Se trata de una excepción explícita de marca frente a las recomendaciones genéricas de Impeccable. Se comprobará el contraste de los glifos sobre su fondo real, no solo de los extremos del gradiente. Si no alcanza 3:1 para el titular grande, se ajustarán esos tonos; cuerpos de texto y controles exigen 4,5:1. El canvas no se renderiza directamente detrás de letras o botones sin una zona de lectura controlada.

**Botones:** misma familia de tamaños, radios, tipografía, foco y estados entre superficies, con variantes semánticas. Acción principal sólida azul, secundaria con borde; mínimo 44px de área táctil en móvil. Un enlace de navegación conserva semántica de enlace. El gradiente se concentra en el titular y la escena, de modo que el CTA es fácil de reconocer.

## 4. Tipografía y marca

**Propuesta principal: conservar Geist**, ya adoptada por el proyecto. Peso 600 en títulos, 400–500 en lectura, números tabulares en las demostraciones. Su neutralidad permite que la escala y las partículas aporten personalidad sin sumar otra descarga ni una familia sin confirmar.

- Hero: tamaño fluido aproximado de 40–48px en móvil a 72–88px en escritorio, interlineado compacto legible y tracking entre −0,02em y −0,03em. El salto de línea se decide con el copy real.
- Títulos de sección: 28–44px, con jerarquía clara respecto al hero.
- Cuerpo público: 16–18px, interlineado cercano a 1,55 y ancho de lectura de 60–70 caracteres.
- Producto: la escala operativa vigente, con cifras completas y formato es-CO.
- Un solo `h1`; `h2` por sección y `h3` únicamente para subsecciones reales.

El logo existente de `BrandLogo` es la fuente de identidad. Se definirán su lockup completo y su versión compacta antes de implementarlas; no se deformará ni se recoloreará sin autorización. El header móvil tendrá un layout propio que evite el recorte del login identificado por el QA. La distribución en sidebar, favicon y metadatos pertenece también al backlog de marca; esta propuesta no la da por resuelta.

## 5. Hero: copy y primera composición

### Copy propuesto

**H1**

> Organiza tu dinero.<br>Entiende tu mes, con claridad.

La segunda frase lleva el gradiente de marca. Si el ancho móvil exige más líneas, se prioriza la lectura sin forzar una línea demasiado larga.

**Descripción**

> Registra tus ingresos y gastos, organiza tus bolsillos y revisa cuánto te queda. FinTrack OS reúne tu hoja mensual, el resumen del año y tu plan de deudas en un solo lugar.

**Acciones**

- Principal: **Crear mi cuenta** → `/register`.
- Secundaria: **Iniciar sesión** → `/login`.
- Navegación de exploración: **Ver cómo funciona** → `#hoja-del-mes`.

Junto a las acciones: **«Gratis por ahora»**. No se usará «Gratis para siempre» ni se publicará una tabla de precios mientras no exista una decisión comercial.

Los enlaces de acceso tienen un destino real incluso antes de que la escena cargue. Si se conserva la redirección de una sesión existente al dashboard, su comprobación no debe bloquear la navegación cuando haya un fallo temporal de red; ese comportamiento requiere la regresión señalada por el QA.

### Primera vista

En escritorio, un header compacto contiene el logo, enlaces internos a Producto / Cómo funciona / Preguntas y las acciones de cuenta. Debajo, el título y los CTAs ocupan la izquierda; el campo de partículas ocupa una región amplia a la derecha y acompaña el fondo. Una vista reconocible de la hoja mensual aparece en el siguiente tramo, no cuatro cifras gigantes aisladas.

En móvil, header de logo y acceso con distribución propia; texto y CTAs preceden la escena. La formación se recorta dentro de su contenedor, jamás mediante overflow horizontal de la página. A 375px ambos accesos deben seguir visibles y usables. La escena no empuja el CTA más allá de varios viewports.

## 6. Recorrido completo, secciones y formaciones

Cada demostración se identifica como **«Datos de ejemplo»**. Sus importes provienen de un fixture coherente y sus estados coinciden con el comportamiento real del producto. No se presenta la regla 50/30/20 como una función que no existe.

| Orden / ancla | Contenido y copy de dirección | Prueba visible | Formación propuesta de partículas |
|---|---|---|---|
| Entrada / `#inicio` | «Organiza tu dinero. Entiende tu mes, con claridad.» | Identidad, descripción y dos accesos reales. | Nube orgánica abierta: grupos dispersos se aproximan a un volumen reconocible, con centro de lectura libre. |
| Hoja mensual / `#hoja-del-mes` | «Una hoja para cada mes. Tus números, en contexto.» | Vista de ingresos, gastos, disponible y colchón; explicación de edición y estado de guardado. | La nube se ordena en planos y líneas de una hoja. Es una abstracción geométrica; la tabla y las cifras permanecen en HTML. |
| Bolsillos y cuentas / `#bolsillos` | «Dale un lugar a cada gasto.» | Un bolsillo con presupuesto y consumo; cuenta y categoría; estados legibles «Sin gastos», «Vas bien» o «Excedido». | Los puntos se distribuyen en grupos separados por espacio, conectados por un flujo contenido; no categorías representadas solo por color. |
| Colchón y deudas / `#plan-de-deudas` | «Cuida lo que queda. Ordena lo que debes.» | Lectura del colchón y ejemplo de priorización de deudas con explicación de estrategia y supuestos. | Los grupos se convierten en un arco protector y luego una secuencia escalonada. La prioridad financiera no se comunica únicamente mediante esa forma decorativa. |
| Resumen anual / `#resumen-anual` | «Mira más allá de un solo mes.» | Comparación mensual de ingresos y gastos, con tabla y leyenda visibles. | Doce planos o columnas de puntos, correspondientes a la idea de meses; el gráfico real sigue siendo accesible y coherente con el fixture. |
| Cómo funciona / `#como-funciona` | «Crea tu cuenta. Prepara tu mes. Registra y revisa.» | Tres pasos concretos del flujo actual; enlace a crear cuenta. | La escena estabiliza una retícula suave; la lectura gana espacio y el movimiento se reduce. |
| Preguntas / `#preguntas` | Respuestas concretas sobre registro manual, bolsillos, ajustes y uso mensual. | FAQ en HTML, expandible con teclado; sin respuestas sobre precios o políticas no decididas. | La forma queda periférica y estable; ningún movimiento dificulta seguir una respuesta. |
| Cierre / `#empezar` y footer | «Haz espacio para un mes más claro.» | Crear mi cuenta / Iniciar sesión y navegación completa del footer. | Retorno a una formación compacta de marca, con reducción de energía al acercarse al footer. El logo real permanece en HTML. |

Las demostraciones alternan orientación para evitar una sucesión monótona de tarjetas. Se mantiene un único lenguaje de escena y una sola historia; no se agrega un efecto distinto y desconectado en cada sección.

### Footer propuesto

- Logo y descripción breve del producto.
- **Producto:** Hoja del mes, Bolsillos, Plan de deudas, Resumen anual, Cómo funciona.
- **Cuenta:** Crear cuenta e Iniciar sesión.
- **Información:** Preguntas frecuentes; destinos propuestos `/privacidad` y `/terminos`, con el contenido preparado en [el borrador legal](landing-contenido-legal.md), todavía pendiente de completar, revisar y aprobar. Esas rutas solo se enlazan en producto después de implementarlas.
- **Datos y soporte:** `fintrackos.auth@gmail.com`, canal confirmado por el Project Owner. Puede presentarse como un enlace `mailto:`; no se promete un horario o tiempo de respuesta sin confirmarlo.
- Copyright del año vigente y titular de la marca por confirmar.

No se publican enlaces `#` de relleno, correos inventados, precios asumidos, métricas de adopción ni formularios que simulen un envío exitoso.

## 7. Coreografía del scroll

**La misma posición de scroll debe reconstruir el mismo estado de la escena al subir y al bajar.** No se utiliza `once: true`, no se cambia el estado únicamente al entrar en una sección y no se fuerza el scroll a cero al montar.

El contrato solicitado utiliza bandas de GSAP controladas por ScrollTrigger, con `scrub: 1`, `invalidateOnRefresh: true` y comportamiento reversible. El progreso total se define como **`uProgress = 1 + suma(progresos de las bandas)`**. El valor inicial 1 corresponde al estado hero después de la introducción; cada banda aporta un avance normalizado. La documentación de [ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/) permite vincular el progreso y refrescar los límites de la animación. Los límites finales se calcularán con los elementos reales después de montar y cargar fuentes/imágenes.

**Estos rangos son intención de storyboard, no mediciones del DOM existente ni garantías de duración.** La secuencia de contenido manda; los rangos se recalculan según su altura real para que los textos no deban deformarse para caber en la animación.

| Tramo del storyboard propuesto | Trigger / rango propuesto | Transición |
|---|---|---|
| 0–14% | Hero desde su entrada hasta la llegada de la hoja mensual. | Nube → hoja, conservando un protagonista estable en la primera vista. |
| 14–30% | La sección de hoja llega aproximadamente al 70% del viewport y avanza hacia el 30%. | Hoja → grupos de bolsillos. |
| 30–46% | Bolsillos ocupa la región central de lectura. | Separación controlada y distribución de grupos. |
| 46–62% | Colchón/deudas entra y recorre el centro. | Grupos → arco → secuencia priorizada. |
| 62–78% | Resumen anual alcanza la región central. | Secuencia → doce planos/columnas. |
| 78–90% | Cómo funciona y FAQ. | Estabilizar escena y reducir intensidad. |
| 90–100% | Cierre y aproximación al footer. | Formación compacta y calma final. |

### Reglas de implementación de esa coreografía

- Cada banda tiene su propio objeto de progreso; un coordinador suma los valores y es el único que publica `uProgress`. Así se evita que varios triggers escriban el mismo uniform en un orden accidental.
- Los triggers usan anclas y rangos reales de las secciones. En refresh se recalculan esos límites; los porcentajes del storyboard se ajustan al contenido real, no sustituyen esas medidas. `invalidateOnRefresh` es obligatorio.
- Después de refrescar y al recargar a mitad de página, el coordinador **sincroniza inmediatamente** los valores objetivo con la posición restaurada, sin esperar un segundo de catch-up del scrub. El primer frame visible utiliza el stage real bajo el hero. No se fuerza el scroll al inicio.
- **Toda la escena es función pura del scroll:** forma, ruido curl, bokeh, color, cámara y postprocesado dependen del mismo progreso y de semillas precalculadas. No hay reloj temporal decorativo, ruido aleatorio por frame ni deriva de cámara. Al volver a una posición, la escena vuelve al mismo resultado.
- La transformación se calcula en el shader. La CPU entrega `stageA`, `stageB` y la fracción de transición; React no actualiza estado ni renderiza componentes por cada frame. Los atributos de formación son `vec4`, con selección estática; no hay uniform arrays con indexación dinámica que comprometa la compilación ANGLE.
- GSAP prepara el estado mediante **`gsap.set` + `.to`**, evitando `fromTo` y sus efectos de `immediateRender` sobre el primer frame o el scroll restaurado.
- Lenis se integra en un único reloj con la escena y GSAP; se utiliza **`gsap.ticker.lagSmoothing(0)`**. Su [integración oficial](https://github.com/darkroomengineering/lenis) describe la coordinación con ScrollTrigger. No se introduce un segundo RAF independiente.
- Scrollbar oculta visualmente y `overflow-x: clip` en la landing, manteniendo el scroll normal y usable. El fondo pertenece a `html`; canvas fijo; `body` y las secciones no agregan capas opacas que tapen la escena. Texto y controles conservan zonas de lectura verificables.
- Los enlaces de ancla, Atrás/Adelante, teclado y restauración de scroll siguen funcionando. El pin que requiera la secuencia tiene dimensiones calculadas y se prueba para detectar saltos; ningún pin ni transición impide alcanzar el contenido.
- La opción de reducir efectos usa el fallback estático sin modificar el scroll ni el contenido. No se añade una animación temporal autónoma bajo el nombre «efecto ambiental».

### Introducción y loader

El loader se entrega desde SSR como **HUD de estado no oclusivo**, con límite máximo de 2 segundos. Los CTAs y el copy nunca se ocultan esperando al motor. El montaje coordina fuentes, preparación de formaciones, `compileAsync` y los cuatro frames de precompilación antes de mostrar la escena activa, o muestra el fallback al agotarse el límite.

Solo en el inicio superior, y respetando ese límite, la formación de wordmark pasa por una singularidad y una expansión hacia el hero. Si la página arranca restaurada por debajo del hero, se omite esa introducción y se muestra directamente el stage obtenido del scroll. Con reduced motion se omite la singularidad y la expansión. El wordmark animado acompaña al logo real, no sustituye el nombre accesible ni los controles.

## 8. Arquitectura propuesta dentro del proyecto

Se respeta App Router y la organización actual por módulos. La ruta pública continúa importando `HomePage`; no se introduce otro proyecto HTML ni directorios top-level `shared/`, `features/`, `entities/` o `packages/`.

```text
frontend/src/app/(public)/page.tsx              # ruta y metadata
frontend/src/modules/home/
    home-page.tsx                             # composición semántica, idealmente servidor
    home-content.ts                           # copy y datos de demostración identificados
    home-auth-actions.tsx                     # navegación de cuenta real, con fallback
    sections/                                 # hero, producto, pasos, FAQ, cierre y footer
    scene/
        particle-canvas.tsx                   # isla cliente y fallback visible
        particle-controller.ts                # renderer, scene, cámara y lifecycle
        particle-shaders.ts                   # vertex/fragment GLSL tipados como strings
        particle-formations.ts                # destinos deterministas y misma topología
        particle-quality.ts                   # perfil fijo inicial según dispositivo
        particle-postprocessing.ts            # pmndrs/postprocessing y HalfFloat
    motion/
        landing-scroll-controller.ts          # GSAP/ScrollTrigger/Lenis y limpieza
        landing-motion-preferences.ts         # pausa, reduced motion, visibilidad
```

Los nombres son un mapa de responsabilidades, no una lista de archivos que haya que crear sin necesidad. Los componentes compartidos, logo y botones continúan en `frontend/src/shared/ui`; el módulo home no importa stores o componentes privados de finance para fabricar una demo.

### Stack del brief, aún sin instalar

- **Three.js directo**, una única `THREE.Points`, una única `ShaderMaterial` GLSL y una `BufferGeometry` con atributos de formación `vec4`. Un renderer y un sistema de puntos conservan la misma topología en todos los stages. [ShaderMaterial](https://threejs.org/docs/pages/ShaderMaterial.html) es la base para el shader propio; no se usan React Three Fiber ni drei.
- La CPU publica `stageA`, `stageB` y la fracción; el shader mezcla destinos con `smoothstep` y stagger determinista, añade ruido curl ligado a progreso y dibuja bokeh de tres colores. El acceso a formaciones es estático, sin un uniform array dinámico susceptible de fallar en ANGLE.
- **[`postprocessing` de pmndrs](https://github.com/pmndrs/postprocessing)**, con su [`EffectComposer`](https://pmndrs.github.io/postprocessing/public/docs/class/src/core/EffectComposer.js~EffectComposer.html) y render targets **HalfFloat**; no los addons `EffectComposer` de Three.js ni un wrapper React. Su opción `frameBufferType` permite seleccionar `HalfFloatType`. Contrato visual: bloom aproximado de **0,45**, grano premultiplicado **desactivado en pantallas estrechas** y viñeta ajustada según legibilidad. El fondo, el alfa y la composición final se validan para no introducir bordes negros ni franjas. La intensidad exacta del efecto se confirma visualmente manteniendo el contrato solicitado.
- Las formaciones se generan por tareas para evitar una única tarea larga que bloquee el hilo principal. Se llama `compileAsync` con el render target y las condiciones de render del composer real, y se precompila/renderiza durante **cuatro frames** antes de revelar la escena. Compilar en un contexto distinto y asumir que el primer render final será rápido no acredita ese gate.
- **GSAP + ScrollTrigger**, `scrub: 1`, con estado reversible y cleanup al cambiar de ruta.
- **Lenis** solo para esta superficie; no altera el scroll del dashboard ni de los formularios de cuenta.
- **next-intl** solo si se aprueba publicar varios idiomas. Para la landing inicial es-CO no se añade esa dependencia ni un selector de idioma ficticio.
- No React Three Fiber, drei, Motion/Framer Motion ni maath, según la instrucción explícita.

Se hará importación dinámica de la isla WebGL, manteniendo el HTML y la imagen fallback disponibles desde el primer render. El paquete de la escena no debe llegar a las rutas de login, registro o dashboard por un import global. Aprobar esta dirección no equivale a afirmar que esas dependencias están instaladas o validadas; su incorporación ocurre en el paso de implementación autorizado.

## 9. Estados, fallback y accesibilidad

| Estado | Resultado esperado |
|---|---|
| JavaScript no disponible | Producto, FAQ básico, footer y enlaces `/register` y `/login` legibles y funcionales. |
| Escena cargando | HUD SSR máximo 2s; copy, CTAs y fallback visibles; espera coordinada de fuentes, tareas del motor y cuatro frames, sin overlay que tape el acceso. |
| Sin WebGL o error de shader | Imagen/representación estática de la formación aprobada; contenido intacto. |
| `prefers-reduced-motion: reduce` | Scroll nativo, sin Lenis suave ni scrub/morph/parallax; escena estática con composición completa. |
| Reducir efectos | Fallback estático y scroll nativo, sin alterar contenido ni devolver al inicio. No existe un reloj temporal decorativo que haya que pausar. |
| Pestaña oculta o escena fuera de vista | Pausar render y conservar el estado para reanudar. |
| Pérdida de contexto WebGL | Mostrar fallback; reintento limitado o restauración controlada sin bucle y sin navegación bloqueada. |
| Móvil / GPU insuficiente | Perfil fijo inicial según el contrato; sin bajar puntos o DPR durante el recorrido. Ante un fallo de capacidad o del presupuesto verificado, fallback explícito, sin modificar silenciosamente el contrato. |

- Canvas decorativo con `aria-hidden`, fuera del orden de tabulación y sin capturar eventos de puntero sobre contenido.
- Titulares, texto, cifras, FAQ y controles reales en HTML. El canvas no es el único canal de una información financiera.
- Foco visible, skip link, nombres accesibles, FAQ con estado expandido, objetivos táctiles de 44px según el proyecto y contraste comprobado sobre la composición final.
- Ningún texto inicialmente oculto por una animación depende de que esta termine para poder leerse.
- `forced-colors`, 200% de zoom, tipografía ampliada y teclado conservan una versión usable; el gradiente de texto dispone de tinta sólida cuando corresponda.
- El fallback debe ser una composición aprobada y honesta, no un canvas vacío ni un mensaje que haga parecer la página rota.

## 10. Rendimiento y gates de QA posteriores

**No se ha construido ni medido esta escena.** Las cifras siguientes son presupuestos iniciales para validar en la implementación, no resultados obtenidos:

- **Perfil solicitado, elegido una vez al iniciar:** 60.000 puntos en escritorio, 36.000 si el equipo tiene hasta 4 cores y 18.000 en móvil. La regla móvil prevalece cuando coinciden condiciones. Estos son objetivos del brief, no una carga ya medida o aprobada en hardware.
- **DPR fijo del contrato:** `min(devicePixelRatio, 2, sqrt(4.2e6 / (width * height)))`. Se calcula **una sola vez al montar**, con las dimensiones iniciales reales. Ante resize se actualiza el tamaño del renderer y del composer manteniendo ese DPR; no se recalcula según FPS ni se adapta en caliente. La resolución y el número de puntos no oscilan durante scroll.
- Destinos generados una vez; ningún array de miles de puntos ni geometría nueva se crea por frame. Evitar trabajo proporcional a las partículas en el hilo principal durante scroll.
- El shader actualiza posiciones/color e implementa el **bokeh solicitado en los puntos**; limitar transparencia superpuesta y el área cubierta por bloom. No añadir un pass extra de profundidad de campo ni otros passes sin una necesidad visible.
- Si el perfil solicitado no puede operar de forma segura y fluida, se muestra un fallback y se registra el fallo. Cualquier rebaja del contrato requiere una decisión explícita; no se presenta una escena con menos puntos como si cumpliera el perfil original.
- Medir LCP ≤2,5s, INP ≤200ms y CLS ≤0,1 como objetivos de salida; una corrida de laboratorio no sustituye datos reales de campo.
- Probar fluidez en GPU integrada de escritorio y al menos un móvil físico de gama media. Registrar dispositivo, GPU, navegador, DPR, resolución, versión y duración del recorrido. En Chrome headless se solicita `--use-angle=d3d11 --enable-gpu --ignore-gpu-blocklist`, pero las flags por sí solas no prueban aceleración: se debe verificar que el renderer real es hardware y no SwiftShader. Si no lo es, ese gate queda bloqueado.
- **Objetivo Lighthouse: al menos 90 en las cuatro categorías** (rendimiento, accesibilidad, buenas prácticas y SEO). No se afirma que esa puntuación ya se haya obtenido; se guarda la configuración, corrida y resultados reales.

| Gate | Evidencia necesaria antes de dar por terminada la implementación |
|---|---|
| Contenido y navegación | Copy final, enlaces sin stubs, CTA con y sin sesión, fallo de red y JS apagado. |
| Responsive | Capturas exactas de 1440×900 y 390×844, además de 375 y 768px del QA general, orientación móvil y 200% zoom; sin overflow horizontal. |
| Motion | Scroll abajo/arriba repetido: **0 diferencias** al volver a la misma posición y **0 saltos**; F5 en top, middle y zona de pin; mismo stage, ruido, cámara y postprocesado. Reduced motion omite la singularidad. |
| Arranque | Loader SSR desaparece o cae a fallback antes de 2s; CTAs nunca ocultos. **Primer frame real <100ms desde el inicio del motor**, no desde que se cierre el loader. Objetivo explícito: **ausencia de long tasks** durante el arranque y recorrido; medir y registrar todas, además de la latencia de compilación/render. Si esos objetivos no se cumplen, el gate queda fallido o bloqueado según la evidencia, sin declararlo logrado a partir de una captura estable. |
| WebGL | Una Points y un ShaderMaterial; atributos vec4; compilación ANGLE hardware, composer HalfFloat, cuatro frames de precompilación, resize, pérdida de contexto y cleanup de RAF/listeners/triggers/Lenis/materials/geometries/passes/renderer. |
| Accesibilidad | Teclado, foco, FAQ, contraste de texto y controles, lectura sin canvas, targets y estados. |
| Rendimiento | Perfil fijo 60k/36k/18k y DPR del contrato; GPU real verificada; bundle por ruta, LCP/INP/CLS, long tasks y perfiles de frames/memoria. Lighthouse ≥90 en las cuatro categorías como objetivo. Fallback y cualquier fallo se reportan. |
| React/Next | Sin error de hidratación ni duplicación al montar/desmontar en Strict Mode; lint, typecheck, tests pertinentes y build. |
| Producción | Revisión en staging de assets, CSP, fuentes, URLs y comportamiento del build; cero conclusiones sobre recursos externos aún no probados. |

## 11. Resolución de conflictos del ejemplo y decisiones pendientes

| Elemento de un ejemplo externo | Decisión para FinTrack OS |
|---|---|
| Animaciones `once` | Reemplazarlas por progreso reversible ligado al scroll. |
| Loader que bloquea toda la página | HUD SSR máximo 2s sin ocluir copy o CTAs; preparación coordinada y fallback. |
| Logos de clientes, cifras o estrellas de una agencia | No trasladarlos; usar demostración sintética y funcionalidades reales. |
| Archivo HTML único y scripts CDN | Mantener Next.js, TypeScript, módulo home y dependencias gestionadas por pnpm cuando se autorice implementar. |
| Forzar `scrollTo(0, 0)` al iniciar | Conservar navegación, anclas y restauración de scroll. |
| Formulario que siempre anuncia éxito | Omitirlo hasta disponer de una acción real; nunca simular envío. |
| Motion como dependencia por defecto | Aplicar GSAP, Three.js y Lenis solicitados; no instalar Motion. |
| Idiomas múltiples por imitación | Primera versión es-CO; next-intl solo si existen idiomas adicionales aprobados y traducciones reales. |

Antes de publicar se necesitan: titular de la marca/copyright, completar y aprobar [el borrador de privacidad y términos ya preparado](landing-contenido-legal.md), implementar sus rutas, lockups oficiales del logo y aprobación del copy. El correo `fintrackos.auth@gmail.com` y el uso gratuito actual están confirmados; planes, precios y condiciones de un futuro SaaS siguen sin definir. El borrador legal todavía no está aprobado para publicar y no prueba cumplimiento. Estas decisiones no impiden revisar ahora la dirección visual; los espacios pendientes se mantienen explícitos y no se rellenan con hechos inventados.

## 12. Relación con el QA y siguiente paso

`F-UI-12` sigue abierto: la landing actual conserva el prototipo. Este documento es la propuesta para corregirlo, no evidencia de una corrección implementada. El overflow `F-UI-14` debe tener una regresión específica después de la implementación. Botones `F-UI-09`, paleta `F-UI-10` y marca `F-UI-11` mantienen su alcance de app completa, aunque esta dirección define su aplicación pública.

**Siguiente paso: recibir el OK o ajustes concretos del Project Owner sobre dirección, copy y recorrido.** Después se implementará dentro del frontend, con las dependencias expresamente acordadas y las comprobaciones anteriores. No habrá commits ni push en este paso de propuesta.
