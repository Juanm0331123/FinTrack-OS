# FinTrack OS — Contenido de la landing

**Estado: contenido de la landing aprobado por el Project Owner el 2026-10-12; pendiente de implementación por Claude.** Los términos, la privacidad y las decisiones legales conservan sus pendientes independientes; esta aprobación no los pone en vigor.

Preparado el 11 de octubre de 2026 contra `main`, commit `91d42bdd47f3930c1fb49dd4d8876b622988fb7c`. Alcance: paso 1 del trabajo de diseño, cerrar el contenido público. Este documento no cambia la propuesta visual, el mega prompt, el código ni los borradores legales.

## 1. Brief editorial

- **Producto:** aplicación web de finanzas personales, organizada como una hoja por mes.
- **Público:** personas que quieren registrar y entender sus ingresos, gastos y deudas; pueden venir de una hoja de cálculo y no necesitan conocer términos financieros avanzados.
- **Necesidad inmediata:** saber para qué sirve la app, ver una muestra comprensible y encontrar cómo crear su cuenta o entrar.
- **Objetivo principal:** crear una cuenta. La persona que ya tiene cuenta encuentra acceso a iniciar sesión.
- **Idioma:** español de Colombia, `es-CO`. Esta propuesta no añade otro idioma.
- **Tono:** directo, cercano y concreto. Explicar lo que la persona puede hacer y los límites que necesita conocer.
- **Modelo confirmado:** gratis por ahora; posible SaaS de pago en el futuro, sin planes, precios ni fecha definidos.
- **Prueba del producto:** demostraciones construidas con datos sintéticos, identificadas como «Datos de ejemplo». No usar información del Excel personal.

### Mensaje que debe entenderse en la primera vista

> FinTrack OS es una app de finanzas personales para registrar tus ingresos y gastos, organizar tu mes y revisar tus deudas.

### Reglas para el copy

- Mantener «Crear mi cuenta» como CTA principal y «Iniciar sesión» como acceso secundario.
- Usar «cuenta de acceso» para identidad y «cuenta» o «cuenta de dinero» para una etiqueta de organización financiera cuando pueda haber confusión.
- Un **bolsillo** es un presupuesto con gastos registrados dentro de él. No es una cuenta bancaria ni dinero que la app custodie.
- El **disponible** se calcula con lo ingresado y presupuestado en la hoja; no equivale a un saldo bancario consultado.
- El **colchón mínimo** es el objetivo de disponible que configura la persona; no es un fondo separado ni una garantía de reserva.
- El plan de deudas calcula recomendaciones con las entradas y supuestos del usuario; no ejecuta pagos ni asegura resultados.
- La demostración debe mostrar los presupuestos de los bolsillos una sola vez en el total de gastos. Sus consumos interiores no son gastos adicionales en ese total.
- No anunciar sincronización bancaria, exportación a Excel, funcionamiento sin conexión, borrado inmediato, asesoría profesional, disponibilidad garantizada o seguridad absoluta.
- No introducir cifras de usuarios, testimonios, logos de clientes, estrellas, sellos o ahorros prometidos.

## 2. Contenido por sección, en orden

El orden conserva las anclas de la propuesta visual y añade un bloque explícito sobre la gratuidad actual. Los párrafos siguientes son copy público propuesto; las notas de implementación se identifican aparte.

### 2.1. Navegación

**Marca:** FinTrack OS.

**Enlaces:** Producto · Cómo funciona · Preguntas.

**Accesos:** Iniciar sesión · Crear mi cuenta.

**Accesibilidad:** primer enlace «Ir al contenido». El menú móvil debe conservar los mismos destinos y nombres.

### 2.2. Hero — `#inicio`

**Antetítulo:** Finanzas personales, mes a mes.

**H1 único:**

> Organiza tu dinero.
> Entiende tu mes, con claridad.

**Descripción:**

> FinTrack OS es una app de finanzas personales para quienes quieren llevar sus ingresos, gastos y deudas en un solo lugar. Organiza tus bolsillos y revisa cuánto te queda cada mes.

**CTA principal:** Crear mi cuenta.

**Acceso secundario:** Iniciar sesión.

**Exploración:** Ver cómo funciona.

