# 7. Referencia de la API

> El contrato HTTP entre el cliente y el servidor. URL base en desarrollo: `http://localhost:5128`. La misma información, interactiva, está en <http://localhost:5128/api-docs> (Swagger, solo en desarrollo).

## 7.1 Resumen de endpoints

| Método | Ruta | Para qué | Respuesta correcta |
| --- | --- | --- | --- |
| `GET` | `/api/asesores` | Listar todos los asesores | `200` |
| `POST` | `/api/upload` | Cargar un CSV de asesores | `200` |
| `GET` | `/health` | Salud del proceso; lo usa el cliente para saber si hay conexión | `200 {"status":"UP"}` |
| `GET` | `/status-server` | Healthcheck de Docker | `200 {"message":"Server Online ..."}` |
| `GET` | `/` | Comprobación manual | `200 {"status":"success","message":"Server is running"}` |
| `GET` | `/api` | Comprobación manual | `200 {"message":"Welcome to Api!"}` |
| `GET` | `/api-docs` | Interfaz de Swagger (solo `development`/`test`) | HTML |
| `GET` | `/api-docs.json` | Especificación OpenAPI (solo `development`/`test`) | JSON |

No hay autenticación: cualquiera que llegue al servidor puede usar la API. Protégela a nivel de red o agrega autenticación antes de exponerla públicamente ([10, sección 10.9](10-guias-de-cambio-y-escalado.md#109-agregar-autenticación-cuando-se-necesite)).

## 7.2 `POST /api/upload`

### Petición

- Tipo: `multipart/form-data`.
- Un único campo de archivo llamado **`file`**.
- Extensión `.csv` y tamaño ≤ `MAX_FILE_SIZE` (10 MB por defecto).

### Formato del CSV

- Codificación **UTF-8** (en Excel: *Guardar como → CSV UTF-8*).
- Separador **punto y coma (`;`)** recomendado. Si el servidor no tiene `CSV_DELIMITER` definido, también acepta coma, tabulador o `|` (lo detecta en la cabecera).
- **Primera fila:** nombres de columna. No importan las mayúsculas ni los espacios: `Nombre Asesor` se lee como `nombre_asesor`.
- **Todos los valores se tratan como texto**, salvo `fecha_novedad`. Los ceros a la izquierda y los textos como `Ventas 2` o `Si` se guardan tal cual.
- Las celdas opcionales vacías se guardan como `NULL`.

| Columna | Obligatoria | Regla |
| --- | --- | --- |
| `id_asesor` | Sí | Mínimo 7 caracteres |
| `nombre_asesor` | Sí | Texto |
| `equipo_entidad` | Sí | Texto |
| `compania` | Sí | Texto |
| `usuario` | Sí | Mínimo 3 caracteres |
| `correo_contacto` | No | Email válido, de cualquier dominio |
| `celular_contacto` | No | Solo dígitos, hasta 10 |
| `rol_asesor` | No | Texto |
| `observaciones` | No | Texto |
| `fecha_novedad` | No | `AAAA-MM-DD`, no futura. Si falta, se usa la fecha actual; si no es una fecha válida, la fila se rechaza. |

**Limitación:** un valor no puede contener el separador, ni siquiera entre comillas (`"Pérez; Juan"` se parte en dos columnas).

### Ejemplo de archivo válido

Guárdalo como `asesores-ejemplo.csv` (en UTF-8):

```text
id_asesor;nombre_asesor;equipo_entidad;compania;correo_contacto;celular_contacto;rol_asesor;observaciones;fecha_novedad;usuario
1216722322;Ana Pérez;Ventas;ABC S.A.S.;ana@example.com;3123456789;Asesora;Ingreso nuevo;2024-01-15;admin
1216722323;Luis Gómez;Soporte;ABC S.A.S.;;;Líder;;2024-02-01;admin
```

### Cómo enviarlo sin el cliente web

**bash / zsh / CMD** (`curl` viene con Windows 10+; en PowerShell escribe `curl.exe`, porque `curl` a secas es otro comando):

```bash
curl -F "file=@asesores-ejemplo.csv" http://localhost:5128/api/upload
```

**PowerShell 7+:**

```powershell
Invoke-RestMethod -Uri http://localhost:5128/api/upload -Method Post -Form @{ file = Get-Item .\asesores-ejemplo.csv }
```

(Windows PowerShell 5.1 no tiene `-Form`: usa `curl.exe -F "file=@asesores-ejemplo.csv" http://localhost:5128/api/upload`.)

**Postman / Thunder Client:** método `POST` → *Body* → `form-data` → clave `file`, tipo **File** → elige el archivo.

**Swagger:** en <http://localhost:5128/api-docs>, abre `POST /api/upload` → *Try it out* → elige el archivo → *Execute*.

### Respuestas

**`200`: procesado** (puede incluir errores, si no superan el 30 %):

```json
{
  "status": "success",
  "message": "Archivo procesado correctamente",
  "data": {
    "totalRows": 2,
    "insertedRows": 2,
    "errorsCount": 0,
    "hasErrors": false,
    "errors": []
  }
}
```

Cada elemento de `errors` (máximo 10) tiene la forma `{ "index": 0, "row": { ...fila leída... }, "error": "Error de validación: ..." }`. `index` empieza en 0 y no cuenta la cabecera: `index: 0` es la **línea 2** del archivo.

**Errores:**

| HTTP | `code` | Causa | Qué hacer |
| --- | --- | --- | --- |
| 400 | `ERR_FILE_VALIDATION` | Sin archivo, el campo no se llama `file`, extensión distinta de `.csv`, CSV vacío o sin filas de datos | Revisa el archivo y el nombre del campo |
| 400 | `ERR_NO_DATA` | No quedaron filas para procesar | — |
| 400 | `ERR_TOO_MANY_ERRORS` | Más del 30 % de las filas son inválidas. **No se guardó nada.** `details.errors` trae las 10 primeras. | Corrige las filas indicadas |
| 413 | `ERR_FILE_TOO_LARGE` | Supera `MAX_FILE_SIZE` | Divide el archivo |
| 500 | `ERR_DATABASE` | No se pudo conectar o falló la transacción | Revisa SQL Server y `server/.env` |
| 500 | `ERR_INTERNAL` | Error inesperado | Revisa los logs del servidor |

## 7.3 `GET /api/asesores`

**bash / zsh / CMD:**

```bash
curl http://localhost:5128/api/asesores
```

**PowerShell:**

```powershell
Invoke-RestMethod http://localhost:5128/api/asesores
```

**`200`:**

```json
{
  "status": "success",
  "data": [
    {
      "id_asesor": "1216722322",
      "nombre_asesor": "Ana Pérez",
      "equipo_entidad": "Ventas",
      "compania": "ABC S.A.S.",
      "correo_contacto": "ana@example.com",
      "celular_contacto": "3123456789",
      "rol_asesor": "Asesora",
      "observaciones": "Ingreso nuevo",
      "fecha_novedad": "2024-01-15T00:00:00.000Z",
      "usuario": "admin"
    }
  ]
}
```

- Devuelve **todos** los registros, sin paginación ni filtros en el servidor.
- La columna `id` de la tabla **no** se incluye (la respuesta pasa por el modelo `Asesor`).
- `fecha_novedad` llega como medianoche UTC. **El día que vale es el que aparece escrito** (`2024-01-15`); no lo conviertas a la hora local para mostrarlo (en el cliente se usa `formatDay`).

**Error:** `500 ERR_DATABASE` si SQL Server no responde.

## 7.4 Contrato de error (común a toda la API)

```json
{
  "status": "error",
  "code": "ERR_FILE_VALIDATION",
  "message": "Formato de archivo no admitido.",
  "details": { }
}
```

| `code` | HTTP | Origen |
| --- | --- | --- |
| `ERR_FILE_VALIDATION` | 400 | `FileValidationError` |
| `ERR_NO_DATA` | 400 | Controlador de carga |
| `ERR_TOO_MANY_ERRORS` | 400 | Controlador de carga |
| `ERR_CORS` | 403 | Origen no permitido (fuera de `development`) |
| `ERR_NOT_FOUND` | 404 | Ruta inexistente |
| `ERR_FILE_TOO_LARGE` | 413 | Multer |
| `ERR_DATABASE` | 500 | `DatabaseError` |
| `ERR_FILE_PROCESSING` | 500 | `FileProcessingError` no controlado |
| `ERR_INTERNAL` | 500 | Cualquier error inesperado (mensaje genérico) |

- `details` solo aparece si hay información adicional.
- En `development` se añade `stack`.
- En el cliente, `apiService.handleResponse` convierte cualquier respuesta no 2xx en `{status:'error', code:<HTTP>, message, errors, details}`.

## 7.5 CORS en la práctica

| Entorno (`NODE_ENV`) | ¿Quién puede llamar a la API desde un navegador? |
| --- | --- |
| `development` | Cualquier origen |
| `production` / `test` | Solo los de `CORS_ORIGIN` (o todos, si vale `*`) |

Para probar un *preflight* desde la terminal:

```bash
curl -i -X OPTIONS http://localhost:5128/api/upload -H "Origin: http://localhost:5173" -H "Access-Control-Request-Method: POST"
```

Siguiente paso: [08-pruebas-y-calidad.md](08-pruebas-y-calidad.md).
