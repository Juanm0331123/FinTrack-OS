# FinTrack OS — Procedimiento manual de datos personales

**Versión 0.1, propuesta interna del 2026-10-16. No publicar como procedimiento ya operativo.** Responsable propuesto de ejecución: **Juan Miguel Leon Gomez**, Santiago de Cali, Valle del Cauca, Colombia. Canal aprobado: **fintrackos.auth@gmail.com**. Complementa el [borrador de términos y privacidad](landing-contenido-legal.md); mantiene sus bloqueos L-01…L-04.

Esta tarea documenta instrucciones y criterios de aceptación. No ha creado registros de consentimiento, exportadores, borrado integral, infraestructura ni trámites de personas reales. Una solicitud recibida debe atenderse aunque esos controles estén pendientes: no se responde con una afirmación de ejecución falsa ni se espera indefinidamente al desarrollo de una función.

## 1. Canal, recepción y reloj

El responsable revisará el buzón cada día hábil una vez active este procedimiento. Asuntos sugeridos: «Datos personales — consulta», «Datos personales — reclamo» o «Cierre de cuenta». No exigir el asunto exacto ni acceso a la app para admitir una solicitud. La indisponibilidad o el cierre de la cuenta no impiden el trámite.

Registrar fecha real de llegada, tipo de solicitud y vencimiento; distinguir consultas de acceso/información y reclamos de rectificación, revocatoria o supresión. Si una petición contiene ambos, separar tareas con sus plazos y un mismo expediente. Un acuse no equivale a respuesta de fondo.

| Trámite | Plazo de referencia y acción |
|---|---|
| Consulta | 10 días hábiles desde recepción; prórroga motivada informada antes del vencimiento, hasta 5 días hábiles adicionales. |
| Reclamo | 15 días hábiles desde el día siguiente a recepción; extensión motivada hasta 8 días hábiles adicionales, informada oportunamente. |
| Reclamo incompleto | Pedir subsanación dentro de los 5 días siguientes a recepción; falta de subsanación durante 2 meses desde el requerimiento permite registrar desistimiento. |
| Competencia ajena | Trasladar e informar dentro de 2 días hábiles. |
| Reclamo completo | Vincular la marca «reclamo en trámite» y su motivo a la base dentro de 2 días hábiles; mantenerla hasta decisión. |

