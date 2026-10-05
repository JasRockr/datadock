# 4. Backend (`server/`) en detalle

> Recorrido por **cada archivo del servidor**, en el orden en que se ejecutan. Para cada uno: qué es, cómo funciona, de quién depende, quién lo usa y cómo modificarlo sin romper nada.

## 4.1 Tecnologías

| Paquete | Versión | Para qué |
| --- | --- | --- |
| `express` | 4.19 | Framework HTTP: rutas, middlewares, respuestas |
| `mssql` | 12.7 | Cliente de SQL Server (usa el protocolo TDS a través de `tedious`) |
| `multer` | 1.4.5-lts | Recibe archivos enviados como `multipart/form-data` |
| `joi` | 17.13 | Valida la forma de los datos (reglas por campo) |
| `cors` | 2.8 | Añade las cabeceras CORS |
| `dotenv` | 16 | Carga `server/.env` en `process.env` |
| `swagger-jsdoc` + `swagger-ui-express` | 6 / 5 | Página de documentación interactiva en `/api-docs` |
| `@babel/runtime` | 7 | Funciones auxiliares que necesita el código compilado en `dist/` |
| *desarrollo:* `nodemon`, `@babel/node`, `@babel/cli`, `jest`, `supertest`, `eslint` | — | Recarga en desarrollo, compilación, pruebas y estilo |

### ¿Por qué Babel?

El código usa `import`/`export` (módulos ES), pero `server/package.json` **no** declara `"type": "module"`. Babel traduce ese código a CommonJS (`require`):

- En desarrollo, `babel-node` traduce al vuelo: `nodemon src/index.js --exec babel-node`. nodemon reinicia el servidor al guardar cambios **solo en `src/`** (`nodemonConfig` en `server/package.json`): los archivos que la aplicación escribe en `uploads/` y `logs/` no lo reinician.
- En producción, `npm run build` genera `server/dist/` una vez y `npm start` ejecuta `node dist`.
- Jest usa `babel-jest` automáticamente gracias a `server/.babelrc`.

## 4.2 Estructura de `server/`

```text
server/
├── src/
│   ├── index.js                          ← 1. Punto de entrada: arranca el proceso
│   ├── app.js                            ← 2. Construye la aplicación Express
│   ├── config.js                         ← Configuración central (lee .env)
│   ├── routes/
│   │   └── health.routes.js              ← /, /api, /status-server, /health
│   ├── domains/
│   │   └── asesores/                     ← Todo lo específico de "asesores"
│   │       ├── routes/asesores.routes.js ← /api/asesores, /api/upload (+ documentación Swagger)
│   │       ├── controllers/asesores.controller.js
│   │       └── models/asesor.model.js    ← Tipos, limpieza y validación de un asesor
│   ├── middlewares/
│   │   ├── requestLogger.middleware.js   ← Registra cada petición
│   │   └── uploadHandler.middleware.js   ← Recibe el archivo y lo convierte en filas
│   ├── database/
│   │   ├── connection.js                 ← Pool de conexiones a SQL Server
│   │   ├── queries.js                    ← Textos SQL
│   │   └── index.js                      ← Reexporta los dos anteriores
│   └── utils/
│       ├── errorHandler.js               ← Clases de error y respuesta de error estándar
│       ├── logger.js                     ← Logs con niveles y colores
│       ├── fileUpload.js                 ← Configuración de Multer
│       ├── fileUtils.js                  ← Funciones de archivos y carpetas
│       ├── csvHandler.js                 ← Lector de CSV
│       ├── dataUtils.js                  ← Conversión de tipos y mapeo de campos
│       ├── fileCleanup.js                ← Borrado programado de archivos antiguos
│       └── swagger.js                    ← Documentación /api-docs
├── database/migrations/                  ← Scripts SQL versionados (ver 06)
├── __tests__/                            ← Pruebas (ver 08)
├── .babelrc  .eslintrc.cjs  .env.example  .gitignore  .dockerignore
├── Dockerfile
└── package.json  package-lock.json
```

## 4.3 Orden de ejecución al arrancar

