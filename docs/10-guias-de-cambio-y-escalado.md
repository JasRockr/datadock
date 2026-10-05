# 10. Guías de cambio y escalado

> Recetas paso a paso para las modificaciones más comunes. Cada receta indica **todos** los archivos que hay que tocar: si te saltas uno, algo quedará inconsistente.

## 10.1 Agregar una columna nueva al asesor

Ejemplo: agregar `ciudad` (texto, opcional).

1. **Base de datos.** Crea `server/database/migrations/002_agregar_ciudad.sql` y ejecútalo en tu base local ([06, sección 6.5](06-base-de-datos.md#65-cómo-cambiar-el-esquema-migraciones)):

   ```sql
   IF COL_LENGTH('dbo.asesores_api', 'ciudad') IS NULL
       ALTER TABLE dbo.asesores_api ADD ciudad VARCHAR(255) NULL;
   ```

2. **`server/src/database/queries.js`:** agrega la columna y su parámetro en `addNewAsesor`:

   ```sql
   INSERT INTO ${asesores} (..., usuario, ciudad) VALUES (..., @usuario, @ciudad)
   ```

3. **`server/src/domains/asesores/models/asesor.model.js`**, en tres lugares:
   - `asesorValidationSchema`: `ciudad: Joi.string().max(255).allow(null, '').optional()`
   - `asesorMappingSchema`: `ciudad: { source: 'ciudad', type: 'string', required: false, transform: value => value || null }`
   - `class Asesor`: en el `constructor` (`this.ciudad = data.ciudad;`), en `sanitize()` (agrégala a `stringFields`) y en `toDatabase()` (`ciudad: this.ciudad`).

4. **El controlador no cambia:** recorre automáticamente los campos de `toDatabase()`.

5. **Swagger:** agrega `ciudad` al esquema `Asesor` de `server/src/utils/swagger.js`.

6. **Cliente, tabla** (`client/src/pages/AsesoresPage.jsx`): agrega a `columns`:

   ```js
   { id: 'ciudad', header: 'Ciudad', accessor: asesor => asesor.ciudad },
   ```

7. **Cliente, instrucciones** (`client/src/pages/CargaArchivoPage.jsx`, bloque "Instrucciones"): menciona la columna nueva.

8. **Si la columna es obligatoria**, además:
   - `required: true` en el mapeo y `.required()` en Joi.
   - Agrégala a `REQUIRED_FIELDS` en `client/src/utils/fileValidator.js`.

9. **Documentación:** la tabla de columnas de [07-api.md](07-api.md#formato-del-csv).

10. **Pruebas:** agrega la columna al CSV de `server/__tests__/upload.contract.test.js` (constantes `HEADER` y `validRow`) y un caso en `server/__tests__/asesor.model.test.js`. Ejecuta `npm test`.

## 10.2 Agregar un endpoint nuevo

Ejemplo: `GET /api/asesores/:id_asesor` para consultar un asesor.

1. **Consulta** en `server/src/database/queries.js`:

   ```js
   getAsesorByIdAsesor: `SELECT * FROM ${asesores} WHERE id_asesor = @id_asesor`,
   ```

2. **Controlador** en `server/src/domains/asesores/controllers/asesores.controller.js`:

   ```js
   import { AppError } from '../../../utils/errorHandler.js';

   export const getAsesorById = catchAsync(async (req, res) => {
     const pool = await getConnection();
     const result = await pool.request()
       .input('id_asesor', sql.VarChar, req.params.id_asesor)   // parámetro, nunca concatenar
       .query(queriesAsesores.getAsesorByIdAsesor);

     if (result.recordset.length === 0) {
       throw new AppError('Asesor no encontrado', 404, 'ERR_NOT_FOUND');
     }
     res.json({ status: 'success', data: new Asesor(result.recordset[0]) });
   });
   ```

   `catchAsync` es obligatorio: sin él, un error dejaría la petición colgada.

3. **Ruta y documentación** en `server/src/domains/asesores/routes/asesores.routes.js` (ver 10.5 para el formato del comentario):

   ```js
   /**
    * @swagger
    * /api/asesores/{id_asesor}:
    *   get:
    *     summary: Consulta un asesor por su id_asesor
    *     tags: [Asesores]
    *     parameters:
    *       - in: path
    *         name: id_asesor
    *         required: true
    *         schema: { type: string }
    *     responses:
    *       200: { description: Asesor encontrado }
    *       404: { description: No existe }
    */
   router.get('/asesores/:id_asesor', getAsesorById);
   ```

4. **Prueba** en `server/__tests__/` con los casos 200 y 404 (modelo en [08, sección 8.3](08-pruebas-y-calidad.md#83-cómo-escribir-una-prueba-nueva)).

5. **Documentación:** agrégalo a [07-api.md](07-api.md).

6. **Cliente** (si lo necesita): un método en `client/src/services/apiService.js` y, si es un dato compartido, una acción en `client/src/context/AppContext.jsx`.

## 10.3 Agregar una página nueva al cliente

Ejemplo: página `/reportes`.

1. Crea `client/src/pages/ReportesPage.jsx`:

   ```jsx
   function ReportesPage() {
     return <section className="rounded-lg bg-white p-4 shadow-sm">Reportes</section>;
   }
   export default ReportesPage;
   ```

2. Registra la ruta en `client/src/App.jsx`:

   ```jsx
   import ReportesPage from './pages/ReportesPage';
   // dentro de <Routes>
   <Route path="/reportes" element={<ReportesPage />} />
   ```

3. Agrega el enlace en `client/src/components/NavBar.jsx` **dos veces**: en el menú de escritorio y en el menú móvil.
4. Si la página necesita piezas propias, créalas en `client/src/components/reportes/`.
5. Agrega su prueba en `client/__tests__/ReportesPage.test.jsx`.

## 10.4 Agregar una entidad de negocio nueva (un dominio)

Ejemplo: `clientes`. Copia la forma de `asesores`:

```text
server/src/domains/clientes/
├── controllers/clientes.controller.js
├── models/cliente.model.js
└── routes/clientes.routes.js
```

1. Consultas en `server/src/database/queries.js` (`export const queriesClientes = {...}`) y reexpórtalas en `database/index.js`.
2. Tabla en `config.js` (`tables.clientes: process.env.TBL_CLIENTES || 'clientes_api'`) y un script en `server/database/migrations/`.
3. Registra las rutas en `server/src/app.js` **antes** del manejador 404: `app.use('/api/', clientesRoutes);`
4. Swagger ya lee `./src/domains/*/routes/*.js`: basta con escribir los comentarios `@swagger`.
5. Reutiliza `uploadFile`/`processFile` si el dominio también se carga por CSV: son genéricos, y el lector entrega texto que tu esquema de mapeo convierte.
6. En el cliente: `pages/ClientesPage.jsx` y `components/clientes/`.

## 10.5 Documentar un endpoint en Swagger

Swagger lee los comentarios `@swagger` de `server/src/routes/*.js` y `server/src/domains/*/routes/*.js`. Los de `asesores.routes.js` sirven de modelo. La estructura mínima:

```js
/**
 * @swagger
 * /api/ruta:
 *   get:
 *     summary: Qué hace, en una frase
 *     tags: [NombreDelGrupo]
 *     responses:
 *       200:
 *         description: Qué devuelve
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Asesor' }
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/ruta', controlador);
```

- Los esquemas (`Error`, `Asesor`, `UploadResponse`) y las respuestas reutilizables (`BadRequest`, `InternalError`…) se definen en `server/src/utils/swagger.js`.
- Reinicia el servidor y abre <http://localhost:5128/api-docs>.
- La prueba `app.contract.test.js` falla si una referencia `$ref` apunta a algo que no existe.

## 10.6 Cambiar el puerto de la API

Lista completa (ver también [03, sección 3.5](03-configuracion.md#35-puertos-del-proyecto)):

1. `PORT` en `server/.env`.
2. `VITE_API_URL` del cliente (`client/.env.local`, `args` en `docker-compose.yml` y la variable de GitHub).
3. `server/Dockerfile`: `ENV PORT` y `EXPOSE`.
4. `docker-compose.yml`: `ports`, `environment.PORT` y la URL del `healthcheck`.
5. `client/nginx/nginx.conf`: `connect-src`.
6. Opcional: los valores por defecto en `server/src/config.js` y `client/src/config.js`.

## 10.7 Cambiar el tamaño máximo de archivo

1. `MAX_FILE_SIZE` en `server/.env` (en bytes: 20 MB = `20971520`).
2. `MAX_FILE_SIZE` en `client/src/utils/fileValidator.js`.
3. El texto "máximo 10MB" en `client/src/pages/CargaArchivoPage.jsx`.
4. La descripción del campo `file` en el comentario `@swagger` de `POST /api/upload`.
5. Si hay un proxy delante (nginx, Azure App Service…), su límite de tamaño de petición también (en nginx: `client_max_body_size`).

## 10.8 Escalar: qué cambiar cuando crezcan los datos

El diseño actual funciona bien con cientos o pocos miles de registros. Estos son los cuellos de botella, en el orden en que aparecerán:

| Síntoma | Causa actual | Cambio recomendado |
| --- | --- | --- |
| El listado tarda en cargar o el navegador va lento | `GET /api/asesores` devuelve **todas** las filas y el cliente filtra y pagina en memoria | Paginación y filtros en el servidor: `GET /api/asesores?page=1&pageSize=50&q=...&desde=...&hasta=...` con `ORDER BY ... OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY` y `SELECT COUNT(*)` (ya existe `getTotalAsesores`). En el cliente, `processRows` deja de filtrar y `AsesoresPage` pide cada página al servidor. |
| Cargar un CSV grande tarda minutos | Un `INSERT` por fila dentro de la transacción | Inserción masiva con `sql.Table` + `request.bulk()` de `mssql`, validando todas las filas antes de insertar. |
| El servidor usa mucha memoria con varias cargas simultáneas | Multer en memoria + todo el CSV en un arreglo | Multer con `diskStorage` y lectura por flujos (*streams*) con una biblioteca como `csv-parse`, procesando por lotes. `csv-parse` además resuelve los separadores dentro de comillas. |
| Filas duplicadas | No hay clave única de negocio | Índice `UNIQUE` en `id_asesor` (o en la combinación que defina el negocio) y `MERGE` en lugar de `INSERT`. |
| Varias instancias del servidor | Caché y limpieza de archivos en la memoria de cada proceso | Almacenamiento compartido para `uploads` (un volumen o *blob storage*) y la limpieza en un único proceso o en una tarea programada. |
| Consultas lentas por fecha | Sin índices | Índice en `fecha_novedad` (y en las columnas por las que se filtre en el servidor). |

## 10.9 Agregar autenticación (cuando se necesite)

Hoy la API es abierta. Un camino ordenado:

1. Decide el proveedor con el equipo (por ejemplo, Microsoft Entra ID, si la organización ya usa Microsoft 365).
2. **Servidor:** un middleware `server/src/middlewares/auth.middleware.js` que valide el token (`Authorization: Bearer ...`) y rechace con `401`. Regístralo en `app.js` antes de las rutas `/api/`, dejando libres `/health` y `/status-server`.
3. **Cliente:** obtener el token al iniciar sesión y añadirlo en **un solo lugar**: las llamadas `fetch` de `client/src/services/apiService.js`.
4. Usa el usuario autenticado para llenar la columna `usuario`, en lugar de leerla del CSV.
5. Swagger ya declara `bearerAuth` en `components.securitySchemes`.

## 10.10 Agregar una dependencia

```bash
npm --prefix client install nombre-paquete            # dependencia del cliente
npm --prefix server install nombre-paquete            # dependencia del servidor
npm --prefix server install --save-dev nombre-paquete # solo para desarrollo o pruebas
```

- Confirma el `package.json` **y** el `package-lock.json` en el mismo commit.
- Antes de agregar un paquete, revisa si ya hay algo en el proyecto que resuelva lo mismo.
- En el servidor, todo lo que el código compilado (`dist/`) necesita al ejecutarse va en `dependencies`, no en `devDependencies`: la imagen Docker instala solo `dependencies`.
- Si una herramienta necesita un paquete que llega "de rebote" (como `jsdom` para Vitest), decláralo explícitamente.

Siguiente paso: [11-solucion-de-problemas.md](11-solucion-de-problemas.md).