**Texto junto al CTA:** Gratis por ahora.

**Nota de implementación:** el texto y los accesos deben estar disponibles desde el HTML inicial. El significado del hero no depende del loader, el canvas ni el movimiento.

### 2.3. Hoja mensual — `#hoja-del-mes`

**Antetítulo:** Tu hoja del mes.

**H2:** Una hoja para cada mes. Tus números, en contexto.

**Descripción:**

> Registra tu ingreso, organiza los gastos por cuenta y categoría y marca los pagos que ya hiciste. Revisa el disponible y compáralo con tu colchón mínimo.

**Detalles junto a la demostración:**

- **Ingresos:** ingresa los valores del mes y los ajustes que correspondan.
- **Gastos y pagos:** distingue lo presupuestado, lo pagado y lo pendiente.
- **Guardado:** consulta si tus cambios están guardados o necesitan un reintento.

**Etiqueta de la demostración:** Datos de ejemplo · Octubre de 2026 · Pesos colombianos.

**Ayuda bajo la demostración:**

> El disponible se calcula con los datos de tu hoja. FinTrack OS no consulta el saldo de tus bancos.

**Nota de implementación:** la sección 3 define la muestra sintética. No mostrar «Cambios guardados» como confirmación de una operación real cuando solo se está viendo una imagen o ejemplo estático.

### 2.4. Bolsillos y cuentas — `#bolsillos`

**Antetítulo:** Presupuesto y organización.

**H2:** Dale un lugar a cada gasto.

**Descripción:**

> Crea un bolsillo para un gasto variable, como mercado o transporte. Define su presupuesto y registra los consumos con fecha y monto para ver lo usado y lo que queda.

**Texto complementario:**

> Usa cuentas y categorías para ordenar tus registros. Las cuentas son etiquetas que tú configuras; no se conectan a entidades financieras.

**Etiquetas de ejemplo:** Mercado · Presupuesto · Gastado · Restante.

**Ayuda:**

> El presupuesto del bolsillo ya forma parte del total de gastos del mes. Sus consumos muestran cómo lo utilizas.

### 2.5. Colchón y deudas — `#plan-de-deudas`

**Antetítulo:** Disponible y prioridades.

**H2:** Cuida lo que queda. Ordena lo que debes.

**Descripción:**

> Define el disponible que quieres conservar y registra los saldos, tasas y cuotas mínimas de tus deudas. El plan muestra una prioridad de pago y recomendaciones según la estrategia que elijas y los datos de tu mes.

**Detalles:**

- **Colchón mínimo:** compara tu disponible con el objetivo que configuraste.
- **Estrategia:** elige mayor interés, mayor cuota, menor cuota o la recomendación de la app.
- **Datos vigentes:** actualiza el saldo, las tasas y la cuota mínima cuando cambie tu extracto.

**Ayuda visible:**

> Las recomendaciones dependen de lo que registres. Si el disponible no alcanza para cubrir las condiciones del plan y tu colchón, la app lo indica. Tú decides y realizas los pagos por tus canales habituales.

**Nota de implementación:** no convertir esta sección en una promesa de pagar menos intereses, salir de deudas en una fecha o preservar siempre el colchón. Cualquier simulación numérica deberá usar el dominio financiero y mostrar sus supuestos.

### 2.6. Resumen anual — `#resumen-anual`

**Antetítulo:** Una mirada al año.

**H2:** Mira más allá de un solo mes.

**Descripción:**

> Compara los ingresos y gastos de tus meses registrados. Revisa el ahorro que apartaste, los pagos de deuda y los meses en los que alcanzaste tu colchón mínimo.

**Pie de la demostración:**

> Datos de ejemplo. El resumen reúne tus hojas registradas; los meses sin hoja no aportan movimientos.

**Nota de implementación:** si se representa ahorro acumulado, distinguirlo del ahorro del año. El acumulado del producto puede incluir meses registrados de años anteriores. Una gráfica debe tener leyenda y una alternativa de lectura de sus valores.

### 2.7. Cómo funciona — `#como-funciona`

**H2:** Empieza con tu próximo mes.

**Paso 1 — Crea tu cuenta.**

