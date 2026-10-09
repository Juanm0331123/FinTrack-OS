# Despliegue de FinTrack OS

Arquitectura de producción acordada el 2026-10-08. Estado: **artefactos implementados en la rama `fix/backend-qa-remediation` (Docker, proxy, CI, backups); infraestructura en la nube y validación de staging pendientes**. El detalle de las correcciones de QA está en [`qa-backend-remediacion.md`](qa-backend-remediacion.md).

FinTrack OS es una app personal para pocas personas. El objetivo es desplegar frontend, backend y base de datos **sin costo**, con servicios administrados que aguanten sin mantenimiento constante y sin perder datos financieros.

## Resumen

| Pieza | Servicio | Región |
|---|---|---|
| Frontend (Next.js 16) | Vercel, plan Hobby | Red global de Vercel |
| Backend (Express 5 + Prisma 7) | Google Cloud Run, imagen Docker | `us-east4` (Virginia) |
| Base de datos (PostgreSQL) | Neon, plan Free | AWS `us-east-1` (Virginia) |
| Imágenes Docker | Google Artifact Registry | `us-east4` |
| Backups | Google Cloud Storage | Región de EE. UU. dentro del plan gratuito |
| CI/CD | GitHub Actions | — |

```
 Usuario
   │  https://<frontend>.vercel.app
   ▼
┌──────────────────────┐   /api/* (rewrite)   ┌────────────────────────────┐
│ Vercel (Hobby)       │ ───────────────────► │ Google Cloud Run            │
│ Next.js 16 frontend  │                      │ Docker: Express 5 + Prisma  │
└──────────────────────┘                      │ us-east4 · 0–2 instancias   │
                                              └─────────────┬──────────────┘
                                                            │ DATABASE_URL (pooled)
                                              ┌─────────────▼──────────────┐
                                              │ Neon Postgres (Free)        │
                                              │ AWS us-east-1               │
                                              └─────────────┬──────────────┘
                                                            │ pg_dump semanal cifrado
                                              ┌─────────────▼──────────────┐
                                              │ Google Cloud Storage        │
                                              └────────────────────────────┘

 GitHub Actions: CI en cada rama; deploy manual (tests → imagen → verificación previa → migraciones → Cloud Run)
```

## Por qué esta arquitectura

- **Vercel** es la plataforma de referencia para Next.js. El plan Hobby permite uso personal no comercial, que es el caso de FinTrack OS.
- **Cloud Run** ejecuta el backend como un contenedor normal: Express corre igual que en local, sin adaptarlo a funciones serverless. Escala a cero; tras un rato sin tráfico, la primera petición tarda 1–2 s. Permite SMTP saliente por los puertos 465 y 587 (Google solo bloquea el 25), así que el envío por Gmail funciona. La imagen Docker es portable a cualquier otro proveedor.
- **Neon** ofrece Postgres administrado con pooling y funciona bien con Prisma. Suspende la base tras 5 minutos sin uso y la despierta en milisegundos, sin pausar el proyecto.
- Cloud Run y Neon quedan en Virginia, prácticamente juntos y en la región más cercana a Colombia.

### Alternativas descartadas

| Opción | Motivo |
|---|---|
| Express en Vercel | Límite de 4 h de CPU al mes en Hobby; habría que adaptar el backend a funciones serverless. |
| Render Free | Se apaga tras 15 min sin tráfico, tarda ~1 min en despertar y bloquea el SMTP saliente. |
| Oracle Cloud Always Free | Exige administrar la VM (parches, Postgres, backups) y Oracle puede reclamar instancias ociosas. |
| Supabase Free | Pausa el proyecto tras 7 días sin actividad. |
| Railway, Fly.io, Koyeb | Sin plan gratuito comparable o con recursos mínimos. |

## Límites gratuitos

Cifras revisadas en octubre de 2026. Los proveedores las cambian; confirmarlas en sus páginas de precios antes de crear las cuentas.

| Servicio | Límite gratuito | Uso esperado |
|---|---|---|
| Vercel Hobby | 100 GB de transferencia; solo uso no comercial | Muy por debajo |
| Cloud Run (Tier 1, facturación por petición) | 2 M de peticiones, 180 000 vCPU-s y 360 000 GiB-s al mes | Muy por debajo |
| Neon Free | 0.5 GB de almacenamiento, 100 CU-h al mes por proyecto, restauración de 6 h | Suficiente para años de datos de pocas personas |
| Artifact Registry | 0.5 GB | Controlado con una política de limpieza |
| Cloud Storage | 5 GB en regiones de EE. UU. | Los backups comprimidos ocupan poco |

