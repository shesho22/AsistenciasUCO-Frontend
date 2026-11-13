# VAL-oleada2-cumplimiento - imagen y nginx del frontend (TRI-08, CF-04)

Detalle completo, pruebas y estado en `Repositorio_GestionAsistenciaInfra/docs/work-items/VAL-oleada2-cumplimiento/`.

- `Dockerfile`: `nginxinc/nginx-unprivileged:1.30.6-alpine` fijada por digest, `USER 101`, puerto interno **8080** (antes 80), `HEALTHCHECK` sobre `/healthz`.
- `nginx/default.conf`: `server_tokens off`, `/healthz`, e inclusión de los encabezados en cada `location` (nginx no hereda `add_header` de nivel superior).
- `nginx/security-headers.conf`: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`.
- `docker-entrypoint.d/40-env-js.sh`: genera `/etc/nginx/snippets/csp.conf` con `connect-src` a partir de `API_URL`, `KEYCLOAK_URL`, `SECURITY_BASELINE_URL` y `SECURITY_BASELINE_ISSUER_URL` (más `CSP_EXTRA_CONNECT_SRC`, separados por espacio); agrega HSTS solo con `ENABLE_HSTS=true` (detrás de TLS).
- Quien publique el contenedor debe mapear `8080` (no `80`).
