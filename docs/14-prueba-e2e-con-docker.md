# 14. Prueba de punta a punta (E2E) con Docker

> Cómo comprobar **todo el sistema funcionando junto** (navegador → API → SQL Server) en tu máquina, con una base de datos desechable. Incluye cómo levantarla, probarla, conectarse desde un gestor SQL, manipularla y eliminarla sin dejar restos.

Las pruebas automáticas (`npm test`) **simulan** la base de datos. Esta prueba usa un SQL Server real en Docker y hay que hacerla:

- antes de publicar una versión;
- después de cambiar el modelo, las consultas, la configuración de conexión, los Dockerfiles o `docker-compose.yml`;
- cuando una prueba automática pasa pero algo "no funciona en la aplicación".

## 14.1 Qué necesitas

| Herramienta | Para qué |
| --- | --- |
| **Docker Desktop** encendido | El contenedor de SQL Server y las imágenes del proyecto |
| El proyecto instalado (`npm run ci-all`) | Modo desarrollo (sección 14.5) |
| `curl` (incluido en Windows 10+, macOS y Linux) | Probar la API desde la terminal |
| Un gestor SQL (opcional) | Ver los datos (sección 14.4) |

Todo lo necesario para la prueba está versionado en la carpeta **`e2e/`**:

| Archivo | Contenido |
| --- | --- |
| `e2e/docker-compose.e2e.yml` | Sobrescritura de `docker-compose.yml` que conecta el servidor al contenedor de pruebas |
| `e2e/datos/01-validos.csv` | 2 filas válidas |
| `e2e/datos/02-valores-literales.csv` | Valores que deben guardarse tal cual: `0012345678`, `Si`, `Ventas 2`, `Asesor 1`, un correo `.edu.co` |
| `e2e/datos/03-separador-coma.csv` | 1 fila separada por comas |
| `e2e/datos/04-demasiados-errores.csv` | 1 fila válida y 2 inválidas (más del 30 %: no debe guardarse nada) |
| `e2e/datos/05-carga-parcial.csv` | 3 filas válidas y 1 con fecha inválida (carga parcial) |
| `e2e/datos/06-extension-invalida.txt` | Archivo con extensión no permitida |

**Datos del contenedor de pruebas** (se usan en toda la guía):

| Dato | Valor |
| --- | --- |
| Contenedor | `datadock-sql` |
| Servidor / puerto | `localhost` / `1433` |
| Usuario | `sa` |
| Contraseña | `Cambiar.Esto123` |
| Base de datos | `datadock` |

> Estas credenciales son **solo para este contenedor local**. No las uses en ningún otro entorno.

**Si usas Git Bash en Windows**, ejecuta esto una vez en la terminal antes de empezar. Sin esa variable, Git Bash convierte las rutas `/opt/...` y `/var/...` de los comandos `docker` en rutas de Windows y fallan:

```bash
export MSYS_NO_PATHCONV=1
```

Todos los comandos se ejecutan **desde la raíz del repositorio**.

## 14.2 Paso 1: levantar `datadock-sql`

1. Comprueba que no exista ya un contenedor con ese nombre ni algo usando el puerto 1433:

   ```bash
   docker ps -a --filter name=datadock-sql
   ```

   Si aparece, ve a la sección 14.9.2 (arrancarlo) o a la 14.10 (eliminarlo). Si el puerto 1433 está ocupado por otro SQL Server, usa otro puerto (sección 14.9.6).

2. Crea y arranca el contenedor (una sola línea; igual en PowerShell, CMD y bash):

   ```bash
   docker run -d --name datadock-sql -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=Cambiar.Esto123" -p 1433:1433 mcr.microsoft.com/mssql/server:2022-latest
   ```

   La primera vez descarga la imagen (unos 600 MB).

3. Espera a que SQL Server esté listo. Sigue sus logs hasta ver `SQL Server is now ready for client connections` y luego sal con `Ctrl+C` (el contenedor sigue funcionando):

   ```bash
   docker logs -f datadock-sql
   ```

## 14.3 Paso 2: crear la base de datos y la tabla

1. Crea la base de datos:

   ```bash
   docker exec datadock-sql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "Cambiar.Esto123" -C -Q "CREATE DATABASE datadock"
   ```

