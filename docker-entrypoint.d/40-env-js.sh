#!/bin/sh
set -eu

template="/usr/share/nginx/html/assets/env.template.js"
target="/usr/share/nginx/html/assets/env.js"

if [ -f "$template" ]; then
  API_URL="${API_URL:-http://localhost:8080/api/v1}"
  KEYCLOAK_URL="${KEYCLOAK_URL:-http://127.0.0.1:8081}"
  KEYCLOAK_REALM="${KEYCLOAK_REALM:-asistencias-uco}"
  KEYCLOAK_CLIENT_ID="${KEYCLOAK_CLIENT_ID:-asistencias-uco-frontend}"
  USE_MOCKS="${USE_MOCKS:-false}"
  SECURITY_PROVIDER="${SECURITY_PROVIDER:-baseline}"
  # Un valor desconocido NO se convierte en legacy: el contenedor no arranca (fail-closed).
  case "$SECURITY_PROVIDER" in
    legacy|baseline) ;;
    *) echo "SECURITY_PROVIDER invalido: '$SECURITY_PROVIDER' (use legacy o baseline)" >&2; exit 1 ;;
  esac
  SECURITY_BASELINE_URL="${SECURITY_BASELINE_URL:-http://localhost:18080}"
  SECURITY_BASELINE_UI_URL="${SECURITY_BASELINE_UI_URL:-http://localhost:5175}"
  # SEC-12: sin id real por defecto. En modo baseline es obligatorio (el contenedor no arranca sin el; fail-closed).
  SECURITY_BASELINE_APPLICATION_ID="${SECURITY_BASELINE_APPLICATION_ID:-}"
  if [ "$SECURITY_PROVIDER" = "baseline" ] && [ -z "$SECURITY_BASELINE_APPLICATION_ID" ]; then
    echo "SECURITY_BASELINE_APPLICATION_ID es obligatorio con SECURITY_PROVIDER=baseline (id de la aplicacion en el PDP; ver .env.example)" >&2
    exit 1
  fi
  SECURITY_BASELINE_ISSUER_URL="${SECURITY_BASELINE_ISSUER_URL:-http://keycloak.localhost:19090/realms/security-baseline}"
  SECURITY_BASELINE_CLIENT_ID="${SECURITY_BASELINE_CLIENT_ID:-asistencias-uco-spa}"

  export API_URL KEYCLOAK_URL KEYCLOAK_REALM KEYCLOAK_CLIENT_ID USE_MOCKS SECURITY_PROVIDER SECURITY_BASELINE_URL SECURITY_BASELINE_UI_URL SECURITY_BASELINE_APPLICATION_ID SECURITY_BASELINE_ISSUER_URL SECURITY_BASELINE_CLIENT_ID
  envsubst '${API_URL} ${KEYCLOAK_URL} ${KEYCLOAK_REALM} ${KEYCLOAK_CLIENT_ID} ${USE_MOCKS} ${SECURITY_PROVIDER} ${SECURITY_BASELINE_URL} ${SECURITY_BASELINE_UI_URL} ${SECURITY_BASELINE_APPLICATION_ID} ${SECURITY_BASELINE_ISSUER_URL} ${SECURITY_BASELINE_CLIENT_ID}' < "$template" > "$target"
fi

# ----------------------------------------------------------------------------
# CSP y HSTS (CF-04). Los origenes permitidos en connect-src salen de las mismas
# variables que env.js (API, IdP/Keycloak, Security Baseline); no hay lista fija.
# ----------------------------------------------------------------------------
origin_of() {
  # scheme://host[:port] de una URL; vacio si no es http(s)
  printf '%s' "$1" | sed -n -E 's#^(https?://[^/?\#]+).*#\1#p'
}

csp_connect="'self'"
for raw in "${API_URL:-}" "${KEYCLOAK_URL:-}" "${SECURITY_BASELINE_URL:-}" "${SECURITY_BASELINE_ISSUER_URL:-}" ${CSP_EXTRA_CONNECT_SRC:-}; do
  o="$(origin_of "$raw")"
  [ -n "$o" ] && csp_connect="$csp_connect $o"
done

# Origenes de los que el SPA navega o embebe (silent-check-sso usa iframe del propio origen).
csp_policy="default-src 'self'; script-src 'self'; script-src-attr 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob:; connect-src $csp_connect; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"

{
  printf 'add_header Content-Security-Policy "%s" always;\n' "$csp_policy"
  # HSTS solo cuando el despliegue esta detras de TLS (ENABLE_HSTS=true); por HTTP no tiene efecto util.
  if [ "${ENABLE_HSTS:-false}" = "true" ]; then
    printf 'add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;\n'
  fi
} > /etc/nginx/snippets/csp.conf
