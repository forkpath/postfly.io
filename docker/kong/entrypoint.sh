#!/bin/sh
set -e

TEMPLATE="/etc/kong/kong.yml.template"
OUTPUT="/etc/kong/kong.yml"

: "${DOMAIN:=localhost}"
: "${ACME_EMAIL:=admin@${DOMAIN}}"
: "${REDIS_PASSWORD:=}"

sed \
  -e "s|\${DOMAIN}|${DOMAIN}|g" \
  -e "s|\${ACME_EMAIL}|${ACME_EMAIL}|g" \
  -e "s|\${REDIS_PASSWORD}|${REDIS_PASSWORD}|g" \
  "$TEMPLATE" > "$OUTPUT"

exec /docker-entrypoint.sh kong docker-start
