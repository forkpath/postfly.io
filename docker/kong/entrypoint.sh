#!/bin/sh
set -eu

: "${DOMAIN:=localhost}"
: "${ACME_EMAIL:=admin@${DOMAIN}}"
: "${PUBLIC_ORIGIN:=http://localhost}"
: "${REDIS_HOST:=redis}"
: "${REDIS_PASSWORD:=}"
: "${ENGINE_UPSTREAM:=engine:8000}"
: "${PULSE_UPSTREAM:=pulse:3001}"
: "${WEB_UPSTREAM:=web:3000}"
: "${KONG_AUTO_TLS:=false}"

# Escape sed replacement characters, including those in Redis credentials.
escape() { printf '%s' "$1" | sed 's/[\\&|]/\\&/g'; }
render() {
  sed \
    -e "s|\${DOMAIN}|$(escape "$DOMAIN")|g" \
    -e "s|\${ACME_EMAIL}|$(escape "$ACME_EMAIL")|g" \
    -e "s|\${PUBLIC_ORIGIN}|$(escape "$PUBLIC_ORIGIN")|g" \
    -e "s|\${REDIS_HOST}|$(escape "$REDIS_HOST")|g" \
    -e "s|\${REDIS_PASSWORD}|$(escape "$REDIS_PASSWORD")|g" \
    -e "s|\${ENGINE_UPSTREAM}|$(escape "$ENGINE_UPSTREAM")|g" \
    -e "s|\${PULSE_UPSTREAM}|$(escape "$PULSE_UPSTREAM")|g" \
    -e "s|\${WEB_UPSTREAM}|$(escape "$WEB_UPSTREAM")|g" "$1"
}
render /etc/kong/kong.yml.template > /etc/kong/kong.yml
case "$KONG_AUTO_TLS" in
  true) render /etc/kong/tls-plugins.yml.template | sed 's/^/  /' >> /etc/kong/kong.yml ;;
  false) ;;
  *) printf 'KONG_AUTO_TLS must be true or false\n' >&2; exit 1 ;;
esac
exec /docker-entrypoint.sh kong docker-start