Confirmar al crear el servicio que `us-east4` es una región Tier 1 de Cloud Run. Si no lo es, usar `us-east1`.


## Protección de costos

Google Cloud exige una tarjeta para la cuenta de facturación aunque no cobre dentro del plan gratuito. **Una alerta de presupuesto no detiene cargos**: solo notifica cuando el gasto real o previsto cruza un umbral, con horas de retraso. Lo que acota el costo son los límites técnicos y la respuesta a la alerta:

- Alerta de presupuesto de **USD 1** (con avisos al 50 %, 90 % y 100 %) en la cuenta de facturación, enviada al correo del Project Owner.
- Cloud Run con `min-instances=0`, `max-instances=2`, `concurrency=20`, `timeout=35s`, 1 vCPU, 512 MiB, facturación por petición y *startup CPU boost*. `max-instances` limita la escala instantánea, no la suma del mes (peticiones, CPU, egress).
- La API rechaza el tráfico que no llega por el proxy de Vercel (`EDGE_PROXY_SECRET`) y aplica límites perimetrales antes de autenticar o consultar la base, así que un abuso directo a `run.app` cuesta poco por petición.
- Política de limpieza en Artifact Registry que conserva solo las 2 imágenes más recientes.
- Ciclo de vida en el bucket de backups que borra los volcados con más de 90 días.

Respuesta ante una alerta (manual, el mismo día):

1. Revisar en Cloud Run las métricas de peticiones e instancias y en Cloud Logging los logs `http_request` y `metrics` (rutas, IPs, códigos 429/403).
2. Si hay abuso: rotar `EDGE_PROXY_SECRET` en Vercel y Cloud Run, y bajar temporalmente `--max-instances=1`.
3. Si el gasto sigue: quitar el acceso público al servicio (`gcloud run services remove-iam-policy-binding fintrack-backend --member=allUsers --role=roles/run.invoker --region us-east4`). La app queda caída pero sin cargos de Cloud Run.
4. Google documenta cómo desactivar la facturación automáticamente desde una notificación de presupuesto (Pub/Sub + función). No se adopta por defecto: puede detener o borrar recursos y no es instantánea. Requiere decisión explícita del Project Owner.

## Sesión y cookies

El frontend llama a la API con `credentials: 'include'` y el refresh token viaja en una cookie HttpOnly. `vercel.app` y `run.app` están en la Public Suffix List, así que dos dominios así son sitios distintos. Con `SameSite=lax` la cookie no se enviaría, y con `none` la bloquean Safari y Brave.

Solución implementada: el navegador solo habla con el dominio de Vercel. `frontend/src/proxy.ts` (Proxy de Next 16) reenvía `/api/*` a Cloud Run y la cookie queda como first-party.

- El proxy reenvía solo una lista blanca de cabeceras, añade `x-fintrack-edge-auth` (`EDGE_PROXY_SECRET`) y `x-fintrack-client-ip` (IP real del visitante que fija Vercel), y descarta esas cabeceras si las envía el navegador.
- El backend exige el secreto en producción: sin él, todo `/api/*` salvo `/api/health*` responde 403 `EDGE_PROXY_REQUIRED`. La IP de cliente para los límites sale de `x-fintrack-client-ip` solo si el secreto es válido; si no, de `req.ip` con `TRUST_PROXY=1` (el salto del balanceador de Google).
- `NEXT_PUBLIC_BACKEND_URL` apunta al propio dominio del frontend. Las URLs de callback de OAuth usan el dominio del frontend.
- El access token vive solo en memoria del navegador; en `localStorage` queda una marca sin secretos para saber si hay que llamar a `/api/auth/refresh` al cargar. Las pestañas coordinan la renovación con Web Locks y BroadcastChannel.

Si más adelante se compra un dominio (~USD 10/año), `app.<dominio>` y `api.<dominio>` serían el mismo sitio; aun así conviene conservar el proxy para no exponer el origen.

## Variables de entorno de producción

Los valores reales nunca se versionan. El backend los recibe como variables del servicio en Cloud Run (recomendado: referenciar los secretos desde Secret Manager con `--set-secrets`, dentro del plan gratuito) y el frontend como variables del proyecto en Vercel. Con `NODE_ENV=production` el backend **no arranca** si la configuración es insegura y lista todos los problemas a la vez.

