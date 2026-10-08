# Despliegue de FinTrack OS

Arquitectura de producción acordada el 2026-10-08. Estado: **decidida, pendiente de implementar**.

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

 GitHub Actions: tests → build de la imagen → Artifact Registry → migraciones → deploy a Cloud Run
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

Google Cloud exige una tarjeta para la cuenta de facturación aunque no cobre dentro del plan gratuito. Para que nunca haya cargos inesperados:

- Alerta de presupuesto de **USD 1** en la cuenta de facturación.
- Cloud Run con `min-instances=0`, `max-instances=2`, 1 vCPU, 512 MiB, facturación por petición y *startup CPU boost*.
- Política de limpieza en Artifact Registry que conserva solo las 2 imágenes más recientes.
- Ciclo de vida en el bucket de backups que borra los volcados con más de 90 días.

## Sesión y cookies

El frontend llama a la API con `credentials: 'include'` y el refresh token viaja en una cookie httpOnly. `vercel.app` y `run.app` están en la Public Suffix List, así que dos dominios así son sitios distintos. Con `SameSite=lax` la cookie no se enviaría, y con `none` la bloquean Safari y Brave.

Solución: el navegador solo habla con el dominio de Vercel. Next.js reenvía `/api/*` a Cloud Run con *rewrites* y la cookie queda como first-party.

- `frontend/next.config.ts` define un rewrite `/api/:path*` → `${BACKEND_ORIGIN}/api/:path*`. El frontend no tiene rutas propias bajo `/api`, así que no hay conflicto.
- `NEXT_PUBLIC_BACKEND_URL` apunta al propio dominio del frontend.
- Las URLs de callback de OAuth usan el dominio del frontend.

Si más adelante se compra un dominio (~USD 10/año), `app.<dominio>` y `api.<dominio>` serían el mismo sitio y los rewrites dejarían de ser necesarios.

## Variables de entorno de producción

Los valores reales nunca se versionan. El backend los recibe como variables del servicio en Cloud Run y el frontend como variables del proyecto en Vercel.

### Backend (Cloud Run)

| Variable | Valor de producción |
|---|---|
| `PORT` | No se define: Cloud Run la inyecta (8080). |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Cadena de conexión **pooled** de Neon (host con `-pooler`) |
| `DIRECT_URL` | Cadena **directa** de Neon; solo la usan las migraciones en CI |
| `ALLOWED_ORIGINS` | `https://<frontend>.vercel.app` |
| `FRONTEND_APP_URL` | `https://<frontend>.vercel.app` |
| `TRUST_PROXY` | `true` |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Nuevos, largos y aleatorios; distintos de los de desarrollo |
| `COOKIE_SECURE` | `true` |
| `COOKIE_SAME_SITE` | `lax` |
| `COOKIE_DOMAIN` | Vacío |
| `EXPOSE_DEV_AUTH_TOKENS` | **`false`**. Si queda en `true`, la API expone en producción tokens pensados solo para desarrollo. |
| `EMAIL_PROVIDER`, `EMAIL_FROM`, `EMAIL_PASSWORD` | Gmail con contraseña de aplicación |
| `GOOGLE_OAUTH_CALLBACK_URL` | `https://<frontend>.vercel.app/api/auth/oauth/google/callback` |
| `GITHUB_OAUTH_CALLBACK_URL` | `https://<frontend>.vercel.app/api/auth/oauth/github/callback` |
| `GOOGLE_OAUTH_*`, `GITHUB_OAUTH_*` (client id y secret) | Credenciales de las apps OAuth de producción |
| Límites de tasa y TTL | Los valores de `backend/.env.example`, salvo que se decida otra cosa |

### Frontend (Vercel)

| Variable | Valor de producción |
|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | `https://<frontend>.vercel.app` |
| `BACKEND_ORIGIN` | URL del servicio de Cloud Run (`https://<servicio>-<hash>.us-east4.run.app`). Nombre propuesto, se fija al implementar el rewrite. |

Tras configurarlas, actualizar los callbacks autorizados en las consolas de Google y GitHub.

## Backend en Docker

`backend/Dockerfile` de varias etapas sobre `node:24-slim`:

1. Instalar dependencias con `pnpm` usando el lockfile.
2. Ejecutar `prisma generate`.
3. Imagen final solo con lo necesario para producción, sin `.env`.
4. Arrancar con `node src/server.ts`. Node 24 ejecuta TypeScript sin flags y las variables llegan desde Cloud Run, sin `--env-file`.