> Regístrate con tu correo y completa la verificación. También puedes usar un proveedor de inicio de sesión si está habilitado.

**Paso 2 — Prepara tu mes.**

> Configura tus cuentas y tu colchón mínimo. Crea la hoja del mes e ingresa tus ingresos y gastos previstos.

**Paso 3 — Registra y revisa.**

> Marca los pagos, agrega los consumos de tus bolsillos y consulta tus totales. Para el siguiente mes, puedes copiar las filas del anterior y actualizarlas.

**CTA:** Crear mi cuenta.

**Nota de implementación:** copiar filas no copia consumos del bolsillo ni marca pagos como realizados. Evitar un mensaje que sugiera que el ingreso o todas las cifras se trasladan automáticamente.

### 2.8. Acceso actual — `#acceso`

**Antetítulo:** Acceso actual.

**H2:** Gratis por ahora.

**Descripción:**

> Actualmente, el uso de FinTrack OS es gratuito. Queremos ofrecer planes de pago en el futuro, pero todavía no hay precios, planes ni una fecha definidos.

**CTA:** Crear mi cuenta.

**Nota de implementación:** no incluir tabla de precios, descuentos, contador de oferta, planes ficticios ni una promesa de gratuidad permanente. El futuro cambio de modelo requiere su propio contenido aprobado y condiciones de contratación.

### 2.9. Preguntas frecuentes — `#preguntas`

**H2:** Antes de empezar.

**¿FinTrack OS se conecta a mis bancos?**

> No. Registras tus datos manualmente. Las cuentas sirven para organizar tus registros; FinTrack OS no consulta movimientos bancarios ni ejecuta pagos.

**¿Para quién está pensado?**

> Para personas que quieren organizar sus finanzas personales por mes: ingresos, gastos, bolsillos y deudas. Si hoy llevas ese seguimiento en una hoja de cálculo, encontrarás una estructura familiar.

**¿Qué es un bolsillo?**

> Es un presupuesto para un gasto variable. Puedes registrar los consumos dentro del bolsillo y ver cuánto has usado y cuánto queda. El presupuesto ya se cuenta en los gastos del mes.

**¿Qué significa el colchón mínimo?**

> Es el disponible que te propones conservar al final de tu presupuesto mensual. Lo defines en Configuración y la app compara ese objetivo con el disponible calculado. No es una cuenta ni dinero reservado automáticamente.

**¿El plan de deudas hace los pagos por mí?**

> No. Calcula recomendaciones según tus saldos, tasas, cuotas, estrategia y mes registrado. Mantén esos datos al día y revisa tus extractos; los pagos los realizas por tus canales habituales.

**¿Puedo reutilizar el mes anterior?**

> Sí. Puedes copiar sus filas al mes elegido. Los pagos quedan pendientes y los bolsillos empiezan sin consumos. Las filas que ya tienes en el mes de destino se conservan.

**¿Puedo importar o descargar un archivo de Excel?**

> La aplicación no ofrece actualmente importación ni exportación de archivos Excel para usuarios. El registro se realiza dentro de FinTrack OS.

**¿Cuánto cuesta?**

> Es gratis por ahora. Está prevista una posible evolución a planes de pago, pero todavía no están definidos sus precios ni su fecha.

**¿Qué pasa si un cambio no se guarda?**

> La app muestra el estado de guardado y el motivo del error cuando está disponible. Si quedan cambios fallidos, puedes reintentarlos o descartarlos. Revisa la confirmación de guardado antes de cerrar; esto no supone funcionamiento sin conexión.

**¿En qué moneda registro los montos?**

> La interfaz actual está preparada para pesos colombianos: ingresas montos en pesos enteros. Los cálculos pueden conservar centavos; el formato que ves no modifica esa precisión.

**¿Cómo contacto a soporte o hago una solicitud sobre mis datos?**

> Escribe a fintrackos.auth@gmail.com. No envíes contraseñas ni códigos de verificación.

**Nota de implementación:** estas preguntas pueden agruparse o priorizarse visualmente sin modificar sus afirmaciones. El acordeón deberá tener controles con nombre, foco y estado expandido accesibles. No publicar respuestas de política de datos que todavía no se han aprobado.

### 2.10. CTA final — `#empezar`

