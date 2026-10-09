# syntax=docker/dockerfile:1.7
# Imagen del backend para Cloud Run (docs/despliegue.md). Node 24 ejecuta TypeScript sin
# transpilar; las variables llegan del entorno del servicio, nunca de un .env dentro de la imagen.

ARG NODE_IMAGE=node:24.16.0-bookworm-slim@sha256:2c87ef9bd3c6a3bd4b472b4bec2ce9d16354b0c574f736c476489d09f560a203

FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=true
RUN npm install --global pnpm@11.27.1 && npm cache clean --force
WORKDIR /app

# Dependencias completas (incluye el CLI de Prisma) a partir del lockfile.
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Imagen de migraciones: solo ejecuta `prisma migrate deploy` contra DIRECT_URL. CI la usa en el
# smoke test; el despliegue real migra desde GitHub Actions antes del deploy.
FROM deps AS migrator
# El motor de migraciones de Prisma necesita OpenSSL (solo en esta imagen, no en el runtime).
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY prisma ./prisma
COPY prisma.config.ts ./
CMD ["node", "node_modules/prisma/build/index.js", "migrate", "deploy"]

FROM deps AS build
COPY prisma ./prisma
COPY prisma.config.ts ./
# El generador no se conecta a la base: la URL solo satisface la validación de la config.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build node node_modules/prisma/build/index.js generate \
    && pnpm prune --prod

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
    PORT=8080
WORKDIR /app
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node src ./src
USER node
EXPOSE 8080
CMD ["node", "src/server.ts"]
