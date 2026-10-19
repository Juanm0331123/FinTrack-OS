# Migración del backend a Vercel Hobby — verificación local

## Alcance y versión

- Fecha: **2026-10-19**. Base: `main`, commit **`55b1ac2`**; cambios de esta tarea sin versionar.
- Objetivo: preparar dos proyectos Vercel Hobby (`frontend/`, `backend/`) con Neon Free; Cloud Run, Artifact Registry y GCS fuera de la arquitectura activa.
- Entorno: Windows, Node **24.16.0**, pnpm **11.27.1**, PostgreSQL **18** aislado en Docker.
- No se crearon cuentas ni recursos remotos; no hubo commits, push, merge ni despliegue. No se utilizó ni modificó la base production de Neon. Diseño, landing, legales y migraciones existentes permanecen fuera del diff.
- Procedimiento del Owner y tablas completas: [despliegue.md](despliegue.md).

## Archivos y motivos

| Archivos | Cambio |
|---|---|
| `.gitignore` | Ignora `.vercel/` también en la raíz del monorepo: `pull` descarga configuración sensible allí. |
| `backend/api/index.ts`, `backend/vercel.json` | Entrada explícita que exporta Express, preset Other, Fluid, `iad1`, 35 s, rewrite y despliegues Git desactivados. Evita autodetectar `src/server.ts`. Incluye cliente Prisma generado. |
| `backend/tsconfig.json` | Incluye la entrada y activa `rewriteRelativeImportExtensions`: imports fuente `.ts` se emiten como `.js`. |
| `backend/package.json`, `backend/pnpm-lock.yaml` | Única dependencia directa nueva: `@vercel/functions` **3.10.1**, para el ciclo de vida del pool. |
| `backend/src/config/prisma.ts` | Registra el pool global con `attachDatabasePool` solo en Vercel. Conserva Prisma, transacciones y desconexión local. |
| `backend/src/config/env-schema.ts`, `backend/src/config/env.test.ts` | Vercel exige proxy autenticado, `TRUST_PROXY=false`, pool de al menos 2 y timeouts de arranque desactivados. |
| `backend/src/middlewares/edge-proxy.middleware.ts`, su nuevo `.test.ts` | Secreto comprobado en tiempo constante e IP dedicada válida; rechazos cerrados ante cabeceras falsas o configuración incompleta. |
| `backend/test/integration/operations.test.ts` | Verifica límites compartidos por IP autenticada y separación de dos visitantes pese al mismo salto de red. |
| `backend/test/unit/vercel-entry.test.ts` | Importa la entrada TS y la aplicación JS emitida sin escuchar puerto, instalar señales ni conectar a la base; verifica configuración determinista. |
| `frontend/src/proxy.ts`, `frontend/src/proxy.test.ts` | Identidad del visitante fijada por Vercel, secreto solo servidor y error 503 sin caché ante configuración incompleta. |
| `frontend/src/shared/lib/edge-proxy.ts`, su `.test.ts` | Descarta cabeceras entrantes de identidad y solo confía en una IP canónica de Vercel. Fuera de Vercel ignora IPs reenviadas. |
| `.github/workflows/deploy-backend.yml` | Manual, main, confirmación DESPLEGAR, aprobación production, preflight/migraciones y Vercel CLI **64.7.0** prebuilt desde raíz del monorepo; smoke del alias estable. |
| `.github/workflows/backup-db.yml` | Dump cifrado AES-256 hacia Releases de otro repo privado, PAT acotado, retención de 90 días y cleanup-auth conservado. Cron comentado. |
| `backend/.env.example`, `frontend/.env.example`, `docs/despliegue.md` | Variables, seguridad, límites y guía de configuración y recuperación para el Owner. |
| Este informe | Evidencia local, fuentes y límites de la conclusión. |

`backend/src/server.ts`, Dockerfile, `docker-smoke.sh` y job Docker de CI no cambian. La nueva regresión de entrada ya entra en `pnpm test`, que ejecuta el CI existente; no se duplica ese gate.

## Decisiones técnicas y fuentes oficiales

Consultadas el **2026-10-19**:

