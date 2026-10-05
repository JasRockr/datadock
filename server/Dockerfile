# Etapa de construcción
FROM node:22-alpine AS build

WORKDIR /app

# Copiar archivos de configuración
COPY package*.json ./

# Instalar dependencias exactas del lockfile
RUN npm ci

# Copiar código fuente
COPY . .

# Construir la aplicación
RUN npm run build

# Etapa de producción
FROM node:22-alpine

WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias de producción solamente (incluye @babel/runtime, requerido por dist)
RUN npm ci --omit=dev && npm cache clean --force

# Copiar archivos compilados desde la etapa de construcción
COPY --from=build /app/dist ./dist

# Crear directorios de uploads
RUN mkdir -p uploads/csv uploads/json uploads/tmp

# Establecer permisos adecuados
RUN chown -R node:node /app

# Cambiar a usuario no root
USER node

# Definir variables de entorno
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=5128

# Exponer puerto
EXPOSE 5128

# Healthcheck propio de la imagen (docker-compose puede sobrescribirlo)
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
  CMD wget --no-verbose --tries=1 --spider "http://127.0.0.1:${PORT}/status-server" || exit 1

# Comando para iniciar la aplicación
CMD ["node", "dist/index.js"]
