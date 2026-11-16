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
  # Catálogo de Parámetros: el UUID de la aplicación no tiene valor por defecto (la pantalla avisa si falta).
  CATALOGO_PARAMETROS_APPLICATION_ID="${CATALOGO_PARAMETROS_APPLICATION_ID:-}"
  CATALOGO_PARAMETROS_UI_URL="${CATALOGO_PARAMETROS_UI_URL:-/parametros-ui/parametros-administration.js}"
  CATALOGO_PARAMETROS_API_BASE_URL="${CATALOGO_PARAMETROS_API_BASE_URL:-/catalogo-parametros/api/v1}"
  # INT-003 (MessageUcoLab 0.3.0, paso 12): los textos de la interfaz se leen del catalogo a traves del Backend
  # (GET /api/v1/public/mensajes-interfaz/{codigo}). Apagado por defecto: la SPA usa sus textos de respaldo
  # (core/messages/mensajes-ui.ts). Encenderlo (true) solo con el Backend en el proveedor messageucolab.
  MENSAJES_UI_DESDE_CATALOGO="${MENSAJES_UI_DESDE_CATALOGO:-false}"

  export API_URL KEYCLOAK_URL KEYCLOAK_REALM KEYCLOAK_CLIENT_ID USE_MOCKS SECURITY_PROVIDER SECURITY_BASELINE_URL SECURITY_BASELINE_UI_URL SECURITY_BASELINE_APPLICATION_ID SECURITY_BASELINE_ISSUER_URL SECURITY_BASELINE_CLIENT_ID CATALOGO_PARAMETROS_APPLICATION_ID CATALOGO_PARAMETROS_UI_URL CATALOGO_PARAMETROS_API_BASE_URL MENSAJES_UI_DESDE_CATALOGO
  envsubst '${API_URL} ${KEYCLOAK_URL} ${KEYCLOAK_REALM} ${KEYCLOAK_CLIENT_ID} ${USE_MOCKS} ${SECURITY_PROVIDER} ${SECURITY_BASELINE_URL} ${SECURITY_BASELINE_UI_URL} ${SECURITY_BASELINE_APPLICATION_ID} ${SECURITY_BASELINE_ISSUER_URL} ${SECURITY_BASELINE_CLIENT_ID} ${CATALOGO_PARAMETROS_APPLICATION_ID} ${CATALOGO_PARAMETROS_UI_URL} ${CATALOGO_PARAMETROS_API_BASE_URL} ${MENSAJES_UI_DESDE_CATALOGO}' < "$template" > "$target"
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

# Micro frontends remotos (Module Federation): Security UI y la consola del Catalogo de Parametros se cargan como modulos
# JavaScript desde su propio origen, piden sus fragmentos y hojas de estilo al mismo origen. Una URL relativa (servida por
# este Nginx) no agrega nada: ya la cubre 'self'.
csp_remotos=""
for raw in "${SECURITY_BASELINE_UI_URL:-}" "${CATALOGO_PARAMETROS_UI_URL:-}" ${CSP_EXTRA_SCRIPT_SRC:-}; do
  o="$(origin_of "$raw")"
  [ -n "$o" ] && csp_remotos="$csp_remotos $o"
done
csp_connect="$csp_connect$csp_remotos"

# Origenes de los que el SPA navega o embebe (silent-check-sso usa iframe del propio origen).
# VAL CF-04 (2026-11-14): sin JavaScript en linea. `inlineCritical` esta apagado en angular.json, asi que el index ya no
# lleva el `onload` del CSS critico y script-src-attr queda en 'none'. style-src conserva 'unsafe-inline' solo porque los
# micro frontends externos (Security UI y minifront-mensajes) inyectan <style> en su shadow DOM sin soporte de nonce; con
# un nonce el navegador ignoraria 'unsafe-inline' y los romperia. Quitarlo depende de esos equipos (ver VALIDATION.md).
csp_policy="default-src 'self'; script-src 'self'$csp_remotos; script-src-attr 'none'; style-src 'self' 'unsafe-inline'$csp_remotos; font-src 'self' data:; img-src 'self' data: blob:; connect-src $csp_connect; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"

{
  printf 'add_header Content-Security-Policy "%s" always;\n' "$csp_policy"
  # HSTS solo cuando el despliegue esta detras de TLS (ENABLE_HSTS=true); por HTTP no tiene efecto util.
  if [ "${ENABLE_HSTS:-false}" = "true" ]; then
    printf 'add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;\n'
  fi
} > /etc/nginx/snippets/csp.conf
