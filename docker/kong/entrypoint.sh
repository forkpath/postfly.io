#!/bin/sh
set -e

TEMPLATE="/etc/kong/kong.yml.template"
OUTPUT="/etc/kong/kong.yml"

: "${DOMAIN:=localhost}"
: "${ACME_EMAIL:=admin@${DOMAIN}}"
: "${REDIS_PASSWORD:=}"
: "${ENGINE_UPSTREAM:=engine:8000}"
: "${WEB_UPSTREAM:=web:3000}"

sed \
  -e "s|\${DOMAIN}|${DOMAIN}|g" \
  -e "s|\${ACME_EMAIL}|${ACME_EMAIL}|g" \
  -e "s|\${REDIS_PASSWORD}|${REDIS_PASSWORD}|g" \
  -e "s|\${ENGINE_UPSTREAM}|${ENGINE_UPSTREAM}|g" \
  -e "s|\${WEB_UPSTREAM}|${WEB_UPSTREAM}|g" \
  "$TEMPLATE" > "$OUTPUT"

exec /docker-entrypoint.sh kong docker-start
