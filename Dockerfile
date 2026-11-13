# ==========================================================
# Etapa 1: Construcción de la aplicación Angular (Build Stage)
# ==========================================================
FROM node:20-alpine AS build

WORKDIR /app

# Copiar manifiestos de dependencias
COPY package*.json .npmrc ./

# Instalar dependencias limpias
RUN npm ci --ignore-scripts

# Copiar el código fuente completo del proyecto
COPY . .

# Compilar para producción (genera dist/gestio-asistencia-frontend/browser)
RUN npm run build -- --configuration=production

# ==========================================================
# Etapa 2: Servidor Nginx para producción (Production Stage)
# ==========================================================
# Imagen sin privilegios (usuario nginx, UID 101), version fija y digest del indice multi-arquitectura.
# Para actualizar: docker buildx imagetools inspect nginxinc/nginx-unprivileged:<tag>
FROM nginxinc/nginx-unprivileged:1.30.6-alpine@sha256:f5116ed4606f3eb015dd4a8e28cb9b351476dc0ad4bc6e9f93b19cec130cdf03

USER root
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist/gestio-asistencia-frontend/browser /usr/share/nginx/html
COPY docker-entrypoint.d/40-env-js.sh /docker-entrypoint.d/40-env-js.sh
# El entrypoint (usuario nginx) escribe assets/env.js y snippets/csp.conf en el arranque.
RUN chmod +x /docker-entrypoint.d/40-env-js.sh \
    && mkdir -p /etc/nginx/snippets \
    && printf '%s\n' "add_header Content-Security-Policy \"default-src 'self'\" always;" > /etc/nginx/snippets/csp.conf \
    && chown -R 101:0 /etc/nginx/snippets /usr/share/nginx/html/assets \
    && chmod -R g+w /etc/nginx/snippets /usr/share/nginx/html/assets
USER 101

# Puerto interno sin privilegios (el contenedor no puede enlazar el 80)
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q --spider http://127.0.0.1:8080/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
