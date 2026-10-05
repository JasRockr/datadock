# 2. Instalación y entorno de desarrollo

> Objetivo: que al terminar este documento tengas el cliente en `http://localhost:5173` y el servidor en `http://localhost:5128` funcionando en tu máquina, uses Windows, macOS o Linux.

## 2.0 Cómo leer los comandos de esta guía

Cuando un comando cambia según el sistema, aparece en cada variante:

| Etiqueta | Dónde se escribe |
| --- | --- |
| **PowerShell** | Windows 10/11. Es la terminal por defecto de VS Code en Windows. |
| **CMD** | Windows, "Símbolo del sistema" (`cmd.exe`). |
| **bash / zsh** | macOS (Terminal), Linux, y también *Git Bash* o WSL en Windows. |

Si un comando no tiene etiqueta, **funciona igual en todos**. Los comandos `npm ...` son iguales en todos los sistemas.

> **Importante:** salvo que se indique otra cosa, los comandos se ejecutan **desde la carpeta raíz del proyecto** (la que contiene `client/`, `server/` y `docs/`). Para saber dónde estás: `pwd` (PowerShell, bash) o `cd` sin argumentos (CMD).

## 2.1 Requisitos

| Herramienta | Versión | Para qué | Cómo comprobarla |
| --- | --- | --- | --- |
| **Node.js** | **22 LTS** (fijada en `.nvmrc` y en `engines` de los `package.json`) | Ejecutar cliente, servidor y herramientas | `node -v` |
| **npm** | La que trae Node (10 u 11) | Instalar dependencias y ejecutar scripts | `npm -v` |
| **Git** | Cualquiera reciente | Descargar y versionar el código | `git --version` |
| **SQL Server** | 2019+ o Azure SQL | Guardar los asesores | ver sección 2.6 |
| **Docker Desktop** *(opcional)* | Reciente | SQL Server local y probar las imágenes | `docker --version` |
| **VS Code** *(recomendado)* | Reciente | Editor | — |

> Con una versión de Node inferior a 22, `npm` avisará al instalar desde la raíz (`engine-strict=true` en `.npmrc`).

### Instalar Node.js 22

**Windows (PowerShell):**

```powershell
winget install OpenJS.NodeJS.LTS
```

O descarga el instalador `.msi` "LTS" desde <https://nodejs.org>. **Cierra y vuelve a abrir la terminal** después de instalar.

**macOS (con Homebrew):**

```bash
brew install node@22
```

**Linux (Debian/Ubuntu), recomendado con `nvm`:**

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
# cierra y abre la terminal; en la carpeta del proyecto:
nvm install
nvm use
```

`nvm install` y `nvm use` sin número leen la versión de `.nvmrc`. En Windows existe **nvm-windows**, que necesita el número explícito: `nvm install 22` y luego `nvm use 22`.

### Dónde guardar el proyecto

Clónalo en una **ruta corta y fuera de carpetas sincronizadas** (OneDrive, Dropbox, Google Drive), por ejemplo `C:\dev\DataDock` o `~/dev/datadock`:

- La sincronización puede restaurar versiones anteriores de un archivo mientras lo editas y crear copias de conflicto (`Archivo-NOMBRE-EQUIPO.jsx`), y además tiene que subir miles de archivos de `node_modules/`.
- En Windows, las rutas de más de 260 caracteres rompen algunas instalaciones (ver 2.3).

### Extensiones de VS Code recomendadas

- **ESLint** (`dbaeumer.vscode-eslint`): marca en vivo los errores de estilo, con la misma configuración que el CI.
- **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`): autocompleta las clases CSS del cliente.
- **Markdown Preview Mermaid Support** (`bierner.markdown-mermaid`): dibuja los diagramas de esta documentación.
- **Code Spell Checker** (`streetsidesoftware.code-spell-checker`): el repositorio trae un diccionario de palabras en español en `.vscode/settings.json`.

## 2.2 Obtener el código

```bash
git clone <URL-DEL-REPOSITORIO> datadock
cd datadock
```