Fuente primaria de esta tabla: [Ley 1581 de 2012, artículos 14 y 15](https://cancilleria.gov.co/normograma/compilacion/docs/ley_1581_2012.htm), consultada el 2026-10-16. Para días hábiles usar calendario de Colombia; no convertir los 5 días de subsanación en una prórroga automática. No reiniciar unilateralmente plazos por clasificación o comprobación de identidad: registrar el fundamento de cualquier ajuste y revisarlo si hay duda.

## 2. Expediente privado mínimo

Antes de activación, elegir almacenamiento privado con acceso exclusivo del responsable, cifrado del dispositivo, respaldo restringido y autenticación robusta. **No usar este repositorio, issues públicos, artifacts de CI, `.local/` compartido con agentes ni logs de producto como archivo de solicitudes.** No agregar un proveedor nuevo sin evaluar qué datos recibiría.

Cada expediente tendrá:

- Identificador interno y fechas de recepción, actuaciones, vencimiento y cierre.
- Identificador de cuenta comprobado y referencia al mensaje original; evitar replicar el contenido financiero.
- Solicitante, medio de respuesta y resultado de verificación, con la mínima evidencia necesaria.
- Alcance solicitado, clasificación y responsable de cada actuación.
- Estado: recibido, pendiente de información, en análisis, ejecutado pendiente de respuesta o cerrado.
- Prórroga/subsanación/traslado, cuando procedan, con fundamento y constancia de envío.
- Datos entregados o modificados, sistemas implicados, comprobación posterior y respuesta de fondo.
- Tratamientos que continúan, motivo concreto, plazo o siguiente revisión, y destinatarios que deban recibir instrucciones.

La marca legal de un reclamo debe quedar vinculada al registro afectado y ser visible para quien lo trate. **El código actual no implementa esa marca.** Una nota aislada en el buzón no permite afirmar que ya se cumple: definir y probar el control asociado antes de abrir el servicio (L-04).

## 3. Comprobar identidad sin crear otro riesgo

1. No confirmar a un remitente desconocido que exista una cuenta. Responder con acuse neutral y pedir el correo de cuenta y alcance si faltan.
2. Si escribe desde el correo de cuenta, comprobar control mediante intercambio independiente al correo registrado; no confiar solo en el nombre visible o encabezado del remitente. Documentar el resultado. No reutilizar OTP de login como prueba que soporte deba recibir.
3. Si perdió ese correo o actúa mediante representación, acordar una verificación proporcional y segura. Registrar legitimación y resolución del responsable; no negar automáticamente por no poder iniciar sesión. Si no es posible verificar sin riesgo, explicar la limitación y el camino para subsanarla sin revelar datos.
4. Nunca solicitar contraseñas, códigos de verificación, tokens, documentos bancarios completos ni datos de otra cuenta. Un documento de identidad no es un requisito automático; si excepcionalmente es necesario, justificar el dato mínimo, canal, acceso y conservación antes de pedirlo.

Ante sospecha de acceso indebido, contener el incidente por el procedimiento de seguridad correspondiente y conservar solo la evidencia necesaria. No enviar una copia financiera mientras la identidad siga dudosa.

## 4. Resolver según lo solicitado

### Acceso, copia e información sobre uso

Preparar una copia **solo de la persona verificada**, con fecha de corte y explicación legible. Consultas y extracción serán específicas por identificador de usuario, con credenciales de operador restringidas; no compartir esas credenciales ni ejecutar búsquedas generales para producir un volcado completo. Si es necesaria una herramienta nueva, debe prepararse, revisarse y probarse antes de usarla sobre datos reales.

| Conjunto | Información a considerar en la respuesta |
|---|---|
| Cuenta | Perfil y preferencias, identificador, estado y fechas relevantes. |
| Finanzas | Cuentas, configuración, meses, ingresos, filas, gastos de bolsillos, deudas y notas del titular; explicar unidades y relaciones. |
| Acceso externo | Proveedor, identificador y datos de perfil asociados cuando existan. |
| Actividad y seguridad | Información personal asociada a sesiones/actividad que corresponda entregar, sin secretos de autenticación. |
| Autorizaciones | Actos y versiones realmente existentes, finalidad y datos de la constancia; si faltan, decirlo expresamente. |
| Contacto | Mensajes y actuaciones del propio expediente cuando procedan, separando información ajena. |

`GET /api/finance/workbook` puede ayudar con finanzas, pero **no es una exportación integral** de cuenta, OAuth, actividad y autorizaciones. No hay una descarga completa implementada en Configuración. Comprobar campos y pertenencia en una copia de trabajo aislada; las consultas serán de solo lectura y no modificarán la cuenta para facilitar una exportación.

**Excluir secretos operativos:** hash de contraseña/versiones internas, security stamp, hashes/salts de códigos y tokens, tokens de acceso/refresh/recuperación, cookies, secretos OAuth, variables de entorno, cadenas de conexión y datos de otros usuarios. Esto protege credenciales; no permite omitir sin explicación los datos personales que correspondan al titular.

Acordar un medio seguro ya disponible y verificado: transferencia cifrada y restringida, sin enlaces públicos. Si se usa un archivo cifrado, comunicar su clave por un canal independiente previamente comprobado. No enviar por correo un CSV financiero en claro ni subirlo a un conversor público. Si aún no existe un medio adecuado, prepararlo y comunicar la situación dentro del plazo; no declarar realizada la entrega. Tras confirmar recepción, retirar copias temporales conforme al plazo aprobado y conservar únicamente evidencia mínima de lo entregado.

### Prueba de autorización y cuentas existentes

Buscar una constancia auténtica, con acto afirmativo, fecha, cuenta, canal y versiones de los textos puestos a disposición. Conservar referencia o copia verificable de esas versiones. No usar «se registró», «aceptó Google» o una casilla de frontend sin registro como prueba suficiente de aceptación separada.

Actualmente no existe esa constancia en el backend. Responder con veracidad ante una solicitud de prueba; registrar la ausencia y elevarla al responsable. Una autorización futura se fechará cuando ocurra: **no se retrodata ni regulariza automáticamente tratamientos anteriores**. Resolver cómo continuar o limitar el tratamiento de las cuentas existentes antes de una apertura pública (L-02). Fuente: [Decreto 1074, artículos 2.2.2.25.2.4 y 2.2.2.25.2.5](https://www.cancilleria.gov.co/sites/default/files/Normograma/docs/decreto_1074_2015_pr025.htm).

### Rectificación

Identificar campos y valor solicitado; comprobar que pertenecen al titular. Para datos que ya tienen un flujo seguro de cambio —por ejemplo correo— usarlo o acordar una actuación administrativa autorizada, sin pedir la contraseña por correo. Registrar modificación mínima y comprobar el valor posterior. No sobrescribir otros datos financieros ni adjuntar la fila completa de otro usuario como evidencia.

### Cierre de acceso

Confirmar el alcance: cierre de acceso, solicitud de copia, supresión o combinación. Si pide copia y cierre, preparar la copia antes de perder referencias útiles, sin demorar una contención urgente de seguridad. Con identidad verificada, el responsable podrá usar la operación autorizada de usuario para desactivar la cuenta y comprobar revocación de sesiones.

**Comportamiento actual:** `UsersRepository.softDelete` sustituye el correo por una etiqueta técnica, marca `INACTIVE`/`deletedAt`, rota el sello y revoca sesiones. Conserva nombres, hash, relaciones OAuth y libros. No es borrado integral ni anonimización. Mantener dentro del expediente restringido la referencia necesaria para atender derechos posteriores; el correo sustituido no debe hacer imposible localizar una solicitud legítima.

### Supresión y revocatoria

El responsable decidirá motivadamente qué datos procede suprimir y qué conservación tiene un fundamento específico. Separar base activa, OAuth, soporte, logs, expedientes y respaldos. Indicar qué se deja de usar, qué permanece y por qué; evitar respuestas genéricas de conservación «por ley» sin identificar alcance.

**No existe una rutina de supresión integral validada.** Antes de cualquier actuación real preparar un plan limitado al usuario comprobado, comprobar relaciones/efectos, disponer de recuperación restringida y probarlo con datos sintéticos. Debe ejecutarlo una persona autorizada con evidencia de resultado; no pegar SQL destructivo improvisado ni borrar una base compartida. La respuesta final no dirá «eliminado» mientras solo se haya ejecutado baja lógica.

Definir cómo se excluyen de uso los datos suprimidos en respaldos y cómo aplicar esa exclusión antes de reabrir una restauración. No prometer borrado de todas las copias al instante. Si la capacidad aún falta, tratarla como una deficiencia concreta, informar actuaciones y fechas fundadas y resolver dentro del trámite aplicable; no cerrar el reclamo como ejecutado. Base: [Decreto 1074, artículos 2.2.2.25.2.6 y 2.2.2.25.2.8](https://www.cancilleria.gov.co/sites/default/files/Normograma/docs/decreto_1074_2015_pr025.htm).

### Salud o minoría de edad detectadas

La admisión aprobada es 18+ y el tratamiento de salud sigue bloqueado en L-03. No pedir detalles clínicos ni documentos del menor para satisfacer una curiosidad técnica. Restringir nuevos usos no necesarios, identificar el mínimo dato afectado y elevar al responsable el tratamiento y la resolución; comunicar por un canal seguro. No asumir que una cuenta creada o una autorización general solucionan el caso.

## 5. Respuesta y conservación del expediente

La respuesta final incluirá identificador, solicitud resuelta, fecha, actuaciones efectivamente ejecutadas, información/copia suministrada y pendientes motivados. Si no accede total o parcialmente, explicar motivo concreto y vía de consulta o reclamo; no afirmar una autorización inexistente ni un borrado no realizado. Conservar constancia de envío y, cuando corresponda, recepción.

**Modelo de acuse:** «Recibimos tu solicitud con referencia [ID] el [fecha]. Estamos verificando su alcance y el medio seguro de respuesta. No envíes contraseñas, códigos ni tokens. Te informaremos cualquier dato adicional estrictamente necesario y responderemos según el trámite aplicable».

**Modelo de cierre de acceso:** «Desactivamos el acceso a la cuenta verificada el [fecha] y revocamos sus sesiones. Esta actuación no significa que todos los datos se hayan eliminado. Tu solicitud de [copia/supresión, si existe] tiene el estado [estado real], con [actuación o decisión motivada]».

Revisar el expediente al resolver y retirar duplicados/copias temporales que ya no sean necesarios. Antes de activación aprobar plazos y criterios para mensajes originales, pruebas, registros técnicos y datos conservados. No inventar una retención indefinida ni aplicar automáticamente los 30 días de tokens o los 90 días previstos de respaldos a estos expedientes. Registrar la fecha de revisión de cualquier conservación excepcional.

## 6. Evidencia para activar el procedimiento

Realizar un ensayo con datos sintéticos de dos cuentas: consulta completa sin datos cruzados; verificación fallida sin divulgación; petición de prueba inexistente; rectificación; cierre sin falsa supresión; reclamo con marcas y plazos; y supresión/restauración cuando exista una solución validada. Guardar evidencia privada sin credenciales. El ensayo no usa Neon ni datos reales por defecto.

La activación requiere aprobación del responsable del canal, almacenamiento, tiempos y capacidad de ejecutar cada actuación; queda dentro de L-04. **Este documento no afirma que ese ensayo haya ocurrido.** La resolución de los cuatro bloqueos del documento legal y la aprobación de vigencia son independientes de los checks técnicos y del merge en `main`.