```text
npm run server
 └─ cd server && npm run dev
     └─ nodemon src/index.js --exec babel-node
         └─ index.js
             ├─ import app.js
             │    ├─ import config.js   → lee server/.env
             │    ├─ import logger.js
             │    ├─ import swagger.js  → genera la especificación OpenAPI
             │    └─ import rutas → controladores → modelo, database, utils
             ├─ import database/connection.js (NO conecta todavía)
             ├─ si UPLOAD_CLEANUP_ENABLED → scheduleFileCleanup()
             └─ app.listen(PORT)
```

**La conexión a SQL Server es perezosa:** no se abre al arrancar, sino con la **primera petición** que la necesita. Por eso el servidor arranca aunque la base de datos esté caída.

## 4.4 Archivo por archivo

### `src/index.js`: punto de entrada

- **Qué hace:** importa la aplicación, programa la limpieza de archivos si está activada y llama a `app.listen(puerto)`.
- **Por qué está separado de `app.js`:** las pruebas importan `app.js` directamente y usan Supertest **sin abrir un puerto real**. Nunca pongas `app.listen` dentro de `app.js`.
- **Cuándo tocarlo:** para agregar tareas de arranque (por ejemplo, comprobar la base de datos al iniciar) o un cierre ordenado (`process.on('SIGTERM', ...)` + `closeConnection()`).

### `src/config.js`: configuración central

- **Qué hace:** carga `server/.env`, calcula `isDev`, `isProd` e `isTest` y exporta un objeto con estas secciones: `app`, `server` (puerto y CORS), `database` (conexión, `options` y `pool`), `upload`, `csvProcessing`, `tables` y `logging`.
- **Regla:** ningún otro archivo debe leer `process.env` directamente; todos hacen `import config from '../config.js'`.
- **Cómo agregar una variable nueva:**
  1. Agrégala en la sección que corresponda, con valor por defecto y la conversión adecuada: `parseInt(process.env.X) || 10`, o `process.env.X === 'true'` para booleanos.
  2. Documéntala en `server/.env.example` y en [03-configuracion.md](03-configuracion.md).
  3. Úsala con `config.seccion.nombre`.
  4. **No declares variables que el código no use**: confunden a quien configura el sistema.

### `src/app.js`: la aplicación Express

Registra los middlewares **en este orden, y el orden importa**:

| # | Middleware | Qué hace |
| --- | --- | --- |
| 1 | `cors(corsOptions)` (si `CORS_ENABLED`) | En desarrollo acepta cualquier origen. En otro entorno, solo los de `CORS_ORIGIN`; los demás reciben `403 ERR_CORS`. Las peticiones sin cabecera `Origin` (curl, Postman, el propio servidor) siempre pasan. `methods` y `credentials` salen de `config.server.cors`. |
| 2 | `requestLogger` | Registra la petición y, al terminar, su código y su duración. |
| 3 | `express.json()` / `express.urlencoded()` | Interpretan cuerpos JSON o de formulario simple. **No** interpretan `multipart/form-data`: de eso se encarga Multer en la ruta de carga. |
| 4 | `setupSwagger(app)` (solo en desarrollo y pruebas) | Monta `/api-docs` y `/api-docs.json`. |
| 5 | `healthRoutes` | `/`, `/api`, `/status-server`, `/health` |
| 6 | `'/api/'` + `asesoresRoutes` | `/api/asesores`, `/api/upload` |
| 7 | `app.use('*')` | Cualquier ruta no reconocida → error `404 ERR_NOT_FOUND` |
| 8 | `errorMiddleware` | **Siempre el último.** Convierte cualquier error en la respuesta JSON estándar. |

**Cómo agregar un grupo de rutas:** impórtalo y regístralo **antes** del paso 7; si va después, nunca se alcanza, porque el 404 lo intercepta primero.

### `src/routes/health.routes.js`: estado del servidor

| Ruta | Respuesta | Quién la usa |
| --- | --- | --- |
| `GET /` | `{status:'success', message:'Server is running'}` | Comprobación manual |
| `GET /api` | `{message:'Welcome to Api!'}` | Comprobación manual |
| `GET /status-server` | `{message:'Server Online ...'}` | **Healthcheck de Docker** (`docker-compose.yml` y `server/Dockerfile`) |
| `GET /health` | `{status:'UP'}` | **Chequeo de conectividad del cliente** y monitores |

Ninguna consulta la base de datos. No cambies `/status-server` ni `/health` sin actualizar a quienes las usan.

### `src/domains/asesores/routes/asesores.routes.js`