### Backend (Cloud Run)

| Variable | Valor de producción |
|---|---|
| `PORT` | No se define: Cloud Run la inyecta (8080). |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Cadena **pooled** de Neon (host con `-pooler`) con `sslmode=verify-full`. Obligatorio. |
| `DIRECT_URL` | Cadena **directa** de Neon con `sslmode=verify-full`; solo la usan las migraciones en CI. |
| `ALLOWED_ORIGINS`, `FRONTEND_APP_URL` | `https://<frontend>.vercel.app` (solo https) |
| `TRUST_PROXY` | `1` (un salto: el balanceador de Cloud Run). `true` está prohibido. |
| `EDGE_PROXY_SECRET` | Aleatorio, ≥ 32 caracteres; el mismo valor en Vercel. |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Nuevos, largos, aleatorios y distintos entre sí y de desarrollo |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` / `SESSION_ABSOLUTE_TTL` | `15m` / `7d` (inactividad) / `30d` (absoluta) |
| `COOKIE_SECURE` | `true` (obligatorio) |
| `COOKIE_SAME_SITE` | `lax` |
| `COOKIE_DOMAIN` | Vacío |
| `EXPOSE_DEV_AUTH_TOKENS` | `false` (el arranque falla si es `true`) |
| `EMAIL_PROVIDER`, `EMAIL_FROM`, `EMAIL_PASSWORD` | Gmail con contraseña de aplicación (o Resend con `RESEND_API_KEY`) |
| `GOOGLE_OAUTH_CALLBACK_URL` | `https://<frontend>.vercel.app/api/auth/oauth/google/callback` |
| `GITHUB_OAUTH_CALLBACK_URL` | `https://<frontend>.vercel.app/api/auth/oauth/github/callback` |
| `GOOGLE_OAUTH_*`, `GITHUB_OAUTH_*` (client id y secret) | Credenciales de las apps OAuth de producción |
| `DB_POOL_MAX` | `5` por réplica (máximo 10 conexiones de cliente con 2 réplicas) |
| `DB_CONNECTION_TIMEOUT_MS`, `DB_LOCK_TIMEOUT_MS`, `DB_STATEMENT_TIMEOUT_MS`, `DB_TRANSACTION_TIMEOUT_MS` | `5000`, `3000`, `8000`, `10000` |
| `DB_STARTUP_TIMEOUTS` | `false` (el pooler de Neon rechaza esos parámetros de arranque) |
| `SHUTDOWN_TIMEOUT_MS` | `8000` (< 10 s de Cloud Run) |
| Límites de tasa y demás | Los valores de `backend/.env.example`, salvo que se decida otra cosa |

### Frontend (Vercel)

| Variable | Valor de producción |
|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | `https://<frontend>.vercel.app` |
| `BACKEND_ORIGIN` | URL del servicio de Cloud Run (`https://<servicio>-<hash>.us-east4.run.app`). Solo servidor. |
| `EDGE_PROXY_SECRET` | Mismo valor que en Cloud Run. Solo servidor (nunca `NEXT_PUBLIC_`). |

Tras configurarlas, actualizar los callbacks autorizados en las consolas de Google y GitHub.

## Base de datos: pool, timeouts y TLS

- Cada réplica abre como máximo `DB_POOL_MAX` conexiones. Con `concurrency=20` y 5 conexiones, las peticiones esperan conexión hasta `DB_CONNECTION_TIMEOUT_MS` y, si no la obtienen, responden 503 `DB_UNAVAILABLE` con `Retry-After` en lugar de acumularse.
- Las transacciones fijan `statement_timeout` y `lock_timeout` con `SET LOCAL` al empezar (compatible con PgBouncer en modo transacción). Para las consultas sueltas, ejecutar **una vez** en Neon (rama `main`, rol de la app):

  ```sql
  ALTER ROLE <rol_de_la_app> SET statement_timeout = '8s';
  ALTER ROLE <rol_de_la_app> SET lock_timeout = '3s';
  ALTER ROLE <rol_de_la_app> SET idle_in_transaction_session_timeout = '10s';
  ```

  Las migraciones deberían usar un rol separado sin esos límites (recomendado) o fijar `SET statement_timeout = 0` en su sesión.
- `sslmode=verify-full` hace que `pg` verifique el certificado y el nombre del host contra las CA del sistema (Neon usa certificados públicos). El smoke de Docker lo prueba con una CA propia.