| Fuente | Confirmación y aplicación |
|---|---|
| [Express](https://vercel.com/docs/frameworks/backend/express) | Detecta app/index/server en raíz o src; acepta default o listen; ignora express.static. Se evita esa elección automática con framework null y api/index.ts. |
| [Node soportado](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions) | Node 24.x soportado; parches gestionados por Vercel. |
| [Runtime Node](https://vercel.com/docs/functions/runtimes/node-js), [builder TypeScript](https://github.com/vercel/vercel/blob/main/packages/node/src/typescript.ts), [emisión del builder](https://github.com/vercel/vercel/blob/main/packages/node/src/build.ts) | Vercel transpila TypeScript. No se depende de que preserve `.ts` al emitir: se activa la reescritura compatible con su compilador y se comprueba el grafo real emitido. El builder completo de Vercel no se ejecutó en esta sesión. |
| [Pooling en Fluid](https://vercel.com/kb/guide/connection-pooling-with-functions) | Recomienda pool global, attachDatabasePool, inactividad corta y evitar max=1. Justifica la única dependencia nueva; configuración documentada: max=2 e idle=5 s por instancia. |
| [Fluid](https://vercel.com/docs/fluid-compute), [límites](https://vercel.com/docs/functions/limitations), [regiones](https://vercel.com/docs/functions/configuring-functions/region) | Hobby Fluid admite 300 s; la app elige 35 s. Bundle estándar 250 MB descomprimido; región fijada iad1, junto a Neon us-east-1. No se midió el bundle final Vercel. |
| [vercel.json](https://vercel.com/docs/project-configuration/vercel-json), [configuración Git](https://vercel.com/docs/project-configuration/git-configuration) | Configuración explícita de framework, Fluid, región, duración, install/build y Git desactivado. |
| [Cabeceras](https://vercel.com/docs/headers/request-headers#x-forwarded-for) | Vercel sobrescribe X-Forwarded-For para impedir suplantación. La IP del frontend viaja al backend en cabecera dedicada autenticada, sin contar saltos. |
| [Correo](https://vercel.com/kb/guide/sending-emails-from-an-application-on-vercel) | Salida 465/587 abierta y 25 bloqueado. Nodemailer requiere esperar el envío. Gmail sigue inicial; Resend HTTP ya existe, sujeto a dominio/remitente verificado. |
| [Hobby](https://vercel.com/docs/plans/hobby) | Uso personal no comercial; cuotas compartidas por scope, no duplicadas por proyecto. Al agotarlas se puede pausar el servicio; mantener sin Pro ni complementos. |
| [CLI](https://vercel.com/docs/cli/release-notes), [monorepo](https://vercel.com/docs/monorepos#add-a-monorepo-through-vercel-cli) | CLI exacta 64.7.0; pull/build/deploy desde raíz y Root Directory backend configurado en el proyecto. |
| [GitHub Releases](https://docs.github.com/en/rest/releases/releases), [assets](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases) | PAT Contents acotado, assets menores de 2 GiB y repositorio privado. Retención por published_at: created_at puede corresponder al commit antiguo del tag. |
| [libpq](https://www.postgresql.org/docs/current/libpq-connect.html), [variables](https://www.postgresql.org/docs/current/libpq-envars.html) | Para el dump se separan parámetros de conexión, sin URI ni contraseña en argv. TLS verify-full con CA del sistema para PostgreSQL 18. |

La guía incluye fuentes adicionales de Neon, aprobación GitHub Free y creación de proyectos vacíos.

## Comportamiento verificado y TDD

1. **Entrada:** ausencia de entrada/configuración produjo fallos; tras implementarlas pasan los casos. Se observó emisión con imports `.ts` incompatible con archivos `.js`; la opción de reescritura la corrige. Se compila el grafo real y se importa el JS resultante interceptando listen y contando listeners.
2. **IP y entorno:** se observaron fallos antes de endurecer validación, descarte de cabeceras e IP obligatoria. Casos IPv4/IPv6, listas, puertos, scope IPv6, ausencia y suplantación pasan. La integración verifica 429 por visitante, sin mezclar dos IPs autenticadas.
3. **Backup:** además de mocks, se ejecutó pg_dump → gzip → GPG AES-256 → SHA-256 → descifrado → pg_restore entre dos bases sintéticas. La cifra `12345.67` se recuperó exactamente.
4. **Hallazgo operativo corregido:** una URI completa en PGDATABASE no se expandió como cadena de conexión: pg_dump intentó socket/rol incorrectos. La restauración sin --dbname también falló. El workflow usa parámetros separados y la guía especifica --dbname con solo el nombre de la base.
5. **Workflow de backup:** el parser exacto del YAML produjo un dump restaurable en PostgreSQL 18 aislado; seis configuraciones inválidas se rechazaron antes de Docker. El arnés sustituyó únicamente el transporte TLS de la base local: no prueba el certificado real Neon. GitHub CLI real comprobó paginación/filtro contra un servidor HTTP local con 104 releases en dos páginas: conserva publicación reciente con commit antiguo, drafts y releases ajenos; selecciona el backup gestionado vencido.

No son pruebas de carga ni una comprobación de red Vercel/Neon reales. Los mocks de GitHub no demuestran permisos efectivos, publicación ni borrado remoto.

## Validaciones ejecutadas

| Comprobación | Resultado real |
|---|---|
| Backend pnpm prisma:generate | **Aprobado**, cliente Prisma 7.10.0 generado. |
| Backend pnpm typecheck | **Aprobado**, también tras ampliar la prueba del grafo emitido. |
| Backend pnpm test | **Aprobado: 126/126**, sin omitidas. |
| Backend pnpm prisma:validate | **Aprobado**. |
| Backend pnpm test:integration | **Aprobado: 146/147, una omitida** por SIGTERM real no disponible en Windows. El smoke Linux de Docker sí comprobó SIGTERM. |
| Backend pnpm test:migrations | **Aprobado: 7/7** en PostgreSQL 18 aislado. |
| Frontend pnpm lint / typecheck | **Aprobados**. |
| Frontend pnpm test | **Aprobado: 253/253**, 26 archivos. |
| Frontend pnpm build | **Aprobado**, 18 rutas; copia aislada para no interferir con dev. |
| backend/scripts/docker-smoke.sh | **Aprobado**: migraciones, TLS verify-full con CA propia, salud, origen protegido, usuario no root, sin .env y SIGTERM con salida 0. |
| Backend pnpm audit --audit-level high | **Aprobado**, sin avisos conocidos. |
| Frontend pnpm audit --prod --audit-level high | **Aprobado**, sin avisos conocidos. |
| Workflows YAML y scripts Bash | **Aprobados** con PyYAML, estructura manual/permisos/environment y bash -n de **19 bloques**. No equivale a actionlint. |
| Workflow backup: parser y errores | **Aprobados**: dump/restauración reales con parser exacto, seis entradas inválidas rechazadas y tres escenarios offline de pipeline. |
| Retención de backups | **Aprobada localmente** con gh real: 104 releases sintéticos, dos páginas; sin llamadas a GitHub remoto. |
| actionlint / shellcheck | **No ejecutados**: no están instalados; no se añadieron herramientas. |
| Dump cifrado y restauración real | **Aprobado**, dos bases sintéticas distintas. |
| git diff --check | **Aprobado**. |
| CI remota y workflow producción | **No ejecutados**, no hay push ni despliegue autorizado. |
| vercel build / deploy reales | **No ejecutados**, no se crearon ni enlazaron proyectos/cuentas. |
| Neon production, Gmail/OAuth reales | **No ejecutados**, fuera de esta sesión. |

Evidencia local ignorada: `.local/qa-vercel/` (logs backend, frontend, Docker, auditorías y roundtrip), `.local/vercel-workflows/` (scripts extraídos, validación y mocks). Son materiales locales, no artefactos CI publicados. Los builds no usaron los .env reales. Las pruebas no usaron DATABASE_URL de producción.

En Windows se adaptó solo la invocación de Git Bash para evitar traducción MSYS de rutas Docker; no se cambió el script del repositorio. Un primer ensayo de restauración evidenció los fallos anteriores; se corrigieron y se repitió hasta salida 0.

## Límites y riesgos que requieren primer entorno real

| Prioridad | Verificación pendiente |
|---|---|
| Alta | Configurar approval/main del environment production y dejar backend sin despliegue Git. No pulsar Import→Deploy antes de migraciones. |
| Alta | Primer prebuilt Vercel: tracer incluye Prisma, resolución ESM y función dentro de 250 MB. La compilación local prueba el código, no todo el empaquetado del proveedor. |
| Alta | Cadena frontend→backend real: HTTPS, cookie first-party, IP canónica, secreto y 403 de negocio directo; desactivar autenticación Vercel que impida el proxy/smoke. |
| Alta | Primer backup privado con PAT real, checksum, publicación, retención y restauración aislada antes de activar cron. |
| Media | Neon pooled/direct y TLS real, defaults del rol, cold starts y concurrencia; el pool de 2 es por instancia, no límite global. |
| Media | Recepción Gmail y callbacks Google/GitHub reales. Puertos abiertos no garantizan entrega ni credenciales correctas. |
| Media | Cuotas conjuntas Hobby/Neon y abuso con registro abierto. Un 403 directo también consume infraestructura. |
| Media | Migración aplicada seguida de build/deploy fallido deja esquema nuevo: no hay rollback de datos automático. |

## Orden para el Owner

1. Revisar y versionar estos cambios con CI verde cuando lo autorice; esta tarea no versiona.
2. Crear cuenta Hobby con GitHub y **dos proyectos vacíos**; raíces frontend/backend, Node 24 y backend preset Other.
3. Configurar alias estables y variables Production según las tres tablas de despliegue.md; no reutilizar secretos en Preview.
4. Crear repo privado backups con README y PAT fine-grained solo Contents; guardar frase fuera de GitHub.
5. Crear environment production del repo principal con revisión requerida y solo main; cargar siete Secrets y dos Variables.
6. Backup si ya hay datos; workflow DESPLEGAR aplica preflight y migraciones antes de publicar backend. Después publicar frontend y ejecutar checklist externo.

La preparación local queda entregada; no constituye aval de un despliegue que todavía no se ha ejecutado.