Pide la URL del repositorio a tu líder técnico. Si usas varias cuentas de GitHub en el mismo equipo, clona con tu alias SSH y configura la identidad de git solo para este repositorio ([09, sección 9.6](09-docker-ci-y-despliegue.md#96-configurar-el-repositorio-en-github-paso-a-paso)).

## 2.3 Instalar dependencias

Hay tres proyectos npm (raíz, `client/` y `server/`; ver [01, sección 1.5](01-vision-general-y-arquitectura.md#15-tres-packagejson-por-qué-y-para-qué)). Instálalos todos con:

```bash
npm run ci-all
```

- `ci-all` usa `npm ci`: instala **exactamente** las versiones de los `package-lock.json`. Es lo que usa el CI y lo **recomendado**.
- `npm run install-all` usa `npm install`: puede actualizar versiones menores y modificar los lockfiles. Úsalo solo cuando agregues o actualices dependencias a propósito.

Tarda unos minutos. Al terminar existen tres carpetas `node_modules/` (raíz, `client/` y `server/`).

> **Windows: error `ENOENT ... esbuild.exe` durante la instalación.** Ocurre cuando la ruta del proyecto es demasiado larga (Windows limita las rutas a 260 caracteres). Solución: mueve el proyecto a una ruta corta como `C:\dev\DataDock`, o activa las rutas largas desde PowerShell **como administrador** y reinicia el equipo:
>
> ```powershell
> New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
> ```

## 2.4 Crear el archivo de configuración del servidor (`server/.env`)

El servidor lee su configuración del archivo **`server/.env`**. Ese archivo **no está** en el repositorio (contiene contraseñas y está en `.gitignore`): se crea a partir de la plantilla `server/.env.example`.

**PowerShell:**

```powershell
Copy-Item server\.env.example server\.env
```

**CMD:**

```cmd
copy server\.env.example server\.env
```

**bash / zsh:**

```bash
cp server/.env.example server/.env
```

Abre `server/.env` y completa **como mínimo** los datos de la base de datos:

```ini
DB_SERVER=localhost
DB_PORT=1433
DB_NAME=<nombre de la base de datos>
DB_USER=<usuario de SQL Server>
DB_PASS=<contraseña>
```

La plantilla ya trae `DB_ENCRYPT=false` y `DB_TRUST_SERVER_CERT=true`, que es lo que necesita un SQL Server local o en Docker. Para Azure SQL, cámbialos a `true` y `false`. Cada variable está explicada en [03-configuracion.md](03-configuracion.md).

> **Nunca subas `server/.env` a git** ni lo compartas por chat. Si se sube por error, avisa: hay que cambiar la contraseña de la base de datos.

**El cliente no necesita configuración en desarrollo**: si no defines nada, apunta a `http://localhost:5128/api`. Si necesitas otra URL, copia `client/.env.example` como `client/.env.local` y edítala.

## 2.5 Arrancar el proyecto

### Opción A: cliente y servidor juntos (lo habitual)

```bash
npm run dev
```

Verás los mensajes de los dos procesos mezclados en la misma terminal:

- `[0]` es el **servidor** (nodemon + babel-node). Se reinicia solo al guardar un archivo de `server/src/`.
- `[1]` es el **cliente** (Vite). Recarga el navegador solo al guardar un archivo de `client/src/`.

Para detener ambos: `Ctrl + C` en esa terminal. En Windows puede preguntar *"¿Desea terminar el trabajo por lotes (S/N)?"*: responde `S`.

### Opción B: cada uno en su propia terminal (más fácil de leer)

Terminal 1:

```bash
npm run server
```

Terminal 2:

```bash
npm run client
```

## 2.6 Base de datos para desarrollo

Necesitas un SQL Server con la tabla `asesores_api`. Hay dos caminos.

### Camino 1: usar una base de datos compartida del equipo

Pide al líder técnico los datos de conexión (servidor, usuario, contraseña y base de datos) y ponlos en `server/.env`. La tabla ya debería existir.

### Camino 2: SQL Server local con Docker (independiente)

> **Git Bash en Windows:** antes de los comandos `docker exec` de esta sección ejecuta `export MSYS_NO_PATHCONV=1`. Sin eso, Git Bash convierte `/opt/mssql-tools18/...` en `C:/Program Files/Git/opt/...` y el comando falla con *"no such file or directory"*. En PowerShell, CMD, macOS y Linux no hace falta.

1. Arranca Docker Desktop.
2. Crea el contenedor. Elige una contraseña fuerte (mínimo 8 caracteres, con mayúsculas, minúsculas, números y un símbolo). El comando es igual en PowerShell, CMD y bash, y debe ir en una sola línea:

   ```bash
   docker run -d --name datadock-sql -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=Cambiar.Esto123" -p 1433:1433 mcr.microsoft.com/mssql/server:2022-latest
   ```

3. Espera unos 20 segundos y crea la base de datos:

   ```bash
   docker exec datadock-sql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "Cambiar.Esto123" -C -Q "CREATE DATABASE datadock"
   ```

4. Crea la tabla con el script versionado del repositorio, `server/database/migrations/001_crear_tabla_asesores_api.sql`:

   **PowerShell:**

   ```powershell
   Get-Content server\database\migrations\001_crear_tabla_asesores_api.sql | docker exec -i datadock-sql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "Cambiar.Esto123" -C -d datadock
   ```

   **CMD:**

   ```cmd
   type server\database\migrations\001_crear_tabla_asesores_api.sql | docker exec -i datadock-sql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "Cambiar.Esto123" -C -d datadock
   ```

   **bash / zsh:**

   ```bash
   docker exec -i datadock-sql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "Cambiar.Esto123" -C -d datadock < server/database/migrations/001_crear_tabla_asesores_api.sql
   ```

5. En `server/.env`:

   ```ini
   DB_SERVER=localhost
   DB_PORT=1433
   DB_NAME=datadock
   DB_USER=sa
   DB_PASS=Cambiar.Esto123
   DB_ENCRYPT=false
   DB_TRUST_SERVER_CERT=true
   ```

Para apagar y volver a encender el contenedor otro día: `docker stop datadock-sql` y `docker start datadock-sql`.

## 2.7 Comprobar que todo funciona

Con `npm run dev` en marcha, revisa en este orden:

| # | Qué abrir | Qué deberías ver | Si falla |
| --- | --- | --- | --- |
| 1 | <http://localhost:5128/health> | `{"status":"UP"}` | El servidor no arrancó: mira los mensajes `[0]` en la terminal. |
| 2 | <http://localhost:5128/api/asesores> | `{"status":"success","data":[...]}` | Error 500: problema con la base de datos (credenciales en `server/.env`, que SQL Server esté encendido, que exista la tabla). |
| 3 | <http://localhost:5128/api-docs> | La página de Swagger con los endpoints | Solo existe con `NODE_ENV=development` o `test`. |
| 4 | <http://localhost:5173> | La aplicación, en la página **Asesores** | Mira los mensajes `[1]` en la terminal. Si Vite dice que usa `5174`, el puerto 5173 estaba ocupado: abre ese otro puerto. |
| 5 | En la aplicación: **Cargar Archivo** y sube un CSV de prueba (cópialo del ejemplo de [07-api.md](07-api.md#72-post-apiupload)) | Alerta verde "¡Operación exitosa!" y el resumen | Ver [11-solucion-de-problemas.md](11-solucion-de-problemas.md). |

También puedes probar la API desde la terminal.

**PowerShell:**

```powershell
Invoke-RestMethod http://localhost:5128/health
```

**bash / zsh / CMD** (Windows 10+ incluye `curl`):

```bash
curl http://localhost:5128/health
```

## 2.8 Comandos del día a día

Todos se ejecutan desde la raíz.

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Cliente + servidor en modo desarrollo, con recarga automática |
| `npm run client` | Solo el cliente (Vite, puerto 5173) |
| `npm run server` | Solo el servidor (nodemon, puerto 5128) |
| `npm test` | Todas las pruebas: primero el servidor (Jest) y luego el cliente (Vitest) |
| `npm run test:server` / `npm run test:client` | Pruebas de una sola parte |
| `npm run lint` | Revisa el estilo del código en cliente y servidor |
| `npm run lint:fix` | Igual, pero corrige automáticamente lo que pueda |
| `npm run build` | Genera `server/dist/` (Babel) y `client/dist/` (Vite) |
| `npm start` | Arranca el servidor **ya compilado** (`server/dist`); antes ejecuta `npm run build` |
| `npm run ci-all` | Reinstala todo exactamente desde los lockfiles |

Para ejecutar un comando **solo en un subproyecto** sin cambiar de carpeta:

```bash
npm --prefix client run dev
npm --prefix server test -- --runInBand
```

## 2.9 Liberar un puerto ocupado

Si aparece `EADDRINUSE: address already in use :::5128`, otro proceso ya usa el puerto.

**PowerShell:**

```powershell
Get-NetTCPConnection -LocalPort 5128 | Select-Object OwningProcess
Stop-Process -Id <NUMERO_DEL_PROCESO>
```

**CMD:**

```cmd
netstat -ano | findstr :5128
taskkill /PID <NUMERO_DEL_PROCESO> /F
```

**bash / zsh:**

```bash
lsof -i :5128
kill <PID>
```

Casi siempre es un `npm run dev` anterior que quedó abierto en otra terminal.

Siguiente paso: [03-configuracion.md](03-configuracion.md).