2. Ejecuta la migración de la tabla.

   **PowerShell:**

   ```powershell
   Get-Content server\database\migrations\001_crear_tabla_asesores_api.sql | docker exec -i datadock-sql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "Cambiar.Esto123" -C -d datadock
   ```

   **CMD:**

   ```cmd
   type server\database\migrations\001_crear_tabla_asesores_api.sql | docker exec -i datadock-sql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "Cambiar.Esto123" -C -d datadock
   ```

   **bash / zsh / Git Bash:**

   ```bash
   docker exec -i datadock-sql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "Cambiar.Esto123" -C -d datadock < server/database/migrations/001_crear_tabla_asesores_api.sql
   ```

   Ejecútala **dos veces**: la segunda tampoco debe dar error (la migración es idempotente).

3. Comprueba la estructura:

   ```bash
   docker exec datadock-sql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "Cambiar.Esto123" -C -d datadock -Q "SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'asesores_api' ORDER BY ORDINAL_POSITION"
   ```

   Deben aparecer las 11 columnas: `id`, `id_asesor`, …, `fecha_novedad` (`datetime`) y `usuario`.

## 14.4 Paso 3: conectarse con un gestor SQL (opcional)

Cualquier gestor que soporte SQL Server sirve. Los datos de conexión son siempre los mismos:

| Campo | Valor |
| --- | --- |
| Tipo / motor | Microsoft SQL Server |
| Servidor | `localhost` |
| Puerto | `1433` |
| Autenticación | SQL Server (usuario y contraseña), **no** Windows |
| Usuario / contraseña | `sa` / `Cambiar.Esto123` |
| Base de datos | `datadock` |
| Cifrado | Desactivado, o activado con **"confiar en el certificado del servidor"** (el contenedor usa un certificado autofirmado) |

### DBeaver (Windows, macOS, Linux)

1. *Base de datos → Nueva conexión* → **SQL Server** → *Siguiente*. Si pide descargar el driver, acepta.
2. Pestaña *Principal*: Host `localhost`, Puerto `1433`, Base de datos `datadock`, Autenticación *SQL Server Authentication*, Usuario `sa`, Contraseña `Cambiar.Esto123`.
3. Pestaña *Propiedades del driver*: `encrypt` = `false` y `trustServerCertificate` = `true`.
4. *Probar conexión* → *Finalizar*. La tabla está en `datadock → dbo → Tablas → asesores_api`.

### HeidiSQL (Windows)

1. *Nueva* sesión → Tipo de red: **Microsoft SQL Server (TCP/IP)**.
2. Nombre del host: `localhost`; Usuario `sa`; Contraseña `Cambiar.Esto123`; Puerto `1433`; Bases de datos: `datadock`.
3. *Abrir*. Si falla por el certificado, en *Biblioteca* elige otro proveedor (por ejemplo `SQLOLEDB`), o uno que permita confiar en el certificado del servidor.

### SQL Server Management Studio (Windows)

1. *Server name*: `localhost,1433` (con **coma**, no dos puntos).
2. *Authentication*: **SQL Server Authentication**, usuario `sa` y contraseña.
3. En *Encryption*, marca **Trust server certificate**.

### VS Code: extensión SQL Server (mssql)

1. Instala la extensión **SQL Server (mssql)** de Microsoft.
2. *Add Connection*: servidor `localhost`, puerto `1433`, base `datadock`, autenticación *SQL Login*, usuario `sa`, contraseña y **Trust server certificate** activado.

### Consultas útiles durante la prueba

```sql
-- ¿Qué se guardó?
SELECT TOP 50 * FROM dbo.asesores_api ORDER BY id DESC;

-- ¿Cuántas filas hay?
SELECT COUNT(*) AS filas FROM dbo.asesores_api;

-- ¿Se guardaron literalmente los valores sensibles?
SELECT id_asesor, nombre_asesor, equipo_entidad, rol_asesor, correo_contacto, celular_contacto
FROM dbo.asesores_api
WHERE id_asesor = '0012345678';

-- ¿Los opcionales vacíos quedaron como NULL?
SELECT id_asesor, correo_contacto, celular_contacto, observaciones
FROM dbo.asesores_api
WHERE correo_contacto IS NULL;
```

