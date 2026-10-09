#!/usr/bin/env bash
# Smoke test de la imagen de producción contra un PostgreSQL efímero con TLS verificado.
# Uso (desde backend/): bash scripts/docker-smoke.sh
# Crea y elimina sus propios recursos (red, contenedores, certificados temporales).
set -euo pipefail

RUN_ID="fintrack-smoke-$RANDOM$RANDOM"
NETWORK="$RUN_ID-net"
DB="$RUN_ID-db"
API="$RUN_ID-api"
CERTS="$(mktemp -d)"
# mktemp crea el directorio con 700: postgres y node necesitan recorrerlo en Linux.
# La clave privada conserva 600; solo los certificados públicos son legibles por otros.
chmod 755 "$CERTS"
EDGE_SECRET="smoke-edge-secret-$(date +%s)-0123456789abcdef"
API_PORT="${SMOKE_API_PORT:-18080}"
DB_PASSWORD="smoke_only_$RANDOM"

cleanup() {
    docker rm -f "$API" "$DB" >/dev/null 2>&1 || true
    docker network rm "$NETWORK" >/dev/null 2>&1 || true
    rm -rf "$CERTS"
}
trap cleanup EXIT

fail() {
    echo "SMOKE FALLÓ: $1" >&2
    docker logs "$DB" 2>&1 | tail -40 >&2 || true
    docker logs "$API" 2>&1 | tail -40 >&2 || true
    exit 1
}

echo "1. Certificados de prueba (CA propia) para TLS verify-full"
docker run --rm -v "$CERTS:/certs" postgres:18 bash -c '
    set -e
    cd /certs
    openssl req -new -x509 -days 1 -nodes -subj "/CN=fintrack-smoke-ca" -keyout ca.key -out ca.crt 2>/dev/null
    openssl req -new -nodes -subj "/CN='"$DB"'" -keyout server.key -out server.csr 2>/dev/null
    printf "subjectAltName=DNS:'"$DB"'" > san.ext
    openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -days 1 -extfile san.ext -out server.crt 2>/dev/null
    chown 999:999 server.key server.crt && chmod 600 server.key && chmod 644 ca.crt
'

echo "2. PostgreSQL efímero con ssl=on"
docker network create "$NETWORK" >/dev/null
docker run -d --name "$DB" --network "$NETWORK" -v "$CERTS:/certs" \
    -e POSTGRES_USER=fintrack_smoke -e POSTGRES_PASSWORD="$DB_PASSWORD" -e POSTGRES_DB=fintrack_smoke \
    postgres:18 -c ssl=on -c ssl_cert_file=/certs/server.crt -c ssl_key_file=/certs/server.key >/dev/null

for _ in $(seq 1 30); do
    docker exec "$DB" pg_isready -U fintrack_smoke -d fintrack_smoke >/dev/null 2>&1 && break
    sleep 1
done

docker exec "$DB" pg_isready -U fintrack_smoke -d fintrack_smoke >/dev/null 2>&1 || fail "PostgreSQL no arrancó con TLS"

DATABASE_URL="postgresql://fintrack_smoke:$DB_PASSWORD@$DB:5432/fintrack_smoke?sslmode=verify-full"

echo "3. Migraciones con la imagen migrator"
docker build --quiet --target migrator -t fintrack-backend-migrator . >/dev/null
docker run --rm --network "$NETWORK" -v "$CERTS:/certs:ro" -e NODE_EXTRA_CA_CERTS=/certs/ca.crt \
    -e DATABASE_URL="$DATABASE_URL" -e DIRECT_URL="$DATABASE_URL" fintrack-backend-migrator >/dev/null

echo "4. Imagen de runtime"
docker build --quiet -t fintrack-backend . >/dev/null

if docker run --rm --entrypoint sh fintrack-backend -c 'ls -a /app' | grep -q '^\.env'; then
    fail "la imagen contiene un archivo .env"
fi

[ "$(docker run --rm --entrypoint id fintrack-backend -u)" != "0" ] || fail "la imagen corre como root"

echo "5. Arranque con configuración de producción inyectada (sin .env)"
docker run -d --name "$API" --network "$NETWORK" -p "127.0.0.1:$API_PORT:8080" -v "$CERTS:/certs:ro" \
    -e NODE_EXTRA_CA_CERTS=/certs/ca.crt \
    -e DATABASE_URL="$DATABASE_URL" \
    -e ALLOWED_ORIGINS=https://fintrack.smoke.test \
    -e FRONTEND_APP_URL=https://fintrack.smoke.test \
    -e COOKIE_SECURE=true \
    -e EXPOSE_DEV_AUTH_TOKENS=false \
    -e EMAIL_PROVIDER=resend -e RESEND_API_KEY=re_smoke_not_used -e EMAIL_FROM="FinTrack <no-reply@smoke.test>" \
    -e JWT_ACCESS_SECRET="$(openssl rand -hex 32 2>/dev/null || echo access-secret-smoke-0123456789abcdef0123)" \
    -e JWT_REFRESH_SECRET="$(openssl rand -hex 32 2>/dev/null || echo refresh-secret-smoke-0123456789abcdef012)" \
    -e EDGE_PROXY_SECRET="$EDGE_SECRET" \
    -e TRUST_PROXY=1 \
    fintrack-backend >/dev/null

for _ in $(seq 1 30); do
    curl -fsS "http://127.0.0.1:$API_PORT/api/health/live" >/dev/null 2>&1 && break
    sleep 1
done

status() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

[ "$(status "http://127.0.0.1:$API_PORT/api/health/live")" = "200" ] || fail "liveness"
[ "$(status "http://127.0.0.1:$API_PORT/api/health/ready")" = "200" ] || fail "readiness con TLS verify-full"
[ "$(status "http://127.0.0.1:$API_PORT/api/auth/me")" = "403" ] || fail "tráfico directo sin secreto de borde debe ser 403"
[ "$(status -H "x-fintrack-edge-auth: $EDGE_SECRET" "http://127.0.0.1:$API_PORT/api/auth/me")" = "401" ] || fail "con secreto de borde debe llegar a la API (401)"
docker logs "$API" 2>&1 | grep -q '"message":"http_request"' || fail "logs JSON estructurados"
if docker logs "$API" 2>&1 | grep -q 'prisma:warn'; then
    fail "el runtime emite advertencias de Prisma"
fi

echo "6. SIGTERM: cierre ordenado dentro de la ventana de Cloud Run"
START=$(date +%s)
docker stop --time 10 "$API" >/dev/null
ELAPSED=$(( $(date +%s) - START ))
EXIT_CODE="$(docker inspect "$API" --format '{{.State.ExitCode}}')"
[ "$EXIT_CODE" = "0" ] || fail "código de salida $EXIT_CODE tras SIGTERM"
[ "$ELAPSED" -lt 10 ] || fail "el cierre tardó ${ELAPSED}s"
docker logs "$API" 2>&1 | grep -q 'shutdown_completed' || fail "no registró shutdown_completed"

echo "SMOKE OK: migraciones, TLS verify-full, salud, protección de origen, logs y SIGTERM (${ELAPSED}s)."
