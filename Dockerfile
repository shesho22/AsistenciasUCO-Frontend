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

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/gestio-asistencia-frontend/browser /usr/share/nginx/html
COPY docker-entrypoint.d/40-env-js.sh /docker-entrypoint.d/40-env-js.sh
RUN chmod +x /docker-entrypoint.d/40-env-js.sh

# Exponer el puerto HTTP estándar
EXPOSE 80

# Iniciar servidor Nginx
CMD ["nginx", "-g", "daemon off;"]