```js
router.get('/asesores', getAllAsesores);
router.post('/upload', uploadFile, processFile, uploadAsesores);
```

- Se montan bajo `/api/`: las URLs finales son `/api/asesores` y `/api/upload`.
- En `POST /upload` se ejecutan **tres funciones en cadena**: si una responde o llama a `next(error)`, las siguientes no se ejecutan.
- Encima de cada ruta hay un comentario `@swagger` que alimenta `/api-docs`. **Si cambias una ruta, actualiza su comentario.**

### `src/middlewares/uploadHandler.middleware.js`

**`uploadFile(req, res, next)`:**

1. Ejecuta `upload.single('file')` (Multer): lee del cuerpo *multipart* el campo llamado exactamente **`file`** y lo deja en `req.file`, con `buffer` (el contenido), `originalname`, `mimetype` y `size`.
2. Si el archivo supera `MAX_FILE_SIZE` → `next(AppError 413 ERR_FILE_TOO_LARGE)`.
3. Cualquier otro error de Multer (por ejemplo, un campo con otro nombre) → `next(FileValidationError 400)`.

**`processFile(req, res, next)`:**

1. Sin `req.file` → `400 ERR_FILE_VALIDATION` "No se proporcionó ningún archivo."
2. Extensión no permitida (`hasValidExtension`) → `400` "Formato de archivo no admitido."
3. Llama a `processCsvFile(file)` y guarda el resultado en **`req.dataRows`**.
4. Si el CSV está vacío o mal formado (`FileProcessingError`) → lo convierte en `400` con el motivo real.

**Patrón importante:** los middlewares **no** responden directamente con `res.status(...).json(...)`. Llaman a `next(error)` y dejan que `errorMiddleware` arme la respuesta. Así todos los errores tienen la misma forma.

### `src/utils/fileUpload.js`

```js
multer({ storage: multer.memoryStorage(), limits: { fileSize: config.upload.maxFileSize } })
```

**Almacenamiento en memoria:** el archivo nunca se escribe en disco; se procesa desde la RAM. Es simple y seguro, pero cada carga ocupa su tamaño en la memoria del servidor. Con 10 MB por archivo no es un problema.

### `src/utils/csvHandler.js`

**`processCsvFile(file, options)`** convierte el contenido en `[{columna: 'valor', ...}, ...]`:

1. Lee `file.buffer` (o `file.path`, si algún día se usa disco) como texto con `CSV_ENCODING`.
2. Quita el BOM (carácter invisible que Excel pone al inicio de los archivos UTF-8).
3. Separa las líneas (`\n` o `\r\n`).
4. **Separador:** si `CSV_DELIMITER` (u `options.delimiter`) tiene valor, usa ese; si no, `detectDelimiter()` elige entre `;`, `,`, tabulador y `|` según cuántos campos produce cada uno en la cabecera, con preferencia por `;`.
5. **Cabecera:** cada nombre sin comillas, sin espacios en los bordes, en **minúsculas** y con los espacios convertidos en `_`. `"Nombre Asesor"` → `nombre_asesor`.
6. **Filas:** cada línea se separa por el delimitador y a cada valor se le quitan las comillas y los espacios de los bordes.
7. **Todos los valores quedan como texto.** El lector no adivina tipos: `"0012345678"`, `"Ventas 2"` o `"Si"` llegan intactos. Qué campo es fecha o número lo decide el esquema de mapeo del dominio (ver `asesor.model.js`).
8. Omite las filas completamente vacías. Si no queda ninguna → `FileProcessingError` "No se encontraron filas de datos válidas".

**Limitación conocida:** no soporta valores que contengan el separador dentro de comillas (`"Pérez; Juan"` se parte en dos columnas). Ver [12](12-problemas-conocidos.md).

**`writeObjectsToCsv(data, ruta, options)`:** escribe objetos a un CSV en disco. Hoy no lo usa ninguna ruta.

### `src/utils/dataUtils.js`

