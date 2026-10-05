# Etapa de construcción
FROM node:22-alpine AS build

WORKDIR /app

ARG VITE_API_URL=http://localhost:5128/api
ENV VITE_API_URL=$VITE_API_URL

# Copiar archivos de configuración
COPY package*.json ./

# Instalar dependencias exactas del lockfile
RUN npm ci

# Copiar código fuente
COPY . .

# Construir la aplicación
RUN npm run build

# Etapa de producción
FROM nginx:alpine

# Copiar la configuración de nginx
COPY ./nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Copiar los archivos de construcción desde la etapa anterior
COPY --from=build /app/dist /usr/share/nginx/html

# Exponer puerto 80
EXPOSE 80

# Healthcheck: nginx sirve el index de la SPA
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/ || exit 1

# Comando para iniciar nginx
CMD ["nginx", "-g", "daemon off;"]