**H2:** Haz espacio para un mes más claro.

**Descripción:**

> Reúne tus ingresos, gastos y deudas. Empieza con tu hoja del mes y revisa tus números desde ahí.

**CTA principal:** Crear mi cuenta.

**Acceso secundario:** Iniciar sesión.

**Texto de apoyo:** Gratis por ahora.

### 2.11. Footer

**Marca:** FinTrack OS.

**Descripción:**

> Tus finanzas personales, organizadas mes a mes.

**Producto:** Hoja del mes · Bolsillos · Plan de deudas · Resumen anual · Cómo funciona.

**Cuenta:** Crear mi cuenta · Iniciar sesión.

**Ayuda:** Preguntas frecuentes · Datos y soporte: fintrackos.auth@gmail.com.

**Información:** Privacidad y datos personales · Términos de uso.

**Línea de marca:** © {año actual} FinTrack OS.

**Nota de implementación:** los destinos legales propuestos son `/privacidad` y `/terminos`. No existen todavía; no convertirlos en enlaces hasta que sus páginas estén implementadas y sus textos aprobados. No poner `href="#"`, redirigirlos a soporte ni mostrar una página vacía como política. La revisión de estos textos y su publicación forma parte de los pendientes de la sección 6.

No incorporar redes sociales, direcciones, teléfonos, logotipos de terceros o enlaces comerciales que no hayan sido confirmados.

## 3. Demostración sintética propuesta

**Etiqueta siempre visible:** «Datos de ejemplo». Los importes siguientes se inventaron exclusivamente para explicar el producto; no son resultados de usuarios ni valores del Excel privado. Antes de producir capturas, crear el fixture correspondiente en el entorno de prueba y obtener sus resultados a través del dominio financiero existente.

### 3.1. Hoja de octubre de 2026

Supuestos explícitos de la muestra: salario de $3.000.000, deducciones y auxilios en cero, descuento de prestaciones manual en cero, sin ingreso por incapacidad ni sobrante anterior. Ingreso neto: $3.000.000. Colchón mínimo: $500.000.

| Concepto | Categoría | Presupuesto / monto |
|---|---|---:|
| Arriendo | Fijo | $900.000 |
| Transporte | Fijo | $200.000 |
| Mercado | Bolsillo | $500.000 |
| Ahorro del mes | Ahorro | $300.000 |
| Cuota de ejemplo | Deuda | $300.000 |
| Suscripción de ejemplo | Suscripción | $50.000 |
| **Total de gastos y asignaciones** | | **$2.250.000** |

- Disponible calculado: **$750.000**.
- Colchón mínimo: **$500.000**.
- Excedente sobre el colchón: **$250.000**. No etiquetarlo como ahorro realizado o cuota extra ejecutada.
- Estado del objetivo de disponible: **Meta cumplida**.
- Bolsillo Mercado: presupuesto **$500.000**, consumos sintéticos **$120.000 + $60.000**, gastado **$180.000**, restante **$320.000**.
- El total mensual incluye el presupuesto de Mercado, no suma sus $180.000 de nuevo.
- Si se muestra el desglose por cuenta, crear etiquetas sintéticas («Cuenta principal» y «Efectivo») y asignar todas las filas. No emplear marcas bancarias como socios.

### 3.2. Resumen de tres meses registrados

| Mes de ejemplo | Ingreso neto | Gastos y asignaciones | Disponible | Ahorro apartado |
|---|---:|---:|---:|---:|
| Agosto de 2026 | $2.800.000 | $2.100.000 | $700.000 | $250.000 |
| Septiembre de 2026 | $2.900.000 | $2.200.000 | $700.000 | $300.000 |
| Octubre de 2026 | $3.000.000 | $2.250.000 | $750.000 | $300.000 |

Para esta muestra, sin hojas anteriores: ingresos **$8.700.000**, gastos y asignaciones **$6.550.000**, ahorro apartado **$850.000** y tres meses alcanzando el colchón de $500.000. Agosto y septiembre deben materializarse con filas coherentes antes de generar una captura; la tabla es una especificación de datos propuesta, no evidencia de ejecución.

## 4. Mapa de enlaces y acciones