Sin gestor, desde la terminal:

```bash
docker exec datadock-sql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "Cambiar.Esto123" -C -d datadock -Q "SELECT COUNT(*) AS filas FROM dbo.asesores_api"
```

## 14.5 Paso 4 (modo A): cliente y servidor de desarrollo contra la base de prueba

> Para probar las **imágenes de producción** en lugar del modo desarrollo, usa el modo B (sección 14.8) y luego vuelve a los pasos 5 y 6.

El servidor lee `server/.env`, que apunta a *tu* base de desarrollo. Para no editarlo, define las variables de conexión **en la terminal**: dotenv no sobrescribe variables que ya existen, así que ganan las de la terminal.

**PowerShell** (las variables duran mientras la ventana esté abierta):

```powershell
$env:DB_SERVER="localhost"; $env:DB_PORT="1433"; $env:DB_NAME="datadock"; $env:DB_USER="sa"; $env:DB_PASS="Cambiar.Esto123"; $env:DB_ENCRYPT="false"; $env:DB_TRUST_SERVER_CERT="true"
npm run dev
```

**CMD:**

```cmd
set "DB_SERVER=localhost" && set "DB_PORT=1433" && set "DB_NAME=datadock" && set "DB_USER=sa" && set "DB_PASS=Cambiar.Esto123" && set "DB_ENCRYPT=false" && set "DB_TRUST_SERVER_CERT=true"
npm run dev
```

**bash / zsh / Git Bash** (solo para ese comando):

```bash
DB_SERVER=localhost DB_PORT=1433 DB_NAME=datadock DB_USER=sa DB_PASS=Cambiar.Esto123 DB_ENCRYPT=false DB_TRUST_SERVER_CERT=true npm run dev
```

Cuando termines, `Ctrl+C` detiene cliente y servidor. En PowerShell y CMD, **cierra esa terminal** para descartar las variables (o en PowerShell: `Remove-Item Env:DB_*`).

## 14.6 Paso 5: casos de prueba de la API

Con el servidor en marcha (modo A o modo B), abre **otra** terminal en la raíz del repositorio. En PowerShell escribe `curl.exe` en lugar de `curl`.

| # | Comando | Respuesta esperada | Comprobación en la base |
| --- | --- | --- | --- |
| 1 | `curl http://localhost:5128/health` | `{"status":"UP"}` | — |
| 2 | `curl -F "file=@e2e/datos/01-validos.csv" http://localhost:5128/api/upload` | `200`, `insertedRows: 2`, `errorsCount: 0` | 2 filas nuevas; en la de Luis Gómez, `correo_contacto`, `celular_contacto` y `observaciones` son `NULL` |
| 3 | `curl -F "file=@e2e/datos/02-valores-literales.csv" http://localhost:5128/api/upload` | `200`, `insertedRows: 1` | `0012345678`, `Si`, `Ventas 2`, `Asesor 1`, `0312345678` y el correo `.edu.co`, **exactamente** así |
| 4 | `curl -F "file=@e2e/datos/03-separador-coma.csv" http://localhost:5128/api/upload` | `200`, `insertedRows: 1` | Fila de Carla Ruiz |
| 5 | `curl -F "file=@e2e/datos/04-demasiados-errores.csv" http://localhost:5128/api/upload` | `400`, `ERR_TOO_MANY_ERRORS`, `errorsCount: 2` | **El número de filas no cambia** (cuéntalas antes y después) |
| 6 | `curl -F "file=@e2e/datos/05-carga-parcial.csv" http://localhost:5128/api/upload` | `200`, `insertedRows: 3`, `errorsCount: 1`, `hasErrors: true`; el error de `index: 0` dice `"fecha_novedad" must be a valid date` | 3 filas nuevas |
| 7 | `curl -F "file=@e2e/datos/06-extension-invalida.txt" http://localhost:5128/api/upload` | `400`, `ERR_FILE_VALIDATION`, "Formato de archivo no admitido." | Sin cambios |
| 8 | `curl http://localhost:5128/api/no-existe` | `404`, `ERR_NOT_FOUND`, "Ruta no encontrada - /api/no-existe" | — |
| 9 | `curl http://localhost:5128/api/asesores` | `200` con todas las filas; `fecha_novedad` como `2024-01-15T00:00:00.000Z` | Mismo número de filas que `SELECT COUNT(*)` |