## Backend en Docker

Implementado en `backend/Dockerfile` (multi-etapa sobre `node:24.16.0-bookworm-slim` fijado por digest):

1. `deps`: `pnpm install --frozen-lockfile` con el lockfile.
2. `migrator`: imagen solo para `prisma migrate deploy` (incluye OpenSSL para el motor de migraciones).
3. `build`: `prisma generate` y `pnpm prune --prod`.
4. `runtime`: usuario `node` (no root), sin `.env` (`backend/.dockerignore`), `NODE_ENV=production`, `CMD node src/server.ts`. Node 24 ejecuta TypeScript sin flags (`erasableSyntaxOnly` en `tsconfig.json` impide sintaxis que requiera transpilar).

Sondas de Cloud Run: *startup* y *liveness* en `GET /api/health/live` (no consulta la base, para que una caída de Neon no reinicie instancias sanas en bucle). `GET /api/health/ready` comprueba la base con un plazo de 2 s y responde 503 durante una caída o el cierre; usarla en el *uptime check* de monitoreo.

Smoke reproducible: `cd backend && bash scripts/docker-smoke.sh` (migraciones, TLS `verify-full`, salud, protección de origen, logs y SIGTERM). Se ejecuta en CI.

## CI/CD

- `.github/workflows/ci.yml` (cada push y PR): backend (`prisma generate`, typecheck, unitarias, migraciones, integración contra PostgreSQL de servicio, `migrate status`, auditoría), frontend (lint, typecheck, test, build, auditoría) y smoke de Docker. No despliega.
- `.github/workflows/deploy-backend.yml`: **solo manual** (`workflow_dispatch` con confirmación escrita) y contra el *environment* `production`, que debe configurarse en GitHub con revisión obligatoria. Pasos: tests → imagen → push a Artifact Registry → `scripts/check-migration-conflicts.ts` (solo lectura) → `prisma migrate deploy` con `DIRECT_URL` → `gcloud run deploy --image` → smoke. Las variables del servicio se configuran una vez en Cloud Run; el flujo no las sobrescribe.
- Autenticación con Google mediante **Workload Identity Federation**: sin llaves JSON en GitHub.
- El frontend se despliega con la integración de Git de Vercel (*Root Directory* `frontend/`). Hasta el aval del QA, desactivar en Vercel el despliegue automático de producción desde `main` o no conectar el proyecto.

Secretos de GitHub Actions: `GCP_PROJECT_ID`, `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_DEPLOY_SERVICE_ACCOUNT`, `GCP_BACKUP_SERVICE_ACCOUNT`, `PRODUCTION_DIRECT_URL`, `PRODUCTION_BACKUP_URL` (rol de solo lectura recomendado), `BACKUP_PASSPHRASE`, `BACKUP_BUCKET`.

## Migraciones

- Producción solo recibe `prisma migrate deploy`, desde el flujo manual y antes del deploy del backend.
- Antes de la migración de la remediación, ejecutar en modo lectura `pnpm db:check-migration` contra producción: reporta ownership inconsistente (la migración se detiene si existe) y nombres de cuenta duplicados por mayúsculas (la migración los renombra con un sufijo ` (n)`, sin borrar nada).
- Nunca se ejecuta `prisma migrate dev` contra producción. El desarrollo local usa una rama `dev` de Neon o el PostgreSQL de `backend/compose.test.yaml`.
- Al desplegar la remediación, las sesiones existentes dejan de servir (los tokens anteriores no tienen los claims ahora obligatorios): cada usuario inicia sesión una vez más.

## Backups

El plan gratuito de Neon solo permite restaurar hasta 6 horas atrás. Por eso hay un respaldo propio en `.github/workflows/backup-db.yml`:

- `pg_dump` (imagen `postgres:18`, igual a la versión mayor de Neon) → gzip → **cifrado AES-256** con `gpg --symmetric` → `gs://<bucket>`. El volcado nunca se publica como artifact ni sin cifrar (el repositorio es público).
- Hoy solo se ejecuta manualmente; la programación semanal está comentada y se activa tras el aval.
- Tras el backup, el job `cleanup-auth` aplica la retención de sesiones, tokens y contadores (`backend/scripts/cleanup-auth.ts`, `AUTH_RETENTION_DAYS=30`).
- Retención de 90 días con una regla de ciclo de vida del bucket.

