# 3. Configuración: dónde y qué configurar

> Aquí está **cada** valor configurable del proyecto: en qué archivo va, qué hace y su valor por defecto. Cuando algo "no funcione como esperas", revisa primero esta página.

## 3.1 Mapa de configuración

| Qué quieres configurar | Dónde | Plantilla | Lo lee |
| --- | --- | --- | --- |
| Puerto, base de datos, CORS, límites de carga, CSV y logs del **servidor** | `server/.env` | `server/.env.example` | `server/src/config.js`, al arrancar |
| URL de la API que usa el **cliente** | `client/.env.local` (o variable de entorno al compilar) | `client/.env.example` | `client/src/config.js`, **al compilar** |
| Tamaño máximo, extensiones y columnas que valida el **cliente** | Código: `client/src/utils/fileValidator.js` y `client/src/config.js` | — | — |
| Versión de Node | `.nvmrc` y `engines` en los tres `package.json` | — | nvm, npm |
| Variables en Docker | `docker-compose.yml` (`env_file`, `environment`, `args`) y `server/Dockerfile` (`ENV`) | — | Los contenedores |
| Variables en CI/CD | GitHub → *Settings → Secrets and variables → Actions* | — | `.github/workflows/ci-cd.yml` |
| Cabeceras de seguridad y política CSP del cliente en producción | `client/nginx/nginx.conf` | — | nginx, dentro del contenedor del cliente |

## 3.2 Cómo carga el servidor su configuración

1. `server/src/config.js` ejecuta `dotenv.config()`, que lee el archivo `.env` de la **carpeta desde la que se arrancó el proceso** (`process.cwd()`).
   - `npm run dev` y `npm run server` desde la raíz hacen `cd server` antes de arrancar, así que se lee **`server/.env`**.
   - Si ejecutas `node dist/index.js` desde otra carpeta, **no** encontrará `server/.env`.
2. dotenv **no pisa** variables que ya existan en el sistema. Si defines `PORT` en la terminal o en Docker, gana esa.
3. `config.js` convierte los textos en números o booleanos y aplica los valores por defecto. **Todo el servidor lee la configuración a través de `config.js`**, nunca de `process.env` directamente (la única excepción es `NODE_ENV` en `utils/errorHandler.js`).
4. Los valores se leen **una sola vez, al arrancar**. Si cambias `server/.env`, **reinicia el servidor**: nodemon solo vigila los archivos `.js` y `.json` de `server/src/` (configuración `nodemonConfig` en `server/package.json`), no `.env`.

Formato del archivo `.env`: una variable por línea, `NOMBRE=valor`. Las líneas que empiezan con `#` son comentarios. No uses comillas salvo que el valor tenga espacios.

## 3.3 Variables del servidor (`server/.env`)

Todas estas variables están en `server/.env.example`; las opcionales aparecen comentadas con su valor por defecto.

### Servidor y entorno

