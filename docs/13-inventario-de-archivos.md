# 13. Inventario de archivos

> Todos los archivos y carpetas del proyecto (sin `node_modules/`, `dist/` ni carpetas generadas), con su función. Úsalo como mapa cuando no sepas para qué sirve algo. **Si agregas, mueves o eliminas un archivo, actualiza esta página.**

Leyenda: ✅ código en uso · ⚙️ configuración o herramienta · 📄 documentación · ⏳ se genera al ejecutar (no se versiona).

## 13.1 Raíz

| Ruta | Tipo | Función |
| --- | --- | --- |
| `package.json` | ⚙️ | Scripts que orquestan cliente y servidor (`dev`, `test`, `lint`, `build`, `ci-all`…) y versión de Node (`engines`). |
| `package-lock.json` | ⚙️ | Versiones exactas de las dependencias de la raíz (`concurrently`). |
| `.nvmrc` | ⚙️ | Versión de Node del proyecto (22). |
| `.npmrc` | ⚙️ | `engine-strict`, `save-exact` y `package-lock` para las instalaciones en la raíz. |
| `.gitignore` | ⚙️ | Qué no se versiona. |
| `docker-compose.yml` | ⚙️ | Levanta cliente y servidor con Docker ([09](09-docker-ci-y-despliegue.md)). |
| `.github/workflows/ci-cd.yml` | ⚙️ | Pipeline de GitHub Actions: validación, build y despliegue. |
| `e2e/docker-compose.e2e.yml` | ⚙️ | Sobrescritura de Compose para la prueba E2E: conecta el servidor al contenedor `datadock-sql` ([14](14-prueba-e2e-con-docker.md)). |
| `e2e/datos/*.csv`, `e2e/datos/*.txt` | ⚙️ | Archivos de los casos de prueba E2E. |
| `.vscode/settings.json` | ⚙️ | Diccionario del corrector ortográfico de VS Code. |
| `README.md` | 📄 | Portada del proyecto. |
| `docs/` | 📄 | Esta documentación (índice en `docs/README.md`). |
| `tmp/` | ⏳ | Zona de trabajo local, ignorada por git. |

## 13.2 `client/`