Restauración (probarla antes de cerrar el despliegue):

1. Crear una rama temporal en Neon desde `main` (por ejemplo `restore-check`) y copiar su cadena **directa**.
2. Descargar el volcado: `gcloud storage cp gs://<bucket>/<archivo>.dump.gz.gpg .`
3. Descifrar y restaurar sin escribir el volcado en claro en disco:

   ```bash
   gpg --decrypt <archivo>.dump.gz.gpg | gunzip | docker run -i --rm postgres:18 \
     pg_restore --no-owner --no-privileges --clean --if-exists -d "<cadena_directa_de_restore-check>"
   ```

4. Verificar conteos (`users`, `month_sheets`, `month_entries`, `pocket_spends`, `debts`) contra producción y abrir la app apuntando a esa rama en un entorno de prueba.
5. Borrar la rama temporal.

## Puesta en marcha

### Cuentas y recursos (Project Owner)

- [ ] Neon: crear el proyecto en AWS `us-east-1`, con la rama `main` para producción y la rama `dev` para desarrollo; aplicar los `ALTER ROLE` de timeouts.
- [ ] Google Cloud: crear el proyecto y la cuenta de facturación, con la alerta de USD 1 y el procedimiento de respuesta de arriba.
- [ ] Google Cloud: habilitar Cloud Run, Artifact Registry, Cloud Storage, IAM Credentials (y Secret Manager si se adopta).
- [ ] Google Cloud: crear el repositorio de Artifact Registry con su política de limpieza.
- [ ] Google Cloud: crear el bucket de backups con su ciclo de vida.
- [ ] Google Cloud: configurar Workload Identity Federation y cuentas de servicio con permisos mínimos (deploy y backup separadas).
- [ ] Cloud Run: crear el servicio con sondas en `/api/health/live`, `--concurrency 20`, `--timeout 35`, `--max-instances 2` y las variables de producción.
- [ ] GitHub: crear el environment `production` con revisión obligatoria y cargar sus secretos.
- [ ] Vercel: crear el proyecto con *Root Directory* `frontend/`, `BACKEND_ORIGIN` y `EDGE_PROXY_SECRET`.
- [ ] Google y GitHub: crear las apps OAuth de producción con los callbacks del dominio de Vercel.
- [ ] Gmail: generar una contraseña de aplicación para el envío de correos.

### Cambios en el repositorio

- [x] `backend/Dockerfile`, `backend/.dockerignore` y `backend/scripts/docker-smoke.sh`.
- [x] Proxy `/api/*` en `frontend/src/proxy.ts` con `BACKEND_ORIGIN` y `EDGE_PROXY_SECRET`.
- [x] `.github/workflows/ci.yml`, `deploy-backend.yml` (manual) y `backup-db.yml` (manual).
- [x] Variables documentadas en `backend/.env.example` y `frontend/.env.example`.

### Verificación en staging (antes de producción)

Pendiente: requiere los recursos de arriba. Procedimiento detallado en [`qa-backend-remediacion.md`](qa-backend-remediacion.md#pendientes-externos-y-procedimiento-de-verificación).

- [ ] HTTPS en Vercel y Cloud Run con certificados gestionados válidos; cabeceras de seguridad reales.
- [ ] Rewrite: cookie first-party, `Set-Cookie` con `Secure`, renovación pasados 15 minutos, también en Safari y en iPhone.
- [ ] Acceso directo a `run.app` sin secreto → 403; con el proxy → normal. IP de cliente correcta en logs (no la IP de Vercel).
- [ ] Registro con verificación por correo real; login con correo, Google y GitHub; recuperación de contraseña; cambio de correo y contraseña.
- [ ] Crear, editar y borrar datos del mes, deudas y bolsillos; varias pestañas abiertas.
- [ ] Arranque en frío (escala a cero) de Cloud Run y suspensión de Neon: primera petición dentro del plazo.
- [ ] Un backup se ejecuta, se descifra y se restaura en una rama temporal de Neon.
- [ ] La alerta de presupuesto está activa y el consumo del mes aparece en cero.

## Cuándo revisar esta decisión

- Si se superan los límites gratuitos de forma sostenida o la app pasa a tener uso comercial (Vercel Hobby no lo permite).
- Si la base se acerca a 0.5 GB.
- Si los arranques en frío de Cloud Run o de Neon molestan en el uso diario.
- Si algún proveedor cambia o elimina su plan gratuito.