| Elemento | Texto | Destino | Estado del destino |
|---|---|---|---|
| Marca | FinTrack OS | `/#inicio` | `/` existe; ancla por implementar. |
| Salto de navegación | Ir al contenido | `#main` | Id del contenido principal por implementar. |
| Navegación de producto | Producto | `#hoja-del-mes` | Ancla propuesta para la explicación y demostración del producto. |
| Navegación de proceso / exploración hero | Cómo funciona / Ver cómo funciona | `#como-funciona` | Ancla por implementar. |
| Navegación y ayuda | Preguntas / Preguntas frecuentes | `#preguntas` | Ancla por implementar. |
| CTA principal, repetido | Crear mi cuenta | `/register` | Ruta real existente. |
| Acceso secundario, repetido | Iniciar sesión | `/login` | Ruta real existente. |
| Footer Producto | Hoja del mes / Bolsillos / Plan de deudas / Resumen anual | `#hoja-del-mes` / `#bolsillos` / `#plan-de-deudas` / `#resumen-anual` | Anclas por implementar. No llevan a rutas privadas para una visita sin sesión. |
| Soporte y datos | fintrackos.auth@gmail.com | `mailto:fintrackos.auth@gmail.com` | Correo confirmado por el Project Owner; no se ha probado su atención por esta tarea. |
| Footer legal | Privacidad y datos personales | `/privacidad` | Ruta propuesta, inexistente; enlazar tras implementación y aprobación. |
| Footer legal | Términos de uso | `/terminos` | Ruta propuesta, inexistente; enlazar tras implementación y aprobación. |

Las rutas privadas actuales son `/dashboard`, `/dashboard/debts`, `/dashboard/summary`, `/dashboard/calendar` y `/dashboard/settings`. Una captura o demostración pública no necesita acceder a ellas con las credenciales de una persona real.

## 5. Trazabilidad de afirmaciones

Rutas relativas a la raíz del repositorio. La inspección verifica que el contenido corresponde al contrato y código presentes; no reemplaza una prueba de navegador ni de proveedores externos.

| Afirmación pública | Fuente inspeccionada | Límite editorial |
|---|---|---|
| Finanzas personales por mes, público y objetivos | `PRODUCT.md`; `frontend/src/modules/finance/month/month-sheet-page.tsx` | No afirmar que adapta cualquier Excel ni que es un sistema contable empresarial. |
| Ingresos, gastos, disponible, ahorro, colchón y desgloses | `frontend/src/modules/finance/domain/month-sheet.ts`; `month/income-card.tsx`; `month/breakdown-cards.tsx` | Disponible calculado; ingresos actuales modelados por los campos del producto, no sincronización bancaria. |
| Gastos pagados y pendientes | `frontend/src/modules/finance/domain/month-sheet.ts`; `month/entries-card.tsx` | El marcado lo registra el usuario; no acredita un pago bancario. |
| Bolsillos con presupuesto, consumo, fecha y restante | `frontend/src/modules/finance/domain/pockets.ts`; `domain/types.ts`; `month/pocket-spends.tsx` | El presupuesto cuenta como asignación mensual; no volver a sumar consumos. |
| Cuentas como etiquetas configurables | `frontend/src/modules/finance/settings/settings-page.tsx`; `domain/types.ts`; `backend/src/modules/finance/` | No integración bancaria identificada en el código inspeccionado. |
| Estrategias y recomendación de deudas | `frontend/src/modules/finance/debts/debt-strategy.ts`; `domain/debt-plan.ts`; `debts/debts-page.tsx`; `PRODUCT.md` | Supuestos, cuotas manuales y advertencias; no prometer resultados ni reserva siempre suficiente. |
| Resumen anual y ahorro acumulado | `frontend/src/modules/finance/domain/annual-summary.ts`; `summary/summary-page.tsx` | El ahorro acumulado puede incluir años anteriores; meses sin hoja no inventan valores. |
| Copiar filas sin alterar las existentes | `frontend/src/modules/finance/month/month-sheet-page.tsx`; `store/workbook-store.ts` | Pagos pendientes y bolsillos sin consumos; no afirmar copia automática completa de todos los campos. |
| Registro, verificación y proveedores habilitados | `frontend/src/modules/auth/register/register-form.tsx`; `auth-social-buttons.tsx`; `email-verification-form.tsx` | OAuth y envío reales no se validaron en esta tarea; no nombrar un proveedor como necesariamente disponible. |
| Guardado y recuperación de errores | `frontend/src/modules/finance/shell/save-indicator.tsx`; `store/save-queue.ts` | No garantiza guardado sin red ni soporte offline. |
| Montos en COP y precisión diferenciada | `PRODUCT.md`; `frontend/src/modules/finance/lib/format.ts`; `domain/money.ts` | Entrada en pesos enteros; cálculo y persistencia pueden conservar centavos. |
| Ausencia actual de importación/exportación Excel para usuarios | Inspección de rutas `frontend/src/app`, módulos de finanzas y búsqueda en `frontend/src`, `backend/src`, `backend/scripts` | Existe un importador administrativo de workbook JSON (`backend/scripts/import-workbook.ts`), que no es una función pública de Excel. |
| Gratuidad actual, SaaS futuro, persona natural en Colombia y correo | Confirmaciones del Project Owner; `docs/landing-direccion-visual.md`; `docs/landing-contenido-legal.md` | No precio, fecha comercial, gratuidad permanente o identidad legal inferida. |
| Destinos de registro y login | `frontend/src/shared/config/routes.ts`; `frontend/src/app/(auth)/register/page.tsx`; `frontend/src/app/(auth)/login/page.tsx` | Rutas legales y anclas de esta landing todavía propuestas. |