- **`cleanString(v)`:** quita los espacios de los bordes y colapsa los espacios internos repetidos.
- **`convertDataType(v, tipo)`:** convierte a `string`, `number`, `date`, `boolean` o `auto`. Con `date`, un texto que no es una fecha válida devuelve `null`.
- **`mapDataToSchema(fila, esquema)`:** construye un objeto nuevo siguiendo el esquema. Por cada campo destino entiende estas claves:

  | Clave | Qué hace |
  | --- | --- |
  | `source` | Columna de origen (o una función `(fila) => valor`) |
  | `type` | Tipo al que se convierte: `string`, `number`, `date`, `boolean`, `auto` |
  | `required` | Si es `true` y el valor está vacío, se registra el error "El campo X es requerido" |
  | `default` (alias `defaultValue`) | Valor, o función que lo calcula, para cuando el origen está vacío |
  | `transform` | Función que se aplica **después** de convertir el tipo |

  Si hay errores, lanza `FileProcessingError` con un mensaje que nombra los campos: `Error en la validación de datos: El campo usuario es requerido`.
- **`validateDataWithSchema`**, **`transformDataArray`:** disponibles, sin uso actual.

### `src/domains/asesores/models/asesor.model.js`: el modelo Asesor

Es la **fuente de verdad** de qué es un asesor válido. Tiene tres partes.

**1. `asesorValidationSchema` (Joi), las reglas por campo:**

| Campo | Obligatorio | Regla |
| --- | --- | --- |
| `id_asesor` | Sí | Texto de 7 a 255 caracteres, o entero positivo |
| `nombre_asesor` | Sí | Texto de 1 a 255 caracteres |
| `equipo_entidad` | Sí | Texto de 1 a 255 caracteres |
| `compania` | Sí | Texto de 1 a 255 caracteres |
| `correo_contacto` | No | Email con formato válido y **cualquier dominio** (`.com`, `.co`, `.edu.co`…); admite vacío o `null` |
| `celular_contacto` | No | Solo dígitos, de 1 a 10; admite vacío o `null` |
| `rol_asesor` | No | Texto; admite vacío o `null` |
| `observaciones` | No | Texto; admite vacío o `null` |
| `fecha_novedad` | No | Fecha válida y no futura. Si viene vacía se usa la fecha actual; si viene con un valor que no es fecha, **la fila se rechaza** |
| `usuario` | Sí | Texto de 3 caracteres o más |

`.unknown(true)`: se aceptan columnas adicionales, pero no se guardan.

**2. `asesorMappingSchema`, cómo pasar de una fila del CSV a un asesor:**

- Todos los campos son `type: 'string'` salvo `fecha_novedad`, que es `type: 'date'` con `default: () => new Date()`.
- Los opcionales tienen `transform: value => value || null`: una celda vacía se guarda como `NULL` en la base de datos.
- `id_asesor` tiene `transform` con `cleanString` para normalizar espacios.

**3. `class Asesor`:**

- `constructor(data)`: copia los 10 campos. Si `fecha_novedad` no viene (`undefined`), usa la fecha actual; si viene `null`, la conserva para que la validación la rechace.
- `sanitize()`: aplica `cleanString` a todos los campos de texto.
- `validate()`: valida con Joi y devuelve **todos** los errores (`abortEarly: false`).
- `toDatabase()`: devuelve solo los 10 campos que van a la tabla.