**Caso 10 (archivo demasiado grande):** crea un archivo de 11 MB y súbelo. Espera `413 ERR_FILE_TOO_LARGE`.

**PowerShell:**

```powershell
New-Item -ItemType Directory -Force tmp | Out-Null
$f = New-Object byte[] 11534336; [IO.File]::WriteAllBytes("$PWD\tmp\grande.csv", $f)
curl.exe -F "file=@tmp/grande.csv" http://localhost:5128/api/upload
```

**bash / zsh / Git Bash:**

```bash
mkdir -p tmp && head -c 11534336 /dev/zero > tmp/grande.csv
curl -F "file=@tmp/grande.csv" http://localhost:5128/api/upload
```

Borra `tmp/grande.csv` al terminar.

> **Modo desarrollo:** las respuestas de error incluyen un campo `stack` con la traza. Es normal; en el modo B (producción) no aparece.

## 14.7 Paso 6: prueba de la interfaz

**Modo A:** abre <http://localhost:5173>. **Modo B:** abre <http://localhost>.

| # | Qué hacer | Qué debe pasar |
| --- | --- | --- |
| 1 | Abrir la aplicación | Página **Asesores** con las filas de la base. Sin aviso amarillo de conexión. |
| 2 | Revisar la fecha de Ana Pérez | **15/1/2024** (no 14/1/2024) |
| 3 | *Mostrar filtros* → Desde `15/01/2024`, Hasta `15/01/2024` | Solo aparece Ana Pérez (una vez por cada carga de `01-validos.csv`: no hay control de duplicados, ver [12, sección 12.1](12-problemas-conocidos.md#121-sin-control-de-duplicados)) |
| 4 | Buscar `ventas 2` en la búsqueda general | Aparece la fila de `0012345678` |
| 5 | *Exportar CSV* | Descarga `asesores.csv` con las filas filtradas, separadas por `;`. La fecha se exporta en formato ISO (`2024-03-10T00:00:00.000Z`), no como se ve en la tabla |
| 6 | *Cargar Archivo* → elegir `e2e/datos/01-validos.csv` → *Cargar Archivo* | Alerta "¡Operación exitosa!" y resumen "Total: 2, Insertados: 2" |
| 7 | Volver a *Asesores* | Aparecen las filas nuevas |
| 8 | Recargar la página estando en `/upload` (`F5`) | La página de carga vuelve a abrir (sin 404) |
| 9 | Abrir las herramientas del navegador (`F12`) → *Console* | **Sin errores en rojo** ni el aviso *Maximum update depth exceeded* |

## 14.8 Modo B: imágenes de producción con Docker Compose

1. Si el modo A está en marcha, detenlo (`Ctrl+C`): el modo B usa los mismos puertos (5128) y además el 80.
2. Construye y levanta las imágenes conectadas al contenedor de prueba:

   ```bash
   docker compose -f docker-compose.yml -f e2e/docker-compose.e2e.yml up --build -d
   ```

   `e2e/docker-compose.e2e.yml` sustituye las variables `DB_*` por las del contenedor de prueba (con `DB_SERVER=host.docker.internal`), así que **no se usa** la base de tu `server/.env`.

3. Espera a que ambos servicios estén sanos:

   ```bash
   docker compose -f docker-compose.yml -f e2e/docker-compose.e2e.yml ps
   ```

   La columna *STATUS* debe decir `(healthy)` en `server` y en `client` (tarda unos 30 s).

4. Repite los casos de la sección 14.6 y la interfaz de la 14.7 (en <http://localhost>).

5. Comprobaciones propias de producción:

   | Comando | Esperado |
   | --- | --- |
   | `curl -s -o /dev/null -w "%{http_code}" http://localhost:5128/api-docs` | `404` (Swagger apagado) |
   | `curl -s -o /dev/null -w "%{http_code}" -H "Origin: http://otro-sitio.example" http://localhost:5128/health` | `403` (CORS) |
   | `docker compose -f docker-compose.yml -f e2e/docker-compose.e2e.yml exec -T server whoami` | `node` (no `root`) |
   | `docker compose -f docker-compose.yml -f e2e/docker-compose.e2e.yml exec -T server ls -a /app` | Sin `.env` ni `src` |
   | `docker compose -f docker-compose.yml -f e2e/docker-compose.e2e.yml exec -T server ls uploads/json` | Una copia `.json` por cada carga correcta |

   En CMD, reemplaza las comillas simples por dobles si copias algún comando de otra terminal. En PowerShell escribe `curl.exe`.

6. Para detener el modo B y borrar su volumen de copias JSON:

   ```bash
   docker compose -f docker-compose.yml -f e2e/docker-compose.e2e.yml down -v
   ```

   Esto **no** toca `datadock-sql`, que es un contenedor independiente.

## 14.9 Manipular el contenedor de prueba

### 14.9.1 Ver su estado y sus logs

```bash
docker ps --filter name=datadock-sql
docker logs --tail 50 datadock-sql
```

### 14.9.2 Detenerlo y volver a arrancarlo

Los datos se conservan mientras no elimines el contenedor.

```bash
docker stop datadock-sql
docker start datadock-sql
```

Después de `docker start`, espera unos segundos a que acepte conexiones (sección 14.2, paso 3).

### 14.9.3 Abrir una consola SQL interactiva

Desde **PowerShell o CMD** (en Git Bash, antepón `winpty` al comando):

```bash
docker exec -it datadock-sql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "Cambiar.Esto123" -C -d datadock
```

Escribe cada consulta seguida de una línea con `GO` para ejecutarla, y `EXIT` para salir.

### 14.9.4 Vaciar los datos o empezar de cero

```bash
# Borrar todas las filas (conserva la tabla)
docker exec datadock-sql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "Cambiar.Esto123" -C -d datadock -Q "TRUNCATE TABLE dbo.asesores_api"

# Borrar la base completa (luego repite la sección 14.3)
docker exec datadock-sql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "Cambiar.Esto123" -C -Q "DROP DATABASE datadock"
```

Si `DROP DATABASE` dice que la base está en uso, detén primero el servidor de la aplicación (y cierra las conexiones de tu gestor SQL).

### 14.9.5 Respaldar y restaurar

Útil para guardar un conjunto de datos de prueba y volver a él.

```bash
# 1. Respaldo dentro del contenedor
docker exec datadock-sql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "Cambiar.Esto123" -C -Q "BACKUP DATABASE datadock TO DISK = N'/var/opt/mssql/data/datadock.bak' WITH INIT"

# 2. Copia del respaldo a tu equipo (carpeta tmp/, ignorada por git)
docker cp datadock-sql:/var/opt/mssql/data/datadock.bak tmp/datadock.bak

# 3. Restaurar (reemplaza la base actual por la del respaldo)
docker exec datadock-sql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "Cambiar.Esto123" -C -Q "RESTORE DATABASE datadock FROM DISK = N'/var/opt/mssql/data/datadock.bak' WITH REPLACE"
```

Para restaurar en un contenedor nuevo, primero copia el archivo hacia dentro: `docker cp tmp/datadock.bak datadock-sql:/var/opt/mssql/data/datadock.bak`.

### 14.9.6 Usar otro puerto (si el 1433 está ocupado)

Crea el contenedor publicando otro puerto de tu equipo, por ejemplo `14330`:

```bash
docker run -d --name datadock-sql -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=Cambiar.Esto123" -p 14330:1433 mcr.microsoft.com/mssql/server:2022-latest
```

Luego usa `14330` en todo lo que se conecta **desde tu equipo**:

- Modo A: `DB_PORT=14330`.
- Modo B: define `E2E_SQL_PORT=14330` antes de `docker compose` (PowerShell: `$env:E2E_SQL_PORT="14330"`; CMD: `set "E2E_SQL_PORT=14330"`; bash: `export E2E_SQL_PORT=14330`).
- Gestores SQL: puerto `14330` (en SSMS: `localhost,14330`).

Los comandos `docker exec ... sqlcmd -S localhost` **no cambian**: se ejecutan dentro del contenedor, donde SQL Server sigue en el 1433.

### 14.9.7 Conservar los datos aunque se elimine el contenedor

Por defecto, los datos viven dentro del contenedor y desaparecen con él. Para guardarlos en un volumen de Docker, créalo así (en lugar del comando del paso 1):

```bash
docker run -d --name datadock-sql -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=Cambiar.Esto123" -p 1433:1433 -v datadock-sql-data:/var/opt/mssql mcr.microsoft.com/mssql/server:2022-latest
```

Si eliminas el contenedor y lo vuelves a crear con el mismo `-v datadock-sql-data:/var/opt/mssql`, la base `datadock` sigue ahí.

## 14.10 Eliminar todo al terminar

1. Detén la aplicación: `Ctrl+C` en el modo A, o `docker compose -f docker-compose.yml -f e2e/docker-compose.e2e.yml down -v` en el modo B.
2. Elimina el contenedor de SQL Server (`-f` lo detiene si está encendido):

   ```bash
   docker rm -f datadock-sql
   ```

3. Si usaste un volumen (sección 14.9.7), elimínalo también:

   ```bash
   docker volume rm datadock-sql-data
   ```

4. Comprueba que no queda nada:

   ```bash
   docker ps -a --filter name=datadock
   docker volume ls --filter name=datadock
   ```

   Ambos listados deben salir vacíos (solo con los encabezados).

5. Opcional, para liberar espacio en disco (se volverán a descargar o construir la próxima vez):

   ```bash
   docker image rm datadock-server datadock-client
   docker image rm mcr.microsoft.com/mssql/server:2022-latest
   ```

6. Borra los archivos temporales de la prueba: `tmp/grande.csv` y `tmp/datadock.bak`.

## 14.11 Problemas frecuentes en la prueba E2E

| Síntoma | Causa | Solución |
| --- | --- | --- |
| `docker: Error response from daemon: Conflict. The container name "/datadock-sql" is already in use` | Ya existe un contenedor con ese nombre | `docker start datadock-sql` para reutilizarlo, o `docker rm -f datadock-sql` para empezar de cero |
| `Bind for 0.0.0.0:1433 failed: port is already allocated` | Otro SQL Server usa el puerto | Sección 14.9.6 |
| El contenedor se detiene solo a los pocos segundos | Contraseña que no cumple la política de SQL Server | `docker logs datadock-sql`; usa una contraseña de 8+ caracteres con mayúsculas, minúsculas, números y símbolo |
| `Login failed for user 'sa'` justo después de crearlo o de arrancarlo | SQL Server todavía está arrancando, o la base `datadock` se está recuperando (sobre todo con volumen) | Espera al mensaje `ready for client connections` (sección 14.2) y unos segundos más; reintenta |
| `Cannot open database "datadock"` | No se creó la base | Sección 14.3 |
| En Git Bash: *"no such file or directory"* con `C:/Program Files/Git/opt/...` | Conversión de rutas de Git Bash | `export MSYS_NO_PATHCONV=1` |
| En Git Bash: *"the input device is not a TTY"* | `docker exec -it` en Git Bash | Quita `-it` (no hace falta con `-Q`) o antepón `winpty` |
| Modo B: la API responde 500 y el modo A funciona | `host.docker.internal` no resuelve o el puerto no coincide | Revisa `E2E_SQL_PORT` y que el contenedor publique el puerto (`docker ps`) |
| Modo B: `Bind for 0.0.0.0:80 failed` | Otro programa usa el puerto 80 (IIS, otro nginx…) | Deténlo, o cambia `"80:80"` por `"8080:80"` en `docker-compose.yml` solo para la prueba (no lo confirmes) y abre <http://localhost:8080>; `e2e/docker-compose.e2e.yml` ya permite ese origen en CORS |
| El gestor SQL no conecta por el certificado | Cifrado obligatorio con certificado autofirmado | Desactiva el cifrado o marca "confiar en el certificado del servidor" (sección 14.4) |

Siguiente: vuelve al [índice de la documentación](README.md).