| Ruta | Tipo | Función |
| --- | --- | --- |
| `index.html` | ✅ | HTML base; carga `src/main.jsx`. |
| `public/ico.svg` | ✅ | Ícono de la pestaña. |
| `src/main.jsx` | ✅ | Punto de entrada: monta `<App/>`. |
| `src/App.jsx` | ✅ | Proveedor de estado global y rutas. |
| `src/App.css` | ✅ | Estilos de la tabla, la paginación y el selector de fechas. |
| `src/index.css` | ✅ | Tailwind y estilos globales. |
| `src/config.js` | ✅ | URL de la API y extensiones permitidas. |
| `src/pages/AsesoresPage.jsx` | ✅ | Página de listado (`/asesores`). |
| `src/pages/CargaArchivoPage.jsx` | ✅ | Página de carga (`/upload`). |
| `src/components/NavBar.jsx` | ✅ | Barra de navegación. |
| `src/components/asesores/DataTable.jsx` | ✅ | Tabla. |
| `src/components/asesores/PaginationControls.jsx` | ✅ | Paginación. |
| `src/components/asesores/ConnectivityStatus.jsx` | ✅ | Avisos de carga, error y conexión. |
| `src/components/asesores/DateRangePicker.jsx` | ✅ | Rango de fechas. |
| `src/components/asesores/SavedFilters.jsx` | ✅ | Filtros guardados en `localStorage`. |
| `src/components/asesores/ExportData.jsx` | ✅ | Exportar a CSV o JSON. |
| `src/context/AppContext.jsx` | ✅ | Estado global y acciones. |
| `src/services/apiService.js` | ✅ | Llamadas HTTP. |
| `src/services/cacheService.js` | ✅ | Caché en memoria. |
| `src/services/notifications.js` | ✅ | Alertas SweetAlert2. |
| `src/utils/dataProcessing.js` | ✅ | Filtrado, orden y formato de fechas (funciones puras). |
| `src/utils/fileValidator.js` | ✅ | Validación previa del CSV. |
| `__tests__/*.test.js(x)` | ✅ | Pruebas ([08](08-pruebas-y-calidad.md#82-qué-pruebas-existen)). |
| `__tests__/setup.js` | ⚙️ | Preparación de Vitest. |
| `vite.config.js` | ⚙️ | Vite y Vitest (incluida la zona horaria fija de las pruebas). |
| `tailwind.config.js`, `postcss.config.js` | ⚙️ | Estilos. |
| `.eslintrc.cjs` | ⚙️ | Lint. |
| `.env.example` | ⚙️ | Plantilla de `VITE_API_URL`. |
| `nginx/nginx.conf` | ⚙️ | Servidor web de la imagen Docker. |
| `Dockerfile`, `.dockerignore` | ⚙️ | Imagen Docker. |
| `.gitignore` | ⚙️ | Exclusiones de git del cliente. |
| `package.json`, `package-lock.json` | ⚙️ | Dependencias y scripts. |
| `README.md` | 📄 | Resumen del cliente y enlaces a esta documentación. |
| `.env.local` | ⚙️ | **Tu** configuración local, opcional. No se versiona. |
| `dist/` | ⏳ | Resultado de `npm run build`. |

## 13.3 `server/`

| Ruta | Tipo | Función |
| --- | --- | --- |
| `src/index.js` | ✅ | Arranque del proceso. |
| `src/app.js` | ✅ | Aplicación Express. |
| `src/config.js` | ✅ | Configuración central. |
| `src/routes/health.routes.js` | ✅ | `/`, `/api`, `/status-server`, `/health`. |
| `src/domains/asesores/routes/asesores.routes.js` | ✅ | `/api/asesores`, `/api/upload` y su documentación Swagger. |
| `src/domains/asesores/controllers/asesores.controller.js` | ✅ | Listar y cargar asesores. |
| `src/domains/asesores/models/asesor.model.js` | ✅ | Validación, mapeo de tipos y clase `Asesor`. |
| `src/middlewares/requestLogger.middleware.js` | ✅ | Log de peticiones. |
| `src/middlewares/uploadHandler.middleware.js` | ✅ | Recepción del archivo y lectura del CSV. |
| `src/database/connection.js` | ✅ | Pool de SQL Server. |
| `src/database/queries.js` | ✅ | Consultas SQL. |
| `src/database/index.js` | ✅ | Reexportaciones. |
| `src/utils/errorHandler.js` | ✅ | Errores estándar. |
| `src/utils/logger.js` | ✅ | Logger. |
| `src/utils/fileUpload.js` | ✅ | Configuración de Multer. |
| `src/utils/fileUtils.js` | ✅ | Utilidades de archivos. |
| `src/utils/csvHandler.js` | ✅ | Lector de CSV. |
| `src/utils/dataUtils.js` | ✅ | Conversión de tipos y mapeo. |
| `src/utils/fileCleanup.js` | ✅ | Limpieza programada. |
| `src/utils/swagger.js` | ✅ | `/api-docs`. |
| `database/migrations/001_crear_tabla_asesores_api.sql` | ⚙️ | Creación de la tabla ([06](06-base-de-datos.md)). |
| `__tests__/*.test.js` | ✅ | Pruebas ([08](08-pruebas-y-calidad.md#82-qué-pruebas-existen)). |
| `.babelrc` | ⚙️ | Babel. |
| `.eslintrc.cjs` | ⚙️ | Lint. |
| `.env.example` | ⚙️ | Plantilla de `server/.env`, con todas las variables. |
| `.env` | ⚙️ | **Tu** configuración local, con secretos. No se versiona. |
| `Dockerfile`, `.dockerignore` | ⚙️ | Imagen Docker. |
| `.gitignore` | ⚙️ | Exclusiones de git del servidor. |
| `package.json`, `package-lock.json` | ⚙️ | Dependencias y scripts. |
| `README.md` | 📄 | Resumen del servidor y enlaces a esta documentación. |
| `uploads/json/` | ⏳ | Copias JSON de cada carga correcta. |
| `logs/` | ⏳ | Logs diarios (con `LOG_TO_FILE`). |
| `dist/` | ⏳ | Resultado de `npm run build`. |