**Cómo agregar un campo:** receta paso a paso en [10-guias-de-cambio-y-escalado.md](10-guias-de-cambio-y-escalado.md#101-agregar-una-columna-nueva-al-asesor).

### `src/domains/asesores/controllers/asesores.controller.js`

**`getAllAsesores`** (`GET /api/asesores`):

1. `getConnection()` → `SELECT * FROM asesores_api`.
2. Cada fila se envuelve en `new Asesor(fila)`: la respuesta lleva solo los 10 campos del modelo.
3. Responde `{status:'success', data:[...]}`.

**`uploadAsesores`** (`POST /api/upload`, después de los middlewares):

1. Si `req.dataRows` está vacío → `400 ERR_NO_DATA`.
2. Abre una **transacción** (`new sql.Transaction(pool)` + `begin()`).
3. Para **cada fila**, dentro de su propio `try`:
   1. `mapDataToSchema(fila, asesorMappingSchema)` → objeto con los 10 campos ya tipados.
   2. `new Asesor(...)` → `sanitize()` → `validate()`. Si no es válido, lanza un error.
   3. `toDatabase()` y, por cada campo, `request.input(campo, tipoSQL, valor)`. El tipo SQL se elige según el valor: `Date` → `DateTime`, número → `Float`, booleano → `Bit`, lo demás (texto y `null`) → `VarChar`.
   4. `INSERT`. Si funciona, suma a `insertedCount`; si falla, guarda `{index, row, error}` en `errorDetails`.
4. **Umbral del 30 %:** si `errores / filas > 0.3` → `rollback` y `400 ERR_TOO_MANY_ERRORS` con los primeros 10 errores. **No queda guardada ninguna fila.**
5. Si no → `commit`. Las filas válidas quedan guardadas **aunque haya errores** (hasta el 30 %).
6. `saveAsJson(nombre, filas)` escribe `uploads/json/<nombre>_<timestamp>.json` con las filas **tal como se leyeron** (antes de validar).
7. Responde `200` con `totalRows`, `insertedRows`, `errorsCount`, `hasErrors` y los primeros 10 errores.

**Para quien mantiene este código:**

- El `index` de cada error empieza en **0** y no cuenta la cabecera: el error `index: 0` corresponde a la **línea 2** del archivo.
- No hay control de duplicados: cargar dos veces el mismo archivo inserta todo dos veces.
- Las filas se insertan **una por una**; con archivos grandes es lento (ver [10](10-guias-de-cambio-y-escalado.md)).
- El umbral `0.3` está fijo en el código (`errorThreshold`). Para hacerlo configurable, pásalo a `config.js`.

### `src/database/connection.js`: conexión a SQL Server

- **`getConnection()`:** devuelve un **pool de conexiones** reutilizable (`globalPool`). La primera vez se conecta con `sql.connect(dbSettings)`, lo comprueba con `SELECT 1` y lo guarda. Las siguientes veces devuelve el mismo pool. Si falla, lanza `DatabaseError` (500).
- **`dbSettings`** se construye desde `config.database`: servidor, puerto, credenciales, `options` (cifrado y tiempos de espera) y `pool` (`DB_POOL_*`).
- **`closeConnection()`:** cierra el pool. Hoy nadie la llama.
- **`executeTransaction(callback)`:** ayuda para ejecutar varias operaciones en una transacción. Hoy no se usa: el controlador maneja su transacción a mano.
- **`sql`:** se reexporta el módulo `mssql` para crear `sql.Transaction`, `sql.Request` y los tipos (`sql.VarChar`…).

> **¿Qué es un pool?** Abrir una conexión a SQL Server es lento. Un *pool* mantiene varias conexiones abiertas y las presta a cada petición; así no se abre una conexión nueva por cada consulta.

### `src/database/queries.js`: consultas SQL

Objeto `queriesAsesores` con el texto de cada consulta. El nombre de la tabla sale de `TBL_ASESORES`.

| Clave | SQL | ¿Se usa? |
| --- | --- | --- |
| `getAllAsesores` | `SELECT * FROM asesores_api` | Sí: `GET /api/asesores` |
| `addNewAsesor` | `INSERT ... VALUES (@id_asesor, @nombre_asesor, ...)` | Sí: `POST /api/upload` |
| `getAsesorById`, `deleteAsesor`, `updateAsesorById`, `getTotalAsesores` | — | No: preparadas para endpoints futuros. Usan la columna `id` (clave primaria). |

- **Parámetros (`@nombre`):** los valores **nunca** se pegan dentro del texto SQL; se envían aparte con `request.input('nombre', tipo, valor)`. Eso previene la **inyección SQL**. Mantén siempre esta práctica.
- El nombre de la tabla sí se inserta en el texto con `${...}`. Viene de la configuración y no del usuario, así que es seguro; pero **nunca** construyas SQL con datos que envía el usuario.

### `src/database/index.js`

Solo reexporta `connection.js` y `queriesAsesores`. Permite escribir `import { getConnection, sql, queriesAsesores } from '../../../database/index.js'`.

### `src/utils/errorHandler.js`: errores estándar

**Clases de error** (todas heredan de `AppError(message, statusCode, errorCode, details)`):

| Clase | HTTP | `code` | Cuándo usarla |
| --- | --- | --- | --- |
| `AppError` | la que indiques | el que indiques | Casos puntuales (404, 413, 403…) |
| `FileValidationError` | 400 | `ERR_FILE_VALIDATION` | El usuario envió algo inválido |
| `FileProcessingError` | 500 | `ERR_FILE_PROCESSING` | Fallo interno procesando un archivo |
| `DatabaseError` | 500 | `ERR_DATABASE` | Fallo de SQL Server |

**`errorMiddleware(err, req, res, next)`** registra el error con el nivel adecuado y responde:

```json
{ "status": "error", "code": "ERR_...", "message": "...", "details": { } }
```

- Si el error **no** es un `AppError` (un fallo inesperado de programación), el mensaje se sustituye por `"Error interno del servidor"` para no filtrar detalles internos.
- Con `NODE_ENV=development` se añade `stack` (la traza del error).
- Aunque no se use, el parámetro `next` debe estar: Express reconoce un manejador de errores porque tiene **4 parámetros**.

**`catchAsync(fn)`:** envuelve un controlador `async` para que, si lanza un error, este llegue a `errorMiddleware`. **Todo controlador `async` nuevo va envuelto en `catchAsync`**; si no, un error deja la petición colgada.

**`handleError(error, contexto)`:** convierte un error cualquiera en `AppError` y lo registra. Disponible; hoy no se usa.

### `src/utils/logger.js`

- Niveles, de más a menos importante: `error`, `warn`, `info`, `http`, `debug`, `trace`. Solo se imprimen los niveles iguales o más importantes que `LOG_LEVEL`.
- Formato: `[AAAA-MM-DD HH:mm:ss] [NIVEL] mensaje {metadatos JSON}`, con color en la consola.
- Con `LOG_TO_FILE` también escribe en `logs/AAAA-MM-DD.log` (un archivo por día).
- Uso: `logger.info('Mensaje', { dato: 1 })`. **Usa `logger`, no `console.log`** (algunos archivos usan `console.log`; ver [12](12-problemas-conocidos.md)).
- **Nunca registres contraseñas, tokens ni datos personales completos.**

### `src/middlewares/requestLogger.middleware.js`

Registra cada petición entrante (nivel `http`) y, al terminar la respuesta, su código y su duración: `error` para 5xx, `warn` para 4xx y `http` para el resto.

### `src/utils/fileUtils.js`

| Función | Uso actual |
| --- | --- |
| `hasValidExtension(file)` | `processFile` |
| `saveAsJson(nombre, datos)` | Controlador de carga |
| `ensureDirectoryExists(ruta)` | Logger y `saveAsJson` |
| `generateUniqueFilename`, `removeFile`, `removeDirectory`, `removeFileAndDirectory` | Disponibles, sin uso actual |

### `src/utils/fileCleanup.js`

- **`scheduleFileCleanup()`:** si `UPLOAD_CLEANUP_ENABLED=true`, ejecuta una limpieza al arrancar y luego cada `UPLOAD_CLEANUP_INTERVAL` horas (`setInterval`).
- **`cleanupOldFiles(dir)`:** recorre `uploads/` y sus subcarpetas y borra los archivos cuya fecha de modificación supera `UPLOAD_RETENTION_DAYS`. Ignora los archivos ocultos (los que empiezan con `.`).

### `src/utils/swagger.js`

- Genera una especificación OpenAPI 3 y la sirve en `/api-docs` (interfaz) y `/api-docs.json` (JSON). Solo en `development` y `test`.
- Define esquemas reutilizables (`Error`, `Asesor`, `UploadResponse`) y respuestas estándar (`BadRequest`, `InternalError`…).
- Lee los comentarios `@swagger` de `./src/routes/*.js` y `./src/domains/*/routes/*.js`. Las rutas son relativas a la carpeta desde la que arranca el proceso: funciona si se arranca desde `server/` (que es lo que hacen todos los scripts).
- Una prueba (`app.contract.test.js`) comprueba que los endpoints están documentados y que todas las referencias `$ref` existen.

## 4.5 Reglas del backend (resumen)

1. La configuración, solo a través de `config.js`.
2. Los controladores `async`, siempre envueltos en `catchAsync`.
3. Los errores, con las clases de `errorHandler.js` y `next(error)`; nada de `res.status(500).json(...)` a mano.
4. El SQL, siempre con parámetros `@nombre` + `request.input(...)`.
5. Los tipos de los datos los decide el esquema de mapeo del dominio, nunca el aspecto del valor.
6. Los logs, con `logger` y sin datos sensibles.
7. Cada ruta nueva, con su prueba en `__tests__/` y su comentario `@swagger`.
8. Lo específico del negocio va en `domains/<entidad>/`; lo reutilizable, en `utils/` o `middlewares/`.

Siguiente paso: [05-frontend.md](05-frontend.md).