Añadir también `backend/.dockerignore` (`node_modules`, `.env`, tests, artefactos locales).

## CI/CD

Workflow `.github/workflows/deploy-backend.yml`, que se dispara con cada push a `main` que toque `backend/`:

1. `pnpm typecheck` y `pnpm test` del backend.
2. Autenticación con Google mediante **Workload Identity Federation**: sin llaves JSON guardadas en GitHub.
3. Build de la imagen y push a Artifact Registry, etiquetada con el SHA del commit.
4. `pnpm prisma:migrate:deploy` contra producción usando `DIRECT_URL`.
5. Deploy a Cloud Run.

El frontend se despliega con la integración de Git de Vercel (*Root Directory* `frontend/`): producción desde `main` y previews en las ramas.

Los secretos de CI (`DIRECT_URL`, proveedor de identidad, cuenta de servicio, clave de cifrado de backups) van en *GitHub Actions secrets*.

## Migraciones

- Producción solo recibe `prisma migrate deploy`, desde CI y antes del deploy del backend.
- Nunca se ejecuta `prisma migrate dev` contra producción.
- El desarrollo local usa una rama `dev` de Neon, aislada de la rama `main` de producción.

## Backups

El plan gratuito de Neon solo permite restaurar hasta 6 horas atrás. Por eso hay un respaldo propio:

- Workflow programado semanal en GitHub Actions: `pg_dump` → compresión → **cifrado** → subida al bucket de Cloud Storage.
- **El repositorio es público:** el volcado nunca se publica como artifact de Actions ni sin cifrar. La clave de cifrado vive en *GitHub Actions secrets* y en un gestor de contraseñas personal.
- Retención de 90 días con una regla de ciclo de vida del bucket.
- Antes de dar por cerrado el despliegue, restaurar un backup en una rama temporal de Neon para comprobar que funciona.

## Puesta en marcha

### Cuentas y recursos (Project Owner)

- [ ] Neon: crear el proyecto en AWS `us-east-1`, con la rama `main` para producción y la rama `dev` para desarrollo.
- [ ] Google Cloud: crear el proyecto y la cuenta de facturación, con la alerta de USD 1.
- [ ] Google Cloud: habilitar Cloud Run, Artifact Registry, Cloud Storage e IAM Credentials.
- [ ] Google Cloud: crear el repositorio de Artifact Registry con su política de limpieza.
- [ ] Google Cloud: crear el bucket de backups con su ciclo de vida.
- [ ] Google Cloud: configurar Workload Identity Federation para el repositorio de GitHub y una cuenta de servicio con permisos mínimos.
- [ ] Vercel: crear el proyecto con *Root Directory* `frontend/`.
- [ ] Google y GitHub: crear las apps OAuth de producción con los callbacks del dominio de Vercel.
- [ ] Gmail: generar una contraseña de aplicación para el envío de correos.

### Cambios en el repositorio

- [ ] `backend/Dockerfile` y `backend/.dockerignore`.
- [ ] Rewrites en `frontend/next.config.ts` y la variable `BACKEND_ORIGIN`.
- [ ] `.github/workflows/deploy-backend.yml`.
- [ ] `.github/workflows/backup-db.yml`.
- [ ] Documentar las variables nuevas en los `.env.example` de cada boundary.

### Verificación en producción

- [ ] Registro con verificación por correo.
- [ ] Inicio de sesión con correo, Google y GitHub.
- [ ] La sesión se renueva pasados 15 minutos, también en Safari y en iPhone.
- [ ] Recuperación de contraseña.
- [ ] Crear, editar y borrar datos del mes, deudas y bolsillos.
- [ ] La API rechaza orígenes no permitidos y no expone tokens de desarrollo.
- [ ] Se ejecuta un backup y se restaura en una rama temporal de Neon.
- [ ] La alerta de presupuesto está activa y el consumo del mes aparece en cero.

## Cuándo revisar esta decisión

- Si se superan los límites gratuitos de forma sostenida o la app pasa a tener uso comercial (Vercel Hobby no lo permite).
- Si la base se acerca a 0.5 GB.
- Si los arranques en frío de Cloud Run o de Neon molestan en el uso diario.
- Si algún proveedor cambia o elimina su plan gratuito.