## 6. Pendientes para aprobar y publicar

### Seguimiento del contenido aprobado

- Copy, recorrido editorial y demostración sintética aceptados como base para que Claude continúe el diseño. Los ajustes que cambien afirmaciones o funciones deben consultarse; el refinamiento de jerarquía y presentación forma parte del trabajo autorizado.
- Materializar los datos sintéticos y capturarlos en el entorno de prueba antes de mostrar resultados de cálculo en la landing.
- Confirmar que el correo será atendido como canal de soporte y solicitudes sobre datos. No se propone un plazo de respuesta sin un procedimiento real.
- Claude prepara tres alternativas desde la base visual revisada; el Project Owner elige una en el paso 2 antes de implementar. La aprobación del contenido no demuestra que la paleta, el logo ni las animaciones estén implementados o verificados.

### Datos del responsable y borrador legal

El archivo canónico sigue siendo `docs/landing-contenido-legal.md`, **borrador no publicado**. Este documento no lo aprueba ni lo sustituye. Antes de publicar sus páginas faltan, según su ficha y lista de pendientes:

- Nombre legal completo del responsable, municipio/departamento, dirección y teléfono de contacto.
- Identificación del proveedor y alcance de publicación que corresponda confirmar.
- URL pública final, fecha de vigencia y versión aprobadas.
- Decisión de capacidad contractual y admisión de menores.
- Revisión y aprobación de términos y privacidad, y del alcance de los datos tratados, conservación, proveedores y atención de solicitudes.
- Resolución del mecanismo de aceptación y autorización en registro y OAuth, incluyendo cuentas existentes, conforme al borrador vigente.
- Implementación y comprobación de `/privacidad` y `/terminos` para poder enlazarlas sin destinos rotos.

Los detalles operativos y su criterio de cierre están en la sección 5 del borrador legal. Preparar copy de landing no demuestra que esos procedimientos o la infraestructura estén listos.

### Comprobaciones efectuadas en esta tarea

- Inspección de `git status`, diff, producto, propuesta visual y borrador legal.
- Inspección de rutas, modelo y pantallas de finanzas, registro y estado de guardado.
- Búsqueda de exportación/importación Excel e integraciones bancarias en el código de producto y scripts; no se identificó una función pública de esas características.
- Revisión editorial con la referencia `clarify` de Impeccable: verbos concretos, terminología consistente y límites explícitos.
- Comprobación aritmética de la muestra sintética mediante aserciones en Python; queda pendiente obtenerla a través del dominio al crear el fixture.
- Comprobación de UTF-8, ausencia de espacios finales y especificación de un único `h1`.
- Este cambio es documental. No se ejecutaron builds, suites de producto, recorridos de navegador ni servicios externos.
