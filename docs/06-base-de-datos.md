# 6. Base de datos

> Qué espera encontrar la aplicación en SQL Server, cómo crearlo y cómo evolucionarlo.

## 6.1 Qué necesita la aplicación

- Un **SQL Server 2019+** o **Azure SQL Database**, con **autenticación SQL** (usuario y contraseña).
- Una base de datos (`DB_NAME`) con una tabla (`TBL_ASESORES`, por defecto `asesores_api`).
- Un usuario con permisos de `SELECT` e `INSERT` sobre esa tabla.

## 6.2 Script de creación de la tabla

Está versionado en **`server/database/migrations/001_crear_tabla_asesores_api.sql`**. Solo crea la tabla si no existe, así que se puede ejecutar más de una vez sin riesgo:

```sql
IF OBJECT_ID(N'dbo.asesores_api', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.asesores_api (
        id               INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_asesores_api PRIMARY KEY,
        id_asesor        VARCHAR(255)  NOT NULL,
        nombre_asesor    VARCHAR(255)  NOT NULL,
        equipo_entidad   VARCHAR(255)  NOT NULL,
        compania         VARCHAR(255)  NOT NULL,
        correo_contacto  VARCHAR(255)  NULL,
        celular_contacto VARCHAR(20)   NULL,
        rol_asesor       VARCHAR(255)  NULL,
        observaciones    VARCHAR(MAX)  NULL,
        fecha_novedad    DATETIME      NULL,
        usuario          VARCHAR(255)  NOT NULL
    );
END;
```

> ⚠️ El script describe la tabla que espera el código. Antes de usarlo contra una base existente, **compáralo con la tabla real** (sección 6.4) o confírmalo con el DBA.

Cómo ejecutarlo:

```bash
sqlcmd -S <servidor> -U <usuario> -P "<contraseña>" -d <base> -C -i server/database/migrations/001_crear_tabla_asesores_api.sql
```

Con el SQL Server en Docker de [02, sección 2.6](02-instalacion-y-entorno.md#26-base-de-datos-para-desarrollo), el paso 4 de esa guía ya lo ejecuta. También puedes abrir el archivo en un gestor SQL (DBeaver, HeidiSQL, SQL Server Management Studio o la extensión **SQL Server (mssql)** de VS Code) y ejecutarlo; cómo conectarte está en [14, sección 14.4](14-prueba-e2e-con-docker.md#144-paso-3-conectarse-con-un-gestor-sql-opcional).

De dónde sale cada decisión:

| Columna | Origen en el código |
| --- | --- |
| `id` | Las consultas `getAsesorById`, `deleteAsesor` y `updateAsesorById` filtran por `WHERE id = @id`. La inserción no envía `id`, así que debe ser autoincremental (`IDENTITY`). |
| `id_asesor`, `nombre_asesor`, `equipo_entidad`, `compania`, `usuario` | Obligatorios en el modelo Joi. |
| `correo_contacto`, `celular_contacto`, `rol_asesor`, `observaciones` | Opcionales en el modelo; una celda vacía se guarda como `NULL`. |
| `fecha_novedad` | El controlador la envía como `sql.DateTime`. |
| Tipos `VARCHAR` | El controlador envía los textos como `sql.VarChar`. Si la tabla real usa `NVARCHAR` (recomendado para tildes y `ñ` sin depender de la *collation*), cambia también el tipo en el controlador a `sql.NVarChar`. |

**Lo que el esquema actual *no* tiene y conviene decidir con el equipo:**

- Un índice o restricción `UNIQUE` sobre `id_asesor`: hoy la misma persona puede quedar repetida.
- Columnas de auditoría (`fecha_carga`, `archivo_origen`) para saber de qué carga vino cada fila.

## 6.3 Cómo se relaciona el código con la tabla

| Operación | Consulta | Código |
| --- | --- | --- |
| Listar | `SELECT * FROM asesores_api` | `getAllAsesores` en el controlador |
| Insertar (una por fila del CSV, dentro de una transacción) | `INSERT INTO asesores_api (10 columnas) VALUES (@...)` | `uploadAsesores` en el controlador |

Recorrido de un dato, desde el archivo hasta la tabla:

```text
Celda del CSV ("Ventas 2")
  → csvHandler: siempre texto → "Ventas 2"
  → mapDataToSchema: tipo del esquema ('string') y transform, si lo hay
  → Asesor.sanitize(): espacios limpiados
  → Asesor.validate(): reglas Joi
  → toDatabase() → request.input('equipo_entidad', sql.VarChar, 'Ventas 2')
  → INSERT
```

Solo `fecha_novedad` cambia de tipo: `"2024-01-15"` → `Date` (medianoche UTC) → `DATETIME` `2024-01-15 00:00:00`.

## 6.4 Consultas útiles para desarrolladores

```sql
-- Ver la estructura real de la tabla
EXEC sp_help 'dbo.asesores_api';

-- Últimos registros cargados
SELECT TOP 20 * FROM dbo.asesores_api ORDER BY id DESC;

-- Asesores duplicados por id_asesor
SELECT id_asesor, COUNT(*) AS veces
FROM dbo.asesores_api
GROUP BY id_asesor
HAVING COUNT(*) > 1;

-- Vaciar la tabla en TU base local (¡nunca en una base compartida!)
TRUNCATE TABLE dbo.asesores_api;
```

Ejemplo con `sqlcmd` dentro del contenedor de desarrollo (en Git Bash, ejecuta antes `export MSYS_NO_PATHCONV=1`):

```bash
docker exec datadock-sql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "Cambiar.Esto123" -C -d datadock -Q "SELECT TOP 5 * FROM dbo.asesores_api ORDER BY id DESC"
```

## 6.5 Cómo cambiar el esquema (migraciones)

El proyecto no usa una herramienta de migraciones; usa **scripts SQL numerados** en `server/database/migrations/`:

1. Crea el siguiente archivo en orden: `002_descripcion_corta.sql`.
2. Escríbelo para que se pueda ejecutar dos veces sin error (comprueba antes con `IF COL_LENGTH(...) IS NULL`, `IF OBJECT_ID(...) IS NULL`, etc.).
3. Ejecútalo en tu base local, actualiza el código que lo necesite y pruébalo.
4. Confírmalo en el mismo *pull request* que el código.
5. Quien despliega lo ejecuta en cada entorno **en orden numérico**, antes de publicar el código nuevo.

Ejemplo `002_agregar_ciudad.sql`:

```sql
IF COL_LENGTH('dbo.asesores_api', 'ciudad') IS NULL
    ALTER TABLE dbo.asesores_api ADD ciudad VARCHAR(255) NULL;
```

## 6.6 Buenas prácticas

1. **Parámetros siempre** (`@campo` + `request.input`). Nunca concatenes valores del usuario en el SQL.
2. **Transacciones** para las operaciones de varias filas: o todo o nada.
3. **Cada cambio de esquema, un script numerado** en `server/database/migrations/`.
4. **Nunca** uses el usuario `sa` fuera de tu máquina local: en servidores compartidos, un usuario con los permisos mínimos.

Siguiente paso: [07-api.md](07-api.md).
