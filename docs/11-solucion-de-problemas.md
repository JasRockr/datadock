# 11. Solución de problemas

> Busca el síntoma. Cada entrada indica la causa probable, cómo confirmarla y cómo arreglarla.

## 11.1 Cómo investigar cualquier problema

1. **Terminal del servidor** (`[0]` en `npm run dev`): cada petición aparece como `[HTTP] GET /api/...` y luego su código de respuesta. Los errores salen en rojo (`[ERROR]`).
2. **Herramientas del navegador** (`F12`):
   - Pestaña **Console**: errores de JavaScript, CORS y CSP.
   - Pestaña **Network**: cada petición, su código y la respuesta. Haz clic en la petición → *Response*.
3. **Prueba la API sin el cliente** (`curl`, Postman o Swagger) para saber si el problema está en el servidor o en el cliente.

## 11.2 Instalación y arranque

| Síntoma | Causa | Solución |
| --- | --- | --- |
| `'nodemon' is not recognized` / `nodemon: command not found` | Dependencias del servidor sin instalar | `npm run ci-all` |
| `Cannot find module '@babel/...'` | Instalación incompleta | Borra `server/node_modules` y ejecuta `npm --prefix server ci` |
| `npm error code EBADENGINE` / "Unsupported engine" | Versión de Node inferior a 22 | Instala Node 22 ([02, sección 2.1](02-instalacion-y-entorno.md#21-requisitos)); con nvm: `nvm use` |
| `ENOENT ... esbuild.exe` al instalar (Windows) | Ruta del proyecto demasiado larga | Mueve el proyecto a una ruta corta (`C:\dev\DataDock`) o activa las rutas largas ([02, sección 2.3](02-instalacion-y-entorno.md#23-instalar-dependencias)) |
| `npm ci` falla con "package.json and package-lock.json are not in sync" | Alguien cambió `package.json` sin confirmar el lockfile | Ejecuta `npm install` en esa carpeta y confirma el `package-lock.json` resultante |
| Aparecen copias como `ExportData-NOMBRE-EQUIPO.jsx` o cambios que "se deshacen solos" | El proyecto está en una carpeta sincronizada (OneDrive, Dropbox…) que restaura versiones y crea copias de conflicto | Mueve el proyecto fuera de la carpeta sincronizada ([02, sección 2.1](02-instalacion-y-entorno.md#dónde-guardar-el-proyecto)). Para recuperar: compara la copia con el original, conserva la versión correcta y borra la otra |
| `EADDRINUSE: address already in use :::5128` | Otro proceso usa el puerto | [02, sección 2.9](02-instalacion-y-entorno.md#29-liberar-un-puerto-ocupado) |
| Vite arranca en `5174` en vez de `5173` | El puerto 5173 está ocupado | Usa la URL que muestra Vite, o libera el puerto |
| En Windows, `npm run dev` pregunta "¿Desea terminar el trabajo por lotes?" | Comportamiento normal de `Ctrl+C` en Windows | Responde `S` |

## 11.3 Base de datos

| Síntoma | Causa | Solución |
| --- | --- | --- |
| `500 ERR_DATABASE` "Failed to connect to ... in 30000ms" | SQL Server apagado, host o puerto incorrectos, o firewall | Revisa `DB_SERVER`/`DB_PORT` y que el contenedor esté encendido (`docker ps`). Prueba el puerto: `Test-NetConnection localhost -Port 1433` (PowerShell) o `nc -zv localhost 1433` (bash) |
| "Login failed for user" | Usuario o contraseña incorrectos | Revisa `DB_USER`/`DB_PASS` en `server/.env` y reinicia el servidor |
| "self signed certificate" / "certificate verify failed" | Certificado autofirmado | `DB_TRUST_SERVER_CERT=true` (y `DB_ENCRYPT=false` en un SQL Server local) |
| "Invalid object name 'asesores_api'" | La tabla no existe, o `TBL_ASESORES` / `DB_NAME` apuntan a otro sitio | Ejecuta la migración ([06, sección 6.2](06-base-de-datos.md#62-script-de-creación-de-la-tabla)) y revisa `DB_NAME` |
| "Invalid column name ..." | La tabla real no tiene alguna columna del `INSERT` | Compara con `EXEC sp_help 'dbo.asesores_api'` |
| En Docker, la API responde 500 y la base de datos está bien | Desde el contenedor, `localhost` es el propio contenedor | `DB_SERVER=host.docker.internal` en `server/.env` ([09, sección 9.3](09-docker-ci-y-despliegue.md#93-docker-composeyml)) |
| Cambié `server/.env` y no pasa nada | nodemon solo vigila `server/src/` | Reinicia el servidor (`Ctrl+C` y `npm run dev`) |
| `docker exec ... sqlcmd` falla en Git Bash con *"no such file or directory"* o *"the input device is not a TTY"* | Git Bash convierte las rutas `/opt/...` y no ofrece una terminal compatible con `-it` | Ejecuta `export MSYS_NO_PATHCONV=1` y usa `docker exec` sin `-it` ([02, sección 2.6](02-instalacion-y-entorno.md#26-base-de-datos-para-desarrollo)) |

## 11.4 Cliente y conexión con la API

| Síntoma | Causa | Solución |
| --- | --- | --- |
| Aviso amarillo "No se puede conectar al servidor" | `GET /health` no responde: el servidor está apagado o `VITE_API_URL` apunta a otro sitio | Abre <http://localhost:5128/health>. Si responde, revisa `VITE_API_URL` y la pestaña *Network* |
| La página Asesores muestra un error, pero no el aviso de conexión | El servidor responde, pero la base de datos falla | Abre <http://localhost:5128/api/asesores>: si da 500, revisa la sección 11.3 |
| Error de CORS en la consola ("blocked by CORS policy") | Servidor con `NODE_ENV` distinto de `development` y origen ausente de `CORS_ORIGIN` | Agrega el origen exacto (`http://localhost:5173`) a `CORS_ORIGIN`, o usa `NODE_ENV=development` en local |
| Error de CSP ("Refused to connect ... Content Security Policy") | Solo en Docker/nginx: la URL de la API no está en `connect-src` | Agrégala en `client/nginx/nginx.conf` y reconstruye la imagen |
| El cliente llama a `localhost` en producción | `VITE_API_URL` no estaba definida al compilar | Recompila con la variable ([03, sección 3.4](03-configuracion.md#34-configuración-del-cliente)); en el CI, define la variable de repositorio `VITE_API_URL` |
| Una fecha aparece un día antes | Se formateó con `new Date(valor).toLocaleDateString()` | Usa `formatDay` de `client/src/utils/dataProcessing.js` ([05, sección 5.10](05-frontend.md#fechas-y-zonas-horarias)) |
| Recargar `/upload` en producción da 404 | El servidor web no redirige las rutas a `index.html` | nginx ya lo hace (`try_files`); en Netlify, crea `client/public/_redirects` con la línea `/* /index.html 200` |
| Los filtros guardados desaparecieron | Se guardan en el `localStorage` del navegador | Son por navegador y por equipo; se pierden al borrar los datos de navegación |

## 11.5 Carga de archivos

| Síntoma / mensaje | Causa | Solución |
| --- | --- | --- |
| "Faltan columnas requeridas: ..." (en el navegador) | La cabecera no tiene esas columnas | Revisa la primera fila: nombres exactos (se admiten mayúsculas y espacios) |
| "Formato de archivo no admitido." | La extensión no es `.csv` | Guarda el archivo como CSV |
| "No se proporcionó ningún archivo." | El campo del formulario no se llama `file` | En Postman o curl, el campo debe llamarse `file` |
| `413` "El archivo es demasiado grande." | Supera `MAX_FILE_SIZE` | Divide el archivo o sube el límite ([10, sección 10.7](10-guias-de-cambio-y-escalado.md#107-cambiar-el-tamaño-máximo-de-archivo)) |
| Todas las filas fallan con "El campo ... es requerido" | El servidor tiene `CSV_DELIMITER` fijado y el archivo usa otro separador | Usa el separador configurado, o deja `CSV_DELIMITER` vacío para que se detecte |
| Una fila se parte en más columnas de las que tiene | Un valor contiene el separador (aunque vaya entre comillas) | Quita el separador del valor; limitación conocida ([12](12-problemas-conocidos.md)) |
| `ERR_TOO_MANY_ERRORS` | Más del 30 % de las filas son inválidas; no se guardó nada | Lee `details.errors`: cada error indica la fila (`index` + 2 = línea del archivo) y el motivo |
| "\"correo_contacto\" must be a valid email" | El correo no tiene un formato válido | Corrige el correo; se acepta cualquier dominio |
| "\"fecha_novedad\" must be a valid date" | La fecha no está en `AAAA-MM-DD` | Corrige el formato de la fecha |
| "\"fecha_novedad\" must be less than or equal to \"now\"" | La fecha es futura | Corrige la fecha |
| Tildes rotas (`JosÃ©`) en los datos guardados | Archivo en `latin1` leído como UTF-8 | Guarda como "CSV UTF-8" o usa `CSV_ENCODING=latin1` |
| La barra de progreso llega al 90 % y se queda ahí | La barra es simulada; el servidor sigue procesando | Espera; si no termina, revisa los logs del servidor |

## 11.6 Pruebas y lint

| Síntoma | Causa | Solución |
| --- | --- | --- |
| Las pruebas del servidor muestran `[ERROR] Database error` pero pasan | Fallos simulados a propósito | Es normal |
| `jest` no termina | Algún recurso quedó abierto (temporizadores, conexiones) | Ejecuta con `--detectOpenHandles` para ver cuál |
| Una prueba de fechas del cliente falla solo en una máquina | Se cambió o se quitó la zona horaria fija de `client/vite.config.js` | Mantén `test.env.TZ` en `America/Bogota` |
| El lint del cliente falla por una advertencia | `--max-warnings 0` | Corrige la advertencia (o desactívala en esa línea explicando por qué) |

Siguiente paso: [12-problemas-conocidos.md](12-problemas-conocidos.md).
