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
FROM nginx:alpine

# La plantilla se procesa con envsubst al arrancar (20-envsubst-on-templates.sh de la imagen oficial).
# Destinos de los componentes externos: solo esquema://host:puerto, sin ruta (nginx conserva la URI original).
ENV MESSAGEUCOLAB_UPSTREAM=http://host.docker.internal:8000 \
    CATALOGO_PARAMETROS_UPSTREAM=http://host.docker.internal:8081 \
    CATALOGO_PARAMETROS_UI_UPSTREAM=http://host.docker.internal:4201
COPY nginx/templates/ /etc/nginx/templates/
COPY --from=build /app/dist/gestio-asistencia-frontend/browser /usr/share/nginx/html
COPY docker-entrypoint.d/40-env-js.sh /docker-entrypoint.d/40-env-js.sh
RUN chmod +x /docker-entrypoint.d/40-env-js.sh

# Exponer el puerto HTTP estándar
EXPOSE 80

# Iniciar servidor Nginx
CMD ["nginx", "-g", "daemon off;"]