| Variable | Por defecto | Qué hace |
| --- | --- | --- |
| `NODE_ENV` | `development` | Cambia el comportamiento global. `development`: Swagger activo, CORS abierto a cualquier origen, logs `debug`, las respuestas de error incluyen el *stack*. `production`: Swagger apagado, CORS restringido a `CORS_ORIGIN`, logs `info` escritos también a archivo. `test`: lo fija Jest. |
| `PORT` | `5128` | Puerto donde escucha Express. Si lo cambias, cambia también `VITE_API_URL` en el cliente ([10, sección 10.6](10-guias-de-cambio-y-escalado.md#106-cambiar-el-puerto-de-la-api)). |
| `HOST` | `127.0.0.1` | **Solo se usa para escribir URLs en los logs y en Swagger.** El servidor escucha en todas las interfaces sea cual sea este valor. En Docker vale `0.0.0.0`. |

### CORS (qué páginas web pueden llamar a la API)

| Variable | Por defecto | Qué hace |
| --- | --- | --- |
| `CORS_ENABLED` | `true` | Con `false` no se envían cabeceras CORS: el navegador bloqueará al cliente si está en otro puerto o dominio. |
| `CORS_ORIGIN` | `*` | Lista de orígenes permitidos, separados por comas: `http://localhost:5173,https://miapp.com`. **Solo se aplica cuando `NODE_ENV` no es `development`**; en desarrollo se permite cualquier origen. Un origen no permitido recibe `403 ERR_CORS`. |
| `CORS_METHODS` | `GET,POST,PUT,DELETE,OPTIONS` | Métodos HTTP permitidos desde otro origen. |
| `CORS_CREDENTIALS` | `true` | Con `true` se envía `Access-Control-Allow-Credentials` y el navegador puede mandar cookies o credenciales. |

> Un "origen" es `protocolo://dominio:puerto`, sin barra final. `http://localhost:5173` y `http://localhost:5174` son orígenes **distintos**.

### Base de datos

| Variable | Por defecto | Qué hace |
| --- | --- | --- |
| `DB_SERVER` | *(vacío)* | Host del SQL Server: `localhost`, una IP o `miservidor.database.windows.net`. Desde un contenedor Docker hacia tu máquina: `host.docker.internal`. |
| `DB_PORT` | `1433` | Puerto del SQL Server. |
| `DB_NAME` | *(vacío)* | Nombre de la base de datos. |
| `DB_USER` | *(vacío)* | Usuario de SQL Server (autenticación SQL, no de Windows). |
| `DB_PASS` (alias `DB_PASSWORD`) | *(vacío)* | Contraseña. |
| `DB_ENCRYPT` | `true` | Cifra la conexión (TLS). Azure SQL lo exige en `true`. En un SQL Server local sin certificado, `false`. |
| `DB_TRUST_SERVER_CERT` | `true` en desarrollo, `false` en producción | Acepta certificados autofirmados. Necesario con SQL Server local o en Docker. |
| `DB_CONN_TIMEOUT` (alias `DB_CONNECTION_TIMEOUT`) | `30000` ms | Cuánto esperar para conectarse. |
| `DB_REQ_TIMEOUT` (alias `DB_REQUEST_TIMEOUT`) | `30000` ms | Cuánto esperar por cada consulta. |
| `DB_POOL_MAX` | `10` | Máximo de conexiones abiertas a la vez. |
| `DB_POOL_MIN` | `0` | Mínimo de conexiones que se mantienen abiertas. |
| `DB_POOL_IDLE` (alias `DB_POOL_IDLE_TIMEOUT`) | `30000` ms | Tiempo que una conexión puede estar inactiva antes de cerrarse. |
| `TBL_ASESORES` | `asesores_api` | Nombre de la tabla que usan las consultas de `database/queries.js`. |

### Carga de archivos

| Variable | Por defecto | Qué hace |
| --- | --- | --- |
| `MAX_FILE_SIZE` (alias `UPLOAD_MAX_SIZE`) | `10485760` (10 MB) | Tamaño máximo en **bytes**. Si se supera: `413 ERR_FILE_TOO_LARGE`. Si lo cambias, cambia también el cliente ([10, sección 10.7](10-guias-de-cambio-y-escalado.md#107-cambiar-el-tamaño-máximo-de-archivo)). |
| `ALLOWED_EXTENSIONS` (alias `UPLOAD_ALLOWED_EXTENSIONS`) | `.csv` | Extensiones aceptadas, separadas por comas. Agregar otra no sirve de nada si el contenido no es CSV: el lector solo entiende CSV. |
| `UPLOAD_DIR` | `uploads` | Carpeta (relativa a `server/`) donde se guarda la copia JSON de cada carga, en `uploads/json/`. |
| `UPLOAD_CLEANUP_ENABLED` | `false` | Con `true`, al arrancar y luego cada `UPLOAD_CLEANUP_INTERVAL` horas se borran de `UPLOAD_DIR` los archivos más antiguos que `UPLOAD_RETENTION_DAYS`. |
| `UPLOAD_RETENTION_DAYS` | `30` | Días que se conservan los archivos antes de la limpieza. |
| `UPLOAD_CLEANUP_INTERVAL` | `24` | Cada cuántas horas se ejecuta la limpieza. |

### Lectura del CSV

| Variable | Por defecto | Qué hace |
| --- | --- | --- |
| `CSV_DELIMITER` | *(vacío = detectar)* | Separador de columnas. Si está vacío, se detecta en la cabecera entre `;`, `,`, tabulador y `\|`, con preferencia por `;`. Si lo defines, se usa siempre ese. |
| `CSV_ENCODING` | `utf-8` | Codificación del texto. Excel en Windows suele guardar "CSV (delimitado por comas)" en `latin1`: si ves tildes rotas (`JosÃ©`), usa `latin1` o guarda el archivo como "CSV UTF-8". |
| `SKIP_EMPTY_LINES` | `true` | Ignora las líneas vacías. |
| `CSV_HEADER_REQUIRED` | `true` | Exige que la primera fila tenga nombres de columna. |
| `CSV_TRIM_VALUES` | `true` | Quita los espacios al inicio y al final de cada valor. |

### Logs

| Variable | Por defecto | Qué hace |
| --- | --- | --- |
| `LOG_LEVEL` | `debug` (desarrollo) / `info` (producción) | Nivel mínimo que se muestra: `error` < `warn` < `info` < `http` < `debug` < `trace`. Con `info` se ocultan los logs `http` de cada petición. |
| `LOG_TO_FILE` | `false` (desarrollo) / `true` (producción) | Escribe también en `LOG_DIR/AAAA-MM-DD.log`. |
| `LOG_DIR` | `logs` | Carpeta de logs, relativa a `server/`. |

## 3.4 Configuración del cliente

### `VITE_API_URL`: a qué servidor llama el cliente

- Se lee en `client/src/config.js`. Si no está definida (o está vacía), se usa `http://localhost:5128/api`.
- Debe terminar en `/api` y no llevar barra final. A partir de ella se construyen:
  - `API_ENDPOINT_ASESORES` = `VITE_API_URL + /asesores`
  - `API_ENDPOINT_UPLOAD` = `VITE_API_URL + /upload`
  - `API_BASE` = `VITE_API_URL` sin `/api` (se usa para `GET /health`)
- **Se incrusta al compilar.** Vite reemplaza `import.meta.env.VITE_API_URL` por el texto literal durante `npm run build`. Cambiarla *después* de compilar no tiene efecto: hay que volver a compilar.
- Solo las variables que empiezan con `VITE_` llegan al navegador. **Nunca pongas secretos en variables `VITE_`**: cualquiera puede leerlas.

**En desarrollo:** copia la plantilla y edítala (git ignora `*.local`).

**PowerShell:**

```powershell
Copy-Item client\.env.example client\.env.local
```

**CMD:**

```cmd
copy client\.env.example client\.env.local
```

**bash / zsh:**

```bash
cp client/.env.example client/.env.local
```

**Solo para un build concreto:**

**PowerShell:**

```powershell
$env:VITE_API_URL = "https://api.midominio.com/api"; npm --prefix client run build
```

**CMD:**

```cmd
set "VITE_API_URL=https://api.midominio.com/api" && npm --prefix client run build
```

(Las comillas alrededor de `NOMBRE=valor` evitan que CMD agregue un espacio al final del valor.)

**bash / zsh:**

```bash
VITE_API_URL=https://api.midominio.com/api npm --prefix client run build
```

En Docker se pasa como `args: VITE_API_URL` en `docker-compose.yml`, y en el CI como la variable de repositorio `VITE_API_URL` (ver [09-docker-ci-y-despliegue.md](09-docker-ci-y-despliegue.md)).

### Valores fijos en el código del cliente

| Valor | Archivo | Qué controla |
| --- | --- | --- |
| `ALLOWED_EXTENSIONS = ['.csv']` | `client/src/config.js` | Extensiones que acepta el selector de archivos |
| `MAX_FILE_SIZE = 10 MB` | `client/src/utils/fileValidator.js` | Tamaño máximo que se valida en el navegador |
| `REQUIRED_FIELDS` | `client/src/utils/fileValidator.js` | Columnas obligatorias que se revisan antes de enviar |
| `DEFAULT_CACHE_TTL = 5 min` | `client/src/services/cacheService.js` | Cuánto tiempo se reutiliza la lista de asesores sin volver a pedirla |
| `STORAGE_KEY = 'datadock.savedFilters'` | `client/src/components/asesores/SavedFilters.jsx` | Clave de `localStorage` donde se guardan los filtros del usuario |
| Puerto de Vite `5173` | Valor por defecto de Vite | Se puede fijar agregando `server: { port: 5173, strictPort: true }` en `client/vite.config.js` |

> **Regla de mantenimiento:** el tamaño máximo, las extensiones y las columnas obligatorias existen **dos veces**: en el cliente y en el servidor. Si cambias una, cambia la otra. La fuente de verdad es el **servidor**.

## 3.5 Puertos del proyecto

| Puerto | Quién | Dónde se cambia |
| --- | --- | --- |
| `5173` | Vite (cliente en desarrollo) | `client/vite.config.js` (`server.port`) |
| `5128` | Express (API) | `PORT` en `server/.env`; `server/Dockerfile` (`ENV PORT` y `EXPOSE`); `docker-compose.yml` (`ports`, `PORT` y la URL del `healthcheck`); valor por defecto en `server/src/config.js`; `VITE_API_URL` del cliente; `connect-src` en `client/nginx/nginx.conf` |
| `80` | nginx (cliente en Docker) | `client/Dockerfile` y `docker-compose.yml` |
| `1433` | SQL Server | `DB_PORT` |

## 3.6 Archivos de configuración de herramientas

| Archivo | Herramienta | Qué configura |
| --- | --- | --- |
| `.nvmrc` | nvm | Versión de Node del proyecto (22). |
| `.npmrc` (raíz) | npm | `engine-strict` (rechaza versiones de Node fuera de `engines`) y `save-exact` para los comandos ejecutados en la raíz. |
| `server/.babelrc` | Babel | Traduce `import/export` y la sintaxis moderna para Node (`preset-env`) y reutiliza funciones auxiliares (`transform-runtime`, que requiere `@babel/runtime` en producción). |
| `server/.eslintrc.cjs` / `client/.eslintrc.cjs` | ESLint | Reglas de estilo y de errores. |
| `client/vite.config.js` | Vite + Vitest | Plugin de React (SWC), alias `@` → `client/src`, entorno de pruebas `jsdom` y zona horaria fija (`America/Bogota`) para las pruebas. |
| `client/tailwind.config.js` | Tailwind | Qué archivos escanear para generar clases, y la animación `fadeIn`. |
| `client/postcss.config.js` | PostCSS | Aplica Tailwind y Autoprefixer al CSS. |
| `.gitignore`, `client/.gitignore`, `server/.gitignore` | git | Qué no se versiona (`node_modules`, `.env`, `dist`, `uploads`, `tmp`…). |
| `client/.dockerignore`, `server/.dockerignore` | Docker | Qué no se copia a las imágenes (`node_modules`, `.env`, `dist`…). |
| `.vscode/settings.json` | VS Code | Diccionario del corrector ortográfico. |

Siguiente paso: [04-backend.md](04-backend.md).
