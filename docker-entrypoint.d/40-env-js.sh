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
  SECURITY_BASELINE_APPLICATION_ID="${SECURITY_BASELINE_APPLICATION_ID:-a0b42637-39f8-4ddd-bec2-0781ba08e779}"
  SECURITY_BASELINE_ISSUER_URL="${SECURITY_BASELINE_ISSUER_URL:-http://keycloak.localhost:19090/realms/security-baseline}"
  SECURITY_BASELINE_CLIENT_ID="${SECURITY_BASELINE_CLIENT_ID:-asistencias-uco-spa}"

  export API_URL KEYCLOAK_URL KEYCLOAK_REALM KEYCLOAK_CLIENT_ID USE_MOCKS SECURITY_PROVIDER SECURITY_BASELINE_URL SECURITY_BASELINE_UI_URL SECURITY_BASELINE_APPLICATION_ID SECURITY_BASELINE_ISSUER_URL SECURITY_BASELINE_CLIENT_ID
  envsubst '${API_URL} ${KEYCLOAK_URL} ${KEYCLOAK_REALM} ${KEYCLOAK_CLIENT_ID} ${USE_MOCKS} ${SECURITY_PROVIDER} ${SECURITY_BASELINE_URL} ${SECURITY_BASELINE_UI_URL} ${SECURITY_BASELINE_APPLICATION_ID} ${SECURITY_BASELINE_ISSUER_URL} ${SECURITY_BASELINE_CLIENT_ID}' < "$template" > "$target"
fi
